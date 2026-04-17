const express = require("express");
const router  = express.Router();
const noteController = require("../controllers/noteController");
const { authenticateJWT } = require("../config/jwt");

// FIX: static delete route before dynamic /:projectId
router.delete("/delete", authenticateJWT, noteController.deleteNote);

router.post("/:projectId",        authenticateJWT, noteController.createNote);
router.get("/:projectId/notes",   authenticateJWT, noteController.fetchNotes);

module.exports = router;