// src/routes/feedbackRoutes.js
const express  = require("express");
const router   = express.Router();
const ctrl     = require("../controllers/feedbackController");

const { authenticateJWT } = require("../config/jwt");

// ─── POINTS ──────────────────────────────────────────────────────────────────

router.get("/submissions/spotlight",        ctrl.getSpotlight);
router.get("/submissions/queue",            ctrl.getQueue);
router.get("/submissions/queue/genres",     ctrl.getQueueGenres);
router.get("/submissions/outdated",         ctrl.getArchive);
router.get("/submissions/outdated/genres",  ctrl.getArchiveGenres);

router.get("/points/me", authenticateJWT, ctrl.getMyWallet);
router.get("/points/:userId",  authenticateJWT, ctrl.getUserWallet);

// ─── SUBMISSIONS ─────────────────────────────────────────────────────────────

router.get("/submissions/mine", authenticateJWT, ctrl.getUserSubmissions);
router.get("/submissions",     ctrl.getSubmissions);
router.get("/submissions/:id", authenticateJWT, ctrl.getSubmissionById);
router.post("/submissions",    authenticateJWT, ctrl.createSubmission);
router.patch("/submissions/:id", authenticateJWT, ctrl.updateSubmission);
router.delete("/submissions/:id", authenticateJWT, ctrl.deleteSubmission);

// ─── RESPONSES BY USER (profile page) ───────────────────────────────────────
router.get("/responses/by-user/:userId", ctrl.getResponsesByUser);

// ─── FEEDBACK RESPONSES (full critiques) ─────────────────────────────────────

router.post("/submissions/:id/responses",    authenticateJWT, ctrl.createResponse);
router.patch("/responses/:responseId",       authenticateJWT, ctrl.updateResponse);
router.post("/responses/:responseId/upvote", authenticateJWT, ctrl.toggleResponseUpvote);

// ─── PARAGRAPH COMMENTS ──────────────────────────────────────────────────────

router.post("/submissions/:id/comments",     authenticateJWT, ctrl.createParagraphComment);
router.get("/submissions/:id/comments",      ctrl.getParagraphComments);
router.patch("/comments/:commentId",         authenticateJWT, ctrl.updateParagraphComment);
router.delete("/comments/:commentId",        authenticateJWT, ctrl.deleteParagraphComment);
router.post("/comments/:commentId/upvote",   authenticateJWT, ctrl.toggleParagraphCommentUpvote);

// ─── PARAGRAPH COMMENT REPLIES ───────────────────────────────────────────────

router.post("/comments/:commentId/replies",            authenticateJWT, ctrl.createParagraphCommentReply);
router.delete("/comments/:commentId/replies/:replyId", authenticateJWT, ctrl.deleteParagraphCommentReply);


module.exports = router;