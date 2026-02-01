const prisma = require("../config/prismaClient");

// Get today's progress
async function getDailyProgress(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get today's sprints
    const todaySprints = await prisma.sprint.findMany({
        where: {
            userId,
            completedAt: {
                gte: today,
                lt: tomorrow
            },
            isActive: false
        },
        select: {
            duration: true,
            wordsWritten: true
        }
    });
    
    // Calculate totals
    const sprintsCompleted = todaySprints.length;
    const wordsWritten = todaySprints.reduce((sum, s) => sum + s.wordsWritten, 0);
    const minutesWritten = todaySprints.reduce((sum, s) => sum + s.duration, 0);
    
    // Check if today was planned
    const dayOfWeek = today.getDay();
    const dayMap = ['sundayGoal', 'mondayGoal', 'tuesdayGoal', 
                    'wednesdayGoal', 'thursdayGoal', 'fridayGoal', 'saturdayGoal'];
    
    const plan = await prisma.writingPlan.findUnique({
        where: { userId }
    });
    
    const wasPlannedDay = plan?.[dayMap[dayOfWeek]] !== null;
    
    return {
        date: today,
        sprintsCompleted,
        wordsWritten,
        minutesWritten,
        wasPlannedDay
    };
}

// Get this week's progress
async function getWeeklyProgress(userId) {
    const weekStart = getStartOfWeek(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    // Get this week's sprints
    const weekSprints = await prisma.sprint.findMany({
        where: {
            userId,
            completedAt: {
                gte: weekStart,
                lt: weekEnd
            },
            isActive: false
        },
        select: {
            duration: true,
            wordsWritten: true,
            completedAt: true
        }
    });
    
    // Get unique days written
    const daysWrittenSet = new Set(
        weekSprints.map(s => new Date(s.completedAt).toDateString())
    );
    
    // Get writing plan
    const plan = await prisma.writingPlan.findUnique({
        where: { userId }
    });
    
    // Calculate planned vs actual
    const dayGoals = ['sundayGoal', 'mondayGoal', 'tuesdayGoal', 
                      'wednesdayGoal', 'thursdayGoal', 'fridayGoal', 'saturdayGoal'];
    
    let plannedDaysCount = 0;
    let completedPlannedDays = 0;
    let bonusDays = 0;
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dateStr = date.toDateString();
        
        const wasPlanned = plan?.[dayGoals[i]] !== null;
        const didWrite = daysWrittenSet.has(dateStr);
        
        if (wasPlanned) {
            plannedDaysCount++;
            if (didWrite) completedPlannedDays++;
        } else if (didWrite) {
            bonusDays++;
        }
    }
    
    // Calculate totals
    const totalSprints = weekSprints.length;
    const totalWords = weekSprints.reduce((sum, s) => sum + s.wordsWritten, 0);
    const totalMinutes = weekSprints.reduce((sum, s) => sum + s.duration, 0);
    
    return {
        weekStart,
        weekEnd,
        plannedDays: plannedDaysCount,
        completedPlannedDays,
        bonusDays,
        totalSprints,
        totalWords,
        totalMinutes
    };
}

function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

async function writingWeeklyProgress(userId) {
    console.log('=== QUERY DEBUG ===');
    console.log('Looking for userId:', userId);
    console.log('Type of userId:', typeof userId);
    
    const result = await prisma.weeklyProgress.findMany({
        where: { userId },
        orderBy: { weekStart: "desc" }
    });
    
    console.log('Found records:', result.length);
    console.log('Records:', result);
    
    return result;
}

module.exports = {
    getDailyProgress,
    getWeeklyProgress,
    writingWeeklyProgress
};