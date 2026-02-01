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
    // 1. End the sprint
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

    // 2. AUTO-CHECK TODAY IN WEEKLY PROGRESS
    await checkOffToday(sprint.userId);

    return sprint;
}

// Helper function to check off today
async function checkOffToday(userId) {
    const today = new Date();
    const weekStart = getStartOfWeek(today);
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, etc.
    
    const dayMap = [
        'sundayDone',
        'mondayDone', 
        'tuesdayDone',
        'wednesdayDone',
        'thursdayDone',
        'fridayDone',
        'saturdayDone'
    ];
    
    // Get or create this week's progress
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
            [dayMap[dayOfWeek]]: true  //Check today
        },
        update: {
            [dayMap[dayOfWeek]]: true  //Check today
        }
    });
}

function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
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