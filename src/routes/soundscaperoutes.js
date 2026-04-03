const express = require("express");
const router = express.Router();
const soundscapeController = require("../controllers/soundscapecontroller");
const { authenticateJWT, requireAdmin } = require("../config/jwt");
const upload = require("../config/multer");

// GET /soundscapes — approved soundscapes for members to pick from (public)
router.get("/", soundscapeController.getApproved);

// GET /soundscapes/pending — admin review page: unapproved submissions
router.get("/pending", authenticateJWT, requireAdmin, soundscapeController.getPending);

// POST /soundscapes — contribute a soundscape (authenticated, lands in pending)
router.post(
  "/",
  authenticateJWT,
  upload.single("audio"),  // field name must be "audio" in the multipart form
  soundscapeController.contribute
);

// PATCH /soundscapes/:soundscapeId/approve — admin approves, goes live
router.patch("/:soundscapeId/approve", authenticateJWT, requireAdmin, soundscapeController.approve);

// DELETE /soundscapes/:soundscapeId — admin rejects OR contributor removes their own
router.delete("/:soundscapeId", authenticateJWT, soundscapeController.remove);

module.exports = router;