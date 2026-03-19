require("dotenv").config();
const groupSprintService = require("../services/groupSprintService");
const { notifyUser } = require('../services/notificationService');

// ─── GROUP SPRINT ─────────────────────────────────────────────

async function startGroupSprint(req, res) {
    const { duration, soundscape } = req.body;
    const userId = Number(req.user.id);

    try {
        const groupSprint = await groupSprintService.startGroupSprint(userId, Number(duration), soundscape);
        res.status(201).json({ groupSprint });
    } catch (error) {
        console.error("Group sprint start error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function endGroupSprint(req, res) {
    const { thankyouNote } = req.body;
    const groupSprintId = Number(req.params.groupSprintId);

    try {
        const groupSprint = await groupSprintService.endGroupSprint(groupSprintId, thankyouNote);

        const user = req.user;
        const message = "You did great for arranging the sprint and helping others write. You should be proud of yourself 🌱";
        const link = `https://inkwellinky.vercel.app/group-sprint/${groupSprintId}`;

        await notifyUser(user, message, link);

        res.status(200).json({ groupSprint });
    } catch (error) {
        console.error("Group sprint end error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function fetchGroupSprint(req, res) {
    const groupSprintId = Number(req.params.groupSprintId);
    try {
        const groupSprint = await groupSprintService.fetchGroupSprint(groupSprintId);
        if (!groupSprint) {
            return res.status(404).json({ message: "Group sprint not found" });
        }
        res.status(200).json({ groupSprint });
    } catch (error) {
        console.error("Fetch group sprint error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function fetchAllActiveGroupSprints(req, res) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const result = await groupSprintService.fetchAllActiveGroupSprints({ skip, take: limit });

        res.status(200).json({
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit),
            groupSprints: result.groupSprints
        });
    } catch (error) {
        console.error("Fetch active group sprints error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

// Returns the last completed group sprint for the homepage
async function fetchLastGroupSprint(req, res) {
    try {
        const groupSprint = await groupSprintService.fetchLastGroupSprint();
        if (!groupSprint) {
            return res.status(404).json({ message: "No completed group sprint found" });
        }
        res.status(200).json({ groupSprint });
    } catch (error) {
        console.error("Fetch last group sprint error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

// ─── SPRINT ───────────────────────────────────────────────────

// Member joins a group sprint room
async function joinSprint(req, res) {
    const { groupSprintId, checkin, startWords } = req.body;
    const userId = Number(req.user.id);

    try {
        const sprint = await groupSprintService.joinSprint(
            userId,
            Number(groupSprintId),
            checkin,
            startWords != null ? Number(startWords) : 0
        );
        res.status(201).json({ sprint });
    } catch (error) {
        console.error("Join sprint error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

// Member checks out of sprint — enters their current word count
async function checkoutSprint(req, res) {
    const sprintId = Number(req.params.sprintId);
    const { currentWordCount } = req.body;

    try {
        const sprint = await groupSprintService.checkoutSprint(
            sprintId,
            currentWordCount != null ? Number(currentWordCount) : 0
        );

        const user = req.user;
        const message = "Great job showing up and writing today. Every word counts 🌱";
        const link = `https://inkwellinky.vercel.app/snippet`;

        await notifyUser(user, message, link);

        res.status(200).json({ sprint });
    } catch (error) {
        console.error("Checkout sprint error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function fetchLoginUserSprint(req, res) {
    const userId = Number(req.user.id);
    try {
        const sprint = await groupSprintService.fetchLoginUserSprint(userId);
        res.status(200).json({ sprint });
    } catch (error) {
        console.error("Fetch user's sprint error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

module.exports = {
    startGroupSprint,
    endGroupSprint,
    fetchGroupSprint,
    fetchAllActiveGroupSprints,
    fetchLastGroupSprint,
    joinSprint,
    checkoutSprint,
    fetchLoginUserSprint
}