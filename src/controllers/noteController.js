require("dotenv").config();
const noteService    = require("../services/noteService");
const projectService = require("../services/projectService");

async function createNote(req, res) {
    const { title, note } = req.body;
    const projectId = Number(req.params.projectId);
    const userId    = req.user.id;

    if (!note || !note.trim()) {
        return res.status(400).json({ message: "Note content is required." });
    }

    try {
        const project = await projectService.fetchProjectById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found." });

        const noteContext = await noteService.createNote({ title, note, projectId, userId });
        res.status(201).json({ note: noteContext });
    } catch (error) {
        console.error("Create note error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

// FIX: was calling deleteNote(noteId) recursively instead of noteService.fetchNoteById
//      also noteId now comes from req.body to match the route (DELETE /delete)
async function deleteNote(req, res) {
    const noteId = Number(req.body.noteId);

    if (!noteId) return res.status(400).json({ message: "noteId is required." });

    try {
        const note = await noteService.fetchNoteById(noteId);
        if (!note) return res.status(404).json({ message: "Note not found." });

        await noteService.deleteNote(noteId);
        res.status(200).json({ message: "Note deleted successfully." });
    } catch (error) {
        console.error("Delete note error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

// FIX: was calling projectService.fetchListById instead of projectService.fetchProjectById
async function fetchNotes(req, res) {
    const projectId = Number(req.params.projectId);

    try {
        const project = await projectService.fetchProjectById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found." });

        const notes = await noteService.fetchNotes(projectId);
        res.status(200).json({ notes });
    } catch (error) {
        console.error("Fetch notes error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

module.exports = {
    createNote,
    deleteNote,
    fetchNotes,
};