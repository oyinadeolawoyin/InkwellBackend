/**
 * sprintReminderService.js
 *
 * Handles the Friday writing-sprint reminder system:
 *   • saveSprintReminderOptIn  — called by the notification controller when a
 *                                user toggles the checkbox on AccountabilityPage
 *   • fetchSprintReminderOptIn — called by the controller to hydrate the toggle
 *                                on page load
 *   • sendFridaySprintReminders — run by the cron scheduler every Friday at
 *                                 3:30 pm UTC (30 minutes before the 4 pm sprint)
 *
 * Cron schedule string:  "30 15 * * 5"
 *   ┌─── minute  (30)
 *   ├─── hour    (15 = 3 pm UTC)
 *   ├─── day of month (*)
 *   ├─── month   (*)
 *   └─── day of week (5 = Friday)
 */

const prisma     = require("../config/prismaClient");
const { notifyUser } = require("./notificationService");

// ── Opt-in / opt-out ─────────────────────────────────────────────────────────

/**
 * Upsert a user's sprint-reminder opt-in preference.
 * Called when the writer toggles the checkbox on the Accountability page.
 *
 * @param {number} userId
 * @param {boolean} optedIn  - true = wants reminder, false = no reminder
 * @returns {Promise<SprintReminderOptIn>}
 */
async function saveSprintReminderOptIn(userId, optedIn) {
  return await prisma.sprintReminderOptIn.upsert({
    where:  { userId: Number(userId) },
    update: { optedIn },
    create: { userId: Number(userId), optedIn },
  });
}

/**
 * Fetch a user's current sprint-reminder opt-in record.
 * Returns null if the user has never set a preference.
 *
 * @param {number} userId
 * @returns {Promise<SprintReminderOptIn|null>}
 */
async function fetchSprintReminderOptIn(userId) {
  return await prisma.sprintReminderOptIn.findUnique({
    where: { userId: Number(userId) },
  });
}

// ── Cron job ─────────────────────────────────────────────────────────────────

/**
 * Query every opted-in user and fire the pre-sprint notification through
 * notifyUser() — which already handles inbox, push, and email channels
 * while respecting the user's per-channel NotificationPreference settings.
 *
 * Wire this up in your scheduler (see scheduledJobs.js below).
 */
async function sendFridaySprintReminders() {
  console.log("[SprintReminder] Cron fired — sending Friday sprint reminders");

  // 1. Fetch all opted-in users (with their profile for notifyUser)
  const optIns = await prisma.sprintReminderOptIn.findMany({
    where: { optedIn: true },
    include: {
      user: {
        select: { id: true, username: true, email: true },
      },
    },
  });

  if (optIns.length === 0) {
    console.log("[SprintReminder] No opted-in users — nothing to send.");
    return;
  }

  console.log(`[SprintReminder] Notifying ${optIns.length} writer(s)…`);

  // 2. Send notifications in parallel; swallow per-user errors so one bad
  //    email address or expired push subscription doesn't abort the batch.
  const results = await Promise.allSettled(
    optIns.map(({ user }) =>
      notifyUser(
        user,
        "The Friday writing sprint starts in 30 minutes — come write with us! 🖊️",
        "/group-sprint",            // links straight to the sprint room
        "friday_sprint_reminder"    // notifKey — respects per-channel preferences
      )
    )
  );

  // 3. Log any failures for debugging without crashing the job
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(
        `[SprintReminder] Failed for userId ${optIns[i].user.id}:`,
        result.reason
      );
    }
  });

  console.log("[SprintReminder] Done.");
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  saveSprintReminderOptIn,
  fetchSprintReminderOptIn,
  sendFridaySprintReminders,
};