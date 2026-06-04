/**
 * scheduledJobs.js
 *
 * Central place for all cron jobs on the Quillweave server.
 * Import and call startScheduledJobs() once in your server entry point:
 *
 *   // server.js / index.js
 *   const { startScheduledJobs } = require("./jobs/scheduledJobs");
 *   startScheduledJobs();
 *
 * Install node-cron if you haven't already:
 *   npm install node-cron
 */

const cron = require("node-cron");
const { sendFridaySprintReminders } = require("../src/services/sprintreminderservice");

/**
 * Register and start all scheduled background jobs.
 * Called once at server startup.
 */
function startScheduledJobs() {

  // ── Friday sprint reminder ────────────────────────────────────────────────
  // Fires every Friday at 3:30 pm UTC = 30 minutes before the 4 pm sprint.
  //
  // Cron field breakdown:
  //   30  → minute 30
  //   15  → hour 15 (3 pm UTC)
  //   *   → any day of month
  //   *   → any month
  //   5   → Friday (0 = Sunday … 6 = Saturday)
  //
  cron.schedule("30 15 * * 5", async () => {
    try {
      await sendFridaySprintReminders();
    } catch (err) {
      // Top-level catch so a crash here never kills the whole server process
      console.error("[ScheduledJobs] Uncaught error in sendFridaySprintReminders:", err);
    }
  }, {
    timezone: "UTC",   // always fire at 3:30 pm UTC regardless of server timezone
  });

  console.log("[ScheduledJobs] Friday sprint reminder cron registered (30 15 * * 5 UTC).");

  // ── Add future jobs here ──────────────────────────────────────────────────
  // e.g. cron.schedule("0 9 * * 1", sendWeeklyDigest, { timezone: "UTC" });
}

module.exports = { startScheduledJobs };