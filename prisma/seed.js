const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const missions = [
    // EASY (5)
    {
        title: "First Words",
        description: "Write at least 100 words in a single sprint.",
        type: "SPRINT_WORDS",
        requirement: 100,
        difficulty: "EASY",
        xp: 50
    },
    {
        title: "Getting Started",
        description: "Complete your first sprint.",
        type: "SPRINT_COUNT",
        requirement: 1,
        difficulty: "EASY",
        xp: 30
    },
    {
        title: "Quick Sprint",
        description: "Complete a sprint of at least 15 minutes.",
        type: "SPRINT_DURATION",
        requirement: 15,
        difficulty: "EASY",
        xp: 40
    },
    {
        title: "Thousand Words",
        description: "Accumulate 1,000 words written across sprints in this quest.",
        type: "TOTAL_WORDS",
        requirement: 1000,
        difficulty: "EASY",
        xp: 100
    },
    {
        title: "Three Sprints",
        description: "Complete 3 sprints in total for this quest.",
        type: "SPRINT_COUNT",
        requirement: 3,
        difficulty: "EASY",
        xp: 60
    },

    // MEDIUM (5)
    {
        title: "Word Burst",
        description: "Write at least 500 words in a single sprint.",
        type: "SPRINT_WORDS",
        requirement: 500,
        difficulty: "MEDIUM",
        xp: 150
    },
    {
        title: "Consistent Writer",
        description: "Complete 10 sprints in total for this quest.",
        type: "SPRINT_COUNT",
        requirement: 10,
        difficulty: "MEDIUM",
        xp: 200
    },
    {
        title: "Deep Focus",
        description: "Complete a sprint lasting at least 45 minutes.",
        type: "SPRINT_DURATION",
        requirement: 45,
        difficulty: "MEDIUM",
        xp: 180
    },
    {
        title: "Five Thousand Words",
        description: "Accumulate 5,000 words written across sprints in this quest.",
        type: "TOTAL_WORDS",
        requirement: 5000,
        difficulty: "MEDIUM",
        xp: 300
    },
    {
        title: "Power Writer",
        description: "Write at least 1,000 words in a single sprint.",
        type: "SPRINT_WORDS",
        requirement: 1000,
        difficulty: "MEDIUM",
        xp: 250
    },

    // HARD (4)
    {
        title: "Scholar's Dedication",
        description: "Accumulate 15,000 words written across sprints in this quest.",
        type: "TOTAL_WORDS",
        requirement: 15000,
        difficulty: "HARD",
        xp: 500
    },
    {
        title: "Marathon Writer",
        description: "Complete a sprint lasting at least 90 minutes.",
        type: "SPRINT_DURATION",
        requirement: 90,
        difficulty: "HARD",
        xp: 400
    },
    {
        title: "Prolific",
        description: "Complete 25 sprints in total for this quest.",
        type: "SPRINT_COUNT",
        requirement: 25,
        difficulty: "HARD",
        xp: 450
    },
    {
        title: "Epic Sprint",
        description: "Write at least 2,500 words in a single sprint.",
        type: "SPRINT_WORDS",
        requirement: 2500,
        difficulty: "HARD",
        xp: 500
    }
];

async function assignActiveMissions(userId) {
    const existing = await prisma.userActiveMission.findMany({ where: { userId } });
    const existingDifficulties = new Set(existing.map(m => m.difficulty));
    const difficulties = ["EASY", "MEDIUM", "HARD"];

    for (const difficulty of difficulties) {
        if (existingDifficulties.has(difficulty)) continue;

        const completedMissions = await prisma.userMission.findMany({
            where: { userId },
            select: { missionId: true }
        });
        const completedIds = completedMissions.map(m => m.missionId);

        const available = await prisma.mission.findMany({
            where: {
                difficulty,
                id: { notIn: completedIds.length > 0 ? completedIds : [-1] }
            }
        });

        if (available.length === 0) continue;

        let picked;
        if (difficulty === "EASY") {
            const firstMission = available.find(m => m.title === "Getting Started");
            picked = firstMission ?? available[Math.floor(Math.random() * available.length)];
        } else {
            picked = available[Math.floor(Math.random() * available.length)];
        }

        await prisma.userActiveMission.create({
            data: { userId, missionId: picked.id, difficulty }
        });
    }
}

async function main() {
    console.log("Seeding missions...");

    for (const mission of missions) {
        await prisma.mission.upsert({
            where: { title: mission.title },
            update: {
                description: mission.description,
                type: mission.type,
                requirement: mission.requirement,
                difficulty: mission.difficulty,
                xp: mission.xp
            },
            create: mission
        });
    }

    console.log(`Seeded ${missions.length} missions successfully.`);

    // Backfill missions for all existing users who don't have active missions yet
    const users = await prisma.user.findMany({ select: { id: true, username: true } });
    console.log(`Backfilling missions for ${users.length} existing users...`);
    for (const user of users) {
        await assignActiveMissions(user.id);
        console.log(`  Assigned missions to user: ${user.username}`);
    }
    console.log("Backfill complete.");
}

main()
    .catch((e) => {
        console.error("Seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
