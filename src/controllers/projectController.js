require("dotenv").config();
const projectService = require("../services/projectService");

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

async function createProject(req, res) {
    const {
        title, description, link, genre, visibility,
        targetWordCount, deadline, daysPerWeek,
        targetChapters, targetScenes, sessionGoalType, sessionGoalCount
    } = req.body;
    const userId = req.user.id;

    if (deadline && new Date(deadline) <= new Date()) {
        return res.status(400).json({ message: "Deadline must be a future date." });
    }

    try {
        const project = await projectService.createProject(
            Number(userId), title, description, link, genre, visibility,
            targetWordCount, deadline, daysPerWeek,
            targetChapters, targetScenes, sessionGoalType, sessionGoalCount
        );
        res.status(201).json({ project });
    } catch (error) {
        console.error("Create project error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function updateProject(req, res) {
    const {
        title, description, link, genre, visibility,
        targetWordCount, deadline, daysPerWeek, status,
        targetChapters, targetScenes, sessionGoalType, sessionGoalCount
    } = req.body;
    const projectId = req.params.projectId;
    const userId    = req.user.id;

    if (deadline && new Date(deadline) <= new Date()) {
        return res.status(400).json({ message: "Deadline must be a future date." });
    }

    try {
        const project = await projectService.updateProject(
            Number(projectId), userId, title, description, link, genre, visibility,
            targetWordCount, deadline, daysPerWeek, status,
            targetChapters, targetScenes, sessionGoalType, sessionGoalCount
        );
        res.status(200).json({ project });
    } catch (error) {
        if (error.message === "PROJECT_NOT_FOUND") return res.status(404).json({ message: "Project not found." });
        if (error.message === "UNAUTHORIZED")       return res.status(403).json({ message: "You do not have permission to update this project." });
        console.error("Update project error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

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
// Step 1: call this first — returns warning data, writes nothing to DB.
// Frontend shows: "Deleting X words will raise your daily target from Y → Z. Confirm?"

async function previewDeleteProgress(req, res) {
    const projectId = Number(req.params.projectId);
    const userId    = req.user.id;
    // field: "words" | "chapters" | "scenes"
    // amount: how many to remove
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
// Step 2: writer saw the warning and confirmed. Now actually subtract.

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

    try {
        const project = await projectService.logSession(Number(projectId), userId);
        res.status(200).json({ project });
    } catch (error) {
        if (error.message === "PROJECT_NOT_FOUND") return res.status(404).json({ message: "Project not found." });
        if (error.message === "UNAUTHORIZED")       return res.status(403).json({ message: "You do not have permission to update this project." });
        console.error("Log session error:", error);
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
    fetchPublicProjects,
    updateDeadline,
    getDailyTarget,
    getRecentProject,
};