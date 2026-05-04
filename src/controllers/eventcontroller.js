require("dotenv").config();
const eventService = require("../services/eventService");
const { notifyUser } = require("../services/notificationService");
const prisma = require("../config/prismaClient");

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Notify all users about an event (start or end).
 * Fire-and-forget — never blocks the HTTP response.
 */
async function notifyAllUsersAboutEvent(event, phase) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true },
    });

    const message =
      phase === "start"
        ? `The event "${event.title}" has just started. Check it out.`
        : `The event "${event.title}" has ended. Thanks for participating!`;

    const link = `/events/${event.id}`;

    await Promise.allSettled(users.map((user) => notifyUser(user, message, link)));
  } catch (err) {
    console.error("notifyAllUsersAboutEvent error:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/events/active
async function fetchActiveEvents(req, res) {
  try {
    const events = await eventService.fetchActiveEvents();
    res.status(200).json({ events });
  } catch (error) {
    console.error("Fetch active events error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// GET /api/events/:eventId
async function fetchEventById(req, res) {
  const eventId = Number(req.params.eventId);
  try {
    const event = await eventService.fetchEventById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found." });
    res.status(200).json({ event });
  } catch (error) {
    console.error("Fetch event error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// GET /api/events/:eventId/projects
async function fetchEventPublicProjects(req, res) {
  const eventId = Number(req.params.eventId);
  try {
    const projects = await eventService.fetchEventPublicProjects(eventId);
    res.status(200).json({ projects });
  } catch (error) {
    if (error.message === "EVENT_NOT_FOUND")
      return res.status(404).json({ message: "Event not found." });
    if (error.message === "NOT_A_DAYS_CHALLENGE")
      return res.status(400).json({ message: "This event does not have a public leaderboard." });
    console.error("Fetch event projects error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// GET /api/events/:eventId/communityStreak
async function getEventCommunityStreak(req, res) {
  const eventId = Number(req.params.eventId);
  try {
    const data = await eventService.getEventCommunityStreak(eventId);
    res.status(200).json(data);
  } catch (error) {
    if (error.message === "EVENT_NOT_FOUND")
      return res.status(404).json({ message: "Event not found." });
    if (error.message === "NOT_A_DAYS_CHALLENGE")
      return res
        .status(400)
        .json({ message: "Community streak is only available for Days Challenge events." });
    console.error("Community streak error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// GET /api/events/:eventId/winners
// Public — returns the recorded winners for a completed challenge.
async function fetchEventWinners(req, res) {
  const eventId = Number(req.params.eventId);
  try {
    const data = await eventService.fetchEventWinners(eventId);
    res.status(200).json(data);
  } catch (error) {
    if (error.message === "EVENT_NOT_FOUND")
      return res.status(404).json({ message: "Event not found." });
    if (error.message === "NOT_A_DAYS_CHALLENGE")
      return res.status(400).json({ message: "Winners are only recorded for Days Challenge events." });
    console.error("Fetch event winners error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/events/admin/all
async function fetchAllEvents(req, res) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Not authorized." });
  }

  try {
    const events = await eventService.fetchAllEvents();
    res.status(200).json({ events });
  } catch (error) {
    console.error("Fetch all events error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// POST /api/events/admin/create
async function createEvent(req, res) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Not authorized." });
  }

  const { title, description, bannerUrl, type, daysTarget, startDate, endDate } = req.body;

  if (!title || !description || !type || !startDate || !endDate) {
    return res
      .status(400)
      .json({ message: "title, description, type, startDate, and endDate are required." });
  }

  const validTypes = ["ANNOUNCEMENT", "DAYS_CHALLENGE", "WORKSHOP", "OTHER"];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ message: `type must be one of: ${validTypes.join(", ")}` });
  }

  if (new Date(startDate) >= new Date(endDate)) {
    return res.status(400).json({ message: "endDate must be after startDate." });
  }

  try {
    const event = await eventService.createEvent({
      title,
      description,
      bannerUrl,
      type,
      daysTarget,
      startDate,
      endDate,
    });

    if (new Date(startDate) <= new Date()) {
      notifyAllUsersAboutEvent(event, "start"); // fire-and-forget
    }

    res.status(201).json({ event });
  } catch (error) {
    if (error.message === "DAYS_TARGET_REQUIRED") {
      return res
        .status(400)
        .json({ message: "daysTarget is required for a Days Challenge event." });
    }
    console.error("Create event error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// POST /api/events/admin/:eventId/update
async function updateEvent(req, res) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Not authorized." });
  }

  const eventId = Number(req.params.eventId);
  const { title, description, bannerUrl, type, daysTarget, startDate, endDate, isActive } =
    req.body;

  const validTypes = ["ANNOUNCEMENT", "DAYS_CHALLENGE", "WORKSHOP", "OTHER"];
  if (type && !validTypes.includes(type)) {
    return res.status(400).json({ message: `type must be one of: ${validTypes.join(", ")}` });
  }

  if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
    return res.status(400).json({ message: "endDate must be after startDate." });
  }

  try {
    const existing = await eventService.fetchEventById(eventId);
    if (!existing) return res.status(404).json({ message: "Event not found." });

    const event = await eventService.updateEvent(eventId, {
      title,
      description,
      bannerUrl,
      type,
      daysTarget,
      startDate,
      endDate,
      isActive,
    });

    // Admin manually deactivated the event -> record winners then notify everyone it ended.
    if (existing.isActive === true && isActive === false) {
      // Record winners fire-and-forget — only meaningful for DAYS_CHALLENGE events.
      if (existing.type === "DAYS_CHALLENGE") {
        eventService.recordEventWinners(eventId).catch(err =>
          console.error("recordEventWinners error:", err)
        );
      }
      notifyAllUsersAboutEvent(event, "end"); // fire-and-forget
    }

    // Admin reactivated the event -> notify everyone it has started again.
    if (existing.isActive === false && isActive === true) {
      notifyAllUsersAboutEvent(event, "start"); // fire-and-forget
    }

    res.status(200).json({ event });
  } catch (error) {
    if (error.message === "EVENT_NOT_FOUND")
      return res.status(404).json({ message: "Event not found." });
    if (error.message === "DAYS_TARGET_REQUIRED")
      return res
        .status(400)
        .json({ message: "daysTarget is required for a Days Challenge event." });
    console.error("Update event error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// POST /api/events/admin/:eventId/delete
async function deleteEvent(req, res) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Not authorized." });
  }

  const eventId = Number(req.params.eventId);
  try {
    const existing = await eventService.fetchEventById(eventId);
    if (!existing) return res.status(404).json({ message: "Event not found." });

    await eventService.deleteEvent(eventId);

    notifyAllUsersAboutEvent(
      { ...existing, title: `${existing.title} (Cancelled)` },
      "end"
    ); // fire-and-forget

    res.status(200).json({ message: "Event deleted successfully." });
  } catch (error) {
    if (error.message === "EVENT_NOT_FOUND")
      return res.status(404).json({ message: "Event not found." });
    console.error("Delete event error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

// POST /api/events/admin/:eventId/recordWinners
// Manually trigger winner recording for a completed challenge.
// Useful if the auto-trigger on deactivation is missed, or to re-run after corrections.
async function recordEventWinners(req, res) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Not authorized." });
  }

  const eventId = Number(req.params.eventId);
  try {
    const result = await eventService.recordEventWinners(eventId);
    res.status(200).json({ message: `Winners recorded.`, count: result.count });
  } catch (error) {
    if (error.message === "EVENT_NOT_FOUND")
      return res.status(404).json({ message: "Event not found." });
    if (error.message === "NOT_A_DAYS_CHALLENGE")
      return res.status(400).json({ message: "Winners can only be recorded for Days Challenge events." });
    console.error("Record winners error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
}

module.exports = {
  // Public
  fetchActiveEvents,
  fetchEventById,
  fetchEventPublicProjects,
  getEventCommunityStreak,
  fetchEventWinners,
  // Admin
  fetchAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  recordEventWinners,
};