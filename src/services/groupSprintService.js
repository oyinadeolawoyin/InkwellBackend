const prisma = require("../config/prismaClient");

// ─── GROUP SPRINT ─────────────────────────────────────────────

async function startGroupSprint(userId, duration) {
  // soundscape is no longer on GroupSprint — each member picks their own
  const groupSprint = await prisma.groupSprint.create({
    data: { userId, duration }
  });

  return prisma.groupSprint.update({
    where: { id: groupSprint.id },
    data: { liveKitRoomName: `sprint-${groupSprint.id}` }
  });
}

async function endGroupSprint(groupSprintId) {
  await prisma.sprint.updateMany({
    where: { groupSprintId, isActive: true },
    data: { completedAt: new Date(), isActive: false }
  });

  const allSprints = await prisma.sprint.findMany({
    where: { groupSprintId },
    select: { wordsWritten: true }
  });
  const totalWordsWritten = allSprints.reduce((sum, s) => sum + (s.wordsWritten || 0), 0);

  return prisma.groupSprint.update({
    where: { id: groupSprintId },
    data: { completedAt: new Date(), isActive: false, totalWordsWritten }
  });
}

async function fetchGroupSprint(groupSprintId) {
  return prisma.groupSprint.findFirst({
    where: { id: groupSprintId },
    include: {
      sprints: {
        include: {
          user: { select: { username: true, avatar: true } },
          soundscape: {  // each member's chosen soundscape
            select: { id: true, name: true, fileUrl: true, creatorName: true }
          }
        }
      },
      _count: { select: { sprints: true } },
      user: { select: { username: true, avatar: true } }
    }
  });
}

async function fetchAllActiveGroupSprints({ take, skip }) {
  const [groupSprints, total] = await prisma.$transaction([
    prisma.groupSprint.findMany({
      where: { isActive: true },
      skip,
      take,
      orderBy: { startedAt: "desc" },
      include: {
        user: { select: { username: true, avatar: true } },
        sprints: {
          select: {
            userId: true,
            user: { select: { username: true, avatar: true } }
          }
        },
        _count: { select: { sprints: true } }
      }
    }),
    prisma.groupSprint.count({ where: { isActive: true } })
  ]);

  return { groupSprints, total };
}

async function fetchLastGroupSprint() {
  return prisma.groupSprint.findFirst({
    where: { isActive: false, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    include: {
      sprints: {
        orderBy: { wordsWritten: "desc" },
        include: {
          user: { select: { username: true, avatar: true } },
          soundscape: {
            select: { id: true, name: true, fileUrl: true, creatorName: true }
          }
        }
      },
      user: { select: { username: true, avatar: true } },
      _count: { select: { sprints: true } }
    }
  });
}

// ─── SPRINT ───────────────────────────────────────────────────

// soundscapeId is now part of join — each member picks their own
async function joinSprint(userId, groupSprintId, checkin, startWords, soundscapeId) {
  const existing = await prisma.sprint.findFirst({
    where: { userId, groupSprintId, isActive: true }
  });

  if (existing) return existing;

  return prisma.sprint.create({
    data: {
      userId,
      groupSprintId,
      checkin,
      startWords: startWords || 0,
      soundscapeId: soundscapeId || null,
    },
    include: {
      soundscape: {
        select: { id: true, name: true, fileUrl: true, creatorName: true }
      }
    }
  });
}

async function checkoutSprint(sprintId, currentWordCount) {
  const existing = await prisma.sprint.findUnique({
    where: { id: sprintId },
    select: { startWords: true, userId: true, groupSprintId: true }
  });

  if (!existing) throw new Error("Sprint not found");

  const diff = currentWordCount - existing.startWords;
  const wordsWritten = diff > 0 ? diff : 0;
  const deletedWords = diff < 0 ? Math.abs(diff) : 0;

  const sprint = await prisma.sprint.update({
    where: { id: sprintId },
    data: { wordsWritten, deletedWords, completedAt: new Date(), isActive: false }
  });

  if (existing.groupSprintId) {
    const allSprints = await prisma.sprint.findMany({
      where: { groupSprintId: existing.groupSprintId },
      select: { wordsWritten: true }
    });
    const total = allSprints.reduce((sum, s) => sum + (s.wordsWritten || 0), 0);
    await prisma.groupSprint.update({
      where: { id: existing.groupSprintId },
      data: { totalWordsWritten: total }
    });
  }

  return sprint;
}

async function fetchLoginUserSprint(userId) {
  return prisma.sprint.findFirst({
    where: { userId, isActive: true },
    include: {
      user: { select: { username: true, avatar: true } },
      soundscape: {
        select: { id: true, name: true, fileUrl: true, creatorName: true }
      }
    }
  });
}

module.exports = {
  startGroupSprint,
  endGroupSprint,
  fetchGroupSprint,
  fetchAllActiveGroupSprints,
  fetchLastGroupSprint,
  joinSprint,
  checkoutSprint,
  fetchLoginUserSprint
};