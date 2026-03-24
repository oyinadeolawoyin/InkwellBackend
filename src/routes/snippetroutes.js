const express = require("express");
const router = express.Router();
const snippetController = require("../controllers/snippetcontroller");
const { authenticateJWT } = require("../config/jwt");
const upload = require("../config/multer");

// ─── Snippets (public read, authenticated write) ──────────────────────────────

router.get("/", snippetController.getSnippets);
router.get("/user/:userId", snippetController.getSnippetsByUser);
router.get("/:snippetId", snippetController.getSnippet);

router.post("/", authenticateJWT, upload.single("media"), snippetController.createSnippet);
router.put("/:snippetId", authenticateJWT, upload.single("media"), snippetController.updateSnippet);
router.delete("/:snippetId", authenticateJWT, snippetController.deleteSnippet);
router.post("/:snippetId/like", authenticateJWT, snippetController.toggleLike);

// ─── Comments (public read, authenticated write) ──────────────────────────────

router.get("/:snippetId/comments", snippetController.getComments);
router.post("/:snippetId/comments", authenticateJWT, snippetController.addComment);
router.delete("/:snippetId/comments/:commentId", authenticateJWT, snippetController.deleteComment);

// ─── Replies (public read, authenticated write) ───────────────────────────────

router.get("/:snippetId/comments/:commentId/replies", snippetController.getReplies);
router.post("/:snippetId/comments/:commentId/replies", authenticateJWT, snippetController.addReply);
router.delete("/:snippetId/comments/:commentId/replies/:replyId", authenticateJWT, snippetController.deleteReply);
router.post("/:snippetId/comments/:commentId/like", authenticateJWT, snippetController.toggleCommentLike);
router.post("/:snippetId/comments/:commentId/replies/:replyId/like", authenticateJWT, snippetController.toggleReplyLike);

module.exports = router;