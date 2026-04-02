const groupSprintService = require("../services/groupSprintService");
const { notifyUser } = require('../services/notificationService');
const { AccessToken, TrackSource } = require("livekit-server-sdk");
const { notifyGroupSprintStarted, notifyGroupSprintEnded, notifyMemberCheckedOut } = require('../services/discordService');

// ─── GROUP SPRINT ─────────────────────────────────────────────

async function startGroupSprint(req, res) {
    const { duration, soundscape } = req.body;
    const userId = Number(req.user.id);

    try {
        const groupSprint = await groupSprintService.startGroupSprint(userId, Number(duration), soundscape);

        // 🔔 Ping Discord
        await notifyGroupSprintStarted({
            username: req.user.username,
            duration,
            soundscape,
            groupSprintId: groupSprint.id
        });

        res.status(201).json({ groupSprint });
    } catch (error) {
        console.error("Group sprint start error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function endGroupSprint(req, res) {
    const groupSprintId = Number(req.params.groupSprintId);

    try {
        const groupSprint = await groupSprintService.endGroupSprint(groupSprintId);

        const user = req.user;
        const message = "You did great for arranging the sprint and helping others write. You should be proud of yourself 🌱";
        const link = `https://inkwellinky.vercel.app/group-sprint/${groupSprintId}`;
        await notifyUser(user, message, link);

        // 🔔 Ping Discord
        await notifyGroupSprintEnded({
            username: req.user.username,
            groupSprintId,
            totalWordsWritten: groupSprint.totalWordsWritten
        });

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
        res.status(200).json({ groupSprint }); console.log("gs", groupSprint);
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

    if (!sprintId || isNaN(sprintId)) {
        return res.status(400).json({ message: "Invalid sprint ID." });
    }

    try {
        const sprint = await groupSprintService.checkoutSprint(
            sprintId,
            currentWordCount != null ? Number(currentWordCount) : 0
        );

        const user = req.user;
        const message = "Great job showing up and writing today. Every word counts 🌱";
        const link = `https://inkwellinky.vercel.app/snippet`;
        await notifyUser(user, message, link);

        // 🔔 Ping daily drop channel
        notifyMemberCheckedOut({
            username: req.user.username,
            wordsWritten: sprint.wordsWritten,
            groupSprintId: sprint.groupSprintId,
        }).catch((err) => console.error("Discord checkout notify failed:", err));

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

// ─── LIVEKIT TOKEN ────────────────────────────────────────────

async function getLiveKitToken(req, res) {
    const groupSprintId = Number(req.params.groupSprintId);

    try {
        const groupSprint = await groupSprintService.fetchGroupSprint(groupSprintId);

        if (!groupSprint) {
            return res.status(404).json({ message: "Group sprint not found" });
        }
        if (!groupSprint.liveKitRoomName) {
            return res.status(400).json({ message: "No LiveKit room found for this sprint" });
        }

        // Safety check — catch missing env vars early with a clear message
        if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
            console.error("Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET in .env");
            return res.status(500).json({ message: "LiveKit is not configured on the server." });
        }

        const at = new AccessToken(
            process.env.LIVEKIT_API_KEY,
            process.env.LIVEKIT_API_SECRET,
            { identity: req.user.username, ttl: "2h" }
        );

        at.addGrant({
            roomJoin: true,
            room: groupSprint.liveKitRoomName,
            canPublish: true,
            canSubscribe: true,
            canPublishSources: [TrackSource.SCREEN_SHARE],
        });

        const jwt = await at.toJwt(); // ✅ always await

        res.status(200).json({ token: jwt, roomName: groupSprint.liveKitRoomName });
    } catch (error) {
        console.error("LiveKit token error:", error);
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
    fetchLoginUserSprint,
    getLiveKitToken
}