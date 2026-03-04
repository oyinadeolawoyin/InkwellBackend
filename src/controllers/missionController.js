const missionService = require("../services/missionService");
const { notifyUser } = require("../services/notificationService");

const VALID_MISSION_TYPES = ["SPRINT_WORDS", "TOTAL_WORDS", "SPRINT_COUNT", "SPRINT_DURATION"];
const VALID_DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];

async function getActiveMissions(req, res) {
    const userId = Number(req.params.userId);
    try {
        const missions = await missionService.getActiveMissions(userId);
        res.status(200).json({ missions });
    } catch (error) {
        console.error("Get active missions error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function getAllMissions(req, res) {
    const userId = Number(req.params.userId);
    try {
        const missions = await missionService.getAllMissions(userId);
        res.status(200).json({ missions });
    } catch (error) {
        console.error("Get all missions error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function getMissionProgress(req, res) {
    const userId = Number(req.params.userId);
    try {
        const progress = await missionService.getMissionProgress(userId);
        if (!progress) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ progress });
    } catch (error) {
        console.error("Get mission progress error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function createMission(req, res) {
    if (req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "Admin access required" });
    }

    const { title, description, type, requirement, difficulty, xp } = req.body;

    if (!title || !description || !type || requirement == null || !difficulty) {
        return res.status(400).json({ message: "title, description, type, requirement, and difficulty are required" });
    }

    if (!VALID_MISSION_TYPES.includes(type)) {
        return res.status(400).json({ message: `type must be one of: ${VALID_MISSION_TYPES.join(", ")}` });
    }

    if (!VALID_DIFFICULTIES.includes(difficulty)) {
        return res.status(400).json({ message: `difficulty must be one of: ${VALID_DIFFICULTIES.join(", ")}` });
    }

    try {
        const mission = await missionService.createMission({
            title,
            description,
            type,
            requirement: Number(requirement),
            difficulty,
            ...(xp != null && { xp: Number(xp) })
        });
        res.status(201).json({ mission });
    } catch (error) {
        console.error("Create mission error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function getRecentMissions(req, res) {
    const userId = Number(req.params.userId);
    try {
        const missions = await missionService.getRecentCompletedMissions(userId);
        res.status(200).json({ missions });
    } catch (error) {
        console.error("Get recent missions error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function claimRank(req, res) {
    const userId = Number(req.user.id);
    try {
        const result = await missionService.claimRank(userId);
        if (!result) {
            return res.status(404).json({ message: "User not found" });
        }
        if (!result.claimed) {
            return res.status(400).json({ message: result.message });
        }

        // Notify user their rank is now active
        const message = `Your rank has been updated to "${result.rank}"! Keep writing to reach the next tier. 🌟`;
        await notifyUser(req.user, message, `https://inkwellinky.vercel.app/dashboard`).catch(err =>
            console.error("Claim rank notification error:", err)
        );

        res.status(200).json({ rank: result.rank });
    } catch (error) {
        console.error("Claim rank error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

module.exports = { getActiveMissions, getAllMissions, getMissionProgress, createMission, claimRank, getRecentMissions };
