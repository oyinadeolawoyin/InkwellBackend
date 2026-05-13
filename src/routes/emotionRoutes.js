// src/routes/emotionRoutes.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/emotionController");

const { authenticateJWT } = require("../config/jwt");

// ─── TODAY'S ENTRY ────────────────────────────────────────────────────────────

// Fully public — returns entry shape + counts only (no user flags, no comments)
router.get("/today", ctrl.getTodayEntry);

// Admin trigger
router.post("/publish-today", authenticateJWT, ctrl.publishToday);

// ─── ENTRY COMMENTS (authenticated) ──────────────────────────────────────────

// Separate authenticated route so req.user is always populated.
// Returns all comments + per-user flags (userHasCommented, userHasLiked, etc.)
router.get("/:entryId/comments", authenticateJWT, ctrl.getEntryComments);

// ─── ENTRY LIKES ─────────────────────────────────────────────────────────────

router.post("/:entryId/like", authenticateJWT, ctrl.toggleLike);

// ─── POST / EDIT COMMENT ─────────────────────────────────────────────────────

// One comment per user per entry, min 20 chars, awards 1 pt. No delete route.
router.post("/:entryId/comments",    authenticateJWT, ctrl.postComment);
router.patch("/comments/:commentId", authenticateJWT, ctrl.editComment);

// ─── COMMENT LIKES ───────────────────────────────────────────────────────────

router.post("/comments/:commentId/like", authenticateJWT, ctrl.toggleCommentLike);

// ─── ADMIN — PIN A COMMENT ───────────────────────────────────────────────────

router.patch("/comments/:commentId/pin", authenticateJWT, ctrl.pinComment);

module.exports = router;