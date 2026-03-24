const prisma = require("../config/prismaClient");

const AUTHOR_SELECT = {
  id: true,
  username: true,
  avatar: true,
};

// ─── Snippets ─────────────────────────────────────────────────────────────────

async function createSnippet({ userId, content, context, mediaUrl, sourceType, tags }) {
  return prisma.writingSnippet.create({
    data: {
      userId,
      content,
      context: context || null,
      mediaUrl: mediaUrl || null,
      sourceType: sourceType || "STANDALONE",
      tags: tags || null,
    },
    include: {
      user: { select: AUTHOR_SELECT },
      _count: { select: { likes: true, comments: true } },
    },
  });
}

async function getSnippets({ page = 1, limit = 10 } = {}) {
  const skip = (page - 1) * limit;

  const [snippets, total] = await Promise.all([
    prisma.writingSnippet.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: AUTHOR_SELECT },
        _count: { select: { likes: true, comments: true } },
      },
    }),
    prisma.writingSnippet.count(),
  ]);

  return { snippets, total, page, totalPages: Math.ceil(total / limit) };
}

async function getSnippetsByUser(userId, { page = 1, limit = 10 } = {}) {
  const skip = (page - 1) * limit;

  const [snippets, total] = await Promise.all([
    prisma.writingSnippet.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: AUTHOR_SELECT },
        _count: { select: { likes: true, comments: true } },
      },
    }),
    prisma.writingSnippet.count({ where: { userId } }),
  ]);

  return { snippets, total, page, totalPages: Math.ceil(total / limit) };
}

async function getSnippet(snippetId) {
  return prisma.writingSnippet.findUnique({
    where: { id: snippetId },
    include: {
      user: { select: AUTHOR_SELECT },
      _count: { select: { likes: true, comments: true } },
    },
  });
}

async function updateSnippet(snippetId, { content, context, mediaUrl, tags }) {
  return prisma.writingSnippet.update({
    where: { id: snippetId },
    data: {
      ...(content !== undefined && { content }),
      ...(context !== undefined && { context }),
      ...(mediaUrl !== undefined && { mediaUrl }),
      ...(tags !== undefined && { tags }),
    },
    include: {
      user: { select: AUTHOR_SELECT },
      _count: { select: { likes: true, comments: true } },
    },
  });
}

async function deleteSnippet(snippetId) {
  const snippet = await prisma.writingSnippet.findUnique({
    where: { id: snippetId },
    select: { mediaUrl: true },
  });

  await prisma.writingSnippet.delete({ where: { id: snippetId } });

  return snippet?.mediaUrl || null;
}

async function findSnippet(snippetId) {
  return prisma.writingSnippet.findUnique({
    where: { id: snippetId },
    select: { id: true, userId: true, mediaUrl: true },
  });
}

// ─── Likes ────────────────────────────────────────────────────────────────────

async function toggleSnippetLike(userId, snippetId) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.snippetLike.findUnique({
      where: { userId_snippetId: { userId, snippetId } },
    });

    if (existing) {
      await tx.snippetLike.delete({
        where: { userId_snippetId: { userId, snippetId } },
      });
    } else {
      await tx.snippetLike.create({ data: { userId, snippetId } });
    }

    const likesCount = await tx.snippetLike.count({ where: { snippetId } });
    return { liked: !existing, likesCount };
  });
}

// ─── Comments ─────────────────────────────────────────────────────────────────

async function getComments(snippetId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    prisma.snippetComment.findMany({
      where: { snippetId },
      skip,
      take: limit,
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: AUTHOR_SELECT },
        _count: { select: { replies: true } },
      },
    }),
    prisma.snippetComment.count({ where: { snippetId } }),
  ]);

  return { comments, total, page, totalPages: Math.ceil(total / limit) };
}

async function addComment(snippetId, userId, content) {
  return prisma.snippetComment.create({
    data: { snippetId, userId, content },
    include: {
      user: { select: AUTHOR_SELECT },
      _count: { select: { replies: true } },
    },
  });
}

async function findComment(commentId) {
  return prisma.snippetComment.findUnique({
    where: { id: commentId },
    select: { id: true, userId: true, snippetId: true },
  });
}

async function deleteComment(commentId) {
  await prisma.snippetComment.delete({ where: { id: commentId } });
}

// ─── Replies ──────────────────────────────────────────────────────────────────

async function getReplies(commentId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;

  const [replies, total] = await Promise.all([
    prisma.snippetReply.findMany({
      where: { commentId },
      skip,
      take: limit,
      orderBy: { createdAt: "asc" },
      include: { user: { select: AUTHOR_SELECT } },
    }),
    prisma.snippetReply.count({ where: { commentId } }),
  ]);

  return { replies, total, page, totalPages: Math.ceil(total / limit) };
}

async function addReply(commentId, userId, content) {
  return prisma.snippetReply.create({
    data: { commentId, userId, content },
    include: { user: { select: AUTHOR_SELECT } },
  });
}

async function findReply(replyId) {
  return prisma.snippetReply.findUnique({
    where: { id: replyId },
    select: { id: true, userId: true, commentId: true },
  });
}

async function deleteReply(replyId) {
  await prisma.snippetReply.delete({ where: { id: replyId } });
}

async function getUserById(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, email: true },
  });
}

async function toggleCommentLike(userId, commentId) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.snippetCommentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });
 
    if (existing) {
      await tx.snippetCommentLike.delete({
        where: { userId_commentId: { userId, commentId } },
      });
    } else {
      await tx.snippetCommentLike.create({ data: { userId, commentId } });
    }
 
    const likesCount = await tx.snippetCommentLike.count({ where: { commentId } });
    return { liked: !existing, likesCount };
  });
}
 
// ─── Reply Likes ──────────────────────────────────────────────────────────────
 
async function toggleReplyLike(userId, replyId) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.snippetReplyLike.findUnique({
      where: { userId_replyId: { userId, replyId } },
    });
 
    if (existing) {
      await tx.snippetReplyLike.delete({
        where: { userId_replyId: { userId, replyId } },
      });
    } else {
      await tx.snippetReplyLike.create({ data: { userId, replyId } });
    }
 
    const likesCount = await tx.snippetReplyLike.count({ where: { replyId } });
    return { liked: !existing, likesCount };
  });
}
 

module.exports = {
  createSnippet,
  getSnippets,
  getSnippetsByUser,
  getSnippet,
  updateSnippet,
  deleteSnippet,
  findSnippet,
  toggleSnippetLike,
  getComments,
  addComment,
  findComment,
  deleteComment,
  getReplies,
  addReply,
  findReply,
  deleteReply,
  getUserById,
  toggleCommentLike,
  toggleReplyLike,
};