const express = require("express");
const router = express.Router();
const blogController = require("../controllers/blogController");
const { authenticateJWT } = require("../config/jwt");
const upload = require("../config/multer");

// ─── Inline image upload (rich-text editor) ────────────────────────────────────

router.post("/upload", authenticateJWT, upload.single("file"), blogController.uploadImage);

// ─── Series (public read, admin write) ────────────────────────────────────────
// Must be defined before "/:postId" so "/series" and "/series/:slug" aren't
// swallowed by the post-id route.

router.get("/series", blogController.getSeriesList);
router.get("/series/:slug", blogController.getSeries);

router.post("/series", authenticateJWT, upload.single("cover"), blogController.createSeries);
router.put("/series/:seriesId", authenticateJWT, upload.single("cover"), blogController.updateSeries);
router.delete("/series/:seriesId", authenticateJWT, blogController.deleteSeries);

// ─── Posts (public read, admin write) ────────────────────────────────────────

router.get("/", blogController.getPosts);
router.get("/:postId", blogController.getPost);

router.post("/", authenticateJWT, upload.single("media"), blogController.createPost);
router.put("/:postId", authenticateJWT, upload.single("media"), blogController.updatePost);
router.delete("/:postId", authenticateJWT, blogController.deletePost);
router.post("/:postId/like", authenticateJWT, blogController.toggleLike);
router.post("/:postId/pin", authenticateJWT, blogController.togglePin);

// ─── Comments (public read, authenticated write) ──────────────────────────────

router.get("/:postId/comments", blogController.getComments);
router.post("/:postId/comments", authenticateJWT, blogController.addComment);
router.delete("/:postId/comments/:commentId", authenticateJWT, blogController.deleteComment);

// ─── Replies (public read, authenticated write) ───────────────────────────────

router.get("/:postId/comments/:commentId/replies", blogController.getReplies);
router.post("/:postId/comments/:commentId/replies", authenticateJWT, blogController.addReply);
router.delete("/:postId/comments/:commentId/replies/:replyId", authenticateJWT, blogController.deleteReply);

module.exports = router;