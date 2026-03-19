const prisma = require("../config/prismaClient");

const AUTHOR_SELECT = {
  id: true,
  username: true,
  avatar: true,
};

// ─── Posts ────────────────────────────────────────────────────────────────────

async function createPost({ title, content, mediaUrl, link }) {
  return prisma.blogPost.create({
    data: {
      title: title || null,
      content,
      mediaUrl: mediaUrl || null,
      link: link || null,
    },
    include: {
      _count: { select: { likes: true, comments: true } },
    },
  });
}

async function getPosts({ page = 1, limit = 10 } = {}) {
  const skip = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { likes: true, comments: true } },
      },
    }),
    prisma.blogPost.count(),
  ]);

  return { posts, total, page, totalPages: Math.ceil(total / limit) };
}

async function getPost(postId) {
  return prisma.blogPost.findUnique({
    where: { id: postId },
    include: {
      _count: { select: { likes: true, comments: true } },
    },
  });
}

async function updatePost(postId, { title, content, mediaUrl, link }) {
  return prisma.blogPost.update({
    where: { id: postId },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(mediaUrl !== undefined && { mediaUrl }),
      ...(link !== undefined && { link }),
    },
    include: {
      _count: { select: { likes: true, comments: true } },
    },
  });
}

async function deletePost(postId) {
  const post = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: { mediaUrl: true },
  });

  await prisma.blogPost.delete({ where: { id: postId } });

  return post?.mediaUrl || null;
}

async function findPost(postId) {
  return prisma.blogPost.findUnique({
    where: { id: postId },
    select: { id: true, mediaUrl: true },
  });
}

// ─── Likes ────────────────────────────────────────────────────────────────────

async function togglePostLike(userId, blogPostId) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.blogPostLike.findUnique({
      where: { userId_blogPostId: { userId, blogPostId } },
    });

    if (existing) {
      await tx.blogPostLike.delete({
        where: { userId_blogPostId: { userId, blogPostId } },
      });
    } else {
      await tx.blogPostLike.create({ data: { userId, blogPostId } });
    }

    const likesCount = await tx.blogPostLike.count({ where: { blogPostId } });
    return { liked: !existing, likesCount };
  });
}

// ─── Comments ─────────────────────────────────────────────────────────────────

async function getComments(blogPostId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    prisma.blogComment.findMany({
      where: { blogPostId },
      skip,
      take: limit,
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: AUTHOR_SELECT },
        _count: { select: { replies: true } },
      },
    }),
    prisma.blogComment.count({ where: { blogPostId } }),
  ]);

  return { comments, total, page, totalPages: Math.ceil(total / limit) };
}

async function addComment(blogPostId, authorId, content) {
  return prisma.blogComment.create({
    data: { blogPostId, authorId, content },
    include: {
      author: { select: AUTHOR_SELECT },
      _count: { select: { replies: true } },
    },
  });
}

async function findComment(commentId) {
  return prisma.blogComment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, blogPostId: true },
  });
}

async function deleteComment(commentId) {
  await prisma.blogComment.delete({ where: { id: commentId } });
}

// ─── Replies ──────────────────────────────────────────────────────────────────

async function getReplies(commentId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;

  const [replies, total] = await Promise.all([
    prisma.blogReply.findMany({
      where: { commentId },
      skip,
      take: limit,
      orderBy: { createdAt: "asc" },
      include: { author: { select: AUTHOR_SELECT } },
    }),
    prisma.blogReply.count({ where: { commentId } }),
  ]);

  return { replies, total, page, totalPages: Math.ceil(total / limit) };
}

async function addReply(commentId, authorId, content) {
  return prisma.blogReply.create({
    data: { commentId, authorId, content },
    include: { author: { select: AUTHOR_SELECT } },
  });
}

async function findReply(replyId) {
  return prisma.blogReply.findUnique({
    where: { id: replyId },
    select: { id: true, authorId: true, commentId: true },
  });
}

async function deleteReply(replyId) {
  await prisma.blogReply.delete({ where: { id: replyId } });
}

async function getAdminUsers() {
  return prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, username: true, email: true },
  });
}

async function getAllUsers() {
  return prisma.user.findMany({
    select: { id: true, username: true, email: true },
  });
}

async function getUserById(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, email: true },
  });
}

module.exports = {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  findPost,
  togglePostLike,
  getComments,
  addComment,
  findComment,
  deleteComment,
  getReplies,
  addReply,
  findReply,
  deleteReply,
  getAdminUsers,
  getAllUsers,
  getUserById,
};
