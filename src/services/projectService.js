const prisma = require("../config/prismaClient");

async function fetchProjects(userId) {
    return prisma.project.findMany({
        where: { userId }
    })
}

async function createProject(userId, title, description, link) {
    return prisma.project.create({
        data: {
            userId,
            title,
            description,
            link
        }
    })
}

async function updateProject(projectId, title, description, link) {
    return prisma.project.update({
        where: { id: projectId },
        data: {
            title,
            description,
            link
        }
    })
}

async function deleteProject(projectId) {
    return prisma.project.delete({
        where: { id: projectId }
    })
}

module.exports = {
    fetchProjects,
    createProject,
    updateProject,
    deleteProject
}