require("dotenv").config();
const todolistService = require("../services/todolistService");
const projectService  = require("../services/projectService");

async function createTodolist(req, res) {
    const { task, index, markComplete } = req.body;
    const projectId = Number(req.params.projectId);
    const userId    = req.user.id;

    if (!task || !task.trim()) {
        return res.status(400).json({ message: "Task text is required." });
    }

    try {
        const project = await projectService.fetchProjectById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found." });

        const todolist = await todolistService.createTodolist({ task, index, markComplete, projectId, userId });
        res.status(201).json({ todolist });
    } catch (error) {
        console.error("Create Todolist error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

// FIX: taskId now comes from req.body (matching the route), not req.params
async function deleteTodolist(req, res) {
    const taskId = Number(req.body.taskId);

    if (!taskId) return res.status(400).json({ message: "taskId is required." });

    try {
        // FIX: was calling fetchListById(listId) — wrong variable name and wrong service
        const task = await todolistService.fetchListById(taskId);
        if (!task) return res.status(404).json({ message: "Task not found." });

        await todolistService.deleteTodolist(taskId);
        res.status(200).json({ message: "Task deleted successfully." });
    } catch (error) {
        console.error("Delete Todolist error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

// FIX: taskId now from req.body, was calling wrong service (projectService.fetchListtById — typo)
async function markListComplete(req, res) {
    const { taskId, markComplete } = req.body;

    if (!taskId) return res.status(400).json({ message: "taskId is required." });

    try {
        const task = await todolistService.fetchListById(Number(taskId));
        if (!task) return res.status(404).json({ message: "Task not found." });

        const todolist = await todolistService.markListComplete(Number(taskId), markComplete);
        res.status(200).json({ todolist });
    } catch (error) {
        console.error("Mark list error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

// FIX: was calling projectService.fetchListById instead of projectService.fetchProjectById
async function fetchCompletedTask(req, res) {
    const projectId = Number(req.params.projectId);

    try {
        const project = await projectService.fetchProjectById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found." });

        const todolist = await todolistService.fetchCompletedTask(projectId);
        res.status(200).json({ todolist });
    } catch (error) {
        console.error("Fetch completed task error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

// FIX: same as above
async function fetchActiveTask(req, res) {
    const projectId = Number(req.params.projectId);

    try {
        const project = await projectService.fetchProjectById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found." });

        const todolist = await todolistService.fetchActiveTask(projectId);
        res.status(200).json({ todolist });
    } catch (error) {
        console.error("Fetch active task error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function fetchAllTasks(req, res) {
    const projectId = Number(req.params.projectId);

    try {
        const project = await projectService.fetchProjectById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found." });

        const todolist = await todolistService.fetchAllTasks(projectId);
        res.status(200).json({ todolist });
    } catch (error) {
        console.error("Fetch all tasks error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

module.exports = {
    createTodolist,
    deleteTodolist,
    markListComplete,
    fetchCompletedTask,
    fetchActiveTask,
    fetchAllTasks,
};