const prisma = require("../config/prismaClient");

// ─── GROUP SPRINT ─────────────────────────────────────────────

async function startGroupSprint(userId, duration, soundscape) {
    return prisma.groupSprint.create({
        data: {
            userId,
            duration,
            soundscape: soundscape || null
        }
    });
}

async function endGroupSprint(groupSprintId, thankyouNote) {
    // Get all completed sprints in this group sprint
    const sprints = await prisma.sprint.findMany({
        where: {
            groupSprintId,
            isActive: false
        },
        select: { wordsWritten: true }
    });

    // Add up all members' words written
    const totalWordsWritten = sprints.reduce((sum, s) => sum + (s.wordsWritten || 0), 0);

    return prisma.groupSprint.update({
        where: { id: groupSprintId },
        data: {
            groupThankNote: thankyouNote || null,
            completedAt: new Date(),
            isActive: false,
            totalWordsWritten
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
        where: { isActive: false },
        orderBy: { completedAt: "desc" },
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

// Member joins a group sprint — saves what they're working on and their starting word count
async function joinSprint(userId, groupSprintId, checkin, startWords) {
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
        select: { startWords: true, userId: true }
    });

    if (!existing) throw new Error("Sprint not found");

    const diff = currentWordCount - existing.startWords;

    const wordsWritten = diff > 0 ? diff : 0;
    const deletedWords = diff < 0 ? Math.abs(diff) : 0;

    return prisma.sprint.update({
        where: { id: sprintId },
        data: {
            wordsWritten,
            deletedWords,
            completedAt: new Date(),
            isActive: false
        }
    });
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