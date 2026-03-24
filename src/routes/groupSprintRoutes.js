const express = require("express");
const router = express.Router();
const groupSprintController = require("../controllers/groupSprintController");
const { authenticateJWT } = require("../config/jwt");

// ─── GROUP SPRINT ─────────────────────────────────────────────
router.get("/activeGroupSprints", groupSprintController.fetchAllActiveGroupSprints);   // public — show active sessions
router.get("/lastGroupSprint", groupSprintController.fetchLastGroupSprint);             // public — homepage results

router.post("/startGroupSprint", authenticateJWT, groupSprintController.startGroupSprint);

// ─── SPRINT (member joining a group sprint) ───────────────────
// IMPORTANT: specific routes must come before /:groupSprintId
router.get("/loginUserSession", authenticateJWT, groupSprintController.fetchLoginUserSprint); // get logged in user's active sprint

router.post("/join", authenticateJWT, groupSprintController.joinSprint);
router.post("/:sprintId/checkout", authenticateJWT, groupSprintController.checkoutSprint);

// ─── Dynamic routes last ──────────────────────────────────────
router.get("/:groupSprintId/livekit-token", authenticateJWT, groupSprintController.getLiveKitToken);
router.get("/:groupSprintId", authenticateJWT, groupSprintController.fetchGroupSprint);
router.post("/:groupSprintId/endGroupSprint", authenticateJWT, groupSprintController.endGroupSprint);

module.exports = router;