// src/controllers/emotionController.js
const emotionService = require("../services/emotionService");
const { publishDailyEmotion } = require("../../jobs/emotioncron.job");
const { embedLength } = require("discord.js");

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function errStatus(msg) {
  if (msg.includes("not found"))                                return 404;
  if (msg.includes("Not authorised"))                          return 403;
  if (msg.includes("already commented"))                       return 409;
  if (msg.includes("at least") || msg.includes("characters")) return 422;
  return 400;
}

// ─── GET ALL EMOTIONS ──────────────────────────────

async function getAllEmotions(req, res) {
  try {
    const emotions = await emotionService.getAllEmotions();

    console.log("emotions count:", emotions.length);

    return res.status(200).json({ emotions });
  } catch (err) {
    console.error("getAllEmotions error:", err);

    return res.status(500).json({
      message: "Failed to fetch emotions",
    });
  }
}

// ─── GET TODAY'S ENTRY (public) ───────────────────────────────────────────────

/**
 * GET /api/emotions/today
 * Public — returns entry shape + counts only. No user flags, no comment bodies.
 */
async function getTodayEntry(req, res) {
  try {
    const entry = await emotionService.getTodayEntry();
    res.json(entry);
  } catch (err) {
    res.status(errStatus(err.message)).json({ message: err.message });
  }
}

// ─── GET ENTRY COMMENTS (authenticated) ──────────────────────────────────────

/**
 * GET /api/emotions/:entryId/comments
 * Authenticated. Returns all comments with per-user liked/isOwn flags.
 * This is intentionally a separate call from getTodayEntry so the route
 * is always authenticated and req.user is always populated.
 */
async function getEntryComments(req, res) {
  try {
    const entryId = Number(req.params.entryId);
    const userId  = Number(req.user.id);
    const result  = await emotionService.getEntryComments(entryId, userId);
    res.json(result);
  } catch (err) {
    res.status(errStatus(err.message)).json({ message: err.message });
  }
}

async function publishToday(req, res) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admins only." });
  }
  try {
    await publishDailyEmotion();
    res.json({ message: "Published." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─── TOGGLE LIKE ─────────────────────────────────────────────────────────────

/**
 * POST /api/emotions/:entryId/like
 * Authenticated. Toggles like on the entry.
 */
async function toggleLike(req, res) {
  try {
    const entryId = Number(req.params.entryId);
    const result  = await emotionService.toggleLike(Number(req.user.id), entryId);
    res.json(result);
  } catch (err) {
    res.status(errStatus(err.message)).json({ message: err.message });
  }
}

// ─── POST COMMENT ─────────────────────────────────────────────────────────────

/**
 * POST /api/emotions/:entryId/comments
 * Authenticated.
 * Body: { content: string }
 * Awards 1 posting point on success.
 */
async function postComment(req, res) {
  try {
    const entryId     = Number(req.params.entryId);
    const { content } = req.body;
    const result      = await emotionService.postComment(Number(req.user.id), entryId, content);
    res.status(201).json(result);
  } catch (err) {
    res.status(errStatus(err.message)).json({ message: err.message });
  }
}

// ─── EDIT COMMENT ─────────────────────────────────────────────────────────────

/**
 * PATCH /api/emotions/comments/:commentId
 * Authenticated. Author only.
 * Body: { content: string }
 */
async function editComment(req, res) {
  try {
    const commentId   = Number(req.params.commentId);
    const { content } = req.body;
    const updated     = await emotionService.editComment(Number(req.user.id), commentId, content);
    res.json(updated);
  } catch (err) {
    res.status(errStatus(err.message)).json({ message: err.message });
  }
}

// ─── TOGGLE COMMENT LIKE ─────────────────────────────────────────────────────

/**
 * POST /api/emotions/comments/:commentId/like
 * Authenticated.
 */
async function toggleCommentLike(req, res) {
  try {
    const commentId = Number(req.params.commentId);
    const result    = await emotionService.toggleCommentLike(Number(req.user.id), commentId);
    res.json(result);
  } catch (err) {
    res.status(errStatus(err.message)).json({ message: err.message });
  }
}

// ─── PIN COMMENT (admin only) ─────────────────────────────────────────────────

/**
 * PATCH /api/emotions/comments/:commentId/pin
 * Admin only.
 */
async function pinComment(req, res) {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Not authorised — admins only." });
    }
    const commentId = Number(req.params.commentId);
    const result    = await emotionService.pinComment(commentId);
    res.json(result);
  } catch (err) {
    res.status(errStatus(err.message)).json({ message: err.message });
  }
}

module.exports = {
  getAllEmotions,
  getTodayEntry,
  getEntryComments,
  publishToday,
  toggleLike,
  postComment,
  editComment,
  toggleCommentLike,
  pinComment,
};