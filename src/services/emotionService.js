// src/services/emotionService.js
const prisma = require("../config/prismaClient");

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const COMMENT_MIN_CHARS    = 20;   // practice sentence must be at least 20 chars
const COMMENT_POINT_REWARD = 1;    // 1 posting point awarded for a valid first comment

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Returns midnight UTC for today — matches scheduledAt in EmotionEntry */
function todayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Fetch all unique emotions from EmotionTemplate
 * (this is your canonical emotion list for sidebar)
 */
async function getAllEmotions() {
  const emotions = await prisma.emotionTemplate.findMany({
    orderBy: { sortOrder: "asc" },
  });

  if (!emotions || emotions.length === 0) {
    throw new Error("No emotions found.");
  }

  return emotions.map((e) => ({
    id: e.id,
    emotion: e.emotion,
    cues: e.cues,
    sortOrder: e.sortOrder,
  }));
}

// ─── TODAY'S ENTRY (public) ───────────────────────────────────────────────────

/**
 * Fetch today's EmotionEntry — public, no user flags, no comment bodies.
 * Returns entry shape + total counts only.
 */
async function getTodayEntry() {
  const entry = await prisma.emotionEntry.findUnique({
    where:   { scheduledAt: todayUTC() },
    include: {
      likes:    { select: { id: true } },
      comments: { select: { id: true } },
    },
  });

  if (!entry) throw new Error("No emotion scheduled for today.");

  return {
    id:           entry.id,
    emotion:      entry.emotion,
    cues:         entry.cues,
    scheduledAt:  entry.scheduledAt,
    likeCount:    entry.likes.length,
    commentCount: entry.comments.length,
  };
}

// ─── ENTRY COMMENTS (authenticated) ──────────────────────────────────────────

/**
 * Fetch all comments for an entry with per-user flags.
 * Called on a separate authenticated route so req.user is guaranteed.
 */
async function getEntryComments(entryId, userId) {
  const uid = Number(userId);

  const comments = await prisma.emotionComment.findMany({
    where:   { entryId },
    orderBy: [{ isPinned: "desc" }, { createdAt: "asc" }],
    include: {
      author: { select: { id: true, username: true, avatar: true } },
      likes:  true,
    },
  });

  const userComment = comments.find((c) => c.authorId === uid) ?? null;

  return {
    userHasCommented: !!userComment,
    userComment: userComment
      ? {
          id:        userComment.id,
          content:   userComment.content,
          isPinned:  userComment.isPinned,
          likeCount: userComment.likes.length,
          createdAt: userComment.createdAt,
        }
      : null,
    comments: comments.map((c) => ({
      id:           c.id,
      content:      c.content,
      isPinned:     c.isPinned,
      likeCount:    c.likes.length,
      userHasLiked: c.likes.some((l) => l.userId === uid),
      createdAt:    c.createdAt,
      author: c.author
        ? { id: c.author.id, username: c.author.username, avatar: c.author.avatar }
        : { id: null, username: "[deleted]", avatar: null },
    })),
  };
}

// ─── TOGGLE LIKE ─────────────────────────────────────────────────────────────

/**
 * Like or unlike today's EmotionEntry.
 * Returns { liked: boolean, likeCount: number }
 */
async function toggleLike(userId, entryId) {
  const existing = await prisma.emotionLike.findUnique({
    where: { userId_entryId: { userId, entryId } },
  });

  if (existing) {
    await prisma.emotionLike.delete({
      where: { userId_entryId: { userId, entryId } },
    });
  } else {
    await prisma.emotionLike.create({ data: { userId, entryId } });
  }

  const likeCount = await prisma.emotionLike.count({ where: { entryId } });
  return { liked: !existing, likeCount };
}

// ─── POST COMMENT ─────────────────────────────────────────────────────────────

/**
 * Post a practice sentence on today's EmotionEntry.
 *
 * Rules enforced here (not just in the controller):
 *  1. Comment must be >= COMMENT_MIN_CHARS characters
 *  2. User can only comment ONCE per entry — no second comment
 *  3. Comments cannot be deleted (only edited) — enforced by having no delete fn
 *  4. First valid comment awards COMMENT_POINT_REWARD to postingBalance
 *
 * Returns { comment, pointAwarded: boolean }
 */
async function postComment(userId, entryId, content) {
  // Rule 1 — minimum length
  if (!content || content.trim().length < COMMENT_MIN_CHARS) {
    throw new Error(
      `Your practice sentence must be at least ${COMMENT_MIN_CHARS} characters. ` +
      `Give it a proper try!`
    );
  }

  // Rule 2 — one comment per entry per user
  const existing = await prisma.emotionComment.findFirst({
    where: { entryId, authorId: userId },
  });
  if (existing) {
    throw new Error(
      "You have already commented on today's emotion. " +
      "You can edit your existing comment."
    );
  }

  // Create comment — no point reward for emotion practice sentences
  const comment = await prisma.emotionComment.create({
    data: { entryId, authorId: userId, content: content.trim() },
    include: {
      author: { select: { id: true, username: true, avatar: true } },
      likes:  true,
    },
  });

  return {
    pointAwarded: false,
    pointMessage: null,
    comment: {
      id:           comment.id,
      content:      comment.content,
      isPinned:     comment.isPinned,
      likeCount:    0,
      userHasLiked: false,
      createdAt:    comment.createdAt,
      author: {
        id:       comment.author.id,
        username: comment.author.username,
        avatar:   comment.author.avatar,
      },
    },
  };
}

// ─── EDIT COMMENT ─────────────────────────────────────────────────────────────

/**
 * Edit an existing comment. Only the original author can edit.
 * Minimum character rule still applies on edits.
 */
async function editComment(userId, commentId, content) {
  if (!content || content.trim().length < COMMENT_MIN_CHARS) {
    throw new Error(
      `Your practice sentence must be at least ${COMMENT_MIN_CHARS} characters.`
    );
  }

  const comment = await prisma.emotionComment.findUnique({
    where: { id: commentId },
  });

  if (!comment) throw new Error("Comment not found.");
  if (comment.authorId !== userId) {
    throw new Error("Not authorised — you can only edit your own comment.");
  }

  const updated = await prisma.emotionComment.update({
    where:   { id: commentId },
    data:    { content: content.trim() },
    include: {
      author: { select: { id: true, username: true, avatar: true } },
      likes:  true,
    },
  });

  return {
    id:        updated.id,
    content:   updated.content,
    isPinned:  updated.isPinned,
    likeCount: updated.likes.length,
    createdAt: updated.createdAt,
    author: {
      id:       updated.author.id,
      username: updated.author.username,
      avatar:   updated.author.avatar,
    },
  };
}

// ─── TOGGLE COMMENT LIKE ─────────────────────────────────────────────────────

/**
 * Like or unlike a comment.
 * Returns { liked: boolean, likeCount: number }
 */
async function toggleCommentLike(userId, commentId) {
  const existing = await prisma.emotionCommentLike.findUnique({
    where: { userId_commentId: { userId, commentId } },
  });

  if (existing) {
    await prisma.emotionCommentLike.delete({
      where: { userId_commentId: { userId, commentId } },
    });
  } else {
    await prisma.emotionCommentLike.create({ data: { userId, commentId } });
  }

  const likeCount = await prisma.emotionCommentLike.count({ where: { commentId } });
  return { liked: !existing, likeCount };
}

// ─── PIN COMMENT (admin only) ─────────────────────────────────────────────────

/**
 * Pin or unpin a comment. Only admins should call this route.
 */
async function pinComment(commentId) {
  const comment = await prisma.emotionComment.findUnique({
    where: { id: commentId },
  });
  if (!comment) throw new Error("Comment not found.");

  const updated = await prisma.emotionComment.update({
    where: { id: commentId },
    data:  { isPinned: !comment.isPinned },
  });

  return { id: updated.id, isPinned: updated.isPinned };
}

module.exports = {
  getAllEmotions,
  getTodayEntry,
  getEntryComments,
  toggleLike,
  postComment,
  editComment,
  toggleCommentLike,
  pinComment,
  COMMENT_MIN_CHARS,
  COMMENT_POINT_REWARD,
};