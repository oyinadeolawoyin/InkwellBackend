const express    = require("express");
const router     = express.Router();
const eventController = require("../controllers/eventcontroller");
const { authenticateJWT } = require("../config/jwt");
const upload = require("../config/multer");

// ─── isAdmin middleware ────────────────────────────────────────
function isAdmin(req, res, next) {
    if (!req.user || req.user.role !== "ADMIN") {
        console.log("you're not an admin")
        return res.status(403).json({ message: "Admin access only." });
    }
    next();
}

// ─── PUBLIC ROUTES ────────────────────────────────────────────

// Carousel: all currently active events
// GET /api/events/active
router.get("/active", eventController.fetchActiveEvents);

// Single event landing page
// GET /api/events/:eventId
router.get("/:eventId", eventController.fetchEventById);

// Public participant leaderboard for a DAYS_CHALLENGE
// GET /api/events/:eventId/projects
router.get("/:eventId/projects", eventController.fetchEventPublicProjects);

// "The community is on Day X!" — min streak + individual leaderboard
// GET /api/events/:eventId/communityStreak
router.get("/:eventId/communityStreak", eventController.getEventCommunityStreak);

// Winners shoutout for a completed DAYS_CHALLENGE — used by the community page
// GET /api/events/:eventId/winners
router.get("/:eventId/winners", eventController.fetchEventWinners);

// ─── ADMIN ROUTES ─────────────────────────────────────────────

// Full event list for the admin dashboard
// GET /api/events/admin/all
router.get("/all", authenticateJWT, eventController.fetchAllEvents);

// Create a new event
// POST /api/events/admin/create
router.post("/admin/create", authenticateJWT, isAdmin, eventController.createEvent);

// Update an existing event (partial update supported)
// POST /api/events/admin/:eventId/update
router.post("/admin/:eventId/update", authenticateJWT, isAdmin, eventController.updateEvent);

// Delete an event
// POST /api/events/admin/:eventId/delete
router.post("/admin/:eventId/delete", authenticateJWT, isAdmin, eventController.deleteEvent);

// Manually trigger winner recording for a DAYS_CHALLENGE
// POST /api/events/admin/:eventId/recordWinners
router.post("/admin/:eventId/recordWinners", authenticateJWT, isAdmin, eventController.recordEventWinners);

module.exports = router;