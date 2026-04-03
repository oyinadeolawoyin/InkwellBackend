const soundscapeService = require("../services/soundscapeservice");

// POST /soundscapes — authenticated user contributes, lands in pending
async function contribute(req, res) {
  const userId = req.user.id;
  const { name, creatorName } = req.body;

  if (!name) return res.status(400).json({ message: "Name is required." });
  if (!req.file) return res.status(400).json({ message: "Audio file is required." });

  try {
    const soundscape = await soundscapeService.createSoundscape({
      userId,
      name,
      creatorName,
      file: req.file,
    });
    res.status(201).json({
      soundscape,
      message: "Soundscape submitted! It will go live once reviewed by an admin.",
    });
  } catch (error) {
    console.error("Contribute soundscape error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// GET /soundscapes — approved only, shown to members picking a sound for their sprint
async function getApproved(req, res) {
  try {
    const soundscapes = await soundscapeService.fetchApprovedSoundscapes();
    res.status(200).json({ soundscapes });
  } catch (error) {
    console.error("Fetch soundscapes error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// GET /soundscapes/pending — admin review page: all unapproved soundscapes
async function getPending(req, res) {
  try {
    const soundscapes = await soundscapeService.fetchPendingSoundscapes();
    res.status(200).json({ soundscapes });
  } catch (error) {
    console.error("Fetch pending soundscapes error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// PATCH /soundscapes/:soundscapeId/approve — admin approves, soundscape goes live
async function approve(req, res) {
  const soundscapeId = Number(req.params.soundscapeId);

  try {
    const existing = await soundscapeService.findSoundscape(soundscapeId);
    if (!existing) return res.status(404).json({ message: "Soundscape not found." });

    const soundscape = await soundscapeService.approveSoundscape(soundscapeId);
    res.status(200).json({ soundscape });
  } catch (error) {
    console.error("Approve soundscape error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// DELETE /soundscapes/:soundscapeId — admin rejects pending OR contributor removes their own
async function remove(req, res) {
  const soundscapeId = Number(req.params.soundscapeId);
  const userId = req.user.id;
  const isAdmin = req.user.role === "ADMIN";

  try {
    const existing = await soundscapeService.findSoundscape(soundscapeId);
    if (!existing) return res.status(404).json({ message: "Soundscape not found." });
    if (existing.contributedBy !== userId && !isAdmin) {
      return res.status(403).json({ message: "Not authorized." });
    }

    await soundscapeService.deleteSoundscape(soundscapeId);
    res.status(200).json({ message: "Soundscape deleted." });
  } catch (error) {
    console.error("Delete soundscape error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

module.exports = { contribute, getApproved, getPending, approve, remove };