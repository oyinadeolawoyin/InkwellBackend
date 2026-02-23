const prisma = require("../config/prismaClient");

async function startGroupSprint(userId, duration, sprintPurpose) {
    return prisma.groupSprint.create({
        data: {
            userId,
            duration,
            groupPurpose: sprintPurpose
        }
    })
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
                    },
                    _count: {
                        select: { likes: true }
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
    })
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
        prisma.groupSprint.count({
            where: { isActive: true }
        })
    ]);

    return {
        groupSprints,
        total
    };
}

async function endGroupSprint(thankyouNote, groupSprintId) {
    return await prisma.groupSprint.update({
        where: { id: groupSprintId },
        data: {
            groupThankNote: thankyouNote,
            completedAt: new Date(),
            isActive: false,
        }
    });
}

async function fetchGroupSprintOfTheDay({ skip, take }) {
    const { start, end } = getTodayRange();

    const [groupSprints, total] = await prisma.$transaction([
        prisma.groupSprint.findMany({
            where: {
                isActive: false,
                completedAt: {
                    gte: start,
                    lt: end
                }
            },
            include: {
                user: {
                    select: {
                        username: true,
                        avatar: true
                    }
                },
                _count: {
                    select: { sprints: true }
                }
            },
            orderBy: { completedAt: "desc" },
            skip,
            take,
        }),
        prisma.groupSprint.count({
            where: {
                isActive: false,
                completedAt: {
                    gte: start,
                    lt: end
                }
            }
        })
    ]);

    return { groupSprints, total };
}

async function startSprint(userId, duration, checkin, groupSprintId, intro) {
    return prisma.sprint.create({
        data: {
            userId,
            duration,
            checkin,
            ...(groupSprintId && { groupSprintId }), // only adds it if it's provided
            intro
        }
    })
}

async function pauseSprint(isPause, sprintId) {
    return prisma.sprint.update({
        where: { id: sprintId },
        data: {
            isPause
        }
    })
}

async function fetchActiveSprint({ skip, take }) {
    const [sprints, total] = await prisma.$transaction([
        prisma.sprint.findMany({
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
                }
            }
        }),
        prisma.sprint.count({
            where: { isActive: true }
        })
    ]);

    return {
        sprints,
        total
    };
}

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
    })
}

async function endSprint(sprintId, wordsWritten, checkout) {
    const sprint = await prisma.sprint.update({
        where: { id: sprintId },
        data: {
            wordsWritten: wordsWritten || 0,
            checkout: checkout || null,
            completedAt: new Date(),
            isActive: false,
            isPause: false
        }
    });

    await checkOffToday(sprint.userId);

    return sprint;
}

// NEW: toggle like on a sprint — works exactly like toggleLikeQuote
async function toggleLikeSprint({ userId, sprintId }) {
    return prisma.$transaction(async (tx) => {
        const existingLike = await tx.sprintLike.findUnique({
            where: {
                userId_sprintId: {
                    userId,
                    sprintId
                }
            }
        });

        let liked;

        if (existingLike) {
            await tx.sprintLike.delete({
                where: {
                    userId_sprintId: {
                        userId,
                        sprintId
                    }
                }
            });
            liked = false;
        } else {
            await tx.sprintLike.create({
                data: {
                    userId,
                    sprintId
                }
            });
            liked = true;
        }

        // Count likes after toggle
        const likesCount = await tx.sprintLike.count({
            where: { sprintId }
        });

        return { liked, likesCount };
    });
}

// NEW: check if a user liked a sprint (used to show liked state on page load)
async function checkUserSprintLike(userId, sprintId) {
    return prisma.sprintLike.findUnique({
        where: {
            userId_sprintId: {
                userId,
                sprintId
            }
        }
    });
}

// Helper function to check off today
async function checkOffToday(userId) {
    const today = new Date();
    const weekStart = getStartOfWeek(today);
    const dayOfWeek = today.getDay();
    
    const dayMap = [
        'sundayDone',
        'mondayDone', 
        'tuesdayDone',
        'wednesdayDone',
        'thursdayDone',
        'fridayDone',
        'saturdayDone'
    ];
    
    await prisma.weeklyProgress.upsert({
        where: {
            userId_weekStart: {
                userId,
                weekStart
            }
        },
        create: {
            userId,
            weekStart,
            [dayMap[dayOfWeek]]: true
        },
        update: {
            [dayMap[dayOfWeek]]: true
        }
    });
}

function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

function getTodayRange() {
    const now = new Date();
    
    const start = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0, 0
    ));
    
    const end = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 0, 0
    ));
    
    return { start, end };
}

async function fetchSprintOfTheDay({ skip, take }) {
    const { start, end } = getTodayRange();

    const [sprints, total] = await prisma.$transaction([
        prisma.sprint.findMany({
            where: {
                isActive: false,
                groupSprintId: null, 
                completedAt: {
                    gte: start,
                    lt: end
                }
            },
            select: {
                id: true,
                wordsWritten: true,
                duration: true,
                completedAt: true,
                startedAt: true,
                checkin: true,
                checkout: true,
                user: {
                    select: {
                        username: true,
                        avatar: true
                    }
                },
                _count: {
                    select: { likes: true }
                }
            },
            orderBy: { completedAt: "desc" },
            skip,
            take
        }),
        prisma.sprint.count({
            where: {
                isActive: false,
                completedAt: {
                    gte: start,
                    lt: end
                }
            }
        })
    ]);

    return { sprints, total };
}

async function fetchSprintDays(userId) {
    return prisma.sprint.findMany({
        where: { userId, isActive: false },
        select: { startedAt: true }
    });
}

module.exports = {
    startGroupSprint,
    fetchGroupSprint,
    fetchAllActiveGroupSprints,
    endGroupSprint,
    fetchGroupSprintOfTheDay,
    startSprint,
    pauseSprint,
    fetchActiveSprint,
    fetchLoginUserSprint,
    endSprint,
    toggleLikeSprint,
    checkUserSprintLike,
    fetchSprintOfTheDay,
    fetchSprintDays
}