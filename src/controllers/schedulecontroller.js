const scheduleService = require("../services/scheduleservice");

// ─── WeeklySchedule ───────────────────────────────────────────

// POST /schedule
// Body: { weekStart, title, description?, sessions: [{ dayOfWeek, time, label? }] }
// Creates a full week's schedule with all its session slots in one request.
async function createWeeklySchedule(req, res) {
  const { weekStart, title, description, sessions } = req.body;

  if (!weekStart || !title) {
    return res.status(400).json({ message: "weekStart and title are required." });
  }
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return res.status(400).json({ message: "At least one session is required." });
  }

  // Validate each session slot
  for (const s of sessions) {
    if (s.dayOfWeek === undefined || s.dayOfWeek < 0 || s.dayOfWeek > 6) {
      return res.status(400).json({ message: "Each session must have a dayOfWeek between 0 (Sun) and 6 (Sat)." });
    }
    if (!s.time || !/^\d{2}:\d{2}$/.test(s.time)) {
      return res.status(400).json({ message: `Invalid time format "${s.time}". Use HH:mm.` });
    }
  }

  try {
    const schedule = await scheduleService.createWeeklySchedule({
      weekStart,
      title,
      description,
      sessions,
    });
    res.status(201).json({ schedule });
  } catch (error) {
    // weekStart has a @unique constraint — catch duplicate week gracefully
    if (error.code === "P2002") {
      return res.status(409).json({ message: "A schedule already exists for this week." });
    }
    console.error("Create schedule error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// GET /schedule
// Returns all weekly schedules, newest first. Public.
async function getAllSchedules(req, res) {
  try {
    const schedules = await scheduleService.getAllSchedules();
    res.status(200).json({ schedules });
  } catch (error) {
    console.error("Get all schedules error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// GET /schedule/current
// Returns the schedule for the current ISO week, or 404. Public.
async function getCurrentWeekSchedule(req, res) {
  try {
    const schedule = await scheduleService.getCurrentWeekSchedule();
    if (!schedule) {
      return res.status(404).json({ message: "No schedule found for the current week." });
    }
    res.status(200).json({ schedule });
  } catch (error) {
    console.error("Get current schedule error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// GET /schedule/:scheduleId
// Returns one schedule by id. Public.
async function getScheduleById(req, res) {
  const scheduleId = Number(req.params.scheduleId);

  try {
    const schedule = await scheduleService.getScheduleById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found." });
    }
    res.status(200).json({ schedule });
  } catch (error) {
    console.error("Get schedule error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// PATCH /schedule/:scheduleId
// Update title, description, or isActive on a schedule. Admin only.
async function updateWeeklySchedule(req, res) {
  const scheduleId = Number(req.params.scheduleId);
  const { title, description, isActive } = req.body;

  try {
    const schedule = await scheduleService.updateWeeklySchedule(scheduleId, {
      title,
      description,
      isActive,
    });
    res.status(200).json({ schedule });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Schedule not found." });
    }
    console.error("Update schedule error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// DELETE /schedule/:scheduleId
// Delete an entire week's schedule (and all its sessions). Admin only.
async function deleteWeeklySchedule(req, res) {
  const scheduleId = Number(req.params.scheduleId);

  try {
    await scheduleService.deleteWeeklySchedule(scheduleId);
    res.status(200).json({ message: "Schedule deleted successfully." });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Schedule not found." });
    }
    console.error("Delete schedule error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// ─── ScheduledSession ─────────────────────────────────────────

// PATCH /schedule/sessions/:sessionId/done
// Mark (or unmark) a session as done. Admin only.
// Body: { isDone: boolean }
async function markSessionDone(req, res) {
  const sessionId = Number(req.params.sessionId);
  const { isDone } = req.body;

  if (typeof isDone !== "boolean") {
    return res.status(400).json({ message: "isDone must be a boolean." });
  }

  try {
    const session = await scheduleService.markSessionDone(sessionId, isDone);
    res.status(200).json({ session });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Session not found." });
    }
    console.error("Mark session done error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// POST /schedule/:scheduleId/sessions
// Add a new session slot to an existing week. Admin only.
// Body: { dayOfWeek, time, label? }
async function addSession(req, res) {
  const scheduleId = Number(req.params.scheduleId);
  const { dayOfWeek, time, label } = req.body;

  if (dayOfWeek === undefined || dayOfWeek < 0 || dayOfWeek > 6) {
    return res.status(400).json({ message: "dayOfWeek must be between 0 (Sun) and 6 (Sat)." });
  }
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    return res.status(400).json({ message: `Invalid time format "${time}". Use HH:mm.` });
  }

  try {
    const session = await scheduleService.addSession(scheduleId, { dayOfWeek, time, label });
    res.status(201).json({ session });
  } catch (error) {
    if (error.code === "P2003") {
      return res.status(404).json({ message: "Schedule not found." });
    }
    console.error("Add session error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// PATCH /schedule/sessions/:sessionId
// Update a session slot's day, time, or label. Admin only.
async function updateSession(req, res) {
  const sessionId = Number(req.params.sessionId);
  const { dayOfWeek, time, label } = req.body;

  if (dayOfWeek !== undefined && (dayOfWeek < 0 || dayOfWeek > 6)) {
    return res.status(400).json({ message: "dayOfWeek must be between 0 (Sun) and 6 (Sat)." });
  }
  if (time !== undefined && !/^\d{2}:\d{2}$/.test(time)) {
    return res.status(400).json({ message: `Invalid time format "${time}". Use HH:mm.` });
  }

  try {
    const session = await scheduleService.updateSession(sessionId, { dayOfWeek, time, label });
    res.status(200).json({ session });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Session not found." });
    }
    console.error("Update session error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// DELETE /schedule/sessions/:sessionId
// Remove a single session slot. Admin only.
async function deleteSession(req, res) {
  const sessionId = Number(req.params.sessionId);

  try {
    await scheduleService.deleteSession(sessionId);
    res.status(200).json({ message: "Session deleted successfully." });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Session not found." });
    }
    console.error("Delete session error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

module.exports = {
  createWeeklySchedule,
  getAllSchedules,
  getCurrentWeekSchedule,
  getScheduleById,
  updateWeeklySchedule,
  deleteWeeklySchedule,
  markSessionDone,
  addSession,
  updateSession,
  deleteSession,
};