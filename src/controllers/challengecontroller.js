// src/controllers/challengeController.js
const challengeService = require("../services/challengeservice");
const { notifyUser }   = require("../services/notificationService");

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function errStatus(msg) {
  if (msg.includes("not found") || msg.includes("not currently"))  return 404;
  if (msg.includes("Only") || msg.includes("Not authorised"))      return 403;
  if (msg.includes("already participating"))                        return 409;
  return 400;
}

// ─── JOIN ─────────────────────────────────────────────────────────────────────

async function joinChallenge(req, res) {
  try {
    const participation = await challengeService.joinChallenge(req.user.id, req.body);
    res.status(201).json(participation);
  } catch (err) {
    res.status(errStatus(err.message)).json({ message: err.message });
  }
}

// ─── LEAVE ────────────────────────────────────────────────────────────────────

async function leaveChallenge(req, res) {
  try {
    const result = await challengeService.leaveChallenge(req.user.id);
    res.json(result);
  } catch (err) {
    res.status(errStatus(err.message)).json({ message: err.message });
  }
}

// ─── CHECK-IN ─────────────────────────────────────────────────────────────────

async function checkIn(req, res) {
  try {
    const result = await challengeService.checkIn(req.user.id, req.body);

    // Streak milestone notifications
    const { currentStreak } = result;
    if ([3, 7, 14, 30].includes(currentStreak)) {
      notifyUser(
        { id: req.user.id, username: req.user.username, email: req.user.email },
        `${currentStreak}-day streak! You are on a roll.`,
        "/challenge",
        "challenge_streak_milestone"
      ).catch(() => {});
    }

    res.json(result);
  } catch (err) {
    res.status(errStatus(err.message)).json({ message: err.message });
  }
}

// ─── UPDATE GOAL ──────────────────────────────────────────────────────────────

async function updateGoal(req, res) {
  try {
    const result = await challengeService.updateGoal(req.user.id, req.body);
    res.json(result);
  } catch (err) {
    res.status(errStatus(err.message)).json({ message: err.message });
  }
}

// ─── MY PARTICIPATION ─────────────────────────────────────────────────────────

async function getMyParticipation(req, res) {
  try {
    const result = await challengeService.getMyParticipation(req.user.id);
    res.json(result);
  } catch (err) {
    res.status(errStatus(err.message)).json({ message: err.message });
  }
}

// ─── STATS ────────────────────────────────────────────────────────────────────

async function getChallengeStats(req, res) {
  try {
    const result = await challengeService.getChallengeStats();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─── REMINDER TOGGLE ─────────────────────────────────────────────────────────

async function toggleReminders(req, res) {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== "boolean")
      return res.status(400).json({ message: "enabled must be a boolean" });

    const result = await challengeService.toggleReminders(req.user.id, enabled);
    res.json(result);
  } catch (err) {
    res.status(errStatus(err.message)).json({ message: err.message });
  }
}

module.exports = {
  joinChallenge,
  leaveChallenge,
  checkIn,
  updateGoal,
  getMyParticipation,
  getChallengeStats,
  toggleReminders,
};