const express = require("express");
const router  = express.Router();
const notificationsController = require("../controllers/notificationController");
const { authenticateJWT }     = require("../config/jwt");

// ── Existing routes ───────────────────────────────────────────────────────────
router.get("/",                authenticateJWT, notificationsController.getNotifications);
router.post("/save-subscription", authenticateJWT, notificationsController.saveSubscription);
router.post("/:userId/read",   authenticateJWT, notificationsController.markRead);
router.get("/preferences",     authenticateJWT, notificationsController.getPreferences);
router.post("/preferences",    authenticateJWT, notificationsController.savePreferences);

// ── Sprint reminder opt-in ────────────────────────────────────────────────────
// GET  /notifications/sprint-reminder  → { optedIn: boolean }
// POST /notifications/sprint-reminder  body: { optedIn: boolean }
router.get("/sprint-reminder",  authenticateJWT, notificationsController.getSprintReminderOptIn);
router.post("/sprint-reminder", authenticateJWT, notificationsController.saveSprintReminderOptIn);

module.exports = router;