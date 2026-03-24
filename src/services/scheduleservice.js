const prisma = require("../config/prismaClient");

// ─── Helpers ──────────────────────────────────────────────────

// Normalise a date to the Monday 00:00:00 UTC of its ISO week.
// This is what we store as weekStart so every week has one canonical key.
function toWeekStart(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  // getUTCDay(): 0=Sun … 6=Sat. We want Monday=0 so shift by 1.
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // roll back to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

// ─── WeeklySchedule ───────────────────────────────────────────

// Create a full week's schedule in one shot.
// sessions: [{ dayOfWeek, time, label? }]
async function createWeeklySchedule({ weekStart, title, description, sessions }) {
  const normalised = toWeekStart(weekStart);

  return prisma.weeklySchedule.create({
    data: {
      weekStart: normalised,
      title,
      description: description || null,
      sessions: {
        create: sessions.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          time: s.time,
          label: s.label || null,
        })),
      },
    },
    include: { sessions: { orderBy: [{ dayOfWeek: "asc" }, { time: "asc" }] } },
  });
}

// Fetch all schedules, newest week first.
// Includes sessions so the frontend can render the full week grid.
async function getAllSchedules() {
  return prisma.weeklySchedule.findMany({
    orderBy: { weekStart: "desc" },
    include: {
      sessions: { orderBy: [{ dayOfWeek: "asc" }, { time: "asc" }] },
    },
  });
}

// Fetch one schedule by id.
async function getScheduleById(scheduleId) {
  return prisma.weeklySchedule.findUnique({
    where: { id: scheduleId },
    include: {
      sessions: { orderBy: [{ dayOfWeek: "asc" }, { time: "asc" }] },
    },
  });
}

// Fetch the schedule for the current ISO week (if one exists).
async function getCurrentWeekSchedule() {
  const weekStart = toWeekStart(new Date());
  return prisma.weeklySchedule.findUnique({
    where: { weekStart },
    include: {
      sessions: { orderBy: [{ dayOfWeek: "asc" }, { time: "asc" }] },
    },
  });
}

// Update top-level schedule fields (title, description, isActive).
// Does NOT touch individual sessions — use session-level endpoints for that.
async function updateWeeklySchedule(scheduleId, { title, description, isActive }) {
  return prisma.weeklySchedule.update({
    where: { id: scheduleId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
    },
    include: {
      sessions: { orderBy: [{ dayOfWeek: "asc" }, { time: "asc" }] },
    },
  });
}

// Delete an entire week's schedule (cascades to all its sessions).
async function deleteWeeklySchedule(scheduleId) {
  await prisma.weeklySchedule.delete({ where: { id: scheduleId } });
}

// ─── ScheduledSession ─────────────────────────────────────────

// Mark a single session as done (or undo it).
async function markSessionDone(sessionId, isDone) {
  return prisma.scheduledSession.update({
    where: { id: sessionId },
    data: {
      isDone,
      completedAt: isDone ? new Date() : null,
    },
  });
}

// Add a new session slot to an existing week.
async function addSession(scheduleId, { dayOfWeek, time, label }) {
  return prisma.scheduledSession.create({
    data: {
      scheduleId,
      dayOfWeek,
      time,
      label: label || null,
    },
  });
}

// Update a session slot's day / time / label.
async function updateSession(sessionId, { dayOfWeek, time, label }) {
  return prisma.scheduledSession.update({
    where: { id: sessionId },
    data: {
      ...(dayOfWeek !== undefined && { dayOfWeek }),
      ...(time !== undefined && { time }),
      ...(label !== undefined && { label }),
    },
  });
}

// Remove a single session slot from a week.
async function deleteSession(sessionId) {
  await prisma.scheduledSession.delete({ where: { id: sessionId } });
}

module.exports = {
  createWeeklySchedule,
  getAllSchedules,
  getScheduleById,
  getCurrentWeekSchedule,
  updateWeeklySchedule,
  deleteWeeklySchedule,
  markSessionDone,
  addSession,
  updateSession,
  deleteSession,
};