// src/services/leaderboardService.js
const prisma = require("../config/prismaClient");

const LIMIT = 5; // always top 5

// ─── ALL-TIME BEST CRITIQUERS ─────────────────────────────────────────────────
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
    select: { id: true, username: true, avatar: true, feedbackPoints: { select: { reputation: true } } },
  });

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return raw.map((r, i) => ({
    rank:          i + 1,
    critiqueCount: r._count.id,
    user:          userMap[r.criticId] ?? { id: r.criticId, username: "[deleted]", avatar: null, feedbackPoints: null },
  }));
}

// ─── ALL-TIME BEST SPRINTERS ──────────────────────────────────────────────────
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
    select: { id: true, username: true, avatar: true, feedbackPoints: { select: { reputation: true } } },
  });

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return raw.map((r, i) => ({
    rank:        i + 1,
    sprintCount: r._count.id,
    user:        userMap[r.userId] ?? { id: r.userId, username: "[deleted]", avatar: null, feedbackPoints: null },
  }));
}

// ─── ALL-TIME BEST DAILY EMOTION CUE PRACTICE ────────────────────────────────
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
    select: { id: true, username: true, avatar: true, feedbackPoints: { select: { reputation: true } } },
  });

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return raw.map((r, i) => ({
    rank:          i + 1,
    practiceCount: r._count.id,
    user:          userMap[r.authorId] ?? { id: r.authorId, username: "[deleted]", avatar: null, feedbackPoints: null },
  }));
}

// ─── NEWEST MEMBERS ───────────────────────────────────────────────────────────
// Returns the 8 most recently joined, non-deleted users with their reputation.
async function getNewestMembers() {
  const users = await prisma.user.findMany({
    where:   { isDeleted: false },
    orderBy: { createdAt: "desc" },
    take:    8,
    select: {
      id:          true,
      username:    true,
      avatar:      true,
      createdAt:   true,
      bio:         true,
      feedbackPoints: { select: { reputation: true } },
    },
  });

  return users.map((u, i) => ({
    rank:       i + 1,
    user:       u,
    joinedAt:   u.createdAt,
    reputation: u.feedbackPoints?.reputation ?? 5,
  }));
}

// ─── USER SEARCH ──────────────────────────────────────────────────────────────
// Searches by exact or partial username (case-insensitive). Returns up to 10.
async function searchMembers(query) {
  if (!query || query.trim().length < 1) return [];

  const users = await prisma.user.findMany({
    where: {
      isDeleted: false,
      username: { contains: query.trim(), mode: "insensitive" },
    },
    take: 10,
    orderBy: { username: "asc" },
    select: {
      id:        true,
      username:  true,
      avatar:    true,
      createdAt: true,
      bio:       true,
      feedbackPoints: { select: { reputation: true } },
      discoveryStories: {
        where: { isApproved: true },
        select: { id: true, title: true, genre: true, coverUrl: true },
        take: 3,
      },
    },
  });

  return users.map((u) => ({
    user:       u,
    reputation: u.feedbackPoints?.reputation ?? 5,
    stories:    u.discoveryStories,
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

// ─── MEMBERS PAGE DATA ────────────────────────────────────────────────────────
// All data for /members in one shot.
async function getMembersPageData() {
  const [critiquers, sprinters, practiceWriters, newest, publications] = await Promise.all([
    getTopCritiquers(),
    getTopSprinters(),
    getTopPracticeWriters(),
    getNewestMembers(),
    // Featured published stories (most recently approved, up to 6)
    prisma.discoveryStory.findMany({
      where:   { isApproved: true },
      orderBy: { createdAt: "desc" },
      take:    6,
      select: {
        id:         true,
        title:      true,
        genre:      true,
        synopsis:   true,
        coverUrl:   true,
        authorName: true,
        platform:   true,
        platformLink: true,
        createdAt:  true,
        user: { select: { id: true, username: true, avatar: true } },
        _count: { select: { likes: true } },
      },
    }),
  ]);

  return { critiquers, sprinters, practiceWriters, newest, publications };
}

module.exports = {
  getTopCritiquers,
  getTopSprinters,
  getTopPracticeWriters,
  getNewestMembers,
  searchMembers,
  getHomepageLeaderboards,
  getMembersPageData,
};