const prisma = require("../config/prismaClient");

const AUTHOR_SELECT = {
  id: true,
  username: true,
  avatar: true,
};

// ─── Threads ──────────────────────────────────────────────────────────────────

async function createThread({ authorId, title, context, mediaUrl, isPinned }) {
  return prisma.thread.create({
    data: {
      authorId,
      title,
      context,
      mediaUrl: mediaUrl || null,
      isPinned: isPinned ?? false,
    },
    include: {
      author: { select: AUTHOR_SELECT },
      _count: { select: { likes: true, comments: true } },
    },
  });
}

async function getThreads({ page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;

  const [threads, total] = await Promise.all([
    prisma.thread.findMany({
      skip,
      take: limit,
      // Pinned threads surface first, then newest
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: {
        author: { select: AUTHOR_SELECT },
        _count: { select: { likes: true, comments: true } },
      },
    }),
    prisma.thread.count(),
  ]);

  return { threads, total, page, totalPages: Math.ceil(total / limit) };
}

async function getThread(threadId) {
  return prisma.thread.findUnique({
    where: { id: threadId },
    include: {
      author: { select: AUTHOR_SELECT },
      _count: { select: { likes: true, comments: true } },
    },
  });
}

async function findThread(threadId) {
  return prisma.thread.findUnique({
    where: { id: threadId },
    select: { id: true, authorId: true, mediaUrl: true },
  });
}

async function updateThread(threadId, { title, context, mediaUrl, isPinned }) {
  return prisma.thread.update({
    where: { id: threadId },
    data: {
      ...(title     !== undefined && { title }),
      ...(context   !== undefined && { context }),
      ...(mediaUrl  !== undefined && { mediaUrl }),
      ...(isPinned  !== undefined && { isPinned }),
    },
    include: {
      author: { select: AUTHOR_SELECT },
      _count: { select: { likes: true, comments: true } },
    },
  });
}

async function deleteThread(threadId) {
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: { mediaUrl: true },
  });
  await prisma.thread.delete({ where: { id: threadId } });
  return thread?.mediaUrl || null;
}

// ─── Thread Likes ─────────────────────────────────────────────────────────────

async function toggleThreadLike(userId, threadId) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.threadLike.findUnique({
      where: { userId_threadId: { userId, threadId } },
    });

    if (existing) {
      await tx.threadLike.delete({
        where: { userId_threadId: { userId, threadId } },
      });
    } else {
      await tx.threadLike.create({ data: { userId, threadId } });
    }

    const likesCount = await tx.threadLike.count({ where: { threadId } });
    return { liked: !existing, likesCount };
  });
}

// ─── Comments ─────────────────────────────────────────────────────────────────

async function getComments(threadId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    prisma.threadComment.findMany({
      where: { threadId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: AUTHOR_SELECT },
        _count: { select: { likes: true, replies: true } },
      },
    }),
    prisma.threadComment.count({ where: { threadId } }),
  ]);

  return { comments, total, page, totalPages: Math.ceil(total / limit) };
}

async function addComment(threadId, authorId, content, mediaUrls = []) {
  return prisma.threadComment.create({
    data: {
      threadId,
      authorId,
      content,
      // Keep legacy mediaUrl for any existing single-image rows;
      // new posts store the full array in mediaUrls (Json field).
      mediaUrl:  mediaUrls[0] ?? null,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : [],
    },
    include: {
      author: { select: AUTHOR_SELECT },
      _count: { select: { likes: true, replies: true } },
    },
  });
}

async function findComment(commentId) {
  return prisma.threadComment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, threadId: true },
  });
}

async function deleteComment(commentId) {
  await prisma.threadComment.delete({ where: { id: commentId } });
}

// ─── Comment Likes ────────────────────────────────────────────────────────────

async function toggleCommentLike(userId, commentId) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.threadCommentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (existing) {
      await tx.threadCommentLike.delete({
        where: { userId_commentId: { userId, commentId } },
      });
    } else {
      await tx.threadCommentLike.create({ data: { userId, commentId } });
    }

    const likesCount = await tx.threadCommentLike.count({ where: { commentId } });
    return { liked: !existing, likesCount };
  });
}

// ─── Replies ──────────────────────────────────────────────────────────────────

async function getReplies(commentId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;

  const [replies, total] = await Promise.all([
    prisma.threadReply.findMany({
      where: { commentId },
      skip,
      take: limit,
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: AUTHOR_SELECT },
        _count: { select: { likes: true } },
      },
    }),
    prisma.threadReply.count({ where: { commentId } }),
  ]);

  return { replies, total, page, totalPages: Math.ceil(total / limit) };
}

async function addReply(commentId, authorId, content, mediaUrls = []) {
  return prisma.threadReply.create({
    data: {
      commentId,
      authorId,
      content,
      mediaUrl:  mediaUrls[0] ?? null,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : [],
    },
    include: {
      author: { select: AUTHOR_SELECT },
      _count: { select: { likes: true } },
    },
  });
}

// ─── Daily challenge thread ───────────────────────────────────────────────────
// Fetch the pinned thread whose title starts with "Daily Writing Challenge"
// (or whatever title the admin gave it). Admins create this once via POST /threads.

async function getDailyThread() {
  return prisma.thread.findFirst({
    where: {
      isPinned: true,
      title:    { contains: "Daily Writing", mode: "insensitive" },
    },
    include: {
      author: { select: AUTHOR_SELECT },
      _count: { select: { likes: true, comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function findReply(replyId) {
  return prisma.threadReply.findUnique({
    where: { id: replyId },
    select: { id: true, authorId: true, commentId: true },
  });
}

async function deleteReply(replyId) {
  await prisma.threadReply.delete({ where: { id: replyId } });
}

// ─── Reply Likes ──────────────────────────────────────────────────────────────

async function toggleReplyLike(userId, replyId) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.threadReplyLike.findUnique({
      where: { userId_replyId: { userId, replyId } },
    });

    if (existing) {
      await tx.threadReplyLike.delete({
        where: { userId_replyId: { userId, replyId } },
      });
    } else {
      await tx.threadReplyLike.create({ data: { userId, replyId } });
    }

    const likesCount = await tx.threadReplyLike.count({ where: { replyId } });
    return { liked: !existing, likesCount };
  });
}

// ─── User helpers (notifications) ─────────────────────────────────────────────

async function getUserById(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, email: true },
  });
}

async function getAllUsers() {
  return prisma.user.findMany({
    select: { id: true, username: true, email: true },
  });
}

// Total number of comments a user has posted across all threads —
// surfaced on their profile to encourage discussion participation.
async function getUserDiscussionCount(userId) {
  return prisma.threadComment.count({ where: { authorId: userId } });
}

async function getAdminUsers() {
  return prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, username: true, email: true },
  });
}

module.exports = {
  // threads
  createThread,
  getThreads,
  getThread,
  findThread,
  updateThread,
  deleteThread,
  toggleThreadLike,
  getDailyThread,
  // comments
  getComments,
  addComment,
  findComment,
  deleteComment,
  toggleCommentLike,
  // replies
  getReplies,
  addReply,
  findReply,
  deleteReply,
  toggleReplyLike,
  // users
  getUserById,
  getAdminUsers,
  getAllUsers,
  getUserDiscussionCount,
};