const express = require("express");
const router  = express.Router();
const todolistController = require("../controllers/todolistController");
const { authenticateJWT } = require("../config/jwt");

// FIX: static routes must come before dynamic /:projectId routes
// FIX: markcomplete and delete now use req.body for IDs (matching controller)
router.post("/markcomplete",  authenticateJWT, todolistController.markListComplete);
router.delete("/delete",      authenticateJWT, todolistController.deleteTodolist);

// Dynamic routes
router.post("/:projectId",                authenticateJWT, todolistController.createTodolist);
router.get("/:projectId/all",             authenticateJWT, todolistController.fetchAllTasks);
router.get("/:projectId/completedTask",   authenticateJWT, todolistController.fetchCompletedTask);
router.get("/:projectId/activeTask",      authenticateJWT, todolistController.fetchActiveTask);

module.exports = router;