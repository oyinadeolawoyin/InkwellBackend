// src/services/feedbackService.js
const prisma               = require("../config/prismaClient");
const pointsService        = require("./pointService");
const { isBlocked }        = require("./userService");

// ─── WORD COUNT HELPERS ───────────────────────────────────────────────────────

const TIER_MAX_WORDS = {
  TIER_1000: 1000,
  TIER_2000: 2000,
  TIER_3000: 3000,
  TIER_4000: 4000,
  TIER_5000: 5000,
};

const GENERAL_FEEDBACK_MIN_WORDS = 150;

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function validateChapterWordCount(content, tier) {
  const count = countWords(content);
  const max   = TIER_MAX_WORDS[tier];
  if (!max) throw new Error(`Unknown tier: ${tier}`);
  if (count > max) {
    throw new Error(
      `Your chapter is ${count} words, which exceeds the ${max}-word limit for ${tier}.`
    );
  }
  return count;
}

function validateGeneralFeedback(text) {
  const words = countWords(text);
  if (words < GENERAL_FEEDBACK_MIN_WORDS) {
    throw new Error(
      `Your general feedback is ${words} word${words === 1 ? "" : "s"}. ` +
      `Please write at least ${GENERAL_FEEDBACK_MIN_WORDS} words — ` +
      `a good critique needs enough detail to genuinely help the writer.`
    );
  }
}

// ─── SHARED INCLUDES ─────────────────────────────────────────────────────────

const userSelect = {
  id: true,
  username: true,
  avatar: true,
  feedbackPoints: { select: { reputation: true } },
};

const submissionMeta = {
  user:   { select: userSelect },
  _count: { select: { responses: true, paragraphComments: true } },
};

// ─── USER HELPER (mirrors snippetService.getUserById) ────────────────────────

/**
 * Fetch a minimal user object { id, username, email } by ID.
 * Used by the controller to resolve notification recipients without
 * importing prisma directly into the controller.
 * Mirrors snippetService.getUserById.
 */
async function getUserById(userId) {
  return prisma.user.findUnique({
    where:  { id: Number(userId) },
    select: { id: true, username: true, email: true },
  });
}

/**
 * Fetch all users except the given one, with just enough fields for notifyUser.
 * Used by createSubmission to broadcast to all other users.
 */
async function getAllUsersExcept(excludeUserId) {
  return prisma.user.findMany({
    where:  { id: { not: Number(excludeUserId) } },
    select: { id: true, username: true, email: true },
  });
}

// ─── SUBMISSIONS ─────────────────────────────────────────────────────────────

async function createSubmission(userId, data) {
  const {
    title,
    genre,
    summary,
    content,
    wordCountTier,
    draftStage,
    contentWarnings = [],
    feedbackWanted  = [],
  } = data;

  if (!title?.trim())   throw new Error("Title is required.");
  if (!genre?.trim())   throw new Error("Genre is required.");
  if (!content?.trim()) throw new Error("Chapter content cannot be empty.");

  const summaryWords = countWords(summary ?? "");
  if (summaryWords < 25 || summaryWords > 60) {
    throw new Error(`Summary must be 25–60 words (yours is ${summaryWords}).`);
  }

  if (!Array.isArray(feedbackWanted) || feedbackWanted.length === 0) {
    throw new Error("Please add at least one specific feedback request.");
  }

  const actualWordCount = validateChapterWordCount(content, wordCountTier);
  const cost            = pointsService.getTierCost(wordCountTier);

  const submission = await prisma.$transaction(async (tx) => {
    let wallet = await tx.feedbackPoint.findUnique({ where: { userId } });
    if (!wallet) {
      wallet = await tx.feedbackPoint.create({
        data: { userId, postingBalance: 5, reputation: 0 },
      });
    }

    const isFreePost = await pointsService.checkAndClaimFreePost(userId, tx);

    if (!isFreePost) {
      await pointsService.deductPostingCost(userId, wordCountTier, tx);
    }

    return tx.feedbackSubmission.create({
      data: {
        userId,
        title:          title.trim(),
        genre:          genre.trim(),
        summary:        summary.trim(),
        content:        content.trim(),
        wordCountTier,
        actualWordCount,
        draftStage,
        contentWarnings,
        feedbackWanted,
        pointsCost:  isFreePost ? 0 : cost,
        wasFreePost: isFreePost,
      },
      include: {
        ...submissionMeta,
        // user.email is needed by the controller for notifyUser — include it here
        // so the controller never needs a second DB round-trip
        user: { select: { id: true, username: true, email: true, avatar: true } },
      },
    });
  });

  return submission;
}

async function getSubmissions({ page = 1, limit = 20, genre, isOpen = true, userId } = {}) {
  const skip  = (page - 1) * limit;
  const where = {};
  // When a userId is given (profile page), show ALL their submissions (open + closed).
  // isOpen filter only applies to the global public feed.
  if (!userId && isOpen !== undefined) where.isOpen = isOpen;
  if (genre)  where.genre  = genre;
  if (userId) where.userId = userId;

  const [items, total] = await Promise.all([
    prisma.feedbackSubmission.findMany({
      where,
      include: submissionMeta,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.feedbackSubmission.count({ where }),
  ]);

  return { items, total, page, pages: Math.ceil(total / limit) };
}

async function getSubmissionById(id, requestingUserId = null) {
  const submission = await prisma.feedbackSubmission.findUnique({
    where: { id },
    include: {
      ...submissionMeta,
      responses: {
        include: {
          critic: { select: userSelect },
          _count: { select: { upvotes: true } },
          ...(requestingUserId && {
            upvotes: { where: { userId: requestingUserId }, select: { id: true } },
          }),
        },
        orderBy: { createdAt: "asc" },
      },
      paragraphComments: {
        include: {
          author: { select: userSelect },
          _count: { select: { upvotes: true } },
          ...(requestingUserId && {
            upvotes: { where: { userId: requestingUserId }, select: { id: true } },
          }),
          replies: {
            include: { author: { select: { id: true, username: true, avatar: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: [{ paragraphIndex: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!submission) throw new Error("Submission not found.");
  return submission;
}

async function closeSubmission(submissionId, userId) {
  const sub = await prisma.feedbackSubmission.findUnique({ where: { id: submissionId } });
  if (!sub) throw new Error("Submission not found.");
  if (sub.userId !== userId) throw new Error("Not authorised.");
  return prisma.feedbackSubmission.update({
    where: { id: submissionId },
    data:  { isOpen: false },
  });
}

async function reopenSubmission(submissionId, userId) {
  const sub = await prisma.feedbackSubmission.findUnique({ where: { id: submissionId } });
  if (!sub) throw new Error("Submission not found.");
  if (sub.userId !== userId) throw new Error("Not authorised.");
  if (sub.isOutdated) throw new Error("Outdated submissions cannot be reopened.");
  return prisma.feedbackSubmission.update({
    where: { id: submissionId },
    data:  { isOpen: true },
  });
}

async function deleteSubmission(submissionId, userId) {
  const sub = await prisma.feedbackSubmission.findUnique({ where: { id: submissionId } });
  if (!sub) throw new Error("Submission not found.");
  if (sub.userId !== userId) throw new Error("Not authorised.");

  const responseCount = await prisma.feedbackResponse.count({ where: { submissionId } });

  await prisma.$transaction(async (tx) => {
    if (responseCount === 0 && !sub.wasFreePost && sub.pointsCost > 0) {
      await tx.feedbackPoint.update({
        where: { userId },
        data:  { postingBalance: { increment: sub.pointsCost } },
      });
    }
    await tx.feedbackSubmission.delete({ where: { id: submissionId } });
  });

  return {
    deleted:        true,
    refunded:       responseCount === 0 && !sub.wasFreePost,
    pointsRefunded: responseCount === 0 && !sub.wasFreePost ? sub.pointsCost : 0,
  };
}

// ─── UPDATE SUBMISSION ────────────────────────────────────────────────────────

/**
 * Update the editable fields of a submission.
 * wordCountTier and cost are intentionally excluded — they cannot change after posting.
 * Content word-count is still validated against the existing tier.
 */
async function updateSubmission(submissionId, userId, data) {
  const {
    title,
    genre,
    summary,
    content,
    draftStage,
    contentWarnings,
    feedbackWanted,
  } = data;

  const sub = await prisma.feedbackSubmission.findUnique({ where: { id: submissionId } });
  if (!sub)              throw new Error("Submission not found.");
  if (sub.userId !== userId) throw new Error("Not authorised.");

  // Validate title / genre / content presence
  if (title   !== undefined && !title.trim())   throw new Error("Title is required.");
  if (genre   !== undefined && !genre.trim())   throw new Error("Genre is required.");
  if (content !== undefined && !content.trim()) throw new Error("Chapter content cannot be empty.");

  // Summary word count (25–60) if provided
  if (summary !== undefined) {
    const summaryWords = countWords(summary);
    if (summaryWords < 25 || summaryWords > 60) {
      throw new Error(`Summary must be 25–60 words (yours is ${summaryWords}).`);
    }
  }

  // feedbackWanted must not be emptied
  if (feedbackWanted !== undefined) {
    if (!Array.isArray(feedbackWanted) || feedbackWanted.length === 0) {
      throw new Error("Please add at least one specific feedback request.");
    }
  }

  // Content word count must still fit the original tier
  if (content !== undefined) {
    validateChapterWordCount(content, sub.wordCountTier);
  }

  return prisma.feedbackSubmission.update({
    where: { id: submissionId },
    data: {
      ...(title           !== undefined && { title:           title.trim() }),
      ...(genre           !== undefined && { genre:           genre.trim() }),
      ...(summary         !== undefined && { summary:         summary.trim() }),
      ...(content         !== undefined && { content:         content.trim(),
                                             actualWordCount: countWords(content) }),
      ...(draftStage      !== undefined && { draftStage }),
      ...(contentWarnings !== undefined && { contentWarnings }),
      ...(feedbackWanted  !== undefined && { feedbackWanted }),
    },
    include: submissionMeta,
  });
}

// 1. Fetch the Spotlight (Top 6 oldest that need critiques)
async function getSpotlightSubmissions() {
  return await prisma.feedbackSubmission.findMany({
    where: {
      isOutdated: false,
      isOpen: true,
      critiqueCount: { lt: 3 }
    },
    include: submissionMeta,
    orderBy: { createdAt: 'asc' }, // Oldest first to move the queue
    take: 6
  });
}

// 2. Fetch Outdated (Archive)
async function getOutdatedSubmissions({ page = 1, limit = 10 }) {
  const skip = (page - 1) * limit;
  return await prisma.feedbackSubmission.findMany({
    where: {
      OR: [
        { isOutdated: true },
        { critiqueCount: { gte: 3 } }
      ]
    },
    include: submissionMeta,
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit
  });
}

// ─── FEEDBACK RESPONSES ──────────────────────────────────────────────────────

async function createResponse(criticId, submissionId, data) {
  const {
    generalFeedback,
  } = data;

  if (!generalFeedback?.trim()) {
    throw new Error("General feedback cannot be empty.");
  }
  validateGeneralFeedback(generalFeedback);

  // Fetch submission to check status and tier
  const submission = await prisma.feedbackSubmission.findUnique({
    where:   { id: submissionId },
    include: { user: { select: { id: true, username: true, email: true } } },
  });

  if (!submission)                    throw new Error("Submission not found.");
  if (!submission.isOpen && !submission.isOutdated) throw new Error("This submission is no longer accepting feedback.");
  if (submission.userId === criticId) throw new Error("You cannot critique your own work.");

  // Block check: submission author has blocked this critic, or critic has blocked author
  const blockedByAuthor = await isBlocked(submission.userId, criticId);
  if (blockedByAuthor) throw new Error("You cannot critique this submission.");
  const blockedAuthor = await isBlocked(criticId, submission.userId);
  if (blockedAuthor) throw new Error("You cannot critique a submission from someone you have blocked.");

  // 1. CALCULATE POINTS (Full points for Spotlight, Half for Outdated)
  const pointsAwarded = pointsService.calculateCritiquePoints(submission.wordCountTier, submission.isOutdated);

  const response = await prisma.$transaction(async (tx) => {
    // 2. CREATE THE RESPONSE
    const resp = await tx.feedbackResponse.create({
      data: {
        submissionId,
        criticId,
        generalFeedback: generalFeedback.trim(),
        pointsEarned: pointsAwarded, // Log exactly what they earned
      },
      include: {
        critic: { select: userSelect },
        _count: { select: { upvotes: true } },
      },
    });

    // 3. AWARD THE CALCULATED POINTS
    await pointsService.awardCritiquePoints(criticId, pointsAwarded, tx);

    // 4. INCREMENT CRITIQUE COUNT
    const updatedSub = await tx.feedbackSubmission.update({
      where: { id: submissionId },
      data: { critiqueCount: { increment: 1 } }
    });

    // 5. ROTATE OUT OF SPOTLIGHT (If hits 3 critiques, mark as outdated and close)
    if (updatedSub.critiqueCount >= 3 && !updatedSub.isOutdated) {
      await tx.feedbackSubmission.update({
        where: { id: submissionId },
        data: { isOutdated: true, isOpen: false }
      });
    }

    return resp;
  });

  return { ...response, submissionAuthor: submission.user, submissionTitle: submission.title };
}

async function updateResponse(responseId, criticId, data) {
  const response = await prisma.feedbackResponse.findUnique({ where: { id: responseId } });
  if (!response)                      throw new Error("Response not found.");
  if (response.criticId !== criticId) throw new Error("Not authorised.");

  const { generalFeedback } = data;

  if (generalFeedback !== undefined) {
    validateGeneralFeedback(generalFeedback);
  }

  return prisma.feedbackResponse.update({
    where: { id: responseId },
    data: {
      ...(generalFeedback     !== undefined && { generalFeedback: generalFeedback.trim() }),
    },
  });
}

async function toggleResponseUpvote(userId, responseId) {
  const response = await prisma.feedbackResponse.findUnique({
    where:   { id: responseId },
    include: { submission: { select: { userId: true, title: true } } },
  });
  if (!response) throw new Error("Response not found.");
  if (response.submission.userId !== userId) {
    throw new Error("Only the submission author can upvote a critique.");
  }
  if (response.criticId === userId) {
    throw new Error("You cannot upvote your own critique.");
  }

  const existing = await prisma.feedbackResponseUpvote.findUnique({
    where: { userId_responseId: { userId, responseId } },
  });

  if (existing) {
    await prisma.$transaction(async (tx) => {
      await tx.feedbackResponseUpvote.delete({ where: { id: existing.id } });
      await pointsService.reverseCritiqueUpvoteBonus(response.criticId, tx);
    });
    return { upvoted: false };
  }

  const walletBefore = await prisma.feedbackPoint.findUnique({ where: { userId: response.criticId } });

  await prisma.$transaction(async (tx) => {
    await tx.feedbackResponseUpvote.create({ data: { userId, responseId } });
    await pointsService.awardCritiqueUpvoteBonus(response.criticId, tx);
  });

  const walletAfter = await prisma.feedbackPoint.findUnique({ where: { userId: response.criticId } });

  return {
    upvoted:         true,
    criticId:        response.criticId,
    submissionId:    response.submissionId,
    submissionTitle: response.submission?.title,
    walletBefore,
    walletAfter,
  };
}

// ─── PARAGRAPH COMMENTS ──────────────────────────────────────────────────────

async function createParagraphComment(authorId, submissionId, data) {
  const { paragraphIndex, content } = data;

  if (typeof paragraphIndex !== "number" || paragraphIndex < 0) {
    throw new Error("paragraphIndex must be a non-negative integer.");
  }
  if (!content?.trim()) {
    throw new Error("Comment cannot be empty.");
  }

  const submission = await prisma.feedbackSubmission.findUnique({
    where:   { id: submissionId },
    // Include email so the controller can pass the author directly to notifyUser
    include: { user: { select: { id: true, username: true, email: true } } },
  });
  if (!submission)        throw new Error("Submission not found.");
  if (!submission.isOpen) throw new Error("This submission is no longer accepting feedback.");

  // Block check: submission author has blocked this commenter, or commenter has blocked author
  if (submission.user.id !== authorId) {
    const blockedByAuthor = await isBlocked(submission.user.id, authorId);
    if (blockedByAuthor) throw new Error("You cannot comment on this submission.");
    const blockedAuthor = await isBlocked(authorId, submission.user.id);
    if (blockedAuthor) throw new Error("You cannot comment on a submission from someone you have blocked.");
  }

  const commenter = await prisma.user.findUnique({
    where:  { id: authorId },
    select: { username: true },
  });

  const comment = await prisma.paragraphComment.create({
    data: { submissionId, authorId, paragraphIndex, content: content.trim() },
    include: {
      author:  { select: userSelect },
      _count:  { select: { upvotes: true } },
      replies: {
        include: { author: { select: { id: true, username: true, avatar: true } } },
      },
    },
  });

  return {
    ...comment,
    submissionAuthor: submission.user,   // full { id, username, email } for notifyUser
    submissionTitle:  submission.title,
    commenterName:    commenter?.username ?? "Someone",
  };
}

async function getParagraphComments(submissionId, paragraphIndex = null, requestingUserId = null) {
  const where = { submissionId };
  if (paragraphIndex !== null) where.paragraphIndex = paragraphIndex;

  return prisma.paragraphComment.findMany({
    where,
    include: {
      author: { select: userSelect },
      _count: { select: { upvotes: true } },
      ...(requestingUserId && {
        upvotes: { where: { userId: requestingUserId }, select: { id: true } },
      }),
      replies: {
        include: { author: { select: { id: true, username: true, avatar: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ paragraphIndex: "asc" }, { createdAt: "asc" }],
  });
}

async function updateParagraphComment(commentId, authorId, content) {
  const comment = await prisma.paragraphComment.findUnique({ where: { id: commentId } });
  if (!comment)                      throw new Error("Comment not found.");
  if (comment.authorId !== authorId) throw new Error("Not authorised.");
  if (!content?.trim())              throw new Error("Comment cannot be empty.");
  return prisma.paragraphComment.update({
    where: { id: commentId },
    data:  { content: content.trim() },
  });
}

async function deleteParagraphComment(commentId, authorId) {
  const comment = await prisma.paragraphComment.findUnique({ where: { id: commentId } });
  if (!comment)                      throw new Error("Comment not found.");
  if (comment.authorId !== authorId) throw new Error("Not authorised.");
  await prisma.paragraphComment.delete({ where: { id: commentId } });
  return { deleted: true };
}

async function toggleParagraphCommentUpvote(userId, commentId) {
  const comment = await prisma.paragraphComment.findUnique({
    where:   { id: commentId },
    include: { submission: { select: { id: true, title: true } } },
  });
  if (!comment)                    throw new Error("Comment not found.");
  if (comment.authorId === userId) throw new Error("You cannot upvote your own comment.");

  const existing = await prisma.paragraphCommentUpvote.findUnique({
    where: { userId_commentId: { userId, commentId } },
  });

  if (existing) {
    await prisma.$transaction(async (tx) => {
      await tx.paragraphCommentUpvote.delete({ where: { id: existing.id } });
      const newTotal = await tx.paragraphCommentUpvote.count({ where: { commentId } });
      await pointsService.checkAndReverseParagraphUpvoteMilestone(comment.authorId, newTotal, tx);
    });
    return { upvoted: false };
  }

  const walletBefore = await prisma.feedbackPoint.findUnique({ where: { userId: comment.authorId } });
  let milestoneResult = { awarded: false, pointsAwarded: 0 };

  await prisma.$transaction(async (tx) => {
    await tx.paragraphCommentUpvote.create({ data: { userId, commentId } });
    const newTotal = await tx.paragraphCommentUpvote.count({ where: { commentId } });
    milestoneResult = await pointsService.checkAndAwardParagraphUpvoteMilestone(
      comment.authorId,
      newTotal,
      tx
    );
    milestoneResult.newTotal = newTotal;
  });

  if (milestoneResult.awarded) {
    const walletAfter = await prisma.feedbackPoint.findUnique({ where: { userId: comment.authorId } });
    return {
      upvoted:         true,
      ...milestoneResult,
      commentAuthorId: comment.authorId,
      submissionId:    comment.submission.id,
      submissionTitle: comment.submission.title,
      paragraphIndex:  comment.paragraphIndex,  // for notification message
      walletBefore,
      walletAfter,
    };
  }

  return { upvoted: true, ...milestoneResult };
}

// ─── PARAGRAPH COMMENT REPLIES ───────────────────────────────────────────────

async function createParagraphCommentReply(authorId, commentId, content) {
  if (!content?.trim()) {
    throw new Error("Reply cannot be empty.");
  }

  const comment = await prisma.paragraphComment.findUnique({
    where:   { id: commentId },
    // Include email so the controller can pass the comment author directly to notifyUser
    include: {
      submission: { select: { id: true, title: true } },
      author:     { select: { id: true, username: true, email: true } },
    },
  });
  if (!comment) throw new Error("Comment not found.");

  const replier = await prisma.user.findUnique({
    where:  { id: authorId },
    select: { username: true },
  });

  const reply = await prisma.paragraphCommentReply.create({
    data:    { commentId, authorId, content: content.trim() },
    include: { author: { select: { id: true, username: true, avatar: true } } },
  });

  return {
    ...reply,
    commentAuthor:   comment.author,           // full { id, username, email } for notifyUser
    submissionId:    comment.submission.id,
    submissionTitle: comment.submission.title,
    replierName:     replier?.username ?? "Someone",
    paragraphIndex:  comment.paragraphIndex,   // so controller can name the paragraph in notification
  };
}

async function deleteParagraphCommentReply(replyId, authorId) {
  const reply = await prisma.paragraphCommentReply.findUnique({ where: { id: replyId } });
  if (!reply)                      throw new Error("Reply not found.");
  if (reply.authorId !== authorId) throw new Error("Not authorised.");
  await prisma.paragraphCommentReply.delete({ where: { id: replyId } });
  return { deleted: true };
}


// ─── RESPONSES BY USER (for profile page) ────────────────────────────────────

async function getResponsesByUser(userId, { page = 1, limit = 10 } = {}) {
  const skip = (page - 1) * limit;

  const [responses, total] = await Promise.all([
    prisma.feedbackResponse.findMany({
      where:   { criticId: userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        submission: {
          select: { id: true, title: true, genre: true },
        },
        _count: { select: { upvotes: true } },
      },
    }),
    prisma.feedbackResponse.count({ where: { criticId: userId } }),
  ]);

  // Normalise field names so the frontend CritiqueRow component works:
  // it reads response.content but the model stores generalFeedback
  const normalised = responses.map(r => ({
    ...r,
    content: r.generalFeedback,
  }));

  return {
    responses:  normalised,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

module.exports = {
  getResponsesByUser,
  getUserById,
  getAllUsersExcept,
  createSubmission,
  getSubmissions,
  getSubmissionById,
  closeSubmission,
  reopenSubmission,
  deleteSubmission,
  updateSubmission,
  getSpotlightSubmissions,
  getOutdatedSubmissions,
  createResponse,
  updateResponse,
  toggleResponseUpvote,
  createParagraphComment,
  getParagraphComments,
  updateParagraphComment,
  deleteParagraphComment,
  toggleParagraphCommentUpvote,
  createParagraphCommentReply,
  deleteParagraphCommentReply,
};