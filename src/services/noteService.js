const prisma = require("../config/prismaClient");

// FIX: was using `where` for projectId instead of `data`
async function createNote({ title, note, projectId, userId }) {
    return await prisma.note.create({
        data: { title, note, projectId, userId }
    });
}

async function deleteNote(noteId) {
    return await prisma.note.delete({
        where: { id: noteId },   // FIX: field is `id`, not `noteId`
    });
}

async function fetchNoteById(noteId) {
    return prisma.note.findUnique({
        where: { id: noteId },   // FIX: field is `id`, not `noteId`
    });
}

// FIX: was querying prisma.project instead of prisma.note, wrong sort syntax
async function fetchNotes(projectId) {
    return prisma.note.findMany({
        where:   { projectId },
        orderBy: { createdAt: "desc" },
    });
}

module.exports = {
    createNote,
    deleteNote,
    fetchNoteById,
    fetchNotes,
};