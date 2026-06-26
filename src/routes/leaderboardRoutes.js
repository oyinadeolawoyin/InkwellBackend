// src/routes/leaderboardRoutes.js
const express               = require("express");
const router                = express.Router();
const leaderboardController = require("../controllers/leaderboardController");

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────
// All leaderboard / members data is public — no authentication required.

// Combined endpoint: all three boards in one request (homepage uses this)
// GET /api/leaderboard
router.get("/", leaderboardController.getHomepageLeaderboards);

// Recent activity for homepage (thread commenters today; sprinters + critiquers last 2 days)
// GET /api/leaderboard/homepage-activity
router.get("/homepage-activity", leaderboardController.getHomepageRecentActivity);

// Individual leaderboard endpoints
// GET /api/leaderboard/critiquers
router.get("/critiquers", leaderboardController.getTopCritiquers);

// GET /api/leaderboard/sprinters
router.get("/sprinters", leaderboardController.getTopSprinters);

// GET /api/leaderboard/practice-writers
router.get("/practice-writers", leaderboardController.getTopPracticeWriters);

// Members page — all data (leaderboards + newest + publications) in one shot
// GET /api/leaderboard/members
router.get("/members", leaderboardController.getMembersPageData);

// Member search by username
// GET /api/leaderboard/members/search?q=partialUsername
router.get("/members/search", leaderboardController.searchMembers);

module.exports = router;