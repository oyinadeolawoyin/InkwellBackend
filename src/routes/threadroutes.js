const express = require("express");
const router = express.Router();
const threadController = require("../controllers/threadcontroller");
const { authenticateJWT } = require("../config/jwt");
const upload = require("../config/multer");

// ─── Member search for @mention autocomplete ─────────────────────────────────

router.get("/members/search", authenticateJWT, threadController.searchMembers);

// ─── Daily challenge thread (public) ─────────────────────────────────────────

router.get("/daily-challenge", threadController.getDailyThread);

// ─── Profile stats (authenticated) ───────────────────────────────────────────

router.get("/stats/mine", authenticateJWT, threadController.getMyDiscussionStats);

// ─── Threads (public read, admin write) ───────────────────────────────────────

router.get("/",          threadController.getThreads);
router.get("/:threadId", threadController.getThread);

router.post("/",             authenticateJWT, upload.single("media"), threadController.createThread);
router.put("/:threadId",     authenticateJWT, upload.single("media"), threadController.updateThread);
router.delete("/:threadId",  authenticateJWT,                         threadController.deleteThread);
router.post("/:threadId/like", authenticateJWT,                       threadController.toggleLike);

// ─── Comments (public read, authenticated write) ───────────────────────────────

const MEDIA_FIELDS = [
  { name: "media_0", maxCount: 1 },
  { name: "media_1", maxCount: 1 },
  { name: "media_2", maxCount: 1 },
  { name: "media_3", maxCount: 1 },
  { name: "media_4", maxCount: 1 },
];

router.get("/:threadId/comments",              threadController.getComments);
router.post("/:threadId/comments",             authenticateJWT, upload.fields(MEDIA_FIELDS), threadController.addComment);
router.delete("/:threadId/comments/:commentId", authenticateJWT, threadController.deleteComment);
router.post("/:threadId/comments/:commentId/like", authenticateJWT, threadController.toggleCommentLike);

// ─── Replies (public read, authenticated write) ────────────────────────────────

router.get("/:threadId/comments/:commentId/replies",              threadController.getReplies);
router.post("/:threadId/comments/:commentId/replies",             authenticateJWT, upload.fields(MEDIA_FIELDS), threadController.addReply);
router.delete("/:threadId/comments/:commentId/replies/:replyId",  authenticateJWT, threadController.deleteReply);
router.post("/:threadId/comments/:commentId/replies/:replyId/like", authenticateJWT, threadController.toggleReplyLike);

module.exports = router;