const express = require("express");
const router = express.Router();
const sprintController = require("../controllers/sprintController");
const { authenticateJWT } = require("../config/jwt");

router.get("/", sprintController.activeSprint); //This is for the public workspace
router.post("/createSprint", authenticateJWT, sprintController.createSprint); 
router.post("/:sprintId/pauseSprint", authenticateJWT, sprintController.pauseSprint);
router.post("/:sprintId/endSprint", authenticateJWT, sprintController.endSprint);

module.exports = router;