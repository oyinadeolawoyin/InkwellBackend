const blogService = require("../services/blogService");
const { uploadFile, deleteFile } = require("../utilis/fileUploader");
const { notifyUser } = require("../services/notificationService");

// ─── Posts (Admin only for mutations) ────────────────────────────────────────

async function createPost(req, res) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const { title, content, link } = req.body;
  if (!content) return res.status(400).json({ message: "Content is required." });

  try {
    let mediaUrl = null;
    if (req.file) {
      mediaUrl = await uploadFile(req.file);
    }

    const post = await blogService.createPost({ title, content, mediaUrl, link });
    res.status(201).json({ post });

    // Notify all users about the new blog post (fire and forget)
    blogService.getAllUsers().then((users) => {
      const link = `/blog/${post.id}`;
      const postTitle = post.title ? `"${post.title}"` : "a new blog post";
      users.forEach((user) =>
        notifyUser(user, `A new blog post has been published: ${postTitle}`, link).catch(() => {})
      );
    }).catch(() => {});
  } catch (error) {
    console.error("Create blog post error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function getPosts(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  try {
    const result = await blogService.getPosts({ page, limit });
    res.status(200).json(result);
  } catch (error) {
    console.error("Get blog posts error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function getPost(req, res) {
  const postId = Number(req.params.postId);

  try {
    const post = await blogService.getPost(postId);
    if (!post) return res.status(404).json({ message: "Post not found." });
    res.status(200).json({ post });
  } catch (error) {
    console.error("Get blog post error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function updatePost(req, res) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const postId = Number(req.params.postId);
  const { title, content, link } = req.body;

  try {
    const existing = await blogService.findPost(postId);
    if (!existing) return res.status(404).json({ message: "Post not found." });

    let mediaUrl;
    if (req.file) {
      if (existing.mediaUrl) await deleteFile(existing.mediaUrl);
      mediaUrl = await uploadFile(req.file);
    }

    const post = await blogService.updatePost(postId, { title, content, mediaUrl, link });
    res.status(200).json({ post });
  } catch (error) {
    console.error("Update blog post error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function deletePost(req, res) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const postId = Number(req.params.postId);

  try {
    const existing = await blogService.findPost(postId);
    if (!existing) return res.status(404).json({ message: "Post not found." });

    const mediaUrl = await blogService.deletePost(postId);
    if (mediaUrl) await deleteFile(mediaUrl);

    res.status(200).json({ message: "Post deleted successfully." });
  } catch (error) {
    console.error("Delete blog post error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function toggleLike(req, res) {
  const postId = Number(req.params.postId);
  const userId = req.user.id;

  try {
    const result = await blogService.togglePostLike(userId, postId);
    res.status(200).json(result);
  } catch (error) {
    console.error("Toggle blog like error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// ─── Comments ─────────────────────────────────────────────────────────────────

async function getComments(req, res) {
  const postId = Number(req.params.postId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  try {
    const result = await blogService.getComments(postId, { page, limit });
    res.status(200).json(result);
  } catch (error) {
    console.error("Get blog comments error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function addComment(req, res) {
  const postId = Number(req.params.postId);
  const authorId = req.user.id;
  const { content } = req.body;

  if (!content) return res.status(400).json({ message: "Content is required." });

  try {
    const comment = await blogService.addComment(postId, authorId, content);
    res.status(201).json({ comment });

    // Notify all admins about the new comment (fire and forget)
    blogService.getAdminUsers().then((admins) => {
      const notifLink = `/blog/${postId}`;
      admins.forEach((admin) =>
        notifyUser(admin, `${req.user.username} commented on a blog post.`, notifLink).catch(() => {})
      );
    }).catch(() => {});
  } catch (error) {
    console.error("Add blog comment error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function deleteComment(req, res) {
  const commentId = Number(req.params.commentId);
  const userId = req.user.id;
  const isAdmin = req.user.role === "ADMIN";

  try {
    const existing = await blogService.findComment(commentId);
    if (!existing) return res.status(404).json({ message: "Comment not found." });
    if (existing.authorId !== userId && !isAdmin) return res.status(403).json({ message: "Not authorized." });

    await blogService.deleteComment(commentId);
    res.status(200).json({ message: "Comment deleted successfully." });
  } catch (error) {
    console.error("Delete blog comment error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// ─── Replies ──────────────────────────────────────────────────────────────────

async function getReplies(req, res) {
  const commentId = Number(req.params.commentId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  try {
    const result = await blogService.getReplies(commentId, { page, limit });
    res.status(200).json(result);
  } catch (error) {
    console.error("Get blog replies error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function addReply(req, res) {
  const commentId = Number(req.params.commentId);
  const authorId = req.user.id;
  const { content } = req.body;

  if (!content) return res.status(400).json({ message: "Content is required." });

  try {
    const comment = await blogService.findComment(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found." });

    const reply = await blogService.addReply(commentId, authorId, content);
    res.status(201).json({ reply });

    // Notify comment author about the reply (fire and forget, skip if replying to own comment)
    if (comment.authorId !== authorId) {
      blogService.getUserById(comment.authorId).then((commentAuthor) => {
        if (commentAuthor) {
          const notifLink = `/blog/${comment.blogPostId}`;
          notifyUser(commentAuthor, `${req.user.username} replied to your comment.`, notifLink).catch(() => {});
        }
      }).catch(() => {});
    }
  } catch (error) {
    console.error("Add blog reply error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function deleteReply(req, res) {
  const replyId = Number(req.params.replyId);
  const userId = req.user.id;
  const isAdmin = req.user.role === "ADMIN";

  try {
    const existing = await blogService.findReply(replyId);
    if (!existing) return res.status(404).json({ message: "Reply not found." });
    if (existing.authorId !== userId && !isAdmin) return res.status(403).json({ message: "Not authorized." });

    await blogService.deleteReply(replyId);
    res.status(200).json({ message: "Reply deleted successfully." });
  } catch (error) {
    console.error("Delete blog reply error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

module.exports = {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  toggleLike,
  getComments,
  addComment,
  deleteComment,
  getReplies,
  addReply,
  deleteReply,
};
