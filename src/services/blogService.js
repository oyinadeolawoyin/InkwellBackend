const prisma = require("../config/prismaClient");

const AUTHOR_SELECT = {
  id: true,
  username: true,
  avatar: true,
};

// ─── Posts ────────────────────────────────────────────────────────────────────

async function createPost({ title, content, mediaUrl, link, seriesId, seriesOrder, category, tag }) {
  let resolvedSeriesId = seriesId ?? null;
  let resolvedSeriesOrder = null;

  if (resolvedSeriesId != null) {
    resolvedSeriesOrder =
      seriesOrder !== undefined && seriesOrder !== null
        ? seriesOrder
        : await getNextSeriesOrder(resolvedSeriesId);
  }

  return prisma.blogPost.create({
    data: {
      title: title || null,
      content,
      mediaUrl: mediaUrl || null,
      link: link || null,
      seriesId: resolvedSeriesId,
      seriesOrder: resolvedSeriesOrder,
      isPinned: false,
      category: category || null,
      tag: tag || null,
    },
    include: {
      _count: { select: { likes: true, comments: true } },
      series: true,
    },
  });
}

async function getPinnedPosts() {
  return prisma.blogPost.findMany({
    where: { isPinned: true },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { likes: true, comments: true } },
      series: { select: { id: true, title: true, slug: true } },
    },
  });
}

async function getPosts({ page = 1, limit = 10, category, tag } = {}) {
  const skip = (page - 1) * limit;
  const where = {
    ...(category ? { category } : {}),
    ...(tag ? { tag } : {}),
  };

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { likes: true, comments: true } },
        series: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.blogPost.count({ where }),
  ]);

  return { posts, total, page, totalPages: Math.ceil(total / limit) };
}

async function getPost(postId) {
  const post = await prisma.blogPost.findUnique({
    where: { id: postId },
    include: {
      _count: { select: { likes: true, comments: true } },
      series: true,
    },
  });

  if (!post) return null;

  // Standalone posts (no series) don't get next/previous links
  if (post.seriesId == null) {
    return { ...post, previousPost: null, nextPost: null };
  }

  const [previousPost, nextPost] = await Promise.all([
    prisma.blogPost.findFirst({
      where: { seriesId: post.seriesId, seriesOrder: { lt: post.seriesOrder } },
      orderBy: { seriesOrder: "desc" },
      select: { id: true, title: true, mediaUrl: true, seriesOrder: true },
    }),
    prisma.blogPost.findFirst({
      where: { seriesId: post.seriesId, seriesOrder: { gt: post.seriesOrder } },
      orderBy: { seriesOrder: "asc" },
      select: { id: true, title: true, mediaUrl: true, seriesOrder: true },
    }),
  ]);

  return { ...post, previousPost, nextPost };
}

async function updatePost(postId, { title, content, mediaUrl, link, seriesId, seriesOrder, category, tag }) {
  const data = {
    ...(title !== undefined && { title }),
    ...(content !== undefined && { content }),
    ...(mediaUrl !== undefined && { mediaUrl }),
    ...(link !== undefined && { link }),
    ...(category !== undefined && { category: category || null }),
    ...(tag !== undefined && { tag: tag || null }),
  };

  if (seriesId !== undefined) {
    if (seriesId === null) {
      // Removing the post from its series
      data.seriesId = null;
      data.seriesOrder = null;
    } else {
      data.seriesId = seriesId;
      data.seriesOrder =
        seriesOrder !== undefined && seriesOrder !== null
          ? seriesOrder
          : await getNextSeriesOrder(seriesId);
    }
  } else if (seriesOrder !== undefined) {
    // Reordering within the same series
    data.seriesOrder = seriesOrder;
  }

  return prisma.blogPost.update({
    where: { id: postId },
    data,
    include: {
      _count: { select: { likes: true, comments: true } },
      series: true,
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

// ─── Series ───────────────────────────────────────────────────────────────────

// Returns the next available seriesOrder for a given series (1 if empty)
async function getNextSeriesOrder(seriesId) {
  const last = await prisma.blogPost.findFirst({
    where: { seriesId },
    orderBy: { seriesOrder: "desc" },
    select: { seriesOrder: true },
  });
  return (last?.seriesOrder ?? 0) + 1;
}

async function createSeries({ title, slug, description, coverUrl, category }) {
  return prisma.blogSeries.create({
    data: {
      title,
      slug,
      description: description || null,
      coverUrl: coverUrl || null,
      category: category || null,
    },
  });
}

async function getSeriesList() {
  return prisma.blogSeries.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { posts: true } },
    },
  });
}

async function getSeriesBySlug(slug) {
  return prisma.blogSeries.findUnique({
    where: { slug },
    include: {
      posts: {
        orderBy: { seriesOrder: "asc" },
        select: {
          id: true,
          title: true,
          mediaUrl: true,
          createdAt: true,
          seriesOrder: true,
          _count: { select: { likes: true, comments: true } },
        },
      },
    },
  });
}

async function findSeries(seriesId) {
  return prisma.blogSeries.findUnique({ where: { id: seriesId } });
}

async function updateSeries(seriesId, { title, slug, description, coverUrl, category }) {
  return prisma.blogSeries.update({
    where: { id: seriesId },
    data: {
      ...(title !== undefined && { title }),
      ...(slug !== undefined && { slug }),
      ...(description !== undefined && { description }),
      ...(coverUrl !== undefined && { coverUrl }),
      ...(category !== undefined && { category: category || null }),
    },
  });
}

async function deleteSeries(seriesId) {
  // Posts in this series are kept — onDelete: SetNull clears their seriesId
  // and seriesOrder, turning them back into standalone posts.
  await prisma.$transaction([
    prisma.blogPost.updateMany({
      where: { seriesId },
      data: { seriesId: null, seriesOrder: null },
    }),
    prisma.blogSeries.delete({ where: { id: seriesId } }),
  ]);
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

async function togglePostPin(postId) {
  const post = await prisma.blogPost.findUnique({ where: { id: postId }, select: { isPinned: true } });
  if (!post) return null;
  return prisma.blogPost.update({
    where: { id: postId },
    data: { isPinned: !post.isPinned },
    select: { id: true, isPinned: true },
  });
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

/**
 * Upsert the user's "last seen community updates" timestamp to now.
 * Called when the user visits /community-update.
 */
async function markCommunityUpdatesRead(userId) {
  return prisma.blogLastSeen.upsert({
    where:  { userId },
    update: { lastSeenAt: new Date() },
    create: { userId, lastSeenAt: new Date() },
  });
}

module.exports = {
  createPost,
  getPosts,
  getPinnedPosts,
  getPost,
  updatePost,
  deletePost,
  findPost,
  togglePostLike,
  togglePostPin,
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
  // series
  createSeries,
  getSeriesList,
  getSeriesBySlug,
  findSeries,
  updateSeries,
  deleteSeries,

  markCommunityUpdatesRead
};