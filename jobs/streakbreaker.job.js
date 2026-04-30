const cron = require("node-cron");
const { breakExpiredStreaks } = require("../src/services/projectService");

 
// Runs every day at 00:05 UTC (5 min after midnight to be safe)
cron.schedule("5 0 * * *", async () => {
    console.log("[StreakBreaker] Running streak expiry check...");
    try {
        await breakExpiredStreaks();
        console.log("[StreakBreaker] Done.");
    } catch (err) {
        console.error("[StreakBreaker] Error:", err);
    }
}, { timezone: "UTC" });
 
console.log("[StreakBreaker] Cron job scheduled.");