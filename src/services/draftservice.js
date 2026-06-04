// src/services/draftService.js
const prisma = require("../config/prismaClient");

// ─── SHARED INCLUDES ──────────────────────────────────────────────────────────

const draftWithSource = {
  sourceSubmission: {
    include: {
      responses: {
        include: {
          critic: { select: { id: true, username: true, avatar: true } },
          _count: { select: { upvotes: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      paragraphComments: {
        include: {
          author: { select: { id: true, username: true, avatar: true } },
          _count: { select: { upvotes: true } },
          replies: {
            include: { author: { select: { id: true, username: true, avatar: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: [{ paragraphIndex: "asc" }, { createdAt: "asc" }],
      },
    },
  },
};

// ─── CREATE ───────────────────────────────────────────────────────────────────

async function createDraft(userId, { title = null, content = "" } = {}) {
  const wordCount = countWords(content);
  return prisma.writingDraft.create({
    data: {
      userId,
      title:     title?.trim() || null,
      content,
      wordCount,
    },
  });
}

// ─── READ ─────────────────────────────────────────────────────────────────────

async function getUserDrafts(userId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.writingDraft.findMany({
      where:   { userId },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      select: {
        id:                  true,
        title:               true,
        wordCount:           true,
        createdAt:           true,
        updatedAt:           true,
        sourceSubmissionId:  true,
        sourceSubmission: {
          select: {
            id:            true,
            title:         true,
            genre:         true,
            isDraft:       true,
            critiqueCount: true,
            _count: { select: { responses: true, paragraphComments: true } },
          },
        },
      },
    }),
    prisma.writingDraft.count({ where: { userId } }),
  ]);

  return { items, total, page, pages: Math.ceil(total / limit) };
}

async function getDraftById(draftId, userId) {
  const draft = await prisma.writingDraft.findFirst({
    where:   { id: draftId, userId },
    include: draftWithSource,
  });
  if (!draft) throw new Error("Draft not found.");
  return draft;
}

async function getDraftsForSprintPicker(userId) {
  return prisma.writingDraft.findMany({
    where:   { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id:        true,
      title:     true,
      wordCount: true,
      updatedAt: true,
      sourceSubmission: {
        select: { id: true, title: true, genre: true },
      },
    },
  });
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

async function updateDraft(draftId, userId, { title, content }) {
  const draft = await prisma.writingDraft.findFirst({
    where: { id: draftId, userId },
  });
  if (!draft) throw new Error("Draft not found.");

  const data = {};
  if (title   !== undefined) data.title     = title?.trim() || null;
  if (content !== undefined) {
    data.content   = content;
    data.wordCount = countWords(content);
  }

  return prisma.writingDraft.update({ where: { id: draftId }, data });
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

async function deleteDraft(draftId, userId) {
  const draft = await prisma.writingDraft.findFirst({
    where: { id: draftId, userId },
  });
  if (!draft) throw new Error("Draft not found.");

  if (draft.sourceSubmissionId) {
    await prisma.feedbackSubmission.delete({
      where: { id: draft.sourceSubmissionId },
    });
  } else {
    await prisma.writingDraft.delete({ where: { id: draftId } });
  }

  return { deleted: true };
}

// ─── UNPUBLISH → DRAFT ────────────────────────────────────────────────────────

async function unpublishSubmission(submissionId, userId) {
  const submission = await prisma.feedbackSubmission.findFirst({
    where: { id: submissionId, userId },
  });
  if (!submission) throw new Error("Submission not found.");
  if (submission.isDraft) throw new Error("Submission is already unpublished.");

  const [, draft] = await prisma.$transaction(async (tx) => {
    // Mark submission as a hidden draft
    const updated = await tx.feedbackSubmission.update({
      where: { id: submissionId },
      data: {
        isDraft:       true,
        unpublishedAt: new Date(),
      },
    });

    // Create draft mirror — idempotent via upsert
    const writingDraft = await tx.writingDraft.upsert({
      where:  { sourceSubmissionId: submissionId },
      update: {},
      create: {
        userId,
        title:              submission.title,
        content:            submission.content,
        wordCount:          submission.actualWordCount,
        sourceSubmissionId: submissionId,
      },
    });

    return [updated, writingDraft];
  });

  return draft;
}

// ─── REPUBLISH FROM DRAFT ─────────────────────────────────────────────────────

async function republishDraft(draftId, userId) {
  const draft = await prisma.writingDraft.findFirst({
    where: { id: draftId, userId },
  });
  if (!draft)                    throw new Error("Draft not found.");
  if (!draft.sourceSubmissionId) throw new Error("This draft has no linked submission to republish.");

  const submission = await prisma.feedbackSubmission.findFirst({
    where: { id: draft.sourceSubmissionId, userId },
  });
  if (!submission)        throw new Error("Linked submission not found.");
  if (!submission.isDraft) throw new Error("Submission is already published.");

  // Check one-spotlight-at-a-time rule
  const existingSpotlight = await prisma.feedbackSubmission.findFirst({
    where: {
      userId,
      isDraft:    false,
      status:     { in: ["QUEUE", "SPOTLIGHT"] },
      id:         { not: submission.id },
    },
    select: { id: true, title: true },
  });
  if (existingSpotlight) {
    throw new Error(
      `You already have a chapter in the spotlight: "${existingSpotlight.title}". ` +
      `It needs to receive 3 critiques before you can republish.`
    );
  }

  // Decide which status to give it when it goes back live
  const spotlightCount = await prisma.feedbackSubmission.count({
    where: { status: "SPOTLIGHT" },
  });
  const newStatus = spotlightCount < 6 ? "SPOTLIGHT" : "QUEUE";

  await prisma.$transaction(async (tx) => {
    await tx.feedbackSubmission.update({
      where: { id: submission.id },
      data: {
        title:           draft.title || submission.title,
        content:         draft.content,
        actualWordCount: draft.wordCount,
        isDraft:         false,
        status:          newStatus,
        unpublishedAt:   null,
      },
    });

    await tx.writingDraft.delete({ where: { id: draftId } });
  });

  return { republished: true, submissionId: submission.id };
}

// ─── POST DRAFT TO FEEDBACK HUB ──────────────────────────────────────────────

async function getDraftForPosting(draftId, userId) {
  const draft = await prisma.writingDraft.findFirst({
    where: { id: draftId, userId },
  });
  if (!draft) throw new Error("Draft not found.");
  if (draft.sourceSubmissionId) {
    throw new Error(
      "This draft is linked to an existing submission. Use republish instead."
    );
  }
  return draft;
}

// ─── SPRINT AUTO-SAVE ─────────────────────────────────────────────────────────

async function sprintAutoSave(userId, { draftId, title, content }) {
  if (draftId) {
    const draft = await prisma.writingDraft.findFirst({
      where: { id: draftId, userId },
    });
    if (!draft) throw new Error("Draft not found for auto-save.");

    return prisma.writingDraft.update({
      where: { id: draftId },
      data: {
        title:     title?.trim() || draft.title,
        content,
        wordCount: countWords(content),
      },
    });
  }

  return prisma.writingDraft.create({
    data: {
      userId,
      title:     title?.trim() || null,
      content,
      wordCount: countWords(content),
    },
  });
}

// ─── HELPER ───────────────────────────────────────────────────────────────────

function countWords(text = "") {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  createDraft,
  getUserDrafts,
  getDraftById,
  getDraftsForSprintPicker,
  updateDraft,
  deleteDraft,
  unpublishSubmission,
  republishDraft,
  getDraftForPosting,
  sprintAutoSave,
};