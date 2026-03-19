const express = require("express");
const router = express.Router();
const blogController = require("../controllers/blogController");
const { authenticateJWT } = require("../config/jwt");
const upload = require("../config/multer");

// ─── Posts (public read, admin write) ────────────────────────────────────────

router.get("/", blogController.getPosts);
router.get("/:postId", blogController.getPost);

router.post("/", authenticateJWT, upload.single("media"), blogController.createPost);
router.put("/:postId", authenticateJWT, upload.single("media"), blogController.updatePost);
router.delete("/:postId", authenticateJWT, blogController.deletePost);
router.post("/:postId/like", authenticateJWT, blogController.toggleLike);

// ─── Comments (public read, authenticated write) ──────────────────────────────

router.get("/:postId/comments", blogController.getComments);
router.post("/:postId/comments", authenticateJWT, blogController.addComment);
router.delete("/:postId/comments/:commentId", authenticateJWT, blogController.deleteComment);

// ─── Replies (public read, authenticated write) ───────────────────────────────

router.get("/:postId/comments/:commentId/replies", blogController.getReplies);
router.post("/:postId/comments/:commentId/replies", authenticateJWT, blogController.addReply);
router.delete("/:postId/comments/:commentId/replies/:replyId", authenticateJWT, blogController.deleteReply);

module.exports = router;
