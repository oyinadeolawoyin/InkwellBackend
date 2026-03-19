const express = require("express");
const router = express.Router();
const groupSprintController = require("../controllers/groupSprintController");
const { authenticateJWT } = require("../config/jwt");

// ─── GROUP SPRINT ─────────────────────────────────────────────
router.get("/activeGroupSprints", groupSprintController.fetchAllActiveGroupSprints);   // public — show active sessions
router.get("/lastGroupSprint", groupSprintController.fetchLastGroupSprint);             // public — homepage results
router.get("/:groupSprintId", authenticateJWT, groupSprintController.fetchGroupSprint); // get a specific group sprint room

router.post("/startGroupSprint", authenticateJWT, groupSprintController.startGroupSprint);
router.post("/:groupSprintId/endGroupSprint", authenticateJWT, groupSprintController.endGroupSprint);

// ─── SPRINT (member joining a group sprint) ───────────────────
router.get("/loginUserSession", authenticateJWT, groupSprintController.fetchLoginUserSprint); // get logged in user's active sprint

router.post("/join", authenticateJWT, groupSprintController.joinSprint);
router.post("/:sprintId/checkout", authenticateJWT, groupSprintController.checkoutSprint);

module.exports = router;