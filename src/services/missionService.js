const prisma = require("../config/prismaClient");
const { RANK_XP_MILESTONES, RANK_ORDER } = require("../utilis/missionUtils");

async function getActiveMissions(userId) {
    const activeMissions = await prisma.userActiveMission.findMany({
        where: { userId },
        include: { mission: true }
    });

    const slots = { EASY: null, MEDIUM: null, HARD: null };
    for (const am of activeMissions) {
        slots[am.difficulty] = am;
    }

    return ["EASY", "MEDIUM", "HARD"].map(difficulty => {
        if (!slots[difficulty]) {
            return {
                difficulty,
                mission: null,
                message: "All quests in this tier completed!"
            };
        }

        const am = slots[difficulty];
        const current = am.progress;
        const required = am.mission.requirement;
        const remaining = Math.max(0, required - current);
        const percentage = Math.min(100, Math.round((current / required) * 100));

        return {
            ...am,
            progress: { current, required, remaining, percentage }
        };
    });
}

async function getAllMissions(userId) {
    const [allMissions, completedMissions] = await Promise.all([
        prisma.mission.findMany({ orderBy: { difficulty: "asc" } }),
        prisma.userMission.findMany({
            where: { userId },
            select: { missionId: true, completedAt: true }
        })
    ]);

    const completedMap = new Map(completedMissions.map(m => [m.missionId, m.completedAt]));

    const result = { easy: [], medium: [], hard: [] };

    for (const mission of allMissions) {
        const entry = {
            ...mission,
            completed: completedMap.has(mission.id),
            completedAt: completedMap.get(mission.id) ?? null
        };

        switch (mission.difficulty) {
            case "EASY":   result.easy.push(entry);   break;
            case "MEDIUM": result.medium.push(entry); break;
            case "HARD":   result.hard.push(entry);   break;
        }
    }

    return result;
}

async function getMissionProgress(userId) {
    const [user, totalCompleted, recentMissions] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: { totalWordsWritten: true, totalXp: true, rank: true, pendingRank: true }
        }),
        prisma.userMission.count({ where: { userId } }),
        prisma.userMission.findMany({
            where: { userId },
            orderBy: { completedAt: "desc" },
            take: 3,
            include: { mission: true }
        })
    ]);

    if (!user) return null;

    // Find next rank milestone based on XP
    let currentMilestone = RANK_XP_MILESTONES[0];
    let nextMilestone = null;

    for (const milestone of RANK_XP_MILESTONES) {
        if (user.totalXp >= milestone.xp) {
            currentMilestone = milestone;
        } else {
            nextMilestone = milestone;
            break;
        }
    }

    let rankPercentage = 100;
    let xpToNextRank = 0;
    let xpForNextRank = null;

    if (nextMilestone) {
        const xpInTier = user.totalXp - currentMilestone.xp;
        const xpNeededForTier = nextMilestone.xp - currentMilestone.xp;
        rankPercentage = Math.min(100, Math.round((xpInTier / xpNeededForTier) * 100));
        xpToNextRank = nextMilestone.xp - user.totalXp;
        xpForNextRank = nextMilestone.xp;
    }

    return {
        rank: user.rank,
        pendingRank: user.pendingRank,
        totalXp: user.totalXp,
        totalWordsWritten: user.totalWordsWritten,
        nextRank: nextMilestone?.rank ?? null,
        xpForNextRank,
        xpToNextRank,
        rankPercentage,
        totalMissionsCompleted: totalCompleted,
        recentMissions: recentMissions.map(m => m.mission)
    };
}

async function claimRank(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { rank: true, pendingRank: true }
    });

    if (!user) return null;
    if (!user.pendingRank) return { claimed: false, message: "No rank available to claim." };

    const updated = await prisma.user.update({
        where: { id: userId },
        data: {
            rank: user.pendingRank,
            pendingRank: null
        },
        select: { rank: true, pendingRank: true }
    });

    return { claimed: true, rank: updated.rank };
}

async function getRecentCompletedMissions(userId) {
    const records = await prisma.userMission.findMany({
        where: { userId },
        orderBy: { completedAt: "desc" },
        take: 2,
        include: { mission: true }
    });
    return records.map(r => ({ ...r.mission, completedAt: r.completedAt }));
}

async function createMission(data) {
    return prisma.mission.create({ data });
}

module.exports = { getActiveMissions, getAllMissions, getMissionProgress, createMission, claimRank, getRecentCompletedMissions };
