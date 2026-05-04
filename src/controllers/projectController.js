require("dotenv").config();
const projectService = require("../services/projectService");

// ─── FETCH PROJECTS ───────────────────────────────────────────

async function fetchProjects(req, res) {
    const userId = req.user.id;
    try {
        const projects = await projectService.fetchProjects(Number(userId));
        res.status(200).json({ projects });
    } catch (error) {
        console.error("Fetch project error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

// ─── CREATE PROJECT ───────────────────────────────────────────

async function createProject(req, res) {
    const {
        title, description, link, genre, visibility,
        targetWordCount, deadline, daysPerWeek,
        targetChapters, targetScenes, sessionGoalType, sessionGoalCount,
        phase, consecutiveDaysTarget
    } = req.body;
    const userId = req.user.id;

    if (deadline && new Date(deadline) <= new Date()) {
        return res.status(400).json({ message: "Deadline must be a future date." });
    }

    const validPhases = ["BRAINSTORMING", "OUTLINING", "DRAFTING", "EDITING", "PLANNING"];
    if (phase && !validPhases.includes(phase)) {
        return res.status(400).json({ message: `phase must be one of: ${validPhases.join(", ")}` });
    }

    // if (consecutiveDaysTarget !== undefined && Number(consecutiveDaysTarget) <= 0) {
    //     return res.status(400).json({ message: "consecutiveDaysTarget must be a positive number." });
    // }
    console.log("t", title, "d",description, "l",link, "g",genre, "v",visibility,
        "wc",targetWordCount, "de",deadline, "dwe",daysPerWeek,
        "tc",targetChapters, "ts",targetScenes, "sg",sessionGoalType, "sco",sessionGoalCount,
        "p",phase, "cota",consecutiveDaysTarget)
    try {
        const project = await projectService.createProject(
            Number(userId), title, description, link, genre, visibility,
            targetWordCount, deadline, daysPerWeek,
            targetChapters, targetScenes, sessionGoalType, sessionGoalCount,
            phase, consecutiveDaysTarget
        ); console.log("pro", project);
        res.status(201).json({ project });
    } catch (error) {
        console.error("Create project error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

// ─── UPDATE PROJECT ───────────────────────────────────────────

async function updateProject(req, res) {
    const {
        title, description, link, genre, visibility,
        targetWordCount, deadline, daysPerWeek, status,
        targetChapters, targetScenes, sessionGoalType, sessionGoalCount,
        // new fields
        phase, consecutiveDaysTarget
    } = req.body;
    const projectId = req.params.projectId;
    const userId    = req.user.id;

    if (deadline && new Date(deadline) <= new Date()) {
        return res.status(400).json({ message: "Deadline must be a future date." });
    }

    const validPhases = ["BRAINSTORMING", "OUTLINING", "DRAFTING", "EDITING", "PLANNING"];
    if (phase && !validPhases.includes(phase)) {
        return res.status(400).json({ message: `phase must be one of: ${validPhases.join(", ")}` });
    }

    // if (consecutiveDaysTarget !== undefined && Number(consecutiveDaysTarget) <= 0) {
    //     return res.status(400).json({ message: "consecutiveDaysTarget must be a positive number." });
    // }

    try {
        const project = await projectService.updateProject(
            Number(projectId), userId, title, description, link, genre, visibility,
            targetWordCount, deadline, daysPerWeek, status,
            targetChapters, targetScenes, sessionGoalType, sessionGoalCount,
            phase, consecutiveDaysTarget
        );
        res.status(200).json({ project });
    } catch (error) {
        if (error.message === "PROJECT_NOT_FOUND") return res.status(404).json({ message: "Project not found." });
        if (error.message === "UNAUTHORIZED")       return res.status(403).json({ message: "You do not have permission to update this project." });
        if (error.message === "VISIBILITY_LOCKED_BY_EVENT") return res.status(400).json({ message: "This project is enrolled in a Days Challenge and must remain Public." });
        console.error("Update project error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

// ─── DELETE PROJECT ───────────────────────────────────────────

async function deleteProject(req, res) {
    const projectId = req.params.projectId;
    const userId    = req.user.id;

    try {
        await projectService.deleteProject(Number(projectId), userId);
        res.status(200).json({ message: "Project deleted successfully." });
    } catch (error) {
        if (error.message === "PROJECT_NOT_FOUND") return res.status(404).json({ message: "Project not found." });
        if (error.message === "UNAUTHORIZED")       return res.status(403).json({ message: "You do not have permission to delete this project." });
        console.error("Delete project error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

// ─── LOG WORDS ────────────────────────────────────────────────

async function logWords(req, res) {
    const projectId = req.params.projectId;
    const userId    = req.user.id;
    const { wordsAdded } = req.body;

    if (!wordsAdded || Number(wordsAdded) <= 0) {
        return res.status(400).json({ message: "wordsAdded must be a positive number." });
    }

    try {
        const project = await projectService.logWords(Number(projectId), userId, Number(wordsAdded));
        res.status(200).json({ project });
    } catch (error) {
        if (error.message === "PROJECT_NOT_FOUND") return res.status(404).json({ message: "Project not found." });
        if (error.message === "UNAUTHORIZED")       return res.status(403).json({ message: "You do not have permission to update this project." });
        console.error("Log words error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

// ─── PREVIEW DELETE ───────────────────────────────────────────

async function previewDeleteProgress(req, res) {
    const projectId = Number(req.params.projectId);
    const userId    = req.user.id;
    const { field, amount } = req.body;

    if (!field || !amount || Number(amount) <= 0) {
        return res.status(400).json({ message: "field and a positive amount are required." });
    }

    const validFields = ["words", "chapters", "scenes"];
    if (!validFields.includes(field)) {
        return res.status(400).json({ message: `field must be one of: ${validFields.join(", ")}` });
    }

    try {
        const project = await projectService.fetchProjectById(projectId);
        if (!project)                  return res.status(404).json({ message: "Project not found." });
        if (project.userId !== userId) return res.status(403).json({ message: "You do not have permission." });

        const preview = projectService.previewDelete(project, field, Number(amount));
        res.status(200).json({ preview });
    } catch (error) {
        if (error.message === "INVALID_FIELD") return res.status(400).json({ message: "Invalid field." });
        console.error("Preview delete error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

// ─── DELETE WORDS (confirmed) ─────────────────────────────────

async function deleteWords(req, res) {
    const projectId   = req.params.projectId;
    const userId      = req.user.id;
    const { wordsToRemove } = req.body;

    if (!wordsToRemove || Number(wordsToRemove) <= 0) {
        return res.status(400).json({ message: "wordsToRemove must be a positive number." });
    }

    try {
        const project = await projectService.deleteWords(Number(projectId), userId, Number(wordsToRemove));
        res.status(200).json({ project });
    } catch (error) {
        if (error.message === "PROJECT_NOT_FOUND") return res.status(404).json({ message: "Project not found." });
        if (error.message === "UNAUTHORIZED")       return res.status(403).json({ message: "You do not have permission to update this project." });
        console.error("Delete words error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

// ─── LOG CHAPTER / SCENE ──────────────────────────────────────

async function logChapterScene(req, res) {
    const projectId = req.params.projectId;
    const userId    = req.user.id;
    const { chaptersAdded, scenesAdded } = req.body;

    if (!chaptersAdded && !scenesAdded) {
        return res.status(400).json({ message: "Provide at least chaptersAdded or scenesAdded." });
    }

    try {
        const project = await projectService.logChapterScene(
            Number(projectId), userId,
            chaptersAdded ? Number(chaptersAdded) : 0,
            scenesAdded   ? Number(scenesAdded)   : 0
        );
        res.status(200).json({ project });
    } catch (error) {
        if (error.message === "PROJECT_NOT_FOUND") return res.status(404).json({ message: "Project not found." });
        if (error.message === "UNAUTHORIZED")       return res.status(403).json({ message: "You do not have permission to update this project." });
        console.error("Log chapter/scene error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

// ─── DELETE CHAPTER / SCENE (confirmed) ───────────────────────

async function deleteChapterScene(req, res) {
    const projectId = req.params.projectId;
    const userId    = req.user.id;
    const { chaptersToRemove, scenesToRemove } = req.body;

    if (!chaptersToRemove && !scenesToRemove) {
        return res.status(400).json({ message: "Provide at least chaptersToRemove or scenesToRemove." });
    }

    try {
        const project = await projectService.deleteChapterScene(
            Number(projectId), userId,
            chaptersToRemove ? Number(chaptersToRemove) : 0,
            scenesToRemove   ? Number(scenesToRemove)   : 0
        );
        res.status(200).json({ project });
    } catch (error) {
        if (error.message === "PROJECT_NOT_FOUND") return res.status(404).json({ message: "Project not found." });
        if (error.message === "UNAUTHORIZED")       return res.status(403).json({ message: "You do not have permission to update this project." });
        console.error("Delete chapter/scene error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

// ─── LOG SESSION ──────────────────────────────────────────────

async function logSession(req, res) {
    const projectId = req.params.projectId;
    const userId    = req.user.id;
    const { wordsWritten = 0, chaptersWritten = 0, scenesWritten = 0, minutesWritten = 0 } = req.body;

    try {
        const project = await projectService.logSession(
            Number(projectId), userId,
            {
                wordsWritten:    Number(wordsWritten)    || 0,
                chaptersWritten: Number(chaptersWritten) || 0,
                scenesWritten:   Number(scenesWritten)   || 0,
                minutesWritten:  Number(minutesWritten)  || 0,
            }
        );
        res.status(200).json({ project });
    } catch (error) {
        if (error.message === "PROJECT_NOT_FOUND") return res.status(404).json({ message: "Project not found." });
        if (error.message === "UNAUTHORIZED")       return res.status(403).json({ message: "You do not have permission to update this project." });
        console.error("Log session error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

// ─── LOG DAY (streak) ─────────────────────────────────────────
// Body: { wordsLogged?, chaptersLogged?, scenesLogged?, minutesLogged? }
// At least one must be a positive number.

async function logDay(req, res) {
    const projectId = Number(req.params.projectId);
    const userId    = req.user.id;
    const { wordsLogged = 0, chaptersLogged = 0, scenesLogged = 0, minutesLogged = 0 } = req.body;

    const allZero = [wordsLogged, chaptersLogged, scenesLogged, minutesLogged]
        .every(v => !v || Number(v) <= 0);

    if (allZero) {
        return res.status(400).json({
            message: "Provide at least one of: wordsLogged, chaptersLogged, scenesLogged, minutesLogged."
        });
    }

    try {
        const project = await projectService.logDay(projectId, userId, {
            wordsLogged:    Number(wordsLogged)    || 0,
            chaptersLogged: Number(chaptersLogged) || 0,
            scenesLogged:   Number(scenesLogged)   || 0,
            minutesLogged:  Number(minutesLogged)  || 0,
        });
        res.status(200).json({ project });
    } catch (error) {
        if (error.message === "PROJECT_NOT_FOUND")        return res.status(404).json({ message: "Project not found." });
        if (error.message === "UNAUTHORIZED")             return res.status(403).json({ message: "You do not have permission to update this project." });
        if (error.message === "AT_LEAST_ONE_FIELD_REQUIRED") return res.status(400).json({ message: "Provide at least one positive value." });
        console.error("Log day error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

// ─── ENROL PROJECT IN A DAYS CHALLENGE ───────────────────────
// Body: { eventId }
// Project must be PUBLIC before enrolling.

async function enrollInEvent(req, res) {
    const projectId = Number(req.params.projectId);
    const userId    = req.user.id;
    const { eventId } = req.body;

    if (!eventId) {
        return res.status(400).json({ message: "eventId is required." });
    }

    try {
        const entry = await projectService.enrollInEvent(projectId, userId, Number(eventId));
        res.status(200).json({ entry });
    } catch (error) {
        if (error.message === "PROJECT_NOT_FOUND")    return res.status(404).json({ message: "Project not found." });
        if (error.message === "UNAUTHORIZED")          return res.status(403).json({ message: "You do not have permission." });
        if (error.message === "EVENT_NOT_FOUND")       return res.status(404).json({ message: "Event not found." });
        if (error.message === "NOT_A_DAYS_CHALLENGE")  return res.status(400).json({ message: "You can only enrol in a Days Challenge event." });
        if (error.message === "EVENT_NOT_ACTIVE")      return res.status(400).json({ message: "This event is no longer active." });
        if (error.message === "PROJECT_MUST_BE_PUBLIC") return res.status(400).json({ message: "Your project must be set to Public before joining a challenge." });
        if (error.message === "PROJECT_CREATED_AFTER_EVENT_START") return res.status(400).json({ message: "Only projects that existed on the day the challenge started can join." });
        if (error.message === "PROJECT_HAS_EXISTING_STREAK")       return res.status(400).json({ message: "Your project already has an active streak. Only projects with a clean streak (0 days) can join." });
        if (error.message === "DAYS_TARGET_MISMATCH")              return res.status(400).json({ message: "Your project's consecutive days target doesn't match this challenge. Please update your project to match the challenge length, then try again." });
        if (error.message === "USER_ALREADY_ENROLLED")             return res.status(400).json({ message: "You already have a project enrolled in this challenge. Only one project per member is allowed." });
        console.error("Enrol in event error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

// ─── PUBLIC PROJECTS ──────────────────────────────────────────

async function fetchPublicProjects(req, res) {
    try {
        const projects = await projectService.fetchPublicProjects();
        res.status(200).json({ projects });
    } catch (error) {
        console.error("Fetch public projects error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

// ─── DEADLINE ─────────────────────────────────────────────────

async function updateDeadline(req, res) {
    const projectId = req.params.projectId;
    const { deadline, daysPerWeek } = req.body;

    if (new Date(deadline) <= new Date()) {
        return res.status(400).json({ message: "Deadline must be a future date." });
    }

    try {
        const project = await projectService.updateDeadline(Number(projectId), deadline, daysPerWeek);
        res.status(200).json({ project });
    } catch (error) {
        console.error("Update deadline error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

// ─── DASHBOARD ────────────────────────────────────────────────

async function getDailyTarget(req, res) {
    const projectId = Number(req.params.projectId);
    const userId    = Number(req.user.id);

    try {
        const [project, todayTotals] = await Promise.all([
            projectService.fetchProjectById(projectId),
            projectService.fetchTodayTotals(projectId, userId)
        ]);

        if (!project) return res.status(404).json({ message: "Project not found." });

        const trackerSummary = projectService.calculateTrackerSummary(project, todayTotals);
        res.status(200).json({ trackerSummary, todayTotals, project });
    } catch (error) {
        console.error("Daily target error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function getRecentProject(req, res) {
    const userId = Number(req.user.id);

    try {
        const project = await projectService.fetchRecentProject(userId);
        if (!project) return res.status(404).json({ message: "No project found." });

        const todayTotals    = await projectService.fetchTodayTotals(project.id, userId);
        const trackerSummary = projectService.calculateTrackerSummary(project, todayTotals);

        res.status(200).json({ project, trackerSummary, todayTotals });
    } catch (error) {
        console.error("Fetch recent project error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

module.exports = {
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    logWords,
    deleteWords,
    previewDeleteProgress,
    logChapterScene,
    deleteChapterScene,
    logSession,
    logDay,
    enrollInEvent,
    fetchPublicProjects,
    updateDeadline,
    getDailyTarget,
    getRecentProject,
};