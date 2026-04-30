const prisma = require("../config/prismaClient");

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM EVENT SERVICE
// Handles carousel notices, days challenges, and community streak data.
// ─────────────────────────────────────────────────────────────────────────────

// ─── FETCH ────────────────────────────────────────────────────

// All active events — used by the frontend carousel.
// Returns events ordered by startDate so upcoming ones surface first.
async function fetchActiveEvents() {
    return prisma.platformEvent.findMany({
        where: {
            isActive: true,
            endDate:  { gte: new Date() }
        },
        orderBy: { startDate: "asc" }
    });
}

// Single event by ID (admin detail view or event landing page).
async function fetchEventById(eventId) {
    return prisma.platformEvent.findUnique({
        where: { id: eventId },
        include: {
            entries: {
                where: { disqualified: false },
                include: {
                    project: {
                        select: {
                            id:            true,
                            title:         true,
                            genre:         true,
                            phase:         true,
                            currentStreak: true,
                            consecutiveDaysTarget: true,
                            currentWordCount: true,
                            targetWordCount:  true,
                            user: { select: { username: true, avatar: true } }
                        }
                    }
                }
            }
        }
    });
}

// All events — admin list view.
async function fetchAllEvents() {
    return prisma.platformEvent.findMany({
        orderBy: { startDate: "desc" },
        include: { _count: { select: { entries: true } } }
    });
}

// ─── PUBLIC EVENT PAGE ────────────────────────────────────────

// Returns public projects currently enrolled in a specific DAYS_CHALLENGE,
// sorted by streak descending (leaderboard order).
async function fetchEventPublicProjects(eventId) {
    const event = await prisma.platformEvent.findUnique({
        where: { id: eventId },
        select: { type: true }
    });

    if (!event)                          throw new Error("EVENT_NOT_FOUND");
    if (event.type !== "DAYS_CHALLENGE") throw new Error("NOT_A_DAYS_CHALLENGE");

    return prisma.project.findMany({
        where: {
            visibility: "PUBLIC",
            status:     "IN_PROGRESS",
            eventEntries: {
                some: { eventId, disqualified: false }
            }
        },
        select: {
            id:                    true,
            title:                 true,
            genre:                 true,
            phase:                 true,
            currentStreak:         true,
            consecutiveDaysTarget: true,
            currentWordCount:      true,
            targetWordCount:       true,
            lastLogDate:           true,
            user: { select: { username: true, avatar: true } }
        },
        orderBy: { currentStreak: "desc" }
    });
}

// ─── COMMUNITY STREAK ─────────────────────────────────────────
// Returns the "Day X" number for the event page — the lowest streak
// among all active participants (the day everyone has reached together),
// plus the full leaderboard sorted by individual streak descending.

async function getEventCommunityStreak(eventId) {
    const event = await prisma.platformEvent.findUnique({
        where: { id: eventId },
        select: {
            type:       true,
            isActive:   true,
            daysTarget: true,
            title:      true,
            startDate:  true,
            endDate:    true
        }
    });

    if (!event)                          throw new Error("EVENT_NOT_FOUND");
    if (event.type !== "DAYS_CHALLENGE") throw new Error("NOT_A_DAYS_CHALLENGE");

    const entries = await prisma.projectEventEntry.findMany({
        where: { eventId, disqualified: false },
        include: {
            project: {
                select: {
                    id:            true,
                    title:         true,
                    currentStreak: true,
                    user:          { select: { username: true, avatar: true } }
                }
            }
        }
    });

    if (entries.length === 0) {
        return {
            eventId,
            eventTitle:       event.title,
            daysTarget:       event.daysTarget,
            startDate:        event.startDate,
            endDate:          event.endDate,
            participantCount: 0,
            communityStreak:  0,
            leaderboard:      []
        };
    }

    const leaderboard = entries
        .map(e => ({
            projectId:    e.project.id,
            projectTitle: e.project.title,
            username:     e.project.user.username,
            avatar:       e.project.user.avatar,
            streak:       e.project.currentStreak
        }))
        .sort((a, b) => b.streak - a.streak);

    // communityStreak = what everyone has in common = the minimum streak.
    // This is the "Day X of the challenge" value shown on the event page.
    const communityStreak = Math.min(...leaderboard.map(e => e.streak));

    return {
        eventId,
        eventTitle:       event.title,
        daysTarget:       event.daysTarget,
        startDate:        event.startDate,
        endDate:          event.endDate,
        participantCount: entries.length,
        communityStreak,
        leaderboard
    };
}

// ─── ADMIN — CREATE ───────────────────────────────────────────

async function createEvent({ title, description, bannerUrl, type, daysTarget, startDate, endDate }) {
    if (type === "DAYS_CHALLENGE" && (!daysTarget || Number(daysTarget) <= 0)) {
        throw new Error("DAYS_TARGET_REQUIRED");
    }

    return prisma.platformEvent.create({
        data: {
            title,
            description,
            bannerUrl:  bannerUrl  ?? null,
            type,
            daysTarget: daysTarget ? Number(daysTarget) : null,
            startDate:  new Date(startDate),
            endDate:    new Date(endDate),
        }
    });
}

// ─── ADMIN — UPDATE ───────────────────────────────────────────

async function updateEvent(eventId, { title, description, bannerUrl, type, daysTarget, startDate, endDate, isActive }) {
    const existing = await prisma.platformEvent.findUnique({ where: { id: eventId } });
    if (!existing) throw new Error("EVENT_NOT_FOUND");

    const resolvedType = type ?? existing.type;
    if (resolvedType === "DAYS_CHALLENGE" && daysTarget !== undefined && Number(daysTarget) <= 0) {
        throw new Error("DAYS_TARGET_REQUIRED");
    }

    return prisma.platformEvent.update({
        where: { id: eventId },
        data: {
            title:      title      ?? existing.title,
            description: description ?? existing.description,
            bannerUrl:  bannerUrl  !== undefined ? bannerUrl : existing.bannerUrl,
            type:       resolvedType,
            daysTarget: daysTarget !== undefined ? Number(daysTarget) : existing.daysTarget,
            startDate:  startDate  ? new Date(startDate) : existing.startDate,
            endDate:    endDate    ? new Date(endDate)   : existing.endDate,
            isActive:   isActive   !== undefined ? Boolean(isActive) : existing.isActive,
        }
    });
}

// ─── ADMIN — DELETE ───────────────────────────────────────────

async function deleteEvent(eventId) {
    const existing = await prisma.platformEvent.findUnique({ where: { id: eventId } });
    if (!existing) throw new Error("EVENT_NOT_FOUND");
    return prisma.platformEvent.delete({ where: { id: eventId } });
}

module.exports = {
    fetchActiveEvents,
    fetchEventById,
    fetchAllEvents,
    fetchEventPublicProjects,
    getEventCommunityStreak,
    createEvent,
    updateEvent,
    deleteEvent,
};