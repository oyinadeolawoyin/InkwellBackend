// src/services/reportService.js
const prisma = require("../config/prismaClient");

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Fetch all admins for notification dispatch.
 * Used by the controller (fire-and-forget pattern, same as feedbackService.getAllUsersExcept).
 */
async function getAllAdmins() {
  return prisma.user.findMany({
    where:  { role: "ADMIN", isDeleted: false },
    select: { id: true, username: true, email: true },
  });
}

// ─── CREATE ──────────────────────────────────────────────────────────────────

/**
 * Submit a report against a FeedbackResponse (critique).
 *
 * Rules:
 *  - A user can only report the same response once.
 *  - The reporter cannot be the critic themselves.
 *  - The response must exist.
 */
async function createReport({ reporterId, responseId, reason, details }) {
  if (!reason?.trim()) throw new Error("A reason is required.");
  if (details && details.trim().length > 2000) {
    throw new Error("Details must be 2,000 characters or fewer.");
  }

  const response = await prisma.feedbackResponse.findUnique({
    where:   { id: responseId },
    include: {
      submission: { select: { id: true, title: true } },
      critic:     { select: { id: true, username: true } },
    },
  });

  if (!response) throw new Error("Critique not found.");
  if (response.criticId === reporterId) {
    throw new Error("You cannot report your own critique.");
  }

  // Prevent duplicate reports from the same user
  const existing = await prisma.critiqueReport.findUnique({
    where: { reporterId_responseId: { reporterId, responseId } },
  });
  if (existing) throw new Error("You have already reported this critique.");

  const report = await prisma.critiqueReport.create({
    data: {
      reporterId,
      responseId,
      reason:  reason.trim(),
      details: details?.trim() ?? null,
    },
    include: {
      reporter: { select: { id: true, username: true } },
      response: {
        include: {
          submission: { select: { id: true, title: true } },
          critic:     { select: { id: true, username: true } },
        },
      },
    },
  });

  return report;
}

// ─── READ ─────────────────────────────────────────────────────────────────────

/**
 * Admin: list all reports (paginated), optionally filtered by status.
 */
async function getReports({ page = 1, limit = 20, status } = {}) {
  const skip  = (page - 1) * limit;
  const where = status ? { status } : {};

  const [items, total] = await Promise.all([
    prisma.critiqueReport.findMany({
      where,
      include: {
        reporter: { select: { id: true, username: true, avatar: true } },
        response: {
          include: {
            submission: { select: { id: true, title: true } },
            critic:     { select: { id: true, username: true, avatar: true } },
          },
        },
        resolver: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take:  limit,
    }),
    prisma.critiqueReport.count({ where }),
  ]);

  return { items, total, page, pages: Math.ceil(total / limit) };
}

/**
 * Admin: get a single report by ID.
 */
async function getReportById(reportId) {
  const report = await prisma.critiqueReport.findUnique({
    where:   { id: reportId },
    include: {
      reporter: { select: { id: true, username: true, avatar: true } },
      response: {
        include: {
          submission: { select: { id: true, title: true, userId: true } },
          critic:     { select: { id: true, username: true, avatar: true } },
        },
      },
      resolver: { select: { id: true, username: true } },
    },
  });

  if (!report) throw new Error("Report not found.");
  return report;
}

/**
 * Check whether the requesting user has already reported a given response.
 */
async function hasUserReported({ reporterId, responseId }) {
  const existing = await prisma.critiqueReport.findUnique({
    where: { reporterId_responseId: { reporterId, responseId } },
    select: { id: true },
  });
  return !!existing;
}

// ─── RESOLVE ─────────────────────────────────────────────────────────────────

/**
 * Admin: resolve (or dismiss) a report.
 *
 * @param {number}  reportId    - the report to update
 * @param {number}  adminId     - the admin doing the resolving
 * @param {"RESOLVED"|"DISMISSED"} resolution
 * @param {string=} adminNotes  - optional internal notes
 */
async function resolveReport({ reportId, adminId, resolution, adminNotes }) {
  if (!["RESOLVED", "DISMISSED"].includes(resolution)) {
    throw new Error("Resolution must be RESOLVED or DISMISSED.");
  }

  const report = await prisma.critiqueReport.findUnique({ where: { id: reportId } });
  if (!report) throw new Error("Report not found.");
  if (report.status !== "PENDING") {
    throw new Error("This report has already been resolved.");
  }

  return prisma.critiqueReport.update({
    where: { id: reportId },
    data:  {
      status:     resolution,
      resolvedAt: new Date(),
      resolverId: adminId,
      adminNotes: adminNotes?.trim() ?? null,
    },
    include: {
      reporter: { select: { id: true, username: true } },
      response: {
        include: {
          submission: { select: { id: true, title: true } },
          critic:     { select: { id: true, username: true } },
        },
      },
      resolver: { select: { id: true, username: true } },
    },
  });
}

module.exports = {
  createReport,
  getReports,
  getReportById,
  hasUserReported,
  resolveReport,
  getAllAdmins,
};