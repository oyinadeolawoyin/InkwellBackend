const express = require("express");
const router = express.Router();
const writingProgressController = require("../controllers/writingProgressController");
const { authenticateJWT } = require("../config/jwt");

router.get("/", authenticateJWT, writingProgressController.writingWeeklyProgress)
router.get("/today", authenticateJWT, writingProgressController.getDailyProgress); // Get today's progress
router.get("/week", authenticateJWT, writingProgressController.getWeeklyProgress); // Get this week's progress

module.exports = router;