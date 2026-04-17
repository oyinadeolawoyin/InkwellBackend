const express = require("express");
const router  = express.Router();
const projectController = require("../controllers/projectController");
const { authenticateJWT } = require("../config/jwt");

// ─── Static routes (must be before /:projectId) ───────────────
router.get("/myProjects",     authenticateJWT, projectController.fetchProjects);
router.get("/public/all",                      projectController.fetchPublicProjects);
router.get("/recentProject",  authenticateJWT, projectController.getRecentProject);
router.post("/createProject", authenticateJWT, projectController.createProject);

// ─── Dynamic project routes ────────────────────────────────────
router.get( "/:projectId/dashboard",       authenticateJWT, projectController.getDailyTarget);
router.post("/:projectId/updateProject",   authenticateJWT, projectController.updateProject);
router.post("/:projectId/deleteProject",   authenticateJWT, projectController.deleteProject);
router.post("/:projectId/updateDeadline",  authenticateJWT, projectController.updateDeadline);

// ─── Word tracking ────────────────────────────────────────────
router.post("/:projectId/logWords",        authenticateJWT, projectController.logWords);
// Step 1 — preview: returns warning, writes nothing
router.post("/:projectId/previewDelete",   authenticateJWT, projectController.previewDeleteProgress);
// Step 2 — confirmed deletes
router.post("/:projectId/deleteWords",     authenticateJWT, projectController.deleteWords);

// ─── Chapter / Scene tracking ─────────────────────────────────
router.post("/:projectId/logChapterScene",    authenticateJWT, projectController.logChapterScene);
// previewDelete covers chapters & scenes too (pass field: "chapters" or "scenes")
router.post("/:projectId/deleteChapterScene", authenticateJWT, projectController.deleteChapterScene);

// ─── Session tracking ─────────────────────────────────────────
router.post("/:projectId/logSession", authenticateJWT, projectController.logSession);

module.exports = router;