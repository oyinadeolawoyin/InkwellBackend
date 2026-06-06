// src/services/leaderboardService.js
const prisma = require("../config/prismaClient");

const LIMIT      = 5;   // always top 5 shown
const FETCH_EXTRA = 20; // overfetch so deleted accounts don't leave gaps

// ─── Shared helper ────────────────────────────────────────────────────────────
// Takes raw groupBy rows and a map of active users; filters out deleted/missing
// users and re-ranks the survivors, returning exactly LIMIT entries (or fewer).
function buildRanked(raw, userMap, idKey, countKey) {
  const results = [];
  for (const r of raw) {
    const user = userMap[r[idKey]];
    if (!user) continue; // deleted or soft-deleted — skip entirely
    results.push({ user, count: r._count.id });
    if (results.length === LIMIT) break;
  }
  return results.map((r, i) => ({ rank: i + 1, user: r.user, count: r.count }));
}

// ─── ALL-TIME BEST CRITIQUERS ─────────────────────────────────────────────────
async function getTopCritiquers() {
  const raw = await prisma.feedbackResponse.groupBy({
    by: ["criticId"],
    where: { criticId: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: FETCH_EXTRA,
  });

  if (raw.length === 0) return [];

  const userIds = raw.map((r) => r.criticId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, isDeleted: false },
    select: { id: true, username: true, avatar: true, feedbackPoints: { select: { reputation: true } } },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return buildRanked(raw, userMap, "criticId", "id").map((r) => ({
    rank:          r.rank,
    critiqueCount: r.count,
    user:          r.user,
  }));
}

// ─── ALL-TIME BEST SPRINTERS ──────────────────────────────────────────────────
async function getTopSprinters() {
  const raw = await prisma.sprint.groupBy({
    by: ["userId"],
    where: { isActive: false },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: FETCH_EXTRA,
  });

  if (raw.length === 0) return [];

  const userIds = raw.map((r) => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, isDeleted: false },
    select: { id: true, username: true, avatar: true, feedbackPoints: { select: { reputation: true } } },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return buildRanked(raw, userMap, "userId", "id").map((r) => ({
    rank:        r.rank,
    sprintCount: r.count,
    user:        r.user,
  }));
}

// ─── ALL-TIME BEST DAILY EMOTION CUE PRACTICE ────────────────────────────────
async function getTopPracticeWriters() {
  const raw = await prisma.emotionComment.groupBy({
    by: ["authorId"],
    where: { authorId: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: FETCH_EXTRA,
  });

  if (raw.length === 0) return [];

  const userIds = raw.map((r) => r.authorId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, isDeleted: false },
    select: { id: true, username: true, avatar: true, feedbackPoints: { select: { reputation: true } } },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return buildRanked(raw, userMap, "authorId", "id").map((r) => ({
    rank:          r.rank,
    practiceCount: r.count,
    user:          r.user,
  }));
}

// ─── NEWEST MEMBERS ───────────────────────────────────────────────────────────
async function getNewestMembers() {
  const users = await prisma.user.findMany({
    where:   { isDeleted: false },
    orderBy: { createdAt: "desc" },
    take:    8,
    select: {
      id:        true,
      username:  true,
      avatar:    true,
      createdAt: true,
      bio:       true,
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
async function getMembersPageData() {
  const [critiquers, sprinters, practiceWriters, newest, publications] = await Promise.all([
    getTopCritiquers(),
    getTopSprinters(),
    getTopPracticeWriters(),
    getNewestMembers(),
    prisma.discoveryStory.findMany({
      where:   { isApproved: true },
      orderBy: { createdAt: "desc" },
      take:    6,
      select: {
        id:           true,
        title:        true,
        genre:        true,
        synopsis:     true,
        coverUrl:     true,
        authorName:   true,
        platform:     true,
        platformLink: true,
        createdAt:    true,
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