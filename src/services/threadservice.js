const prisma = require("../config/prismaClient");

const AUTHOR_SELECT = {
  id: true,
  username: true,
  avatar: true,
};

// ─── Thread Categories ────────────────────────────────────────────────────────

/**
 * For each category we return:
 *   - id, name, slug, description, sortOrder
 *   - totalPosts      — total thread count
 *   - activePosts     — threads that received a comment or reply in the last 30 days,
 *                       OR were created in the last 30 days
 *   - latestThread    — { id, title, createdAt } of the most recently created thread
 *   - lastPostAt      — createdAt of that newest thread (null if no threads yet)
 */
async function getCategories() {
  const categories = await prisma.threadCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      threads: {
        select: {
          id: true,
          title: true,
          createdAt: true,
          comments: {
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  return categories.map((cat) => {
    const { threads, ...rest } = cat;

    const totalPosts = threads.length;

    // A thread is "active" if it was created or had a comment within 30 days
    const activePosts = threads.filter((t) => {
      if (t.createdAt >= thirtyDaysAgo) return true;
      const lastComment = t.comments[0];
      return lastComment && lastComment.createdAt >= thirtyDaysAgo;
    }).length;

    // Most recently created thread
    const sorted = [...threads].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    const latest = sorted[0] ?? null;

    return {
      ...rest,
      totalPosts,
      activePosts,
      latestThread: latest
        ? { id: latest.id, title: latest.title, createdAt: latest.createdAt }
        : null,
      lastPostAt: latest ? latest.createdAt : null,
    };
  });
}

async function createCategory({ name, slug, description, sortOrder }) {
  return prisma.threadCategory.create({
    data: {
      name,
      slug,
      description: description ?? null,
      sortOrder:   sortOrder   ?? 0,
    },
  });
}

async function findCategory(categoryId) {
  return prisma.threadCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true, slug: true },
  });
}

async function updateCategory(categoryId, { name, slug, description, sortOrder }) {
  return prisma.threadCategory.update({
    where: { id: categoryId },
    data: {
      ...(name        !== undefined && { name }),
      ...(slug        !== undefined && { slug }),
      ...(description !== undefined && { description }),
      ...(sortOrder   !== undefined && { sortOrder }),
    },
  });
}

async function deleteCategory(categoryId) {
  // Threads whose category is deleted will have categoryId set to null
  // because the schema uses onDelete: SetNull on the category relation.
  return prisma.threadCategory.delete({ where: { id: categoryId } });
}

// ─── Threads ──────────────────────────────────────────────────────────────────

async function createThread({ authorId, categoryId, title, context, mediaUrl, isPinned }) {
  return prisma.thread.create({
    data: {
      authorId,
      categoryId: categoryId ?? null,
      title,
      context,
      mediaUrl: mediaUrl || null,
      isPinned: isPinned ?? false,
    },
    include: {
      author:   { select: AUTHOR_SELECT },
      category: { select: { id: true, name: true, slug: true } },
      _count:   { select: { likes: true, comments: true } },
    },
  });
}

async function getThreads({ page = 1, limit = 20, categoryId } = {}) {
  const skip = (page - 1) * limit;

  const where = categoryId ? { categoryId } : {};

  const [threads, total] = await Promise.all([
    prisma.thread.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: {
        author:   { select: AUTHOR_SELECT },
        category: { select: { id: true, name: true, slug: true } },
        _count:   { select: { likes: true, comments: true } },
      },
    }),
    prisma.thread.count({ where }),
  ]);

  return { threads, total, page, totalPages: Math.ceil(total / limit) };
}

async function getThread(threadId) {
  return prisma.thread.findUnique({
    where: { id: threadId },
    include: {
      author:   { select: AUTHOR_SELECT },
      category: { select: { id: true, name: true, slug: true } },
      _count:   { select: { likes: true, comments: true } },
    },
  });
}

async function findThread(threadId) {
  return prisma.thread.findUnique({
    where: { id: threadId },
    select: { id: true, authorId: true, mediaUrl: true, categoryId: true },
  });
}

async function updateThread(threadId, { title, context, mediaUrl, isPinned, categoryId }) {
  return prisma.thread.update({
    where: { id: threadId },
    data: {
      ...(title      !== undefined && { title }),
      ...(context    !== undefined && { context }),
      ...(mediaUrl   !== undefined && { mediaUrl }),
      ...(isPinned   !== undefined && { isPinned }),
      ...(categoryId !== undefined && { categoryId }),
    },
    include: {
      author:   { select: AUTHOR_SELECT },
      category: { select: { id: true, name: true, slug: true } },
      _count:   { select: { likes: true, comments: true } },
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

async function getDailyThread() {
  return prisma.thread.findFirst({
    where: {
      isPinned: true,
      title:    { contains: "Daily Writing", mode: "insensitive" },
    },
    include: {
      author:   { select: AUTHOR_SELECT },
      category: { select: { id: true, name: true, slug: true } },
      _count:   { select: { likes: true, comments: true } },
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

// ─── User helpers ─────────────────────────────────────────────────────────────

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

async function getUserDiscussionCount(userId) {
  return prisma.threadComment.count({ where: { authorId: userId } });
}

async function getAdminUsers() {
  return prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, username: true, email: true },
  });
}

// ─── Mention / like notification helpers ─────────────────────────────────────

async function getUserByUsername(username) {
  return prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" }, isDeleted: false },
    select: { id: true, username: true, email: true },
  });
}

async function searchUsersByUsername(query) {
  return prisma.user.findMany({
    where: {
      username: { contains: query, mode: "insensitive" },
      isDeleted: false,
    },
    select: { id: true, username: true, avatar: true },
    take: 8,
    orderBy: { username: "asc" },
  });
}

async function findCommentWithAuthor(commentId) {
  return prisma.threadComment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, threadId: true },
  });
}

async function findReplyWithAuthor(replyId) {
  return prisma.threadReply.findUnique({
    where: { id: replyId },
    select: {
      id: true,
      authorId: true,
      commentId: true,
      comment: { select: { threadId: true } },
    },
  });
}

module.exports = {
  // categories
  getCategories,
  createCategory,
  findCategory,
  updateCategory,
  deleteCategory,
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
  getUserByUsername,
  searchUsersByUsername,
  findCommentWithAuthor,
  findReplyWithAuthor,
};