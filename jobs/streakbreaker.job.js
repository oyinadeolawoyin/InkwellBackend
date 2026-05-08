const cron = require("node-cron");
const { breakExpiredStreaks } = require("../src/services/projectService");

// Runs every day at 00:05 UTC (5 min after midnight — gives all timezones time to settle)
cron.schedule("5 0 * * *", async () => {
    console.log("[StreakBreaker] Running streak expiry check...");
    try {
        const result = await breakExpiredStreaks();
        console.log(`[StreakBreaker] Done. Processed ${result.processed} project(s).`);
    } catch (err) {
        console.error("[StreakBreaker] Error:", err);
    }
}, { timezone: "UTC" });

console.log("[StreakBreaker] Cron job scheduled (runs daily at 00:05 UTC).");