const express = require("express");
const router = express.Router();
const sprintController = require("../controllers/sprintController");
const { authenticateJWT } = require("../config/jwt");

router.get("/", sprintController.activeSprint); //This is for the public workspace
router.get("/sprintsOfTheDay", sprintController.sprintOfTheDay); //These are the sprints done in a day from different users
router.get("/activeGroupSprints", sprintController.fecthAllActiveGroupSprints); //public route;
router.get("/GroupSprintsOfTheDay", sprintController.fetchGroupSprintsOfTheDay); //public route;

router.get("/:userId/sprintDays", sprintController.fetchSprintDays); //This is for the days users had sprinted
router.get("/loginUserSession", authenticateJWT, sprintController.loginUserSession); //This is to get the log in user session

router.post("/startSprint", authenticateJWT, sprintController.startSprint);
router.post("/:sprintId/endSprint", authenticateJWT, sprintController.endSprint); 
router.post("/:sprintId/pause/:isPause", authenticateJWT, sprintController.pauseSprint);

router.get("/:groupSprintId", authenticateJWT, sprintController.fetchGroupSprint);

router.post("/startGroupSprint", authenticateJWT, sprintController.startGroupSprint);
router.post("/:groupSprintId/endGroupSprint", authenticateJWT, sprintController.endGroupSprint);
router.post("/:sprintId/like", authenticateJWT, sprintController.likeSprint);

module.exports = router;