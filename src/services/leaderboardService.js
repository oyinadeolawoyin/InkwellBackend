// src/services/leaderboardService.js
const prisma = require("../config/prismaClient");

const LIMIT       = 5;
const FETCH_EXTRA = 20; // overfetch so deleted accounts don't leave gaps

// ─── Shared helper ────────────────────────────────────────────────────────────
function buildRanked(raw, userMap, idKey) {
  const results = [];
  for (const r of raw) {
    const user = userMap[r[idKey]];
    if (!user) continue;
    results.push({ user, count: r._count.id });
    if (results.length === LIMIT) break;
  }
  return results.map((r, i) => ({ rank: i + 1, user: r.user, count: r.count }));
}

// Returns the start/end of "yesterday" in UTC
function yesterdayRange() {
  const now   = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const end   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return { start, end };
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
  const users   = await prisma.user.findMany({
    where:  { id: { in: userIds }, isDeleted: false },
    select: { id: true, username: true, avatar: true, feedbackPoints: { select: { reputation: true } } },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return buildRanked(raw, userMap, "criticId").map((r) => ({
    rank: r.rank, critiqueCount: r.count, user: r.user,
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
  const users   = await prisma.user.findMany({
    where:  { id: { in: userIds }, isDeleted: false },
    select: { id: true, username: true, avatar: true, feedbackPoints: { select: { reputation: true } } },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return buildRanked(raw, userMap, "userId").map((r) => ({
    rank: r.rank, sprintCount: r.count, user: r.user,
  }));
}

// ─── ALL-TIME BEST DRAFT WRITERS (total words logged) ────────────────────────
// Groups DraftProgressLog by userId and sums the words/chapters/scenes logged.
// We rank by total countLogged across all their plans.
async function getTopDraftWriters() {
  const raw = await prisma.draftProgressLog.groupBy({
    by: ["userId"],
    _sum:     { countLogged: true },
    orderBy:  { _sum: { countLogged: "desc" } },
    take:     FETCH_EXTRA,
  });
  if (raw.length === 0) return [];

  const userIds = raw.map((r) => r.userId);
  const users   = await prisma.user.findMany({
    where:  { id: { in: userIds }, isDeleted: false },
    select: { id: true, username: true, avatar: true, feedbackPoints: { select: { reputation: true } } },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const results = [];
  for (const r of raw) {
    const user = userMap[r.userId];
    if (!user) continue;
    results.push({ user, wordCount: r._sum.countLogged ?? 0 });
    if (results.length === LIMIT) break;
  }
  return results.map((r, i) => ({ rank: i + 1, user: r.user, wordCount: r.wordCount }));
}

// ─── YESTERDAY: CRITIQUERS ────────────────────────────────────────────────────
async function getYesterdayCritiquers() {
  const { start, end } = yesterdayRange();
  const raw = await prisma.feedbackResponse.groupBy({
    by: ["criticId"],
    where: { criticId: { not: null }, createdAt: { gte: start, lt: end } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: FETCH_EXTRA,
  });
  if (raw.length === 0) return [];

  const userIds = raw.map((r) => r.criticId);
  const users   = await prisma.user.findMany({
    where:  { id: { in: userIds }, isDeleted: false },
    select: { id: true, username: true, avatar: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const results = [];
  for (const r of raw) {
    const user = userMap[r.criticId];
    if (!user) continue;
    results.push({ user, critiqueCount: r._count.id });
    if (results.length === LIMIT) break;
  }
  return results;
}

// ─── YESTERDAY: SPRINTERS ─────────────────────────────────────────────────────
async function getYesterdaySprinters() {
  const { start, end } = yesterdayRange();
  const raw = await prisma.sprint.groupBy({
    by: ["userId"],
    where: { isActive: false, completedAt: { gte: start, lt: end } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: FETCH_EXTRA,
  });
  if (raw.length === 0) return [];

  const userIds = raw.map((r) => r.userId);
  const users   = await prisma.user.findMany({
    where:  { id: { in: userIds }, isDeleted: false },
    select: { id: true, username: true, avatar: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const results = [];
  for (const r of raw) {
    const user = userMap[r.userId];
    if (!user) continue;
    results.push({ user, sprintCount: r._count.id });
    if (results.length === LIMIT) break;
  }
  return results;
}

// ─── YESTERDAY: DRAFT WRITERS ─────────────────────────────────────────────────
async function getYesterdayDraftWriters() {
  const { start, end } = yesterdayRange();
  const raw = await prisma.draftProgressLog.groupBy({
    by: ["userId"],
    where: {
      logDate: { gte: start, lt: end },
    },
    _sum:    { countLogged: true },
    orderBy: { _sum: { countLogged: "desc" } },
    take:    FETCH_EXTRA,
  });
  if (raw.length === 0) return [];

  const userIds = raw.map((r) => r.userId);
  const users   = await prisma.user.findMany({
    where:  { id: { in: userIds }, isDeleted: false },
    select: {
      id: true, username: true, avatar: true,
      draftPlan: { select: { goalType: true } },
    },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const results = [];
  for (const r of raw) {
    const user = userMap[r.userId];
    if (!user) continue;
    const goalType = user.draftPlan?.goalType ?? "WORDS";
    const { draftPlan, ...userWithoutPlan } = user;
    results.push({ user: userWithoutPlan, countLogged: r._sum.countLogged ?? 0, goalType });
    if (results.length === LIMIT) break;
  }
  return results;
}

// ─── NEWEST MEMBERS (joined in last 2 days) ───────────────────────────────────
// Returns an empty array when no one has joined in the last 48 hours —
// the frontend should hide the section entirely in that case.
async function getNewestMembers() {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const users = await prisma.user.findMany({
    where:   { isDeleted: false, createdAt: { gte: twoDaysAgo } },
    orderBy: { createdAt: "desc" },
    take:    8,
    select:  {
      id: true, username: true, avatar: true, createdAt: true, bio: true,
      feedbackPoints: { select: { reputation: true } },
    },
  });
  return users.map((u, i) => ({
    rank:     i + 1,
    user:     u,
    joinedAt: u.createdAt,
  }));
}

// ─── TODAY: MEMBERS WHO COMMENTED ON THREADS ─────────────────────────────────
// Returns users who created a thread, posted a comment, or wrote a reply today.
// Each entry exposes threadCount, commentCount, and postCount (total) so the
// frontend can render the breakdown: "2 posts · 3 comments", "1 post", etc.
// Returns [] if nobody has done so yet — frontend should hide the section.
async function getTodayThreadCommenters() {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const [threadRaw, commentRaw, replyRaw] = await Promise.all([
    // threads started today
    prisma.thread.groupBy({
      by: ["authorId"],
      where: { createdAt: { gte: startOfToday } },
      _count: { id: true },
    }),
    // comments posted today
    prisma.threadComment.groupBy({
      by: ["authorId"],
      where: { authorId: { not: null }, createdAt: { gte: startOfToday } },
      _count: { id: true },
    }),
    // replies posted today
    prisma.threadReply.groupBy({
      by: ["authorId"],
      where: { authorId: { not: null }, createdAt: { gte: startOfToday } },
      _count: { id: true },
    }),
  ]);

  // Accumulate per-user breakdowns
  const threadCounts  = {};
  const commentCounts = {};

  for (const r of threadRaw)  threadCounts[r.authorId]  = (threadCounts[r.authorId]  ?? 0) + r._count.id;
  for (const r of commentRaw) commentCounts[r.authorId] = (commentCounts[r.authorId] ?? 0) + r._count.id;
  for (const r of replyRaw)   commentCounts[r.authorId] = (commentCounts[r.authorId] ?? 0) + r._count.id;

  // Union of all user ids
  const allIds = new Set([
    ...Object.keys(threadCounts),
    ...Object.keys(commentCounts),
  ]);

  // Sort by total activity descending
  const sorted = [...allIds]
    .map((id) => ({
      id:           Number(id),
      threadCount:  threadCounts[id]  ?? 0,
      commentCount: commentCounts[id] ?? 0,
      postCount:    (threadCounts[id] ?? 0) + (commentCounts[id] ?? 0),
    }))
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, 8);

  if (sorted.length === 0) return [];

  const userIds = sorted.map((r) => r.id);
  const users   = await prisma.user.findMany({
    where:  { id: { in: userIds }, isDeleted: false },
    select: { id: true, username: true, avatar: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const results = [];
  for (const { id, threadCount, commentCount, postCount } of sorted) {
    const user = userMap[id];
    if (!user) continue;
    results.push({ user, threadCount, commentCount, postCount });
  }
  return results;
}

// ─── TODAY: MEMBERS WHO SPRINTED ─────────────────────────────────────────────
// Returns users who completed (or started) a sprint today (UTC).
// Returns [] if nobody has sprinted yet today — frontend should hide the section.
async function getTodaySprinters() {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const raw = await prisma.sprint.groupBy({
    by: ["userId"],
    where: { startedAt: { gte: startOfToday } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: FETCH_EXTRA,
  });

  if (raw.length === 0) return [];

  const userIds = raw.map((r) => r.userId);
  const users   = await prisma.user.findMany({
    where:  { id: { in: userIds }, isDeleted: false },
    select: { id: true, username: true, avatar: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const results = [];
  for (const r of raw) {
    const user = userMap[r.userId];
    if (!user) continue;
    results.push({ user, sprintCount: r._count.id });
    if (results.length === 8) break;
  }
  return results;
}

// ─── TODAY: MEMBERS WHO CRITIQUED ────────────────────────────────────────────
// Returns users who submitted a FeedbackResponse today (UTC).
// Returns [] if nobody has critiqued yet today — frontend should hide the section.
async function getTodayCritiquers() {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const raw = await prisma.feedbackResponse.groupBy({
    by: ["criticId"],
    where: { criticId: { not: null }, createdAt: { gte: startOfToday } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: FETCH_EXTRA,
  });

  if (raw.length === 0) return [];

  const userIds = raw.map((r) => r.criticId);
  const users   = await prisma.user.findMany({
    where:  { id: { in: userIds }, isDeleted: false },
    select: { id: true, username: true, avatar: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const results = [];
  for (const r of raw) {
    const user = userMap[r.criticId];
    if (!user) continue;
    results.push({ user, critiqueCount: r._count.id });
    if (results.length === 8) break;
  }
  return results;
}

// ─── TOP THREAD CONTRIBUTORS ──────────────────────────────────────────────────
// Counts thread posts (threads created + comments + replies) per user, all-time.
async function getTopThreaders() {
  const [threadRaw, commentRaw, replyRaw] = await Promise.all([
    prisma.thread.groupBy({
      by: ["authorId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: FETCH_EXTRA * 2,
    }),
    prisma.threadComment.groupBy({
      by: ["authorId"],
      where: { authorId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: FETCH_EXTRA * 2,
    }),
    prisma.threadReply.groupBy({
      by: ["authorId"],
      where: { authorId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: FETCH_EXTRA * 2,
    }),
  ]);

  // Merge counts by userId
  const totals = {};
  for (const r of threadRaw)  totals[r.authorId] = (totals[r.authorId] ?? 0) + r._count.id;
  for (const r of commentRaw) totals[r.authorId] = (totals[r.authorId] ?? 0) + r._count.id;
  for (const r of replyRaw)   totals[r.authorId] = (totals[r.authorId] ?? 0) + r._count.id;

  const sorted = Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, FETCH_EXTRA);

  if (sorted.length === 0) return [];

  const userIds = sorted.map(([id]) => Number(id));
  const users   = await prisma.user.findMany({
    where:  { id: { in: userIds }, isDeleted: false },
    select: { id: true, username: true, avatar: true, feedbackPoints: { select: { reputation: true } } },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const results = [];
  for (const [id, postCount] of sorted) {
    const user = userMap[Number(id)];
    if (!user) continue;
    results.push({ user, postCount });
    if (results.length === LIMIT) break;
  }
  return results;
}

// ─── USER SEARCH ──────────────────────────────────────────────────────────────
async function searchMembers(query) {
  if (!query || query.trim().length < 1) return [];
  const users = await prisma.user.findMany({
    where: {
      isDeleted: false,
      username:  { contains: query.trim(), mode: "insensitive" },
    },
    take:    10,
    orderBy: { username: "asc" },
    select:  {
      id: true, username: true, avatar: true, createdAt: true, bio: true,
      feedbackPoints: { select: { reputation: true } },
    },
  });
  return users.map((u) => ({
    user:       u,
    reputation: u.feedbackPoints?.reputation ?? 5,
  }));
}

// ─── COMBINED: HOMEPAGE ───────────────────────────────────────────────────────
async function getHomepageLeaderboards() {
  const [critiquers, sprinters, practiceWriters] = await Promise.all([
    getTopCritiquers(),
    getTopSprinters(),
    // keep practice writers for homepage if still used elsewhere
    (async () => [])(),
  ]);
  return { critiquers, sprinters, practiceWriters };
}

// ─── COMBINED: MEMBERS PAGE ───────────────────────────────────────────────────
async function getMembersPageData() {
  const [
    critiquers,
    sprinters,
    draftWriters,
    yesterdayCritiquers,
    yesterdaySprinters,
    yesterdayDraftWriters,
    newest,
    topThreaders,
    todayThreadCommenters,
    todaySprinters,
    todayCritiquers,
  ] = await Promise.all([
    getTopCritiquers(),
    getTopSprinters(),
    getTopDraftWriters(),
    getYesterdayCritiquers(),
    getYesterdaySprinters(),
    getYesterdayDraftWriters(),
    getNewestMembers(),
    getTopThreaders(),
    getTodayThreadCommenters(),
    getTodaySprinters(),
    getTodayCritiquers(),
  ]);

  // recentActivity sections: each key is only included when non-empty.
  // The frontend should hide any section whose array is empty ([]).
  const recentActivity = {
    ...(todayThreadCommenters.length > 0 && { threadCommenters: todayThreadCommenters }),
    ...(todaySprinters.length       > 0 && { sprinters:        todaySprinters }),
    ...(todayCritiquers.length      > 0 && { critiquers:       todayCritiquers }),
  };

  return {
    critiquers,
    sprinters,
    draftWriters,
    yesterdayCritiquers,
    yesterdaySprinters,
    yesterdayDraftWriters,
    newest,
    topThreaders,
    recentActivity,
  };
}

// ─── TODAY: MEMBERS WHO LOGGED DRAFT PROGRESS ────────────────────────────────
// Returns users who created a DraftProgressLog entry today (UTC).
// Returns [] if nobody has logged yet — frontend should hide the section.
async function getTodayProgressLoggers() {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const raw = await prisma.draftProgressLog.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: startOfToday } },
    _sum: { countLogged: true },
    orderBy: { _sum: { countLogged: "desc" } },
    take: 8,
  });

  if (raw.length === 0) return [];

  const userIds = raw.map((r) => r.userId);
  const users   = await prisma.user.findMany({
    where:  { id: { in: userIds }, isDeleted: false },
    select: {
      id: true, username: true, avatar: true,
      draftPlan: { select: { goalType: true } },
    },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const results = [];
  for (const r of raw) {
    const user = userMap[r.userId];
    if (!user) continue;
    const goalType = user.draftPlan?.goalType ?? "WORDS";
    const { draftPlan, ...userWithoutPlan } = user;
    results.push({
      user: userWithoutPlan,
      countLogged: r._sum.countLogged ?? 0,
      goalType,
    });
  }
  return results;
}

// ─── HOMEPAGE RECENT ACTIVITY ────────────────────────────────────────────────
// Thread commenters = today only.
// Sprinters + Critiquers = last 2 days (today + yesterday), deduped by user.
// Each key is only present when non-empty — frontend hides absent sections.
async function getHomepageRecentActivity() {
  const [
    todayCommenters,
    todaySprinters,
    yesterdaySprinters,
    todayCritiquers,
    yesterdayCritiquers,
    progressLoggers,
  ] = await Promise.all([
    getTodayThreadCommenters(),
    getTodaySprinters(),
    getYesterdaySprinters(),
    getTodayCritiquers(),
    getYesterdayCritiquers(),
    getTodayProgressLoggers(),
  ]);

  // Merge today + yesterday for sprinters, dedup by user id, sum counts
  const sprintersMap = {};
  for (const e of [...todaySprinters, ...yesterdaySprinters]) {
    if (!sprintersMap[e.user.id]) sprintersMap[e.user.id] = { ...e };
    else sprintersMap[e.user.id].sprintCount += (e.sprintCount ?? 0);
  }
  const sprinters = Object.values(sprintersMap).slice(0, 8);

  // Merge today + yesterday for critiquers, dedup by user id, sum counts
  const critiquersMap = {};
  for (const e of [...todayCritiquers, ...yesterdayCritiquers]) {
    if (!critiquersMap[e.user.id]) critiquersMap[e.user.id] = { ...e };
    else critiquersMap[e.user.id].critiqueCount += (e.critiqueCount ?? 0);
  }
  const critiquers = Object.values(critiquersMap).slice(0, 8);

  return {
    ...(progressLoggers.length  > 0 && { progressLoggers }),
    ...(todayCommenters.length  > 0 && { threadCommenters: todayCommenters }),
    ...(sprinters.length        > 0 && { sprinters }),
    ...(critiquers.length       > 0 && { critiquers }),
  };
}

module.exports = {
  getTopCritiquers,
  getTopSprinters,
  getTopDraftWriters,
  getYesterdayCritiquers,
  getYesterdaySprinters,
  getYesterdayDraftWriters,
  getNewestMembers,
  getTodayThreadCommenters,
  getTodaySprinters,
  getTodayCritiquers,
  getTodayProgressLoggers,
  getTopThreaders,
  searchMembers,
  getHomepageLeaderboards,
  getHomepageRecentActivity,
  getMembersPageData,
};