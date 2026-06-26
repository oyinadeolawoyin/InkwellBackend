// src/jobs/sprintReminderCron.js
//
// Fires every Friday at 3:30pm UTC (30 minutes before the standing 4pm UTC
// group sprint) and notifies every user who's opted in via
// SprintReminderOptIn. The actual notification fan-out logic already exists
// in sprintReminderService.sendFridaySprintReminders() — it just wasn't
// scheduled anywhere yet. This file is the missing wiring.
//
// Wire up alongside your other jobs:
//   const { startSprintReminderCron } = require("./sprintReminderCron");
//   startSprintReminderCron();

const cron = require("node-cron");
const { sendFridaySprintReminders } = require("../src/services/sprintreminderservice");

function startSprintReminderCron() {
  // "30 15 * * 5" → minute 30, hour 15 (3pm UTC), any day-of-month, any
  // month, day-of-week 5 (Friday). 3:30pm UTC = 30 min before the 4pm UTC
  // sprint referenced in sprintRoom.jsx's nextFridayFourPM().
  cron.schedule("30 15 * * 5", async () => {
    try {
      await sendFridaySprintReminders();
    } catch (err) {
      console.error("[sprintReminderCron] error:", err.message);
    }
  });

  console.log("✅ Friday sprint reminder cron started");
}

module.exports = { startSprintReminderCron };