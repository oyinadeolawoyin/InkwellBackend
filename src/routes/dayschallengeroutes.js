// src/routes/daysChallengeRoutes.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/dayschallengecontroller");

const { authenticateJWT } = require("../config/jwt");

// ─── COMMUNITY FEEDS (public) ─────────────────────────────────────────────────

// All writers currently on an active challenge — progress bars + focuses
router.get("/active",       ctrl.getActiveChallengeWriters);

// Writers who logged today — for challenge page feed and homepage
router.get("/logged-today", ctrl.getWritersWhoLoggedToday);

// ─── CHALLENGE (authenticated) ────────────────────────────────────────────────

// Join a new challenge
// Body: { duration, focuses, storyTitle?, workingGoal, whyNow, goalType, dailyGoal }
router.post("/",      authenticateJWT, ctrl.createChallenge);

// Get own active challenge + full stats
router.get("/mine",   authenticateJWT, ctrl.getMyChallenge);

// Edit challenge info / daily goal (storyTitle, workingGoal, whyNow, dailyGoal only)
router.patch("/",     authenticateJWT, ctrl.updateChallenge);

// Mark challenge done early
router.patch("/complete",   authenticateJWT, ctrl.completeChallenge);

// Undo "mark done early" — restores COMPLETED → ACTIVE if deadline hasn't passed
router.patch("/uncomplete", authenticateJWT, ctrl.uncompleteChallenge);

// Leave / abandon challenge
router.delete("/",    authenticateJWT, ctrl.leaveChallenge);

// ─── PROGRESS LOGGING (authenticated) ────────────────────────────────────────

// Log a day's progress
// Body: { countLogged: number, note?: string, checkInDate?: ISO string }
// Response includes metDailyGoal, isAllDone, updated stats
router.post("/progress", authenticateJWT, ctrl.logProgress);

module.exports = router;