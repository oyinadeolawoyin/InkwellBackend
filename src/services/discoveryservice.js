const prisma = require("../config/prismaClient");

const AUTHOR_SELECT = {
  id: true,
  username: true,
  avatar: true,
};

// ─── Stories ──────────────────────────────────────────────────────────────────

async function createStory({
  userId,
  title,
  genre,
  synopsis,
  firstChapter,
  firstChapterTitle,
  coverUrl,
  authorName,
  recommendedBy,
  platform,
  platformLink,
  contentWarnings,
}) {
  return prisma.discoveryStory.create({
    data: {
      userId,
      title,
      genre,
      synopsis,
      firstChapter,
      firstChapterTitle: firstChapterTitle || null,
      coverUrl: coverUrl || null,
      authorName,
      recommendedBy: recommendedBy || null,
      platform,
      platformLink,
      contentWarnings: contentWarnings || [],
    },
    include: {
      user: { select: AUTHOR_SELECT },
      _count: { select: { likes: true } },
    },
  });
}

async function getStories({ page = 1, limit = 12, genre, userId } = {}) {
  const skip = (page - 1) * limit;
  const where = {
    isApproved: true,
    ...(genre ? { genre } : {}),
    // Filter by userId when provided (for profile page)
    ...(userId ? { userId: Number(userId) } : {}),
  };

  const [stories, total] = await Promise.all([
    prisma.discoveryStory.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: AUTHOR_SELECT },
        _count: { select: { likes: true } },
      },
    }),
    prisma.discoveryStory.count({ where }),
  ]);

  return { stories, total, page, totalPages: Math.ceil(total / limit) };
}

async function getStory(storyId) {
  return prisma.discoveryStory.findUnique({
    where: { id: storyId },
    include: {
      user: { select: AUTHOR_SELECT },
      _count: { select: { likes: true } },
    },
  });
}

async function findStory(storyId) {
  return prisma.discoveryStory.findUnique({
    where: { id: storyId },
    select: { id: true, userId: true, coverUrl: true, isApproved: true, title: true, authorName: true },
  });
}

async function updateStory(
  storyId,
  { title, genre, synopsis, firstChapter, firstChapterTitle, coverUrl, authorName, recommendedBy, platform, platformLink, contentWarnings }
) {
  return prisma.discoveryStory.update({
    where: { id: storyId },
    data: {
      ...(title !== undefined && { title }),
      ...(genre !== undefined && { genre }),
      ...(synopsis !== undefined && { synopsis }),
      ...(firstChapter !== undefined && { firstChapter }),
      ...(firstChapterTitle !== undefined && { firstChapterTitle }),
      ...(coverUrl !== undefined && { coverUrl }),
      ...(authorName !== undefined && { authorName }),
      ...(recommendedBy !== undefined && { recommendedBy }),
      ...(platform !== undefined && { platform }),
      ...(platformLink !== undefined && { platformLink }),
      ...(contentWarnings !== undefined && { contentWarnings }),
    },
    include: {
      user: { select: AUTHOR_SELECT },
      _count: { select: { likes: true } },
    },
  });
}

async function approveStory(storyId) {
  return prisma.discoveryStory.update({
    where: { id: storyId },
    data: { isApproved: true },
  });
}

async function deleteStory(storyId) {
  const story = await prisma.discoveryStory.findUnique({
    where: { id: storyId },
    select: { coverUrl: true },
  });

  await prisma.discoveryStory.delete({ where: { id: storyId } });
  return story?.coverUrl || null;
}

// ─── Likes ────────────────────────────────────────────────────────────────────

async function toggleLike(userId, storyId) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.discoveryLike.findUnique({
      where: { userId_storyId: { userId, storyId } },
    });

    if (existing) {
      await tx.discoveryLike.delete({
        where: { userId_storyId: { userId, storyId } },
      });
    } else {
      await tx.discoveryLike.create({ data: { userId, storyId } });
    }

    const likesCount = await tx.discoveryLike.count({ where: { storyId } });
    return { liked: !existing, likesCount };
  });
}

async function getUserLikes(userId, storyIds) {
  if (!storyIds.length) return [];
  const likes = await prisma.discoveryLike.findMany({
    where: { userId, storyId: { in: storyIds } },
    select: { storyId: true },
  });
  return likes.map((l) => l.storyId);
}

// ─── Pending (admin) ──────────────────────────────────────────────────────────

async function getPendingStories({ page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const where = { isApproved: false };

  const [stories, total] = await Promise.all([
    prisma.discoveryStory.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: AUTHOR_SELECT },
        _count: { select: { likes: true } },
      },
    }),
    prisma.discoveryStory.count({ where }),
  ]);

  return { stories, total, page, totalPages: Math.ceil(total / limit) };
}

module.exports = {
  createStory,
  getStories,
  getStory,
  findStory,
  updateStory,
  approveStory,
  deleteStory,
  toggleLike,
  getUserLikes,
  getPendingStories,
};