const snippetService = require("../services/snippetservice")
const { uploadFile, deleteFile } = require("../utilis/fileUploader");
const { notifyUser } = require("../services/notificationService");

// ─── Snippets (any authenticated user) ───────────────────────────────────────

async function createSnippet(req, res) {
  const userId = req.user.id;
  const { context, sourceType, tags } = req.body;

  try {
    let mediaUrl = null;
    if (req.file) {
      mediaUrl = await uploadFile(req.file);
    }

    const snippet = await snippetService.createSnippet({ userId, context, mediaUrl, sourceType, tags });
    res.status(201).json({ snippet });
  } catch (error) {
    console.error("Create snippet error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function getSnippets(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  try {
    const result = await snippetService.getSnippets({ page, limit });
    res.status(200).json(result);
  } catch (error) {
    console.error("Get snippets error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function getSnippetsByUser(req, res) {
  const userId = Number(req.params.userId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  try {
    const result = await snippetService.getSnippetsByUser(userId, { page, limit });
    res.status(200).json(result);
  } catch (error) {
    console.error("Get snippets by user error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function getSnippet(req, res) {
  const snippetId = Number(req.params.snippetId);

  try {
    const snippet = await snippetService.getSnippet(snippetId);
    if (!snippet) return res.status(404).json({ message: "Snippet not found." });
    res.status(200).json({ snippet });
  } catch (error) {
    console.error("Get snippet error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function updateSnippet(req, res) {
  const snippetId = Number(req.params.snippetId);
  const userId = req.user.id;
  const isAdmin = req.user.role === "ADMIN";
  const { context, tags } = req.body;

  try {
    const existing = await snippetService.findSnippet(snippetId);
    if (!existing) return res.status(404).json({ message: "Snippet not found." });
    if (existing.userId !== userId && !isAdmin) return res.status(403).json({ message: "Not authorized." });

    let mediaUrl;
    if (req.file) {
      if (existing.mediaUrl) await deleteFile(existing.mediaUrl);
      mediaUrl = await uploadFile(req.file);
    }

    const snippet = await snippetService.updateSnippet(snippetId, { context, mediaUrl, tags });
    res.status(200).json({ snippet });
  } catch (error) {
    console.error("Update snippet error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function deleteSnippet(req, res) {
  const snippetId = Number(req.params.snippetId);
  const userId = req.user.id;
  const isAdmin = req.user.role === "ADMIN";

  try {
    const existing = await snippetService.findSnippet(snippetId);
    if (!existing) return res.status(404).json({ message: "Snippet not found." });
    if (existing.userId !== userId && !isAdmin) return res.status(403).json({ message: "Not authorized." });

    const mediaUrl = await snippetService.deleteSnippet(snippetId);
    if (mediaUrl) await deleteFile(mediaUrl);

    res.status(200).json({ message: "Snippet deleted successfully." });
  } catch (error) {
    console.error("Delete snippet error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function toggleLike(req, res) {
  const snippetId = Number(req.params.snippetId);
  const userId = req.user.id;

  try {
    const result = await snippetService.toggleSnippetLike(userId, snippetId);
    res.status(200).json(result);
  } catch (error) {
    console.error("Toggle snippet like error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// ─── Comments ─────────────────────────────────────────────────────────────────

async function getComments(req, res) {
  const snippetId = Number(req.params.snippetId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  try {
    const result = await snippetService.getComments(snippetId, { page, limit });
    res.status(200).json(result);
  } catch (error) {
    console.error("Get snippet comments error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function addComment(req, res) {
  const snippetId = Number(req.params.snippetId);
  const userId = req.user.id;
  const { content } = req.body;

  if (!content) return res.status(400).json({ message: "Content is required." });

  try {
    const snippet = await snippetService.findSnippet(snippetId);
    if (!snippet) return res.status(404).json({ message: "Snippet not found." });

    const comment = await snippetService.addComment(snippetId, userId, content);
    res.status(201).json({ comment });

    // Notify snippet author (fire and forget, skip if commenting on own snippet)
    if (snippet.userId !== userId) {
      snippetService.getUserById(snippet.userId).then((snippetAuthor) => {
        if (snippetAuthor) {
          const notifLink = `/snippets/${snippetId}`;
          notifyUser(snippetAuthor, `${req.user.username} commented on your snippet.`, notifLink).catch(() => {});
        }
      }).catch(() => {});
    }
  } catch (error) {
    console.error("Add snippet comment error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function toggleCommentLike(req, res) {
  const commentId = Number(req.params.commentId);
  const userId = req.user.id;

  try {
    const result = await snippetService.toggleCommentLike(userId, commentId);
    res.status(200).json(result);

    // Notify comment author when their comment gets liked (fire and forget, skip self-like)
    if (result.liked) {
      snippetService.findComment(commentId).then(async (comment) => {
        if (comment && comment.userId !== userId) {
          const author = await snippetService.getUserById(comment.userId);
          if (author) {
            const notifLink = `/snippets/${comment.snippetId}`;
            notifyUser(author, `${req.user.username} liked your comment.`, notifLink).catch(() => {});
          }
        }
      }).catch(() => {});
    }
  } catch (error) {
    console.error("Toggle comment like error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function deleteComment(req, res) {
  const commentId = Number(req.params.commentId);
  const userId = req.user.id;
  const isAdmin = req.user.role === "ADMIN";

  try {
    const existing = await snippetService.findComment(commentId);
    if (!existing) return res.status(404).json({ message: "Comment not found." });
    if (existing.userId !== userId && !isAdmin) return res.status(403).json({ message: "Not authorized." });

    await snippetService.deleteComment(commentId);
    res.status(200).json({ message: "Comment deleted successfully." });
  } catch (error) {
    console.error("Delete snippet comment error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// ─── Replies ──────────────────────────────────────────────────────────────────

async function getReplies(req, res) {
  const commentId = Number(req.params.commentId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  try {
    const result = await snippetService.getReplies(commentId, { page, limit });
    res.status(200).json(result);
  } catch (error) {
    console.error("Get snippet replies error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function addReply(req, res) {
  const commentId = Number(req.params.commentId);
  const userId = req.user.id;
  const { content } = req.body;

  if (!content) return res.status(400).json({ message: "Content is required." });

  try {
    const comment = await snippetService.findComment(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found." });

    const reply = await snippetService.addReply(commentId, userId, content);
    res.status(201).json({ reply });

    // Notify comment author (fire and forget, skip self-reply)
    if (comment.userId !== userId) {
      snippetService.getUserById(comment.userId).then((commentAuthor) => {
        if (commentAuthor) {
          const notifLink = `/snippets/${comment.snippetId}`;
          notifyUser(commentAuthor, `${req.user.username} replied to your comment.`, notifLink).catch(() => {});
        }
      }).catch(() => {});
    }
  } catch (error) {
    console.error("Add snippet reply error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function toggleReplyLike(req, res) {
  const replyId = Number(req.params.replyId);
  const userId = req.user.id;

  try {
    const result = await snippetService.toggleReplyLike(userId, replyId);
    res.status(200).json(result);

    // Notify reply author when their reply gets liked (fire and forget, skip self-like)
    if (result.liked) {
      snippetService.findReply(replyId).then(async (reply) => {
        if (reply && reply.userId !== userId) {
          const author = await snippetService.getUserById(reply.userId);
          if (author) {
            const comment = await snippetService.findComment(reply.commentId);
            const notifLink = comment ? `/snippets/${comment.snippetId}` : "/snippets";
            notifyUser(author, `${req.user.username} liked your reply.`, notifLink).catch(() => {});
          }
        }
      }).catch(() => {});
    }
  } catch (error) {
    console.error("Toggle reply like error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function deleteReply(req, res) {
  const replyId = Number(req.params.replyId);
  const userId = req.user.id;
  const isAdmin = req.user.role === "ADMIN";

  try {
    const existing = await snippetService.findReply(replyId);
    if (!existing) return res.status(404).json({ message: "Reply not found." });
    if (existing.userId !== userId && !isAdmin) return res.status(403).json({ message: "Not authorized." });

    await snippetService.deleteReply(replyId);
    res.status(200).json({ message: "Reply deleted successfully." });
  } catch (error) {
    console.error("Delete snippet reply error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

module.exports = {
  createSnippet,
  getSnippets,
  getSnippetsByUser,
  getSnippet,
  updateSnippet,
  deleteSnippet,
  toggleLike,
  getComments,
  addComment,
  toggleCommentLike,
  deleteComment,
  getReplies,
  addReply,
  toggleReplyLike,
  deleteReply,
};