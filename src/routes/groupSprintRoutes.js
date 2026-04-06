const express = require("express");
const router = express.Router();
const groupSprintController = require("../controllers/groupSprintController");
const { authenticateJWT } = require("../config/jwt");

// ─── Bot secret middleware ────────────────────────────────────

function requireBotSecret(req, res, next) {
  if (req.headers["x-bot-secret"] !== process.env.BOT_SECRET) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// ─── Bot routes — no JWT, secret only ────────────────────────
router.post("/bot/startGroupSprint", requireBotSecret, groupSprintController.startGroupSprint);
router.post("/bot/join", requireBotSecret, groupSprintController.botJoinSprint);
router.get("/bot/:groupSprintId", requireBotSecret, groupSprintController.fetchGroupSprint); // 👈 needed by notifyService

// ─── GROUP SPRINT ─────────────────────────────────────────────
router.get("/activeGroupSprints", groupSprintController.fetchAllActiveGroupSprints);
router.get("/lastGroupSprint", groupSprintController.fetchLastGroupSprint);
router.post("/startGroupSprint", authenticateJWT, groupSprintController.startGroupSprint);

// ─── SPRINT ───────────────────────────────────────────────────
router.get("/loginUserSession", authenticateJWT, groupSprintController.fetchLoginUserSprint);
router.post("/join", authenticateJWT, groupSprintController.joinSprint);
router.post("/:sprintId/checkout", authenticateJWT, groupSprintController.checkoutSprint);

// ─── Dynamic routes last ──────────────────────────────────────
router.get("/:groupSprintId/livekit-token", authenticateJWT, groupSprintController.getLiveKitToken);
router.get("/:groupSprintId", authenticateJWT, groupSprintController.fetchGroupSprint);
router.post("/:groupSprintId/endGroupSprint", authenticateJWT, groupSprintController.endGroupSprint);

module.exports = router;