// src/cron/challengeCron.js
const cron = require("node-cron");
const { processMissedDays } = require("../src/services/challengeservice");

// Runs every day at 00:05 UTC.
// Marks active participants who did NOT check in "yesterday" by
// incrementing missedDaysInRow, and resets currentStreak to 0 once
// missedDaysInRow reaches STREAK_MISS_THRESHOLD (3).
function startChallengeCron() {
  cron.schedule(
    "5 0 * * *",
    async () => {
      try {
        const result = await processMissedDays();
        console.log("[challenge-cron] processed:", result);
      } catch (err) {
        console.error("[challenge-cron] failed:", err);
      }
    },
    { timezone: "UTC" }
  );
}

module.exports = { startChallengeCron };