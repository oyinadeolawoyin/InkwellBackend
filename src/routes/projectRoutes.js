const express = require("express");
const router = express.Router();
const projectController = require("../controllers/projectController");
const { authenticateJWT } = require("../config/jwt");

router.get("/:userId", projectController.fetchProjects);
router.post("/createProject", authenticateJWT, projectController.createProject);
router.post("/:projectId/updateProject", authenticateJWT, projectController.updateProject);
router.post("/:projectId/deleteProject", authenticateJWT, projectController.deleteProject);


module.exports = router;