const prisma = require("../config/prismaClient");

async function fetchProjects(userId) {
    return prisma.project.findMany({
        where: { userId }
    });
}

async function createProject(
    userId, title, description, link, genre, visibility,
    targetWordCount, deadline, daysPerWeek,
    targetChapters, targetScenes, sessionGoalType, sessionGoalCount
) {
    return prisma.project.create({
        data: {
            userId,
            title,
            description,
            link,
            genre,
            visibility: visibility ?? "PRIVATE",
            targetWordCount: targetWordCount ? Number(targetWordCount) : null,
            deadline: deadline ? new Date(deadline) : null,
            daysPerWeek: daysPerWeek ? Number(daysPerWeek) : 5,
            targetChapters: targetChapters ? Number(targetChapters) : null,
            targetScenes: targetScenes ? Number(targetScenes) : null,
            sessionGoalType: sessionGoalType ?? null,
            sessionGoalCount: sessionGoalCount ? Number(sessionGoalCount) : null,
        }
    });
}

async function updateProject(
    projectId, userId, title, description, link, genre, visibility,
    targetWordCount, deadline, daysPerWeek, status,
    targetChapters, targetScenes, sessionGoalType, sessionGoalCount
) {
    const existing = await prisma.project.findUnique({ where: { id: projectId } });
    if (!existing) throw new Error("PROJECT_NOT_FOUND");
    if (existing.userId !== userId) throw new Error("UNAUTHORIZED");

    return prisma.project.update({
        where: { id: projectId },
        data: {
            title, description, link, genre, visibility,
            targetWordCount: targetWordCount ? Number(targetWordCount) : null,
            deadline: deadline ? new Date(deadline) : null,
            daysPerWeek: daysPerWeek ? Number(daysPerWeek) : 5,
            status,
            targetChapters: targetChapters ? Number(targetChapters) : null,
            targetScenes: targetScenes ? Number(targetScenes) : null,
            sessionGoalType: sessionGoalType ?? null,
            sessionGoalCount: sessionGoalCount ? Number(sessionGoalCount) : null,
        }
    });
}

async function deleteProject(projectId, userId) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    if (project.userId !== userId) throw new Error("UNAUTHORIZED");
    return prisma.project.delete({ where: { id: projectId } });
}

// ─── HELPERS ──────────────────────────────────────────────────

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function startOfToday() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Generic daily target calculator — works for words, chapters, scenes
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

// ─── PREVIEW DELETE (no DB writes — warn the writer first) ────

// Calculates what the daily target WOULD become after a subtraction.
// Call this before confirming a delete so the frontend can show a warning.
function previewDelete(project, field, amountToRemove) {
    // field: "words" | "chapters" | "scenes"
    const fieldMap = {
        words:    { current: "currentWordCount",  target: "targetWordCount" },
        chapters: { current: "currentChapters",   target: "targetChapters" },
        scenes:   { current: "currentScenes",     target: "targetScenes" }
    };

    const map = fieldMap[field];
    if (!map) throw new Error("INVALID_FIELD");

    const currentCount = project[map.current];
    const targetCount  = project[map.target];

    // Floor at 0 — count can never go negative
    const newCount = Math.max(currentCount - amountToRemove, 0);
    const actualRemoved = currentCount - newCount; // might be less than requested if near 0

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
        // How much harder the daily target gets — useful for the warning message
        dailyTargetIncrease: (newDailyTarget && currentDailyTarget)
            ? newDailyTarget - currentDailyTarget
            : null
    };
}

// ─── LOG WORDS ────────────────────────────────────────────────

async function logWords(projectId, userId, wordsAdded) {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true }
    });
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    if (project.userId !== userId) throw new Error("UNAUTHORIZED");

    // wordsAdded is always positive here
    await prisma.projectWordLog.create({
        data: { projectId, userId, wordsAdded }
    });

    return prisma.project.update({
        where: { id: projectId },
        data: { currentWordCount: { increment: wordsAdded } }
    });
}

// ─── DELETE WORDS (confirmed) ─────────────────────────────────

async function deleteWords(projectId, userId, wordsToRemove) {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true, currentWordCount: true }
    });
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    if (project.userId !== userId) throw new Error("UNAUTHORIZED");

    // Floor at 0
    const newCount = Math.max(project.currentWordCount - wordsToRemove, 0);
    const actualRemoved = project.currentWordCount - newCount;

    // Negative log entry — signed history
    await prisma.projectWordLog.create({
        data: { projectId, userId, wordsAdded: -actualRemoved }
    });

    return prisma.project.update({
        where: { id: projectId },
        data: { currentWordCount: newCount }
    });
}

// ─── LOG CHAPTER / SCENE ──────────────────────────────────────

async function logChapterScene(projectId, userId, chaptersAdded, scenesAdded) {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true }
    });
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    if (project.userId !== userId) throw new Error("UNAUTHORIZED");

    // Positive log entry
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

// ─── DELETE CHAPTER / SCENE (confirmed) ───────────────────────

async function deleteChapterScene(projectId, userId, chaptersToRemove, scenesToRemove) {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true, currentChapters: true, currentScenes: true }
    });
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    if (project.userId !== userId) throw new Error("UNAUTHORIZED");

    // Floor at 0 for both
    const newChapters = Math.max(project.currentChapters - (chaptersToRemove || 0), 0);
    const newScenes   = Math.max(project.currentScenes   - (scenesToRemove   || 0), 0);

    const actualChaptersRemoved = project.currentChapters - newChapters;
    const actualScenesRemoved   = project.currentScenes   - newScenes;

    // Negative log entry — signed history
    await prisma.projectProgressLog.create({
        data: {
            projectId, userId,
            chaptersAdded: -actualChaptersRemoved,
            scenesAdded:   -actualScenesRemoved
        }
    });

    return prisma.project.update({
        where: { id: projectId },
        data: {
            currentChapters: newChapters,
            currentScenes:   newScenes
        }
    });
}

// ─── LOG SESSION ──────────────────────────────────────────────

async function logSession(projectId, userId) {
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
    if (!project) throw new Error("PROJECT_NOT_FOUND");
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
        data: { projectId, userId }
    });

    return prisma.project.update({
        where: { id: projectId },
        data: {
            currentSessionCount: shouldReset ? 1 : { increment: 1 },
            lastSessionReset: shouldReset ? now : (project.lastSessionReset ?? now)
        }
    });
}

// ─── FETCH TODAY'S TOTALS ─────────────────────────────────────

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

    // Sum signed values — net progress today (additions minus deletions)
    return {
        wordsToday:    wordLogs.reduce((sum, l) => sum + l.wordsAdded, 0),
        chaptersToday: progressLogs.reduce((sum, l) => sum + l.chaptersAdded, 0),
        scenesToday:   progressLogs.reduce((sum, l) => sum + l.scenesAdded, 0),
        sessionsToday: sessionLogs.length
    };
}

// ─── TRACKER SUMMARY ──────────────────────────────────────────

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
        const remaining    = Math.max(project.targetWordCount - project.currentWordCount, 0);
        const dailyTarget  = (deadline && daysPerWeek)
            ? calculateDailyTarget(project.targetWordCount, project.currentWordCount, deadline, daysPerWeek)
            : null;
        summary.wordCount = {
            current: project.currentWordCount,
            target: project.targetWordCount,
            remaining,
            percent: Math.min(Math.round((project.currentWordCount / project.targetWordCount) * 100), 100),
            dailyTarget,
            todayCount:   wordsToday,
            todayPercent: dailyTarget
                ? Math.min(Math.round((wordsToday / dailyTarget) * 100), 100)
                : null
        };
    }

    if (project.targetChapters) {
        const remaining   = Math.max(project.targetChapters - project.currentChapters, 0);
        const dailyTarget = (deadline && daysPerWeek)
            ? calculateDailyTarget(project.targetChapters, project.currentChapters, deadline, daysPerWeek)
            : null;
        summary.chapters = {
            current: project.currentChapters,
            target: project.targetChapters,
            remaining,
            percent: Math.min(Math.round((project.currentChapters / project.targetChapters) * 100), 100),
            dailyTarget,
            todayCount:   chaptersToday,
            todayPercent: dailyTarget
                ? Math.min(Math.round((chaptersToday / dailyTarget) * 100), 100)
                : null
        };
    }

    if (project.targetScenes) {
        const remaining   = Math.max(project.targetScenes - project.currentScenes, 0);
        const dailyTarget = (deadline && daysPerWeek)
            ? calculateDailyTarget(project.targetScenes, project.currentScenes, deadline, daysPerWeek)
            : null;
        summary.scenes = {
            current: project.currentScenes,
            target: project.targetScenes,
            remaining,
            percent: Math.min(Math.round((project.currentScenes / project.targetScenes) * 100), 100),
            dailyTarget,
            todayCount:   scenesToday,
            todayPercent: dailyTarget
                ? Math.min(Math.round((scenesToday / dailyTarget) * 100), 100)
                : null
        };
    }

    if (project.sessionGoalCount && project.sessionGoalType) {
        const remaining = Math.max(project.sessionGoalCount - project.currentSessionCount, 0);
        summary.sessions = {
            current: project.currentSessionCount,
            target: project.sessionGoalCount,
            remaining,
            period: project.sessionGoalType,
            percent: Math.min(Math.round((project.currentSessionCount / project.sessionGoalCount) * 100), 100),
            dailyTarget:  null,
            todayCount:   sessionsToday,
            todayPercent: null
        };
    }

    return summary;
}

// ─── FETCH FUNCTIONS ──────────────────────────────────────────

async function fetchPublicProjects() {
    return prisma.project.findMany({
        where: { visibility: "PUBLIC", status: "IN_PROGRESS" },
        select: {
            id:                  true,
            title:               true,
            genre:               true,
            status:              true,
            // progress numbers only — no notes, no tasks, no logs, no description
            targetWordCount:     true,
            currentWordCount:    true,
            targetChapters:      true,
            currentChapters:     true,
            targetScenes:        true,
            currentScenes:       true,
            sessionGoalType:     true,
            sessionGoalCount:    true,
            currentSessionCount: true,
            // author identity only
            user: { select: { username: true, avatar: true } }
        },
        orderBy: { updatedAt: "desc" }
    });
}

async function updateDeadline(projectId, newDeadline, daysPerWeek) {
    return prisma.project.update({
        where: { id: projectId },
        data: { deadline: new Date(newDeadline), daysPerWeek }
    });
}

async function fetchProjectById(projectId) {
    return prisma.project.findUnique({
        where: { id: projectId },
        include: {
            wordLogs:     { orderBy: { loggedAt: "desc" }, take: 30 },
            progressLogs: { orderBy: { loggedAt: "desc" }, take: 30 },
            sessionLogs:  { orderBy: { loggedAt: "desc" }, take: 30 }
        }
    });
}

async function fetchRecentProject(userId) {
    const [recentWord, recentProgress, recentSession] = await Promise.all([
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
        })
    ]);

    const candidates = [recentWord, recentProgress, recentSession]
        .filter(Boolean)
        .sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt));

    const mostRecentProjectId = candidates[0]?.projectId ?? null;

    if (mostRecentProjectId) {
        return prisma.project.findUnique({
            where: { id: mostRecentProjectId },
            include: {
                wordLogs:     { orderBy: { loggedAt: "desc" }, take: 1 },
                progressLogs: { orderBy: { loggedAt: "desc" }, take: 1 },
                sessionLogs:  { orderBy: { loggedAt: "desc" }, take: 1 }
            }
        });
    }

    return prisma.project.findFirst({
        where: { userId, status: "IN_PROGRESS" },
        orderBy: { updatedAt: "desc" },
        include: {
            wordLogs:     { orderBy: { loggedAt: "desc" }, take: 1 },
            progressLogs: { orderBy: { loggedAt: "desc" }, take: 1 },
            sessionLogs:  { orderBy: { loggedAt: "desc" }, take: 1 }
        }
    });
}

module.exports = {
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    logWords,
    deleteWords,
    logChapterScene,
    deleteChapterScene,
    logSession,
    previewDelete,
    calculateTrackerSummary,
    calculateDailyTarget,
    fetchTodayTotals,
    fetchPublicProjects,
    updateDeadline,
    fetchProjectById,
    fetchRecentProject
};