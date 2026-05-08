const prisma = require("../config/prismaClient");

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Returns midnight UTC for today as a Date object.
function startOfToday() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Converts any date to its UTC midnight (calendar-day key).
function toUTCDay(date) {
    const d = new Date(date);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// Generic daily target calculator — works for words, chapters, scenes.
function calculateDailyTarget(target, current, deadline, daysPerWeek) {
    const remaining = target - current;
    if (remaining <= 0) return 0;

    const today = new Date();
    const deadlineDate = new Date(deadline);
    const daysLeft = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
    const weeksLeft = daysLeft / 7;
    const sessionsLeft = Math.floor(weeksLeft * daysPerWeek);

    if (sessionsLeft <= 0) return remaining;
    return Math.ceil(remaining / sessionsLeft);
}

// ─────────────────────────────────────────────────────────────────────────────
// STREAK HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Returns the new streak value based on lastLogDate and whether today is already logged.
// Rules:
//   - lastLogDate is null → streak becomes 1 (first ever log)
//   - lastLogDate is yesterday → streak increments (uses DB value, even if cron zeroed it)
//   - lastLogDate is today → no change (already logged today)
//   - lastLogDate is older → missed a day, reset to 1
function computeNewStreak(currentStreak, lastLogDate) {
    const today = toUTCDay(new Date());

    if (!lastLogDate) return 1;

    const last = toUTCDay(lastLogDate);
    const diffDays = Math.round((today - last) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return currentStreak === 0 ? 1 : currentStreak; // cron may have zeroed it mid-day but user is logging today
    if (diffDays === 1) return currentStreak + 1;                        // yesterday → keep the chain going
    return 1;                                                             // missed one or more days → reset
}

// Returns true if a day was missed (streak needs to reset to 0 externally if needed).
// Used by the breaker job — not called during logDay.
function didMissDay(lastLogDate) {
    if (!lastLogDate) return false;
    const today = toUTCDay(new Date());
    const last  = toUTCDay(lastLogDate);
    const diffDays = Math.round((today - last) / (1000 * 60 * 60 * 24));
    return diffDays > 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT CRUD
// ─────────────────────────────────────────────────────────────────────────────

async function fetchProjects(userId) {
    return prisma.project.findMany({
        where: { userId }
    });
}

async function createProject(
    userId, title, description, link, genre, visibility,
    targetWordCount, deadline, daysPerWeek,
    targetChapters, targetScenes, sessionGoalType, sessionGoalCount,
    phase, consecutiveDaysTarget
) {
    return prisma.project.create({
        data: {
            userId,
            title,
            description,
            link,
            genre,
            visibility:           visibility ?? "PRIVATE",
            phase:                phase ?? "DRAFTING",
            targetWordCount:      targetWordCount      ? Number(targetWordCount)      : null,
            deadline:             deadline             ? new Date(deadline)           : null,
            daysPerWeek:          daysPerWeek          ? Number(daysPerWeek)          : 5,
            targetChapters:       targetChapters       ? Number(targetChapters)       : null,
            targetScenes:         targetScenes         ? Number(targetScenes)         : null,
            sessionGoalType:      sessionGoalType      ?? null,
            sessionGoalCount:     sessionGoalCount     ? Number(sessionGoalCount)     : null,
            consecutiveDaysTarget: consecutiveDaysTarget ? Number(consecutiveDaysTarget) : null,
        }
    });
}

async function updateProject(
    projectId, userId, title, description, link, genre, visibility,
    targetWordCount, deadline, daysPerWeek, status,
    targetChapters, targetScenes, sessionGoalType, sessionGoalCount,
    phase, consecutiveDaysTarget
) {
    const existing = await prisma.project.findUnique({
        where: { id: projectId },
        include: { eventEntries: { where: { disqualified: false }, select: { id: true } } }
    });
    if (!existing)               throw new Error("PROJECT_NOT_FOUND");
    if (existing.userId !== userId) throw new Error("UNAUTHORIZED");

    // Projects enrolled in an active challenge are locked to PUBLIC
    const hasActiveEntry = existing.eventEntries.length > 0;
    if (hasActiveEntry && visibility && visibility !== "PUBLIC") {
        throw new Error("VISIBILITY_LOCKED_BY_EVENT");
    }
    const effectiveVisibility = hasActiveEntry ? "PUBLIC" : visibility;

    return prisma.project.update({
        where: { id: projectId },
        data: {
            title, description, link, genre, visibility: effectiveVisibility, status,
            phase:                phase ?? existing.phase,
            targetWordCount:      targetWordCount      ? Number(targetWordCount)      : null,
            deadline:             deadline             ? new Date(deadline)           : null,
            daysPerWeek:          daysPerWeek          ? Number(daysPerWeek)          : 5,
            targetChapters:       targetChapters       ? Number(targetChapters)       : null,
            targetScenes:         targetScenes         ? Number(targetScenes)         : null,
            sessionGoalType:      sessionGoalType      ?? null,
            sessionGoalCount:     sessionGoalCount     ? Number(sessionGoalCount)     : null,
            consecutiveDaysTarget: consecutiveDaysTarget !== undefined
                ? (consecutiveDaysTarget ? Number(consecutiveDaysTarget) : null)
                : existing.consecutiveDaysTarget,
        }
    });
}

async function deleteProject(projectId, userId) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project)                throw new Error("PROJECT_NOT_FOUND");
    if (project.userId !== userId) throw new Error("UNAUTHORIZED");
    return prisma.project.delete({ where: { id: projectId } });
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW DELETE (no DB writes — warn the writer first)
// ─────────────────────────────────────────────────────────────────────────────

function previewDelete(project, field, amountToRemove) {
    const fieldMap = {
        words:    { current: "currentWordCount",  target: "targetWordCount"  },
        chapters: { current: "currentChapters",   target: "targetChapters"   },
        scenes:   { current: "currentScenes",     target: "targetScenes"     }
    };

    const map = fieldMap[field];
    if (!map) throw new Error("INVALID_FIELD");

    const currentCount = project[map.current];
    const targetCount  = project[map.target];
    const newCount     = Math.max(currentCount - amountToRemove, 0);
    const actualRemoved = currentCount - newCount;

    const currentDailyTarget = (targetCount && project.deadline && project.daysPerWeek)
        ? calculateDailyTarget(targetCount, currentCount, project.deadline, project.daysPerWeek)
        : null;

    const newDailyTarget = (targetCount && project.deadline && project.daysPerWeek)
        ? calculateDailyTarget(targetCount, newCount, project.deadline, project.daysPerWeek)
        : null;

    return {
        field,
        currentCount,
        newCount,
        actualRemoved,
        currentDailyTarget,
        newDailyTarget,
        dailyTargetIncrease: (newDailyTarget && currentDailyTarget)
            ? newDailyTarget - currentDailyTarget
            : null
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// LOG WORDS
// ─────────────────────────────────────────────────────────────────────────────

async function logWords(projectId, userId, wordsAdded) {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true }
    });
    if (!project)                throw new Error("PROJECT_NOT_FOUND");
    if (project.userId !== userId) throw new Error("UNAUTHORIZED");

    await prisma.projectWordLog.create({ data: { projectId, userId, wordsAdded } });

    return prisma.project.update({
        where: { id: projectId },
        data:  { currentWordCount: { increment: wordsAdded } }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE WORDS (confirmed)
// ─────────────────────────────────────────────────────────────────────────────

async function deleteWords(projectId, userId, wordsToRemove) {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true, currentWordCount: true }
    });
    if (!project)                throw new Error("PROJECT_NOT_FOUND");
    if (project.userId !== userId) throw new Error("UNAUTHORIZED");

    const newCount      = Math.max(project.currentWordCount - wordsToRemove, 0);
    const actualRemoved = project.currentWordCount - newCount;

    await prisma.projectWordLog.create({
        data: { projectId, userId, wordsAdded: -actualRemoved }
    });

    return prisma.project.update({
        where: { id: projectId },
        data:  { currentWordCount: newCount }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// LOG CHAPTER / SCENE
// ─────────────────────────────────────────────────────────────────────────────

async function logChapterScene(projectId, userId, chaptersAdded, scenesAdded) {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true }
    });
    if (!project)                throw new Error("PROJECT_NOT_FOUND");
    if (project.userId !== userId) throw new Error("UNAUTHORIZED");

    await prisma.projectProgressLog.create({
        data: {
            projectId, userId,
            chaptersAdded: chaptersAdded || 0,
            scenesAdded:   scenesAdded   || 0
        }
    });

    return prisma.project.update({
        where: { id: projectId },
        data: {
            currentChapters: chaptersAdded ? { increment: chaptersAdded } : undefined,
            currentScenes:   scenesAdded   ? { increment: scenesAdded }   : undefined,
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE CHAPTER / SCENE (confirmed)
// ─────────────────────────────────────────────────────────────────────────────

async function deleteChapterScene(projectId, userId, chaptersToRemove, scenesToRemove) {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true, currentChapters: true, currentScenes: true }
    });
    if (!project)                throw new Error("PROJECT_NOT_FOUND");
    if (project.userId !== userId) throw new Error("UNAUTHORIZED");

    const newChapters = Math.max(project.currentChapters - (chaptersToRemove || 0), 0);
    const newScenes   = Math.max(project.currentScenes   - (scenesToRemove   || 0), 0);

    await prisma.projectProgressLog.create({
        data: {
            projectId, userId,
            chaptersAdded: -(project.currentChapters - newChapters),
            scenesAdded:   -(project.currentScenes   - newScenes)
        }
    });

    return prisma.project.update({
        where: { id: projectId },
        data:  { currentChapters: newChapters, currentScenes: newScenes }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// LOG SESSION
// ─────────────────────────────────────────────────────────────────────────────

async function logSession(projectId, userId, { wordsWritten = 0, chaptersWritten = 0, scenesWritten = 0, minutesWritten = 0 } = {}) {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
            userId: true,
            sessionGoalType: true,
            sessionGoalCount: true,
            currentSessionCount: true,
            lastSessionReset: true
        }
    });
    if (!project)                throw new Error("PROJECT_NOT_FOUND");
    if (project.userId !== userId) throw new Error("UNAUTHORIZED");

    const now = new Date();
    let shouldReset = false;

    if (project.lastSessionReset) {
        const last = new Date(project.lastSessionReset);
        if (project.sessionGoalType === "WEEKLY") {
            const lastWeek    = getWeekNumber(last);
            const currentWeek = getWeekNumber(now);
            shouldReset = lastWeek !== currentWeek || last.getFullYear() !== now.getFullYear();
        }
        if (project.sessionGoalType === "MONTHLY") {
            shouldReset = last.getMonth() !== now.getMonth() || last.getFullYear() !== now.getFullYear();
        }
    }

    await prisma.projectSessionLog.create({
        data: {
            projectId,
            userId,
            wordsWritten:    wordsWritten    || null,
            chaptersWritten: chaptersWritten || null,
            scenesWritten:   scenesWritten   || null,
            minutesWritten:  minutesWritten  || null,
        }
    });

    return prisma.project.update({
        where: { id: projectId },
        data: {
            currentSessionCount: shouldReset ? 1 : { increment: 1 },
            lastSessionReset: shouldReset ? now : (project.lastSessionReset ?? now)
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// LOG DAY  (streak system)
// ─────────────────────────────────────────────────────────────────────────────
// At least one of wordsLogged, chaptersLogged, scenesLogged, minutesLogged > 0.
// Upserts today's ProjectDayLog, recalculates the streak on Project,
// and — if the project is enrolled in an active DAYS_CHALLENGE and the streak
// resets — disqualifies the entry and flips visibility to PRIVATE.

async function logDay(projectId, userId, { wordsLogged = 0, chaptersLogged = 0, scenesLogged = 0, minutesLogged = 0 }) {
    if (wordsLogged <= 0 && chaptersLogged <= 0 && scenesLogged <= 0 && minutesLogged <= 0) {
        throw new Error("AT_LEAST_ONE_FIELD_REQUIRED");
    }

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
            userId: true,
            currentStreak: true,
            lastLogDate: true,
            consecutiveDaysTarget: true,
            visibility: true,
            eventEntries: {
                where: { disqualified: false },
                include: { event: { select: { id: true, type: true, isActive: true, endDate: true } } }
            }
        }
    });

    if (!project)                throw new Error("PROJECT_NOT_FOUND");
    if (project.userId !== userId) throw new Error("UNAUTHORIZED");

    const today       = toUTCDay(new Date());
    const newStreak   = computeNewStreak(project.currentStreak, project.lastLogDate);
    const alreadyToday = project.lastLogDate
        ? Math.round((today - toUTCDay(project.lastLogDate)) / (1000 * 60 * 60 * 24)) === 0
        : false;

    // Upsert: create or add to today's day log.
    await prisma.projectDayLog.upsert({
        where:  { projectId_logDate: { projectId, logDate: today } },
        create: {
            projectId, userId, logDate: today,
            wordsLogged, chaptersLogged, scenesLogged, minutesLogged,
            streakAtLog: newStreak
        },
        update: {
            wordsLogged:    { increment: wordsLogged    },
            chaptersLogged: { increment: chaptersLogged },
            scenesLogged:   { increment: scenesLogged   },
            minutesLogged:  { increment: minutesLogged  },
            streakAtLog:    newStreak
        }
    });

    // Only update streak / lastLogDate on the project if today hasn't been logged yet.
    const projectUpdate = alreadyToday
        ? {}  // already logged today — totals updated above, streak unchanged
        : { currentStreak: newStreak, lastLogDate: today };

    await prisma.project.update({
        where: { id: projectId },
        data:  projectUpdate
    });

    // ── Event disqualification check ─────────────────────────────────────────
    // If this is the FIRST log of the day (not alreadyToday), a missed-day reset
    // means the writer broke their chain. We detect this in two ways:
    //   1. newStreak === 1 AND project.currentStreak > 1  → logDay caught the break first
    //   2. newStreak === 1 AND project.currentStreak === 0 → cron already zeroed it, but
    //      lastLogDate is 2+ days ago, confirming the break happened
    const cronAlreadyBroke = !alreadyToday && newStreak === 1 && project.currentStreak === 0
        && project.lastLogDate
        && Math.round((toUTCDay(new Date()) - toUTCDay(project.lastLogDate)) / (1000 * 60 * 60 * 24)) > 1;

    const streakBroken = !alreadyToday && newStreak === 1 && (project.currentStreak > 1 || cronAlreadyBroke);

    if (streakBroken) {
        const challengeEntries = project.eventEntries.filter(
            e => e.event.type === "DAYS_CHALLENGE" && e.event.isActive && new Date(e.event.endDate) > new Date()
        );

        if (challengeEntries.length > 0) {
            const now = new Date();
            // Disqualify each active challenge entry
            await prisma.projectEventEntry.updateMany({
                where: {
                    projectId,
                    eventId: { in: challengeEntries.map(e => e.event.id) },
                    disqualified: false
                },
                data: { disqualified: true, disqualifiedAt: now }
            });
            // Flip visibility to PRIVATE — removes from public event page
            await prisma.project.update({
                where: { id: projectId },
                data:  { visibility: "PRIVATE" }
            });
        }
    }

    // Return the refreshed project with its day logs
    return prisma.project.findUnique({
        where: { id: projectId },
        include: { dayLogs: { orderBy: { logDate: "desc" }, take: 30 } }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// STREAK BREAKER (called by a cron job — not by the user)
// ─────────────────────────────────────────────────────────────────────────────
// Finds all projects with a streak > 0 that haven't logged yesterday or today,
// resets their streak to 0, and disqualifies them from any active challenges.

// Alias used by the cron job
async function breakExpiredStreaks() {
    return runStreakBreaker();
}

async function runStreakBreaker() {
    // A project has broken its streak if its lastLogDate is strictly before yesterday
    // (i.e. they missed yesterday entirely). Projects that logged any time yesterday are safe.
    const yesterday = toUTCDay(new Date(Date.now() - 86400000));

    const stalledProjects = await prisma.project.findMany({
        where: {
            currentStreak: { gt: 0 },
            OR: [
                { lastLogDate: { lt: yesterday } },
                { lastLogDate: null }
            ]
        },
        select: {
            id: true,
            currentStreak: true,
            lastLogDate: true,
            visibility: true,
            eventEntries: {
                where: { disqualified: false },
                include: { event: { select: { id: true, type: true, isActive: true, endDate: true } } }
            }
        }
    });

    const now = new Date();
    for (const project of stalledProjects) {
        // Extra guard against timezone edge cases: skip if they actually logged yesterday
        if (project.lastLogDate) {
            const last = toUTCDay(project.lastLogDate);
            const diffDays = Math.round((yesterday - last) / (1000 * 60 * 60 * 24));
            if (diffDays < 1) continue;
        }

        // Reset to 0 (broken state). lastLogDate is intentionally NOT changed here so
        // that logDay() can still detect the gap and correctly restart the streak at 1.
        await prisma.project.update({
            where: { id: project.id },
            data:  { currentStreak: 0 }
        });

        const challengeEntries = project.eventEntries.filter(
            e => e.event.type === "DAYS_CHALLENGE" && e.event.isActive && new Date(e.event.endDate) > new Date()
        );

        if (challengeEntries.length > 0) {
            await prisma.projectEventEntry.updateMany({
                where: {
                    projectId: project.id,
                    eventId: { in: challengeEntries.map(e => e.event.id) },
                    disqualified: false
                },
                data: { disqualified: true, disqualifiedAt: now }
            });
            await prisma.project.update({
                where: { id: project.id },
                data:  { visibility: "PRIVATE" }
            });
        }
    }

    return { processed: stalledProjects.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH TODAY'S TOTALS
// ─────────────────────────────────────────────────────────────────────────────

async function fetchTodayTotals(projectId, userId) {
    const todayStart = startOfToday();

    const [wordLogs, progressLogs, sessionLogs] = await Promise.all([
        prisma.projectWordLog.findMany({
            where: { projectId, userId, loggedAt: { gte: todayStart } },
            select: { wordsAdded: true }
        }),
        prisma.projectProgressLog.findMany({
            where: { projectId, userId, loggedAt: { gte: todayStart } },
            select: { chaptersAdded: true, scenesAdded: true }
        }),
        prisma.projectSessionLog.findMany({
            where: { projectId, userId, loggedAt: { gte: todayStart } },
            select: { id: true }
        })
    ]);

    return {
        wordsToday:    wordLogs.reduce((sum, l) => sum + l.wordsAdded, 0),
        chaptersToday: progressLogs.reduce((sum, l) => sum + l.chaptersAdded, 0),
        scenesToday:   progressLogs.reduce((sum, l) => sum + l.scenesAdded, 0),
        sessionsToday: sessionLogs.length
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// TRACKER SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

function calculateTrackerSummary(project, todayTotals = {}) {
    const summary = {};
    const { deadline, daysPerWeek } = project;
    const {
        wordsToday    = 0,
        chaptersToday = 0,
        scenesToday   = 0,
        sessionsToday = 0
    } = todayTotals;

    if (project.targetWordCount) {
        const remaining   = Math.max(project.targetWordCount - project.currentWordCount, 0);
        const dailyTarget = (deadline && daysPerWeek)
            ? calculateDailyTarget(project.targetWordCount, project.currentWordCount, deadline, daysPerWeek)
            : null;
        summary.wordCount = {
            current:      project.currentWordCount,
            target:       project.targetWordCount,
            remaining,
            percent:      Math.min(Math.round((project.currentWordCount / project.targetWordCount) * 100), 100),
            dailyTarget,
            todayCount:   wordsToday,
            todayPercent: dailyTarget ? Math.min(Math.round((wordsToday / dailyTarget) * 100), 100) : null
        };
    }

    if (project.targetChapters) {
        const remaining   = Math.max(project.targetChapters - project.currentChapters, 0);
        const dailyTarget = (deadline && daysPerWeek)
            ? calculateDailyTarget(project.targetChapters, project.currentChapters, deadline, daysPerWeek)
            : null;
        summary.chapters = {
            current:      project.currentChapters,
            target:       project.targetChapters,
            remaining,
            percent:      Math.min(Math.round((project.currentChapters / project.targetChapters) * 100), 100),
            dailyTarget,
            todayCount:   chaptersToday,
            todayPercent: dailyTarget ? Math.min(Math.round((chaptersToday / dailyTarget) * 100), 100) : null
        };
    }

    if (project.targetScenes) {
        const remaining   = Math.max(project.targetScenes - project.currentScenes, 0);
        const dailyTarget = (deadline && daysPerWeek)
            ? calculateDailyTarget(project.targetScenes, project.currentScenes, deadline, daysPerWeek)
            : null;
        summary.scenes = {
            current:      project.currentScenes,
            target:       project.targetScenes,
            remaining,
            percent:      Math.min(Math.round((project.currentScenes / project.targetScenes) * 100), 100),
            dailyTarget,
            todayCount:   scenesToday,
            todayPercent: dailyTarget ? Math.min(Math.round((scenesToday / dailyTarget) * 100), 100) : null
        };
    }

    if (project.sessionGoalCount && project.sessionGoalType) {
        const remaining = Math.max(project.sessionGoalCount - project.currentSessionCount, 0);
        summary.sessions = {
            current:      project.currentSessionCount,
            target:       project.sessionGoalCount,
            remaining,
            period:       project.sessionGoalType,
            percent:      Math.min(Math.round((project.currentSessionCount / project.sessionGoalCount) * 100), 100),
            dailyTarget:  null,
            todayCount:   sessionsToday,
            todayPercent: null
        };
    }

    // ── Streak summary ────────────────────────────────────────────────────────
    if (project.consecutiveDaysTarget) {
        summary.streak = {
            current:    project.currentStreak,
            target:     project.consecutiveDaysTarget,
            percent:    Math.min(Math.round((project.currentStreak / project.consecutiveDaysTarget) * 100), 100),
            lastLogDate: project.lastLogDate ?? null,
            // Did the user already log today? Useful for UI to disable the "Log Day" button.
            loggedToday: project.lastLogDate
                ? Math.round((toUTCDay(new Date()) - toUTCDay(project.lastLogDate)) / (1000 * 60 * 60 * 24)) === 0
                : false
        };
    }

    return summary;
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function fetchPublicProjects() {
    return prisma.project.findMany({
        where: { visibility: "PUBLIC", status: "IN_PROGRESS" },
        select: {
            id:                   true,
            title:                true,
            genre:                true,
            status:               true,
            phase:                true,
            targetWordCount:      true,
            currentWordCount:     true,
            targetChapters:       true,
            currentChapters:      true,
            targetScenes:         true,
            currentScenes:        true,
            sessionGoalType:      true,
            sessionGoalCount:     true,
            currentSessionCount:  true,
            consecutiveDaysTarget: true,
            currentStreak:        true,
            lastLogDate:          true,
            user: { select: { username: true, avatar: true } },
            // Include active event entries so the frontend knows which challenge they're in
            eventEntries: {
                where: { disqualified: false },
                include: { event: { select: { id: true, title: true, type: true, daysTarget: true, endDate: true } } }
            }
        },
        orderBy: { updatedAt: "desc" }
    });
}

async function updateDeadline(projectId, newDeadline, daysPerWeek) {
    return prisma.project.update({
        where: { id: projectId },
        data:  { deadline: new Date(newDeadline), daysPerWeek }
    });
}

async function fetchProjectById(projectId) {
    return prisma.project.findUnique({
        where: { id: projectId },
        include: {
            wordLogs:     { orderBy: { loggedAt: "desc"  }, take: 30 },
            progressLogs: { orderBy: { loggedAt: "desc"  }, take: 30 },
            sessionLogs:  { orderBy: { loggedAt: "desc"  }, take: 30 },
            dayLogs:      { orderBy: { logDate:  "desc"  }, take: 30 },
            eventEntries: {
                where: { disqualified: false },
                include: { event: true }
            }
        }
    });
}

async function fetchRecentProject(userId) {
    const [recentWord, recentProgress, recentSession, recentDay] = await Promise.all([
        prisma.projectWordLog.findFirst({
            where: { userId },
            orderBy: { loggedAt: "desc" },
            select: { projectId: true, loggedAt: true }
        }),
        prisma.projectProgressLog.findFirst({
            where: { userId },
            orderBy: { loggedAt: "desc" },
            select: { projectId: true, loggedAt: true }
        }),
        prisma.projectSessionLog.findFirst({
            where: { userId },
            orderBy: { loggedAt: "desc" },
            select: { projectId: true, loggedAt: true }
        }),
        // Day/streak logs use logDate instead of loggedAt — normalise below
        prisma.projectDayLog.findFirst({
            where: { userId },
            orderBy: { logDate: "desc" },
            select: { projectId: true, logDate: true }
        })
    ]);

    // Normalise recentDay so it has a loggedAt field matching the others.
    // logDate is a date-only value (e.g. 2024-01-15T00:00:00Z) which always
    // sorts *before* a same-day datetime (e.g. 14:30:00Z).
    // We push it to end-of-that-day (23:59:59Z) so a streak-only project
    // whose last day log is today still wins the sort against older logs.
    const recentDayNorm = recentDay
        ? (() => {
              const d = new Date(recentDay.logDate);
              d.setUTCHours(23, 59, 59, 999);
              return { projectId: recentDay.projectId, loggedAt: d };
          })()
        : null;

    const candidates = [recentWord, recentProgress, recentSession, recentDayNorm]
        .filter(Boolean)
        .sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt));

    const mostRecentProjectId = candidates[0]?.projectId ?? null;

    if (mostRecentProjectId) {
        return prisma.project.findUnique({
            where: { id: mostRecentProjectId },
            include: {
                wordLogs:     { orderBy: { loggedAt: "desc" }, take: 1 },
                progressLogs: { orderBy: { loggedAt: "desc" }, take: 1 },
                sessionLogs:  { orderBy: { loggedAt: "desc" }, take: 1 },
                dayLogs:      { orderBy: { logDate:  "desc" }, take: 1 }
            }
        });
    }

    return prisma.project.findFirst({
        where: { userId, status: "IN_PROGRESS" },
        orderBy: { updatedAt: "desc" },
        include: {
            wordLogs:     { orderBy: { loggedAt: "desc" }, take: 1 },
            progressLogs: { orderBy: { loggedAt: "desc" }, take: 1 },
            sessionLogs:  { orderBy: { loggedAt: "desc" }, take: 1 },
            dayLogs:      { orderBy: { logDate:  "desc" }, take: 1 }
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// ENROL IN EVENT
// ─────────────────────────────────────────────────────────────────────────────
// Enrols a PUBLIC project in an active DAYS_CHALLENGE event.
// Forces the project to PUBLIC and locks that state for the duration.

async function enrollInEvent(projectId, userId, eventId) {
    const [project, event] = await Promise.all([
        prisma.project.findUnique({ where: { id: projectId } }),
        prisma.platformEvent.findUnique({ where: { id: eventId } })
    ]);

    if (!project)                         throw new Error("PROJECT_NOT_FOUND");
    if (project.userId !== userId)        throw new Error("UNAUTHORIZED");
    if (!event)                           throw new Error("EVENT_NOT_FOUND");
    if (event.type !== "DAYS_CHALLENGE")  throw new Error("NOT_A_DAYS_CHALLENGE");
    if (!event.isActive || new Date(event.endDate) <= new Date()) throw new Error("EVENT_NOT_ACTIVE");

    // Guard: project must have been created on or before the event start date
    const eventStartDay   = new Date(new Date(event.startDate).toDateString());
    const projectCreatedDay = new Date(new Date(project.createdAt).toDateString());
    if (projectCreatedDay > eventStartDay) {
        throw new Error("PROJECT_CREATED_AFTER_EVENT_START");
    }

    // Guard: project must have a clean streak (no pre-existing streak)
    if (project.currentStreak > 0) {
        throw new Error("PROJECT_HAS_EXISTING_STREAK");
    }

    // Guard: project's consecutiveDaysTarget must match the event's daysTarget exactly
    if (!project.consecutiveDaysTarget || project.consecutiveDaysTarget !== event.daysTarget) {
        throw new Error("DAYS_TARGET_MISMATCH");
    }

    // Guard: this user must not already have a different project enrolled in this event
    const existingEntry = await prisma.projectEventEntry.findFirst({
        where: {
            eventId,
            disqualified: false,
            project: { userId }
        }
    });
    if (existingEntry && existingEntry.projectId !== projectId) {
        throw new Error("USER_ALREADY_ENROLLED");
    }

    // Force the project to PUBLIC — event projects are always visible
    if (project.visibility !== "PUBLIC") {
        await prisma.project.update({
            where: { id: projectId },
            data:  { visibility: "PUBLIC" }
        });
    }

    return prisma.projectEventEntry.upsert({
        where:  { projectId_eventId: { projectId, eventId } },
        create: { projectId, eventId },
        update: { disqualified: false, disqualifiedAt: null }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
    // Project CRUD
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,

    // Progress logging
    logWords,
    deleteWords,
    logChapterScene,
    deleteChapterScene,
    logSession,
    previewDelete,

    // Day / streak logging
    logDay,
    runStreakBreaker,
    breakExpiredStreaks,   // alias used by cron job
    computeNewStreak,
    didMissDay,

    // Event enrolment
    enrollInEvent,

    // Summary helpers
    calculateTrackerSummary,
    calculateDailyTarget,
    fetchTodayTotals,

    // Fetch helpers
    fetchPublicProjects,
    updateDeadline,
    fetchProjectById,
    fetchRecentProject,
};