const prisma = require("../config/prismaClient");

// FIX: was using `where` for projectId instead of putting it inside `data`
async function createTodolist({ task, index, markComplete, projectId, userId }) {
    return await prisma.todolist.create({
        data: { task, index: index ?? 0, markComplete: markComplete ?? false, projectId, userId }
    });
}

async function deleteTodolist(taskId) {
    return await prisma.todolist.delete({
        where: { id: taskId },   // FIX: field is `id`, not `taskId`
    });
}

// FIX: argument order was swapped (was markComplete, taskId — should match call site)
async function markListComplete(taskId, markComplete) {
    return await prisma.todolist.update({
        where: { id: taskId },   // FIX: field is `id`, not `taskId`
        data:  { markComplete }
    });
}

async function fetchListById(taskId) {
    return prisma.todolist.findUnique({
        where: { id: taskId },   // FIX: field is `id`, not `projectId`
    });
}

// FIX: was querying prisma.project, wrong field name (mark vs markComplete), wrong sort syntax, typo `flase`
async function fetchCompletedTask(projectId) {
    return prisma.todolist.findMany({
        where:   { projectId, markComplete: true },
        orderBy: { createdAt: "desc" },
    });
}

async function fetchActiveTask(projectId) {
    return prisma.todolist.findMany({
        where:   { projectId, markComplete: false },
        orderBy: { createdAt: "desc" },
    });
}

async function fetchAllTasks(projectId) {
    return prisma.todolist.findMany({
        where:   { projectId },
        orderBy: { createdAt: "desc" },
    });
}

module.exports = {
    createTodolist,
    deleteTodolist,
    markListComplete,
    fetchListById,
    fetchCompletedTask,
    fetchActiveTask,
    fetchAllTasks,
};