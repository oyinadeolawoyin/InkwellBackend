const express = require("express");
const router = express.Router();
const scheduleController = require("../controllers/schedulecontroller");
const { authenticateJWT } = require("../config/jwt");

// ─── Auth middleware ───────────────────────────────────────────
// Reusable guard: must be logged in AND have ADMIN role.
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }
  next();
}

// ─── Public routes (anyone can read the schedule) ─────────────
router.get("/", scheduleController.getAllSchedules);
router.get("/current", scheduleController.getCurrentWeekSchedule);

// ─── Session-level routes — MUST come before /:scheduleId ─────
// (otherwise Express would try to match "sessions" as a scheduleId)
router.patch("/sessions/:sessionId/done", authenticateJWT, requireAdmin, scheduleController.markSessionDone);
router.patch("/sessions/:sessionId", authenticateJWT, requireAdmin, scheduleController.updateSession);
router.delete("/sessions/:sessionId", authenticateJWT, requireAdmin, scheduleController.deleteSession);

// ─── Schedule-level routes ────────────────────────────────────
router.get("/:scheduleId", scheduleController.getScheduleById);

router.post("/", authenticateJWT, requireAdmin, scheduleController.createWeeklySchedule);
router.patch("/:scheduleId", authenticateJWT, requireAdmin, scheduleController.updateWeeklySchedule);
router.delete("/:scheduleId", authenticateJWT, requireAdmin, scheduleController.deleteWeeklySchedule);

// Add a new session slot to an existing week
router.post("/:scheduleId/sessions", authenticateJWT, requireAdmin, scheduleController.addSession);

module.exports = router;