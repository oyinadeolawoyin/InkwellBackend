// src/controllers/profileController.js

const profileService = require("../services/profileservice");

/**
 * GET /api/profile/:userId
 *
 * Returns the public profile for any writer.
 * No authentication required — the data returned is all public.
 */
async function getProfile(req, res) {
  const userId = Number(req.params.userId);

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ message: "Invalid user ID." });
  }

  try {
    const data = await profileService.getPublicProfile(userId);
    res.json(data);
  } catch (err) {
    if (err.message === "User not found") {
      return res.status(404).json({ message: "Writer not found." });
    }
    console.error("Profile fetch error:", err);
    res.status(500).json({ message: "Something went wrong." });
  }
}

module.exports = { getProfile };