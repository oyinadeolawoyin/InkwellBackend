// src/services/challengeService.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const STREAK_MISS_THRESHOLD  = 3;    // consecutive missed days before streak resets
const RECENT_JOINERS_LIMIT   = 5;
const STREAK_LEADERS_LIMIT   = 5;
const TODAY_COMPLETIONS_LIMIT = 20;

const VALID_GOAL_TYPES = ["WORDS", "CHAPTERS", "SCENES", "DURATION"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function toUtcMidnight(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const writerSelect = { id: true, username: true, avatar: true };

// ─── JOIN ─────────────────────────────────────────────────────────────────────

async function joinChallenge(userId, body) {
  const { goalValue, goalType, remindersEnabled = true } = body;

  if (!goalValue || !Number.isInteger(Number(goalValue)) || goalValue < 1)
    throw new Error("goalValue must be a positive whole number");
  if (!VALID_GOAL_TYPES.includes(goalType))
    throw new Error("goalType must be WORDS, CHAPTERS, SCENES, or DURATION");

  // Enforce one active participation at a time
  const existing = await prisma.challengeParticipation.findFirst({
    where: { userId, isActive: true },
  });
  if (existing) throw new Error("You are already participating in the daily challenge");

  // Carry over longest streak from User record
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { challengeLongestStreak: true },
  });

  const participation = await prisma.challengeParticipation.create({
    data: {
      userId,
      goalValue:       Number(goalValue),
      goalType,
      remindersEnabled,
      longestStreak:   user.challengeLongestStreak,  // start with their all-time best
    },
    include: { user: { select: writerSelect } },
  });

  return participation;
}

// ─── LEAVE ────────────────────────────────────────────────────────────────────

async function leaveChallenge(userId) {
  const participation = await prisma.challengeParticipation.findFirst({
    where: { userId, isActive: true },
  });
  if (!participation) throw new Error("You are not currently participating in the daily challenge");

  // Before leaving, persist longest streak to User
  if (participation.longestStreak > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        challengeLongestStreak: {
          set: participation.longestStreak,  // service already guarantees this is the max
        },
      },
    });
  }

  await prisma.challengeParticipation.update({
    where: { id: participation.id },
    data:  { isActive: false },
  });

  return {
    message:       "You have left the daily challenge. Your longest streak has been saved.",
    currentStreak: participation.currentStreak,
    longestStreak: participation.longestStreak,
  };
}

// ─── DAILY CHECK-IN ───────────────────────────────────────────────────────────
//
// mode = "replace"  → set today's count to countLogged (default)
// mode = "add"      → add countLogged on top of today's existing total
// mode = "subtract" → subtract countLogged from today's total (floor 0)

async function checkIn(userId, body) {
  const { countLogged, mode = "replace" } = body;

  if (countLogged == null || countLogged < 0)
    throw new Error("countLogged must be a non-negative number");
  if (!["add", "replace", "subtract"].includes(mode))
    throw new Error("mode must be add, replace, or subtract");

  const participation = await prisma.challengeParticipation.findFirst({
    where: { userId, isActive: true },
  });
  if (!participation) throw new Error("You are not currently participating in the daily challenge");

  const today = toUtcMidnight();

  const existing = await prisma.challengeCheckIn.findUnique({
    where: {
      participationId_checkInDate: {
        participationId: participation.id,
        checkInDate:     today,
      },
    },
  });

  let finalCount;
  if (mode === "add") {
    finalCount = (existing?.countLogged ?? 0) + countLogged;
  } else if (mode === "subtract") {
    finalCount = Math.max(0, (existing?.countLogged ?? 0) - countLogged);
  } else {
    finalCount = countLogged;
  }

  const metGoal = finalCount >= participation.goalValue;

  const checkInRecord = await prisma.challengeCheckIn.upsert({
    where: {
      participationId_checkInDate: {
        participationId: participation.id,
        checkInDate:     today,
      },
    },
    create: {
      participationId: participation.id,
      userId,
      checkInDate:  today,
      countLogged:  finalCount,
      metDailyGoal: metGoal,
    },
    update: {
      countLogged:  finalCount,
      metDailyGoal: metGoal,
    },
  });

  // ── Recompute streaks from full check-in history ──────────────────────────
  const allCheckIns = await prisma.challengeCheckIn.findMany({
    where:   { participationId: participation.id },
    orderBy: { checkInDate: "asc" },
  });

  const metDates = allCheckIns
    .filter((c) => c.metDailyGoal)
    .map((c)    => toUtcMidnight(c.checkInDate).getTime())
    .sort((a, b) => a - b);

  // Walk forward to find longest streak
  let longestStreak = participation.longestStreak;
  let runStreak     = 0;
  for (let i = 0; i < metDates.length; i++) {
    if (i === 0) {
      runStreak = 1;
    } else {
      const dayDiff = (metDates[i] - metDates[i - 1]) / (1000 * 60 * 60 * 24);
      runStreak     = dayDiff === 1 ? runStreak + 1 : 1;
    }
    if (runStreak > longestStreak) longestStreak = runStreak;
  }

  // Walk backward from today to find current streak
  let currentStreak = 0;
  const todayTime   = today.getTime();
  for (let i = metDates.length - 1; i >= 0; i--) {
    const expected = todayTime - currentStreak * 24 * 60 * 60 * 1000;
    if (metDates[i] === expected) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Count consecutive missed days from the most recent check-in backwards
  let missedDaysInRow = 0;
  const sortedAll = [...allCheckIns].sort(
    (a, b) => new Date(b.checkInDate) - new Date(a.checkInDate)
  );
  for (const c of sortedAll) {
    if (!c.metDailyGoal) { missedDaysInRow++; } else { break; }
  }

  // 3 consecutive misses resets current streak
  if (missedDaysInRow >= STREAK_MISS_THRESHOLD) currentStreak = 0;

  // If longest streak improved, update User record too
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { challengeLongestStreak: true },
  });
  const newUserLongest = Math.max(user.challengeLongestStreak, longestStreak);

  await Promise.all([
    prisma.challengeParticipation.update({
      where: { id: participation.id },
      data: {
        currentStreak,
        longestStreak,
        missedDaysInRow,
        lastCheckInDate: today,
      },
    }),
    ...(newUserLongest > user.challengeLongestStreak
      ? [prisma.user.update({
          where: { id: userId },
          data:  { challengeLongestStreak: newUserLongest },
        })]
      : []),
  ]);

  // Running totals across all check-ins for this participation
  const totalLogged = allCheckIns.reduce((sum, c) => sum + c.countLogged, 0);

  return {
    checkIn:        checkInRecord,
    finalCount,
    todayPrevious:  existing?.countLogged ?? 0,
    mode,
    metGoal,
    totalLogged,        // cumulative for this participation
    goalValue:      participation.goalValue,
    goalType:       participation.goalType,
    currentStreak,
    longestStreak,
    missedDaysInRow,
  };
}

// ─── UPDATE GOAL ─────────────────────────────────────────────────────────────

async function updateGoal(userId, body) {
  const { goalValue, goalType } = body;

  if (goalValue !== undefined) {
    if (!Number.isInteger(Number(goalValue)) || goalValue < 1)
      throw new Error("goalValue must be a positive whole number");
  }
  if (goalType !== undefined && !VALID_GOAL_TYPES.includes(goalType)) {
    throw new Error("goalType must be WORDS, CHAPTERS, SCENES, or DURATION");
  }

  const participation = await prisma.challengeParticipation.findFirst({
    where: { userId, isActive: true },
  });
  if (!participation) throw new Error("You are not currently participating in the daily challenge");

  const updated = await prisma.challengeParticipation.update({
    where: { id: participation.id },
    data: {
      ...(goalValue !== undefined && { goalValue: Number(goalValue) }),
      ...(goalType  !== undefined && { goalType }),
    },
  });

  return updated;
}

// ─── MY PARTICIPATION ────────────────────────────────────────────────────────

async function getMyParticipation(userId) {
  const participation = await prisma.challengeParticipation.findFirst({
    where:   { userId, isActive: true },
    include: {
      checkIns: { orderBy: { checkInDate: "desc" }, take: 30 },
      user:     { select: { ...writerSelect, challengeLongestStreak: true } },
    },
  });
  if (!participation) throw new Error("You are not currently participating in the daily challenge");

  const totalLogged = participation.checkIns.reduce((sum, c) => sum + c.countLogged, 0);

  return { ...participation, totalLogged };
}

// ─── STATS: RECENTLY JOINED, STREAK LEADERS, TODAY'S COMPLETIONS ─────────────

async function getChallengeStats() {
  const today = toUtcMidnight();

  const [recentJoiners, streakLeaders, todayCompletions, totalActive] = await Promise.all([

    // 5 writers who joined most recently
    prisma.challengeParticipation.findMany({
      where:   { isActive: true },
      orderBy: { joinedAt: "desc" },
      take:    RECENT_JOINERS_LIMIT,
      select: {
        joinedAt:  true,
        goalValue: true,
        goalType:  true,
        user:      { select: writerSelect },
      },
    }),

    // Top 5 by current streak
    prisma.challengeParticipation.findMany({
      where:   { isActive: true },
      orderBy: { currentStreak: "desc" },
      take:    STREAK_LEADERS_LIMIT,
      select: {
        currentStreak: true,
        longestStreak: true,
        goalType:      true,
        user:          { select: { ...writerSelect, challengeLongestStreak: true } },
      },
    }),

    // Writers who logged today's goal — most recent first
    prisma.challengeCheckIn.findMany({
      where: {
        checkInDate:  today,
        metDailyGoal: true,
      },
      orderBy: { createdAt: "desc" },
      take:    TODAY_COMPLETIONS_LIMIT,
      select: {
        countLogged: true,
        createdAt:   true,
        participation: {
          select: {
            goalType: true,
            user:     { select: writerSelect },
          },
        },
      },
    }),

    // Total active participants
    prisma.challengeParticipation.count({ where: { isActive: true } }),
  ]);

  // Count how many hit goal today (total, not capped)
  const todayGoalCount = await prisma.challengeCheckIn.count({
    where: { checkInDate: today, metDailyGoal: true },
  });

  return {
    totalActive,
    todayGoalCount,      // number of writers who completed their goal today
    recentJoiners,
    streakLeaders,
    todayCompletions,    // the list with their logged counts
  };
}

// ─── REMINDER TOGGLE ─────────────────────────────────────────────────────────

async function toggleReminders(userId, enabled) {
  const participation = await prisma.challengeParticipation.findFirst({
    where: { userId, isActive: true },
  });
  if (!participation) throw new Error("You are not currently participating in the daily challenge");

  await prisma.challengeParticipation.update({
    where: { id: participation.id },
    data:  { remindersEnabled: enabled },
  });

  return { remindersEnabled: enabled };
}

// ─── CRON HELPER — called nightly to process missed days ─────────────────────
//
// Run this once per day (e.g. 00:05 UTC) after midnight rolls over.
// It finds all active participations where the writer didn't log yesterday,
// increments missedDaysInRow, and resets currentStreak if threshold is hit.

async function processMissedDays() {
  const yesterday = toUtcMidnight();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  // Find active participations that have NO check-in for yesterday
  const activeParticipations = await prisma.challengeParticipation.findMany({
    where: { isActive: true },
    select: {
      id:             true,
      userId:         true,
      currentStreak:  true,
      missedDaysInRow: true,
      checkIns: {
        where: { checkInDate: yesterday },
        select: { metDailyGoal: true },
      },
    },
  });

  const updates = [];
  for (const p of activeParticipations) {
    const metYesterday = p.checkIns.some((c) => c.metDailyGoal);
    if (!metYesterday) {
      const newMissed = p.missedDaysInRow + 1;
      const newStreak = newMissed >= STREAK_MISS_THRESHOLD ? 0 : p.currentStreak;
      updates.push(
        prisma.challengeParticipation.update({
          where: { id: p.id },
          data:  { missedDaysInRow: newMissed, currentStreak: newStreak },
        })
      );
    }
  }

  if (updates.length > 0) await Promise.all(updates);
  return { processed: activeParticipations.length, missedUpdates: updates.length };
}

// ─── HELPER: get all participants with reminders on (for cron) ────────────────

async function getParticipantsForReminder() {
  return prisma.challengeParticipation.findMany({
    where:   { isActive: true, remindersEnabled: true },
    include: { user: { select: { id: true, username: true, email: true } } },
  });
}

module.exports = {
  joinChallenge,
  leaveChallenge,
  checkIn,
  updateGoal,
  getMyParticipation,
  getChallengeStats,
  toggleReminders,
  processMissedDays,
  getParticipantsForReminder,
  STREAK_MISS_THRESHOLD,
};