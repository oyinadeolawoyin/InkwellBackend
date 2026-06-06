// src/controllers/reportController.js
const reportService  = require("../services/reportService");
const { notifyUser } = require("../services/notificationService");
const prisma         = require("../config/prismaClient");

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function errStatus(msg) {
  if (msg.includes("not found"))                               return 404;
  if (msg.includes("Not authorised") || msg.includes("Only")) return 403;
  if (msg.includes("already reported"))                        return 409;
  if (msg.includes("cannot report"))                           return 403;
  return 400;
}

// ─── SUBMIT A REPORT ─────────────────────────────────────────────────────────

/**
 * POST /reports/responses/:responseId
 * Authenticated writers — report a critique (FeedbackResponse).
 * After persisting, notifies every admin (fire-and-forget).
 */
async function submitReport(req, res) {
  try {
    const reporterId = req.user.id;
    const responseId = Number(req.params.responseId);
    const { reason, details } = req.body;

    const report = await reportService.createReport({
      reporterId,
      responseId,
      reason,
      details,
    });

    // ── Notify all admins (fire and forget) ──────────────────────────────────
    reportService.getAllAdmins()
      .then((admins) => {
        const submissionTitle = report.response?.submission?.title ?? "a submission";
        const criticName      = report.response?.critic?.username ?? "a user";
        const reporterName    = req.user.username ?? "Someone";

        const message = `⚠️ ${reporterName} reported a critique by ${criticName} on "${submissionTitle}". Reason: ${reason}`;
        const link    = `/admin/reports`;

        admins.forEach((admin) =>
          notifyUser(admin, message, link, "report_new").catch(() => {})
        );
      })
      .catch(() => {});

    res.status(201).json({ message: "Report submitted successfully.", reportId: report.id });
  } catch (err) {
    res.status(errStatus(err.message)).json({ message: err.message });
  }
}

// ─── CHECK IF CURRENT USER ALREADY REPORTED ──────────────────────────────────

/**
 * GET /reports/responses/:responseId/mine
 * Returns { reported: true/false } so the frontend can disable the report button.
 */
async function checkMyReport(req, res) {
  try {
    const reported = await reportService.hasUserReported({
      reporterId: req.user.id,
      responseId: Number(req.params.responseId),
    });
    res.json({ reported });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─── ADMIN: LIST REPORTS ─────────────────────────────────────────────────────

/**
 * GET /reports
 * Admin only. Optional ?status=PENDING|RESOLVED|DISMISSED
 */
async function listReports(req, res) {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const result = await reportService.getReports({
      page:   Number(page),
      limit:  Math.min(Number(limit), 50),
      status: status || undefined,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─── ADMIN: GET SINGLE REPORT ─────────────────────────────────────────────────

/**
 * GET /reports/:reportId
 * Admin only.
 */
async function getReport(req, res) {
  try {
    const report = await reportService.getReportById(Number(req.params.reportId));
    res.json(report);
  } catch (err) {
    res.status(errStatus(err.message)).json({ message: err.message });
  }
}

// ─── ADMIN: RESOLVE REPORT ────────────────────────────────────────────────────

/**
 * PATCH /reports/:reportId/resolve
 * Body: { resolution: "RESOLVED" | "DISMISSED", adminNotes?: string }
 * Admin only.
 */
async function resolveReport(req, res) {
  try {
    const { resolution, adminNotes } = req.body;
    const report = await reportService.resolveReport({
      reportId:   Number(req.params.reportId),
      adminId:    req.user.id,
      resolution,
      adminNotes,
    });

    // ── Notify the reporter that their report has been actioned (fire-and-forget) ──
    (async () => {
      try {
        // Load the reporter's full user row so notifyUser has email + username
        const reporter = await prisma.user.findUnique({
          where:  { id: report.reporterId },
          select: { id: true, username: true, email: true },
        });

        if (!reporter) return;

        const isResolved  = resolution === "RESOLVED";
        const action      = isResolved ? "reviewed and resolved" : "reviewed and dismissed";
        const submissionTitle = report.response?.submission?.title ?? "a submission";

        const message = `Your report on a critique for "${submissionTitle}" has been ${action}. Thank you for helping keep Inkwell a safe space for writers.`;

        // Link to their profile so they can review their activity
        await notifyUser(reporter, message, `/profile/${reporter.id}`, "report_resolved");
      } catch (err) {
        console.error("Report resolution notification error:", err);
      }
    })();

    res.json(report);
  } catch (err) {
    res.status(errStatus(err.message)).json({ message: err.message });
  }
}

module.exports = {
  submitReport,
  checkMyReport,
  listReports,
  getReport,
  resolveReport,
};