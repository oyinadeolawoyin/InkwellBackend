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
                    user:          { select: { id: true, username: true, avatar: true } }
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
            userId:       e.project.user.id,
            username:     e.project.user.username,
            avatar:       e.project.user.avatar,
            streak:       e.project.currentStreak
        }))
        .sort((a, b) => b.streak - a.streak);

    // communityStreak = what everyone has in common = the minimum streak.
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

// ─── EVENT WINNERS ────────────────────────────────────────────
// Returns the recorded winners for a completed DAYS_CHALLENGE event.
// Called by the community page shoutout section.

async function fetchEventWinners(eventId) {
    const event = await prisma.platformEvent.findUnique({
        where: { id: eventId },
        select: { type: true, title: true, daysTarget: true, endDate: true, isActive: true }
    });

    if (!event)                          throw new Error("EVENT_NOT_FOUND");
    if (event.type !== "DAYS_CHALLENGE") throw new Error("NOT_A_DAYS_CHALLENGE");

    const winners = await prisma.eventWinner.findMany({
        where: { eventId },
        orderBy: [{ challengeRole: "asc" }, { finalStreak: "desc" }],
        include: {
            user: { select: { id: true, username: true, avatar: true } }
        }
    });

    return {
        eventId,
        eventTitle:  event.title,
        daysTarget:  event.daysTarget,
        endDate:     event.endDate,
        isActive:    event.isActive,
        winners
    };
}

// ─── RECORD EVENT WINNERS (called when admin closes/ends a challenge) ─────────
// Scans all non-disqualified entries for the event, computes each writer's
// totals from their ProjectDayLog rows, assigns challenge roles, and writes
// EventWinner records. Safe to call multiple times — uses upsert.
//
// Role logic:
//   IRON_PEN       — streak equals the event's daysTarget exactly (perfect run)
//   CHAMPION       — highest total word output among finishers
//   STREAK_KEEPER  — everyone else who finished (streak >= 1 at end)

async function recordEventWinners(eventId) {
    const event = await prisma.platformEvent.findUnique({
        where: { id: eventId },
        select: { type: true, daysTarget: true, title: true }
    });

    if (!event)                          throw new Error("EVENT_NOT_FOUND");
    if (event.type !== "DAYS_CHALLENGE") throw new Error("NOT_A_DAYS_CHALLENGE");

    // Grab all non-disqualified entries with their project + day logs
    const entries = await prisma.projectEventEntry.findMany({
        where: { eventId, disqualified: false },
        include: {
            project: {
                select: {
                    id:            true,
                    title:         true,
                    currentStreak: true,
                    userId:        true,
                    user: { select: { username: true, avatar: true } },
                    dayLogs:       { select: { wordsLogged: true, chaptersLogged: true, scenesLogged: true, minutesLogged: true } }
                }
            }
        }
    });

    if (entries.length === 0) return { count: 0 };

    // Compute totals for each entry
    const computed = entries.map(e => {
        const logs  = e.project.dayLogs || [];
        const total = logs.reduce(
            (acc, l) => ({
                words:   acc.words   + (l.wordsLogged    || 0),
                chapters:acc.chapters+ (l.chaptersLogged || 0),
                scenes:  acc.scenes  + (l.scenesLogged   || 0),
                minutes: acc.minutes + (l.minutesLogged  || 0),
            }),
            { words: 0, chapters: 0, scenes: 0, minutes: 0 }
        );
        return {
            userId:       e.project.userId,
            projectId:    e.project.id,
            projectTitle: e.project.title,
            username:     e.project.user.username,
            avatar:       e.project.user.avatar,
            finalStreak:  e.project.currentStreak,
            totalWords:   total.words,
            totalChapters:total.chapters,
            totalScenes:  total.scenes,
            totalMinutes: total.minutes,
        };
    });

    // Determine champion — highest word count, tie-break by streak
    const sorted      = [...computed].sort((a, b) => b.totalWords - a.totalWords || b.finalStreak - a.finalStreak);
    const championId  = sorted[0]?.userId;

    const upserts = computed.map(w => {
        let role = "STREAK_KEEPER";
        if (event.daysTarget && w.finalStreak >= event.daysTarget) {
            role = "IRON_PEN";
        }
        if (w.userId === championId && w.totalWords > 0) {
            // Champion badge overrides STREAK_KEEPER but IRON_PEN can also be champion;
            // store CHAMPION on top scorer if they're not already IRON_PEN, otherwise
            // they keep IRON_PEN (rarest badge). To award both, you'd need a many-to-many;
            // for simplicity we stack CHAMPION on top of IRON_PEN only when word count wins.
            if (role !== "IRON_PEN") role = "CHAMPION";
        }

        return prisma.eventWinner.upsert({
            where:  { eventId_userId: { eventId, userId: w.userId } },
            update: {
                projectTitle:  w.projectTitle,
                username:      w.username,
                avatar:        w.avatar,
                finalStreak:   w.finalStreak,
                totalWords:    w.totalWords,
                totalChapters: w.totalChapters,
                totalScenes:   w.totalScenes,
                totalMinutes:  w.totalMinutes,
                challengeRole: role,
            },
            create: {
                eventId,
                userId:        w.userId,
                projectId:     w.projectId,
                projectTitle:  w.projectTitle,
                username:      w.username,
                avatar:        w.avatar,
                finalStreak:   w.finalStreak,
                totalWords:    w.totalWords,
                totalChapters: w.totalChapters,
                totalScenes:   w.totalScenes,
                totalMinutes:  w.totalMinutes,
                challengeRole: role,
            }
        });
    });

    const results = await Promise.allSettled(upserts);
    const count   = results.filter(r => r.status === "fulfilled").length;
    return { count };
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
    fetchEventWinners,
    recordEventWinners,
    createEvent,
    updateEvent,
    deleteEvent,
};