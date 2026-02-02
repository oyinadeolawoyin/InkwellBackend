require("dotenv").config();
const sprintService = require("../services/sprintService");

async function startSprint(req, res) {
    const { duration, checkin } = req.body;
    const userId = req.user.id;

    try {
        const sprint = await sprintService.startSprint(Number(userId), Number(duration), checkin);
        res.status(201).json({ sprint });
    } catch(error) {
        console.error("Sprint start error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function pauseSprint(req, res) {
    const { isPause, sprintId } = req.params; //isPause can be true or false(true means user pause sprint; flase means user resume)
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
        res.status(201).json({ sprint });
    } catch(error) {
        console.error("Fetch user's sprint error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function endSprint(req, res) {
    const { wordsWritten, checkout } = req.body;
    const sprintId = req.params.sprintId;

    try {
        const sprint = await sprintService.endSprint(Number(sprintId), Number(wordsWritten), checkout);
        res.status(200).json({ sprint });
    } catch(error) {
        console.error("Sprint end error:", error);
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
        sprintDays = await sprintService.fetchSprintDays(Number(userId));
        res.status(200).json({ sprintDays });
    } catch(error) {
        console.error("Sprint end error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

module.exports = {
    startSprint,
    pauseSprint,
    activeSprint,
    loginUserSession,
    endSprint,
    sprintOfTheDay,
    fetchSprintDays
}