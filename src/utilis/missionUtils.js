const prisma = require("../config/prismaClient");
const { notifyUser } = require("../services/notificationService");

const RANK_XP_MILESTONES = [
    { xp: 0,    rank: "Inklings" },
    { xp: 150,  rank: "Scribe" },
    { xp: 600,  rank: "Quill Bearer" },
    { xp: 1500, rank: "Scholar" },
    { xp: 3500, rank: "Architect" },
    { xp: 7000, rank: "Inkwell Legend" },
];

const RANK_ORDER = {
    "Inklings": 0,
    "Scribe": 1,
    "Quill Bearer": 2,
    "Scholar": 3,
    "Architect": 4,
    "Inkwell Legend": 5
};

function getRankFromXp(totalXp) {
    let currentRank = "Inklings";
    for (const milestone of RANK_XP_MILESTONES) {
        if (totalXp >= milestone.xp) {
            currentRank = milestone.rank;
        } else {
            break;
        }
    }
    return currentRank;
}

async function assignActiveMissions(userId) {
    const existing = await prisma.userActiveMission.findMany({
        where: { userId }
    });

    const existingDifficulties = new Set(existing.map(m => m.difficulty));
    const difficulties = ["EASY", "MEDIUM", "HARD"];

    for (const difficulty of difficulties) {
        if (existingDifficulties.has(difficulty)) continue;

        const completedMissions = await prisma.userMission.findMany({
            where: { userId },
            select: { missionId: true }
        });
        const completedIds = completedMissions.map(m => m.missionId);

        const available = await prisma.mission.findMany({
            where: {
                difficulty,
                id: { notIn: completedIds.length > 0 ? completedIds : [-1] }
            }
        });

        if (available.length === 0) continue;

        let picked;
        if (difficulty === "EASY") {
            const firstMission = available.find(m => m.title === "Getting Started");
            picked = firstMission ?? available[Math.floor(Math.random() * available.length)];
        } else {
            picked = available[Math.floor(Math.random() * available.length)];
        }

        await prisma.userActiveMission.create({
            data: { userId, missionId: picked.id, difficulty }
        });
    }
}

async function checkActiveMissions(userId, sprintData) {
    const { wordsWritten, duration } = sprintData;

    const activeMissions = await prisma.userActiveMission.findMany({
        where: { userId },
        include: { mission: true }
    });

    if (activeMissions.length === 0) return [];

    const completedMissions = [];

    for (const activeMission of activeMissions) {
        const { mission } = activeMission;
        const currentProgress = activeMission.progress;
        let newProgress = currentProgress;
        let isCompleted = false;

        switch (mission.type) {
            case "SPRINT_WORDS":
                // Single sprint check — completed if this sprint meets the requirement
                isCompleted = wordsWritten >= mission.requirement;
                // Track best attempt for progress display
                newProgress = Math.max(currentProgress, wordsWritten);
                break;

            case "SPRINT_DURATION":
                // Single sprint check — completed if this sprint's duration meets the requirement
                isCompleted = duration >= mission.requirement;
                // Track best attempt for progress display
                newProgress = Math.max(currentProgress, duration);
                break;

            case "SPRINT_COUNT":
                // Accumulate — count completed sprints toward requirement
                newProgress = currentProgress + 1;
                isCompleted = newProgress >= mission.requirement;
                break;

            case "TOTAL_WORDS":
                // Accumulate — sum words across sprints toward requirement
                newProgress = currentProgress + wordsWritten;
                isCompleted = newProgress >= mission.requirement;
                break;
        }

        if (!isCompleted) {
            await prisma.userActiveMission.update({
                where: { id: activeMission.id },
                data: { progress: newProgress }
            });
            continue;
        }

        // Quest completed — award XP, record completion, remove from active
        await prisma.$transaction(async (tx) => {
            await tx.userMission.create({
                data: { userId, missionId: mission.id }
            });
            await tx.userActiveMission.delete({
                where: { id: activeMission.id }
            });
            await tx.user.update({
                where: { id: userId },
                data: { totalXp: { increment: mission.xp } }
            });
        });

        // Check if the new XP total unlocks a higher rank (for claim mechanic)
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, email: true, totalXp: true, rank: true, pendingRank: true }
        });

        const earnedRank = getRankFromXp(user.totalXp);
        const currentRankOrder = RANK_ORDER[user.rank] ?? 0;
        const pendingRankOrder = RANK_ORDER[user.pendingRank] ?? -1;
        const earnedRankOrder = RANK_ORDER[earnedRank] ?? 0;

        const shouldSetPendingRank =
            earnedRankOrder > currentRankOrder &&
            earnedRankOrder > pendingRankOrder;

        if (shouldSetPendingRank) {
            await prisma.user.update({
                where: { id: userId },
                data: { pendingRank: earnedRank }
            });
        }

        // Notify: quest completed
        await notifyUser(
            user,
            `Quest completed: "${mission.title}" (+${mission.xp} XP)! Keep writing to unlock more.`,
            `https://inkwellinky.vercel.app/dashboard`
        ).catch(err => console.error("Quest completion notification error:", err));

        // Notify: rank available to claim
        if (shouldSetPendingRank) {
            await notifyUser(
                user,
                `You've unlocked the "${earnedRank}" rank! Visit your profile to claim it.`,
                `https://inkwellinky.vercel.app/missions`
            ).catch(err => console.error("Rank unlock notification error:", err));
        }

        // Fill the empty slot with a new quest from the same tier
        await assignActiveMissions(userId);

        completedMissions.push({
            id: mission.id,
            title: mission.title,
            xp: mission.xp,
            difficulty: mission.difficulty,
            rankUnlocked: shouldSetPendingRank ? earnedRank : null
        });
    }

    return completedMissions;
}

module.exports = { getRankFromXp, assignActiveMissions, checkActiveMissions, RANK_XP_MILESTONES, RANK_ORDER };
