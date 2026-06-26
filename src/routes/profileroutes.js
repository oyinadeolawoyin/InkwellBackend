// src/routes/profileRoutes.js

const express = require("express");
const router  = express.Router();
const { getProfile } = require("../controllers/profilecontroller");

// GET /api/profile/:userId
// Public — no auth required. Returns the full public profile bundle.
router.get("/:userId", getProfile);

module.exports = router;