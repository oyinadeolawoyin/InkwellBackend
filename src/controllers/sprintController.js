require("dotenv").config();
const sprintService = require("../services/sprintService");
const { notifyUser } = require('../services/notificationService');

async function startGroupSprint(req, res) {
    const { sprintPurpose, duration } = req.body;
    const userId = Number(req.user.id);

    try {
        const groupSprint = await sprintService.startGroupSprint(userId, Number(duration), sprintPurpose);
        res.status(201).json({ groupSprint });
    } catch(error) {
        console.error("Group sprint start error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }    
}

async function fetchGroupSprint(req, res) {
    const groupSprintId = Number(req.params.groupSprintId);
    try {
        const groupSprint = await sprintService.fetchGroupSprint(groupSprintId);
        if (!groupSprint) {
            return res.status(404).json({ message: "Group sprint not found" });
        }
        res.status(200).json({ groupSprint });
    } catch (error) {
        console.error("Fetch group sprint error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function fecthAllActiveGroupSprints(req, res) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const result = await sprintService.fetchAllActiveGroupSprints({
            skip,
            take: limit
        });

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

async function endGroupSprint(req, res) {
    const { ThankyouNote } = req.body;
    const groupSprintId = Number(req.params.groupSprintId);
  
    try {
        const groupSprint = await sprintService.endGroupSprint(ThankyouNote, groupSprintId);

        const user = req.user;
        const message = "You did great for arranging the sprint and helping others write. You should be proud of yourself🌱";
        const link = `https://inkwellinky.vercel.app/dashboard`;
        
        await notifyUser(user, message, link);

        res.status(200).json({ groupSprint });
    } catch(error) {
        console.error("Group sprint end error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function fetchGroupSprintsOfTheDay(req, res) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const result = await sprintService.fetchGroupSprintOfTheDay({
            skip,
            take: limit
        });

        res.status(200).json({
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit),
            groupSprints: result.groupSprints
        });
    } catch (error) {
        console.error("Group sprint of the day error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function startSprint(req, res) {
    const { duration, checkin, groupSprintId, intro, startWordCount } = req.body;
    const userId = req.user.id;
    console.log("intro", intro);
    try {
        const sprint = await sprintService.startSprint(
            Number(userId),
            Number(duration),
            checkin,
            groupSprintId ? Number(groupSprintId) : null,
            intro,
            startWordCount != null ? Number(startWordCount) : 0
        );
        res.status(201).json({ sprint });
    } catch(error) {
        console.error("Sprint start error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function pauseSprint(req, res) {
    const { isPause, sprintId } = req.params;
    const isPauseBool = isPause === "true";

    try {
        const sprint = await sprintService.pauseSprint(isPauseBool, Number(sprintId));
        res.status(200).json({ sprint });
    } catch(error) {
        console.error("Sprint pause error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function activeSprint(req, res) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const result = await sprintService.fetchActiveSprint({
            skip,
            take: limit
        });

        res.status(200).json({
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit),
            sprints: result.sprints
        });
    } catch (error) {
        console.error("Fetch active sprints error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function loginUserSession(req, res) {
    const userId = req.user.id;
    try {
        const sprint = await sprintService.fetchLoginUserSprint(Number(userId));
        res.status(200).json({ sprint });
    } catch(error) {
        console.error("Fetch user's sprint error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function endSprint(req, res) {
    const { endWordCount, checkout } = req.body;
    const sprintId = req.params.sprintId;

    try {
        const sprint = await sprintService.endSprint(
            Number(sprintId),
            endWordCount != null ? Number(endWordCount) : null,
            checkout
        );

        const user = req.user;
        const message = "Your writing sprint has come to an end. Take a breath and be proud of the words you showed up for today. Every line counts 🌱";
        const link = `https://inkwellinky.vercel.app/dashboard`;
        
        await notifyUser(user, message, link);

        res.status(200).json({ sprint });
    } catch(error) {
        console.error("Sprint end error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function likeSprint(req, res) {
    const userId = req.user.id;
    const sprintId = Number(req.params.sprintId);

    try {
        const result = await sprintService.toggleLikeSprint({ userId, sprintId });
        res.status(200).json(result);
    } catch(error) {
        console.error("Like sprint error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function sprintOfTheDay(req, res) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const result = await sprintService.fetchSprintOfTheDay({
            skip,
            take: limit
        });

        res.status(200).json({
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit),
            sprints: result.sprints
        });
    } catch (error) {
        console.error("Sprint of the day error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function fetchSprintDays(req, res) {
    const userId = req.params.userId;

    try {
        const sprintDays = await sprintService.fetchSprintDays(Number(userId));
        res.status(200).json({ sprintDays });
    } catch(error) {
        console.error("Fetch sprint days error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function updateWordsDirectly(req, res) {
    const sprintId = Number(req.params.sprintId);
    const { wordsWritten } = req.body;

    try {
        const sprint = await sprintService.updateWordsDirectly(sprintId, Number(wordsWritten));
        res.status(200).json({ sprint });
    } catch(error) {
        console.error("Update words directly error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

module.exports = {
    startGroupSprint,
    fetchGroupSprint,
    fecthAllActiveGroupSprints,
    endGroupSprint,
    fetchGroupSprintsOfTheDay,
    startSprint,
    pauseSprint,
    activeSprint,
    loginUserSession,
    endSprint,
    likeSprint,
    sprintOfTheDay,
    fetchSprintDays,
    updateWordsDirectly
}