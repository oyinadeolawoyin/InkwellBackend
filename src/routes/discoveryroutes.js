const express = require("express");
const router = express.Router();
const discoveryController = require("../controllers/discoverycontroller");
const { authenticateJWT } = require("../config/jwt");
const upload = require("../config/multer");

// ─── Public read, optional auth (for liked status) ────────────────────────────

router.get("/", discoveryController.getStories);
router.get("/pending", authenticateJWT, discoveryController.getPendingStories); // admin only (checked in controller via role)
router.get("/:storyId", discoveryController.getStory);

// ─── Authenticated write ──────────────────────────────────────────────────────

router.post("/", authenticateJWT, upload.single("cover"), discoveryController.createStory);
router.put("/:storyId", authenticateJWT, upload.single("cover"), discoveryController.updateStory);
router.delete("/:storyId", authenticateJWT, discoveryController.deleteStory);

// ─── Like ─────────────────────────────────────────────────────────────────────

router.post("/:storyId/like", authenticateJWT, discoveryController.toggleLike);

// ─── Admin approve ────────────────────────────────────────────────────────────

router.patch("/:storyId/approve", authenticateJWT, discoveryController.approveStory);

module.exports = router;