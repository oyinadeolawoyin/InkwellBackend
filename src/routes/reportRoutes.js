// src/routes/reportRoutes.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/reportController");

const { authenticateJWT, requireAdmin } = require("../config/jwt");

// ─── WRITER ROUTES ────────────────────────────────────────────────────────────

// Submit a report against a specific critique (FeedbackResponse)
router.post(
  "/responses/:responseId",
  authenticateJWT,
  ctrl.submitReport
);

// Check if the current user has already reported a specific critique
router.get(
  "/responses/:responseId/mine",
  authenticateJWT,
  ctrl.checkMyReport
);

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

// List all reports (paginated); ?status=PENDING|RESOLVED|DISMISSED
router.get(
  "/",
  authenticateJWT,
  requireAdmin,
  ctrl.listReports
);

// Get a single report by ID
router.get(
  "/:reportId",
  authenticateJWT,
  requireAdmin,
  ctrl.getReport
);

// Resolve or dismiss a report
router.patch(
  "/:reportId/resolve",
  authenticateJWT,
  requireAdmin,
  ctrl.resolveReport
);

module.exports = router;