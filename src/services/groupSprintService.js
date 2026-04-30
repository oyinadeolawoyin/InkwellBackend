const prisma = require("../config/prismaClient");

// ─── AUTO-END STALE SPRINTS ───────────────────────────────────
// Called before any read that returns active sprints.
// Ends any GroupSprint whose (startedAt + duration + 10 min grace) has passed.
// This ensures stale sprints vanish from the homepage even when the host
// never manually ends the session.
async function autoEndStaleSprints() {
  const now = new Date();

  // Find all active group sprints that are overdue
  const stale = await prisma.groupSprint.findMany({
    where: { isActive: true },
    select: { id: true, startedAt: true, duration: true },
  });

  const overdueIds = stale
    .filter(({ startedAt, duration }) => {
      const endsAt = new Date(startedAt).getTime() + (duration + 10) * 60 * 1000;
      return now.getTime() > endsAt;
    })
    .map((gs) => gs.id);

  if (overdueIds.length === 0) return;

  // For each overdue sprint, run the same logic as endGroupSprint
  for (const groupSprintId of overdueIds) {
    try {
      await prisma.sprint.updateMany({
        where: { groupSprintId, isActive: true },
        data: { completedAt: now, isActive: false },
      });

      const allSprints = await prisma.sprint.findMany({
        where: { groupSprintId },
        select: { wordsWritten: true },
      });
      const totalWordsWritten = allSprints.reduce((sum, s) => sum + (s.wordsWritten || 0), 0);

      await prisma.groupSprint.update({
        where: { id: groupSprintId },
        data: { completedAt: now, isActive: false, totalWordsWritten },
      });
    } catch (err) {
      // Don't let one failure block the rest
      console.error(`[autoEnd] Failed to end groupSprint ${groupSprintId}:`, err);
    }
  }
}

// ─── GROUP SPRINT ─────────────────────────────────────────────
async function startGroupSprint(userId, duration, visibility = "PUBLIC", sprintType = "WRITING") {
  const groupSprint = await prisma.groupSprint.create({
    data: { userId, duration, visibility, sprintType }
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
  // Auto-end this sprint if its time has passed (covers direct URL visits)
  await autoEndStaleSprints();

  return prisma.groupSprint.findFirst({
    where: { id: groupSprintId },
    include: {
      sprints: {
        include: {
          user: { select: { username: true, avatar: true, discordId: true } },
          soundscape: {
            select: { id: true, name: true, fileUrl: true, creatorName: true }
          },
          project: { select: { id: true, title: true } }
        }
      },
      _count: { select: { sprints: true } },
      user: { select: { username: true, avatar: true } }
    }
  });
}

async function fetchAllActiveGroupSprints({ take, skip }) {
  // Sweep stale sprints before returning the list so the homepage stays clean
  await autoEndStaleSprints();

  const [groupSprints, total] = await prisma.$transaction([
    prisma.groupSprint.findMany({
      where: { isActive: true, visibility: "PUBLIC" }, // only PUBLIC sprints in the global list
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
    prisma.groupSprint.count({ where: { isActive: true, visibility: "PUBLIC" } })
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

// projectId is now part of join — each member can optionally link their project
async function joinSprint(userId, groupSprintId, checkin, startWords, soundscapeId, projectId) {
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
      projectId: projectId || null,
    },
    include: {
      soundscape: {
        select: { id: true, name: true, fileUrl: true, creatorName: true }
      },
      project: { select: { id: true, title: true } }
    }
  });
}

async function checkoutSprint(sprintId, currentWordCount) {
  const existing = await prisma.sprint.findUnique({
    where: { id: sprintId },
    select: { startWords: true, userId: true, groupSprintId: true, projectId: true }
  });

  if (!existing) throw new Error("Sprint not found");

  const diff = currentWordCount - existing.startWords;
  const wordsWritten = diff > 0 ? diff : 0;
  const deletedWords = diff < 0 ? Math.abs(diff) : 0;

  const sprint = await prisma.sprint.update({
    where: { id: sprintId },
    data: { wordsWritten, deletedWords, completedAt: new Date(), isActive: false }
  });

  // ── Update group sprint total ──────────────────────────────
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

  // ── Auto-log words to linked project ──────────────────────
  // Only log if this was a writing sprint and words were actually written
  if (existing.projectId && wordsWritten > 0) {
    // Verify the project belongs to this user before writing
    const project = await prisma.project.findFirst({
      where: { id: existing.projectId, userId: existing.userId },
      select: { id: true, currentWordCount: true }
    });

    if (project) {
      await prisma.$transaction([
        prisma.project.update({
          where: { id: project.id },
          data: { currentWordCount: { increment: wordsWritten } }
        }),
        prisma.projectWordLog.create({
          data: {
            projectId: project.id,
            userId: existing.userId,
            wordsAdded: wordsWritten,
          }
        })
      ]);
    }
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
      },
      project: { select: { id: true, title: true } }
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
  fetchLoginUserSprint,
  autoEndStaleSprints,
};