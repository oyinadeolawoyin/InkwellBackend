require("dotenv").config();
const projectService = require("../services/projectService");

async function fetchProjects(req, res) {
    const userId = req.params.userId;

    try{ 
        const projects = await projectService.fetchProjects(Number(userId));
        res.status(201).json({ projects });
    } catch(error) {
        console.error("Fetch project error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function createProject(req, res) {
    const { title, description, link } = req.body;
    const userId = req.user.id;

    try{ 
        const project = await projectService.createProject(Number(userId), title, description, link);
        res.status(201).json({ project });
    } catch(error) {
        console.error("Create project error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function updateProject(req, res) {
    const { title, description, link } = req.body;
    const projectId = req.params.projectId;

    try{ 
        const project = await projectService.updateProject(Number(projectId), title, description, link);
        res.status(201).json({ project });
    } catch(error) {
        console.error("Update project error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

async function deleteProject(req, res) {
    const projectId = req.params.projectId;

    try{ 
        await projectService.deleteProject(Number(projectId));
        res.status(201).json({ message: "Project delete successfully." });
    } catch(error) {
        console.error("Delete project error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

module.exports = {
    fetchProjects,
    createProject,
    updateProject,
    deleteProject
}