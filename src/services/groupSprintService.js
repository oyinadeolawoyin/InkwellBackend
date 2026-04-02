const { check } = require("express-validator");
const prisma = require("../config/prismaClient");

// ─── GROUP SPRINT ─────────────────────────────────────────────

async function startGroupSprint(userId, duration, soundscape) {
    // With LiveKit, rooms are created automatically when participants join
    // We just need to store a unique room name derived from the sprint id
    // We'll update it after creation using the sprint's id
    const groupSprint = await prisma.groupSprint.create({
        data: {
            userId,
            duration,
            soundscape: soundscape || null,
            // roomName will be set after we have the id
        }
    });

    // Now set the liveKitRoomName using the sprint id
    return prisma.groupSprint.update({
        where: { id: groupSprint.id },
        data: { liveKitRoomName: `sprint-${groupSprint.id}` }
    });
}

async function endGroupSprint(groupSprintId) {
    // Force-close any member sprints that never checked out (wordsWritten stays 0 for them)
    await prisma.sprint.updateMany({
        where: { groupSprintId, isActive: true },
        data: {
            completedAt: new Date(),
            isActive: false,
        }
    });

    // Recalculate totalWordsWritten from ALL sprints (including the ones just force-closed)
    // This ensures Discord gets the real number, not 0
    const allSprints = await prisma.sprint.findMany({
        where: { groupSprintId },
        select: { wordsWritten: true }
    });
    const totalWordsWritten = allSprints.reduce((sum, s) => sum + (s.wordsWritten || 0), 0);

    return prisma.groupSprint.update({
        where: { id: groupSprintId },
        data: {
            completedAt: new Date(),
            isActive: false,
            totalWordsWritten,
        }
    });
}

async function fetchGroupSprint(groupSprintId) {
    return prisma.groupSprint.findFirst({
        where: { id: groupSprintId },
        include: {
            sprints: {
                include: {
                    user: {
                        select: {
                            username: true,
                            avatar: true
                        }
                    }
                }
            },
            _count: {
                select: { sprints: true }
            },
            user: {
                select: {
                    username: true,
                    avatar: true
                }
            }
        }
    });
}

async function fetchAllActiveGroupSprints({ take, skip }) {
    const [groupSprints, total] = await prisma.$transaction([
        prisma.groupSprint.findMany({
            where: { isActive: true },
            skip,
            take,
            orderBy: { startedAt: "desc" },
            include: {
                user: {
                    select: {
                        username: true,
                        avatar: true
                    }
                },
                sprints: {
                    select: {
                        userId: true,
                        user: {
                            select: {
                                username: true,
                                avatar: true
                            }
                        }
                    }
                },
                _count: {
                    select: { sprints: true }
                }
            }
        }),
        prisma.groupSprint.count({ where: { isActive: true } })
    ]);

    return { groupSprints, total };
}

// Returns the last completed group sprint — used to show results on homepage
async function fetchLastGroupSprint() {
    return prisma.groupSprint.findFirst({
        where: { 
            isActive: false,
            completedAt: { not: null } 
        },
        orderBy: { completedAt: "desc" },
        include: {
            sprints: {
                orderBy: { wordsWritten: "desc" },
                include: {
                    user: {
                        select: {
                            username: true,
                            avatar: true
                        }
                    }
                }
            },
            user: {
                select: {
                    username: true,
                    avatar: true
                }
            },
            _count: {
                select: { sprints: true }
            }
        }
    });
}

// ─── SPRINT (joining a group sprint) ─────────────────────────

// Member joins a group sprint — saves what they're working on and their starting word count.
// If the user already has an active sprint in this room (e.g. they left and came back),
// return the existing sprint instead of creating a duplicate.
async function joinSprint(userId, groupSprintId, checkin, startWords) {
    const existing = await prisma.sprint.findFirst({
        where: { userId, groupSprintId, isActive: true }
    });

    if (existing) return existing;
    
    return prisma.sprint.create({
        data: {
            userId,
            groupSprintId,
            checkin,
            startWords: startWords || 0
        }
    });
}

async function checkoutSprint(sprintId, currentWordCount) {
    const existing = await prisma.sprint.findUnique({
        where: { id: sprintId },
        select: { startWords: true, userId: true, groupSprintId: true }
    });

    if (!existing) throw new Error("Sprint not found");

    const diff = currentWordCount - existing.startWords;
    const wordsWritten = diff > 0 ? diff : 0;
    const deletedWords = diff < 0 ? Math.abs(diff) : 0;

    // Save this sprint's words and mark inactive
    const sprint = await prisma.sprint.update({
        where: { id: sprintId },
        data: {
            wordsWritten,
            deletedWords,
            completedAt: new Date(),
            isActive: false
        }
    });

    // Recalculate totalWordsWritten on the parent GroupSprint so homepage stays accurate
    // This runs after every checkout so late checkouts are always included
    if (existing.groupSprintId) {
        const allSprints = await prisma.sprint.findMany({
            where: { groupSprintId: existing.groupSprintId },
            select: { wordsWritten: true }
        });
        const total = allSprints.reduce((sum, s) => sum + (s.wordsWritten || 0), 0);
        await prisma.groupSprint.update({
            where: { id: existing.groupSprintId },
            data: { totalWordsWritten: total }
        });
    }

    return sprint;
}

// Get the logged in user's active sprint
async function fetchLoginUserSprint(userId) {
    return prisma.sprint.findFirst({
        where: { userId, isActive: true },
        include: {
            user: {
                select: {
                    username: true,
                    avatar: true
                }
            }
        }
    });
}

module.exports = {
    startGroupSprint,
    endGroupSprint,
    fetchGroupSprint,
    fetchAllActiveGroupSprints,
    fetchLastGroupSprint,
    joinSprint,
    checkoutSprint,
    fetchLoginUserSprint
}