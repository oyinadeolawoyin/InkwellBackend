const express = require("express");
const router = express.Router();
const missionController = require("../controllers/missionController");
const { authenticateJWT } = require("../config/jwt");

router.get("/active/:userId", missionController.getActiveMissions);
router.get("/recent/:userId", missionController.getRecentMissions);
router.get("/all/:userId", missionController.getAllMissions);
router.get("/progress/:userId", missionController.getMissionProgress);
router.post("/claim-rank", authenticateJWT, missionController.claimRank);
router.post("/", authenticateJWT, missionController.createMission);

module.exports = router;
