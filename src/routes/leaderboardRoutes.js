// src/routes/leaderboardRoutes.js
const express             = require("express");
const router              = express.Router();
const leaderboardController = require("../controllers/leaderboardController");

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────
// All leaderboard data is public — no authentication required.

// Combined endpoint: all three boards in one request (homepage uses this)
// GET /api/leaderboard
router.get("/", leaderboardController.getHomepageLeaderboards);

// Individual endpoints — useful if you ever want to show a dedicated page
// GET /api/leaderboard/critiquers
router.get("/critiquers", leaderboardController.getTopCritiquers);

// GET /api/leaderboard/sprinters
router.get("/sprinters", leaderboardController.getTopSprinters);

// GET /api/leaderboard/practice-writers
router.get("/practice-writers", leaderboardController.getTopPracticeWriters);

module.exports = router;