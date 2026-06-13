// src/routes/challengeRoutes.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/challengecontroller");

const { authenticateJWT } = require("../config/jwt");

// ─── STATS (public) ───────────────────────────────────────────────────────────

// Recently joined, streak leaders, today's completions, total active count
router.get("/stats", ctrl.getChallengeStats);

// ─── MY PARTICIPATION (auth required) ────────────────────────────────────────

// Get current active participation + last 30 check-ins
router.get("/my-participation", authenticateJWT, ctrl.getMyParticipation);

// ─── JOIN / LEAVE ─────────────────────────────────────────────────────────────

// Join the daily challenge { goalValue: Int, goalType: "WORDS"|"CHAPTERS"|"SCENES"|"DURATION" }
router.post("/join",  authenticateJWT, ctrl.joinChallenge);
// Leave the daily challenge
router.post("/leave", authenticateJWT, ctrl.leaveChallenge);

// ─── GOAL ─────────────────────────────────────────────────────────────────────

// Update daily goal mid-challenge { goalValue?: Int, goalType?: string }
router.patch("/goal", authenticateJWT, ctrl.updateGoal);

// ─── CHECK-IN ─────────────────────────────────────────────────────────────────

// Log today's progress { countLogged: Int, mode?: "replace"|"add"|"subtract" }
router.post("/checkin", authenticateJWT, ctrl.checkIn);

// ─── REMINDERS ────────────────────────────────────────────────────────────────

// Toggle daily reminder { enabled: Boolean }
router.patch("/reminders", authenticateJWT, ctrl.toggleReminders);

module.exports = router;