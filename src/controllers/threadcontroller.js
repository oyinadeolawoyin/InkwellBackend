const threadService = require("../services/threadservice");
const { uploadFile, deleteFile } = require("../utilis/fileUploader");
const { notifyUser } = require("../services/notificationService");

// ─── Word limit helper ────────────────────────────────────────────────────────

const COMMENT_WORD_LIMIT = 200;

function countWords(str) {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

// ─── Threads (admin create/edit/delete; public read) ──────────────────────────

async function createThread(req, res) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const { title, context, isPinned } = req.body;
  if (!title)   return res.status(400).json({ message: "Title is required." });
  if (!context) return res.status(400).json({ message: "Context is required." });

  try {
    let mediaUrl = null;
    if (req.file) mediaUrl = await uploadFile(req.file);

    const thread = await threadService.createThread({
      authorId: req.user.id,
      title,
      context,
      mediaUrl,
      isPinned: isPinned === "true" || isPinned === true,
    });

    res.status(201).json({ thread });

    // Notify all users about new "discussion" threads only (fire and forget).
    // Only threads whose title contains "discussion" (case-insensitive)
    // trigger this broadcast — e.g. "Weekly Discussion: ...". Users can opt
    // out via their notification preferences ("thread_new_discussion").
    if (title.toLowerCase().includes("discussion")) {
      threadService.getAllUsers().then((users) => {
        const notifLink = `/threads/${thread.id}`;
        users.forEach((u) => {
          if (u.id === req.user.id) return; // skip the author
          notifyUser(u, `New discussion thread: "${title}"`, notifLink).catch(() => {});
        });
      }).catch(() => {});
    }
  } catch (error) {
    console.error("Create thread error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function getThreads(req, res) {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 20;

  try {
    const result = await threadService.getThreads({ page, limit });
    res.status(200).json(result);
  } catch (error) {
    console.error("Get threads error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function getThread(req, res) {
  const threadId = Number(req.params.threadId);

  try {
    const thread = await threadService.getThread(threadId);
    if (!thread) return res.status(404).json({ message: "Thread not found." });
    res.status(200).json({ thread });
  } catch (error) {
    console.error("Get thread error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function updateThread(req, res) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const threadId = Number(req.params.threadId);
  const { title, context, isPinned } = req.body;

  try {
    const existing = await threadService.findThread(threadId);
    if (!existing) return res.status(404).json({ message: "Thread not found." });

    let mediaUrl;
    if (req.file) {
      if (existing.mediaUrl) await deleteFile(existing.mediaUrl);
      mediaUrl = await uploadFile(req.file);
    }

    const thread = await threadService.updateThread(threadId, {
      title,
      context,
      mediaUrl,
      isPinned: isPinned !== undefined ? (isPinned === "true" || isPinned === true) : undefined,
    });

    res.status(200).json({ thread });
  } catch (error) {
    console.error("Update thread error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function deleteThread(req, res) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const threadId = Number(req.params.threadId);

  try {
    const existing = await threadService.findThread(threadId);
    if (!existing) return res.status(404).json({ message: "Thread not found." });

    const mediaUrl = await threadService.deleteThread(threadId);
    if (mediaUrl) await deleteFile(mediaUrl);

    res.status(200).json({ message: "Thread deleted successfully." });
  } catch (error) {
    console.error("Delete thread error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function toggleLike(req, res) {
  const threadId = Number(req.params.threadId);
  const userId   = req.user.id;

  try {
    const result = await threadService.toggleThreadLike(userId, threadId);
    res.status(200).json(result);
  } catch (error) {
    console.error("Toggle thread like error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// ─── Comments ─────────────────────────────────────────────────────────────────

async function getComments(req, res) {
  const threadId = Number(req.params.threadId);
  const page     = parseInt(req.query.page)  || 1;
  const limit    = parseInt(req.query.limit) || 20;

  try {
    const result = await threadService.getComments(threadId, { page, limit });
    res.status(200).json(result);
  } catch (error) {
    console.error("Get thread comments error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function addComment(req, res) {
  const threadId = Number(req.params.threadId);
  const authorId = req.user.id;
  const { content } = req.body;

  if (!content) return res.status(400).json({ message: "Content is required." });

  const wordCount = countWords(content);
  if (wordCount > COMMENT_WORD_LIMIT) {
    return res.status(400).json({
      message: `Comments must be ${COMMENT_WORD_LIMIT} words or fewer. Yours is ${wordCount} words.`,
    });
  }

  try {
    // Support up to 5 images: fields media_0 … media_4
    const fileFields = req.files && typeof req.files === "object" && !Array.isArray(req.files)
      ? Object.values(req.files).flat()
      : req.files ?? (req.file ? [req.file] : []);

    const mediaUrls = fileFields.length > 0
      ? await Promise.all(fileFields.map(f => uploadFile(f)))
      : [];

    const comment = await threadService.addComment(threadId, authorId, content, mediaUrls);
    res.status(201).json({ comment });
  } catch (error) {
    console.error("Add thread comment error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function deleteComment(req, res) {
  const commentId = Number(req.params.commentId);
  const userId    = req.user.id;
  const isAdmin   = req.user.role === "ADMIN";

  try {
    const existing = await threadService.findComment(commentId);
    if (!existing) return res.status(404).json({ message: "Comment not found." });
    if (existing.authorId !== userId && !isAdmin) {
      return res.status(403).json({ message: "Not authorized." });
    }

    await threadService.deleteComment(commentId);
    res.status(200).json({ message: "Comment deleted successfully." });
  } catch (error) {
    console.error("Delete thread comment error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function toggleCommentLike(req, res) {
  const commentId = Number(req.params.commentId);
  const userId    = req.user.id;

  try {
    const result = await threadService.toggleCommentLike(userId, commentId);
    res.status(200).json(result);
  } catch (error) {
    console.error("Toggle comment like error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// ─── Replies ──────────────────────────────────────────────────────────────────

async function getReplies(req, res) {
  const commentId = Number(req.params.commentId);
  const page      = parseInt(req.query.page)  || 1;
  const limit     = parseInt(req.query.limit) || 20;

  try {
    const result = await threadService.getReplies(commentId, { page, limit });
    res.status(200).json(result);
  } catch (error) {
    console.error("Get thread replies error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function addReply(req, res) {
  const commentId = Number(req.params.commentId);
  const authorId  = req.user.id;
  const { content } = req.body;

  if (!content) return res.status(400).json({ message: "Content is required." });

  const wordCount = countWords(content);
  if (wordCount > COMMENT_WORD_LIMIT) {
    return res.status(400).json({
      message: `Replies must be ${COMMENT_WORD_LIMIT} words or fewer. Yours is ${wordCount} words.`,
    });
  }

  try {
    const comment = await threadService.findComment(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found." });

    const fileFields = req.files && typeof req.files === "object" && !Array.isArray(req.files)
      ? Object.values(req.files).flat()
      : req.files ?? (req.file ? [req.file] : []);

    const mediaUrls = fileFields.length > 0
      ? await Promise.all(fileFields.map(f => uploadFile(f)))
      : [];

    const reply = await threadService.addReply(commentId, authorId, content, mediaUrls);
    res.status(201).json({ reply });

    // Notify comment author about the reply (skip self-reply)
    if (comment.authorId && comment.authorId !== authorId) {
      threadService.getUserById(comment.authorId).then((commentAuthor) => {
        if (commentAuthor) {
          const notifLink = `/threads/${comment.threadId}?comment=${commentId}&reply=${reply.id}`;
          notifyUser(commentAuthor, `${req.user.username} replied to your comment.`, notifLink, "thread_reply").catch(() => {});
        }
      }).catch(() => {});
    }
  } catch (error) {
    console.error("Add thread reply error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// ─── Profile stats ──────────────────────────────────────────────────────────

async function getMyDiscussionStats(req, res) {
  const userId = req.user.id;

  try {
    const discussionCount = await threadService.getUserDiscussionCount(userId);
    res.status(200).json({ discussionCount });
  } catch (error) {
    console.error("Get discussion stats error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// ─── Daily challenge thread ───────────────────────────────────────────────────

async function getDailyThread(req, res) {
  try {
    const thread = await threadService.getDailyThread();
    if (!thread) return res.status(404).json({ message: "No daily challenge thread found." });
    res.status(200).json({ thread });
  } catch (error) {
    console.error("Get daily thread error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function deleteReply(req, res) {
  const replyId = Number(req.params.replyId);
  const userId  = req.user.id;
  const isAdmin = req.user.role === "ADMIN";

  try {
    const existing = await threadService.findReply(replyId);
    if (!existing) return res.status(404).json({ message: "Reply not found." });
    if (existing.authorId !== userId && !isAdmin) {
      return res.status(403).json({ message: "Not authorized." });
    }

    await threadService.deleteReply(replyId);
    res.status(200).json({ message: "Reply deleted successfully." });
  } catch (error) {
    console.error("Delete thread reply error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

async function toggleReplyLike(req, res) {
  const replyId = Number(req.params.replyId);
  const userId  = req.user.id;

  try {
    const result = await threadService.toggleReplyLike(userId, replyId);
    res.status(200).json(result);
  } catch (error) {
    console.error("Toggle reply like error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

module.exports = {
  createThread,
  getThreads,
  getThread,
  updateThread,
  deleteThread,
  toggleLike,
  getDailyThread,
  getMyDiscussionStats,
  getComments,
  addComment,
  deleteComment,
  toggleCommentLike,
  getReplies,
  addReply,
  deleteReply,
  toggleReplyLike,
};