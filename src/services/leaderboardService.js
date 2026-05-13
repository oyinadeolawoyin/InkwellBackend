// src/services/leaderboardService.js
const prisma = require("../config/prismaClient");

const LIMIT = 5; // always top 5

// ─── TOP CRITIQUERS ───────────────────────────────────────────────────────────
// Ranks by number of FeedbackResponse records where the user is the critic.
// criticId is nullable (deleted accounts), so we exclude nulls.
async function getTopCritiquers() {
  const raw = await prisma.feedbackResponse.groupBy({
    by: ["criticId"],
    where: { criticId: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: LIMIT,
  });

  if (raw.length === 0) return [];

  const userIds = raw.map((r) => r.criticId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, isDeleted: false },
    select: { id: true, username: true, avatar: true },
  });

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return raw.map((r, i) => ({
    rank:          i + 1,
    critiqueCount: r._count.id,
    user:          userMap[r.criticId] ?? { id: r.criticId, username: "[deleted]", avatar: null },
  }));
}

// ─── TOP SPRINTERS ────────────────────────────────────────────────────────────
// Ranks by number of completed sprints — appreciates consistent effort.
async function getTopSprinters() {
  const raw = await prisma.sprint.groupBy({
    by: ["userId"],
    where: { isActive: false },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: LIMIT,
  });

  if (raw.length === 0) return [];

  const userIds = raw.map((r) => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, isDeleted: false },
    select: { id: true, username: true, avatar: true },
  });

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return raw.map((r, i) => ({
    rank:        i + 1,
    sprintCount: r._count.id,
    user:        userMap[r.userId] ?? { id: r.userId, username: "[deleted]", avatar: null },
  }));
}

// ─── TOP PRACTICE WRITERS ─────────────────────────────────────────────────────
// Ranks by number of EmotionComment records authored.
// authorId is nullable (deleted accounts), so we exclude nulls.
async function getTopPracticeWriters() {
  const raw = await prisma.emotionComment.groupBy({
    by: ["authorId"],
    where: { authorId: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: LIMIT,
  });

  if (raw.length === 0) return [];

  const userIds = raw.map((r) => r.authorId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, isDeleted: false },
    select: { id: true, username: true, avatar: true },
  });

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return raw.map((r, i) => ({
    rank:          i + 1,
    practiceCount: r._count.id,
    user:          userMap[r.authorId] ?? { id: r.authorId, username: "[deleted]", avatar: null },
  }));
}

// ─── COMBINED ─────────────────────────────────────────────────────────────────
async function getHomepageLeaderboards() {
  const [critiquers, sprinters, practiceWriters] = await Promise.all([
    getTopCritiquers(),
    getTopSprinters(),
    getTopPracticeWriters(),
  ]);
  return { critiquers, sprinters, practiceWriters };
}

module.exports = {
  getTopCritiquers,
  getTopSprinters,
  getTopPracticeWriters,
  getHomepageLeaderboards,
};