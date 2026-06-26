// src/controllers/leaderboardController.js
const leaderboardService = require("../services/leaderboardService");

// GET /api/leaderboard — all three boards in one request, always top 5
async function getHomepageLeaderboards(req, res) {
  try {
    const data = await leaderboardService.getHomepageLeaderboards();
    res.status(200).json(data);
  } catch (error) {
    console.error("getHomepageLeaderboards error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// GET /api/leaderboard/critiquers
async function getTopCritiquers(req, res) {
  try {
    const data = await leaderboardService.getTopCritiquers();
    res.status(200).json({ critiquers: data });
  } catch (error) {
    console.error("getTopCritiquers error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// GET /api/leaderboard/sprinters
async function getTopSprinters(req, res) {
  try {
    const data = await leaderboardService.getTopSprinters();
    res.status(200).json({ sprinters: data });
  } catch (error) {
    console.error("getTopSprinters error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// GET /api/leaderboard/practice-writers
async function getTopPracticeWriters(req, res) {
  try {
    const data = await leaderboardService.getTopPracticeWriters();
    res.status(200).json({ practiceWriters: data });
  } catch (error) {
    console.error("getTopPracticeWriters error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// GET /api/leaderboard/members — full members page data in one shot
async function getMembersPageData(req, res) {
  try {
    const data = await leaderboardService.getMembersPageData();
    res.status(200).json(data);
  } catch (error) {
    console.error("getMembersPageData error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// GET /api/leaderboard/members/search?q=username
async function searchMembers(req, res) {
  try {
    const query = req.query.q || "";
    const results = await leaderboardService.searchMembers(query);
    res.status(200).json({ results });
  } catch (error) {
    console.error("searchMembers error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// GET /api/leaderboard/homepage-activity — recent activity for the homepage
async function getHomepageRecentActivity(req, res) {
  try {
    const data = await leaderboardService.getHomepageRecentActivity();
    res.status(200).json(data);
  } catch (error) {
    console.error("getHomepageRecentActivity error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

module.exports = {
  getHomepageLeaderboards,
  getHomepageRecentActivity,
  getTopCritiquers,
  getTopSprinters,
  getTopPracticeWriters,
  getMembersPageData,
  searchMembers,
};