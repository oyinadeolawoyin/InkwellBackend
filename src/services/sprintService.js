const prisma = require("../config/prismaClient");

async function startSprint(userId, duration, checkin) {
    return prisma.sprint.create({
        data: {
            userId,
            duration,
            checkin
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
    return prisma.sprint.update({
        where: { id: sprintId },
        data: {
            wordsWritten: wordsWritten || 0,        // Default to 0 if undefined
            checkout: checkout || null,              // Default to null if undefined
            completedAt: new Date(),                 // Should always work
            isActive: false,
            isPause: false
        }
    });
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
    startSprint,
    pauseSprint,
    fetchActiveSprint,
    fetchLoginUserSprint,
    endSprint,
    fetchSprintOfTheDay,
    fetchSprintDays
}