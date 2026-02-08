const cron = require("node-cron");
const prisma = require("../src/config/prismaClient");
const { notifyUser } = require("../src/services/notificationService");
const { getCurrentTimeInTimezone, timeToMinutes } = require("../src/utilis/getTimezones");

const dayMap = {
  0: { goal: "sundayGoal", time: "sundayTime", label: "Sunday" },
  1: { goal: "mondayGoal", time: "mondayTime", label: "Monday" },
  2: { goal: "tuesdayGoal", time: "tuesdayTime", label: "Tuesday" },
  3: { goal: "wednesdayGoal", time: "wednesdayTime", label: "Wednesday" },
  4: { goal: "thursdayGoal", time: "thursdayTime", label: "Thursday" },
  5: { goal: "fridayGoal", time: "fridayTime", label: "Friday" },
  6: { goal: "saturdayGoal", time: "saturdayTime", label: "Saturday" }
};

function getMotivationalMessage(user, goal, currentTime) {
  const username = user.username;
  const goalText = goal > 0 ? `${goal} words` : 'something';
  
  // Parse time (assumes format "HH:mm")
  const [hours, minutes] = currentTime.split(':').map(Number);
  
  // Determine time of day
  let timeOfDay;
  let greeting;
  
  if (hours >= 5 && hours < 12) {
    timeOfDay = 'morning';
    greeting = 'Morning';
  } else if (hours >= 12 && hours < 17) {
    timeOfDay = 'afternoon';
    greeting = 'Hey';
  } else if (hours >= 17 && hours < 21) {
    timeOfDay = 'evening';
    greeting = 'Evening';
  } else {
    timeOfDay = 'night';
    greeting = 'Hey';
  }
  
  // Time-specific messages
  const messagesByTime = {
    morning: [
      `${greeting}, ${username}! ☕\n\nYou wanted to write this morning.\n\nWant to start a quick sprint before your day gets busy?\n\n(Even 10 minutes counts.)`,
      
      `Good morning, ${username}! 🌅\n\nFresh day, fresh page.\n\nReady to write ${goalText}?\n\n(No pressure if not - I'll be here later too.)`,
      
      `${greeting} ${username} 👋\n\nYou set this morning as writing time.\n\nEven 15 minutes before coffee kicks in counts.\n\nWant to try?`,
      
      `${username}, morning writing time 🖋️\n\nYour brain is fresh. Want to capture some words before the day starts?\n\n(Messy drafts welcome.)`
    ],
    
    afternoon: [
      `${greeting} ${username}!\n\nAfternoon writing break? ☕\n\nYou planned to write ${goalText} today.\n\nWant to spend 15 minutes on it?`,
      
      `${username}, ready for an afternoon sprint?\n\nOther writers are here too. You're not alone.\n\nEven 10 minutes counts. 🌱`,
      
      `${greeting} ${username} 👋\n\nMidday check-in: want to write?\n\nNo pressure - even one paragraph is progress.\n\n[Start a sprint]`,
      
      `Afternoon, ${username}!\n\nYou wanted to write today.\n\nPerfect time for a quick 20-minute sprint?\n\n(If not now, that's okay too.)`
    ],
    
    evening: [
      `${greeting}, ${username}! 🌙\n\nEnd-of-day writing session?\n\nYou planned to write ${goalText} today.\n\nWant to unwind with a sprint?`,
      
      `${username}, evening writing time 🖋️\n\nNo rush. No pressure.\n\nJust you, your words, and 25 minutes.\n\nReady?`,
      
      `${greeting} ${username}!\n\nBefore you close the day - want to write?\n\nEven 5 minutes counts as showing up.\n\n(Or skip if you're tired - that's valid too.)`,
      
      `${username}, this is your gentle reminder 🌱\n\nYou set tonight for writing.\n\nEven one sentence is progress.\n\nWant to give it a try?`
    ],
    
    night: [
      `${greeting} ${username}, night owl! 🦉\n\nLate-night writing session?\n\nYou wanted to write ${goalText} today.\n\nWant to try before bed?`,
      
      `${username}, it's late but... want to write? 🌙\n\nNo pressure at all.\n\nEven 10 minutes before sleep counts.\n\n(Or save it for tomorrow - totally fine.)`,
      
      `${greeting} ${username}!\n\nI know it's late.\n\nIf you're up for it: quick 15-minute sprint?\n\nIf not: tomorrow's a new day. ❤️`,
      
      `${username}, late-night reminder 🌛\n\nYou set this time for writing.\n\nEven capturing a few thoughts counts.\n\nWant to try? (Or rest - that's important too.)`
    ]
  };
  
  // Get messages for current time of day
  const relevantMessages = messagesByTime[timeOfDay];
  
  // Return random message from that time period
  return relevantMessages[Math.floor(Math.random() * relevantMessages.length)];
}

console.log("📝 Writing Plan Reminder Job: Initializing...");

const task = cron.schedule("*/1 * * * *", async () => {
  console.log("\n🔄 Writing Plan Reminder Job: Running at", new Date().toISOString());
  
  try {
    const plans = await prisma.writingPlan.findMany({
      include: { user: true }
    });

    console.log(`📋 Found ${plans.length} writing plan(s)`);

    if (plans.length === 0) {
      console.log("⚠️  No writing plans found in database");
      return;
    }

    for (const plan of plans) {
      const user = plan.user;
      
      console.log(`\n👤 Processing plan for user: ${user?.username || user?.id}`);
      
      if (!user?.timezone) {
        console.log(`  ⚠️  User ${user?.id} has no timezone set - skipping`);
        continue;
      }

      console.log(`  🌍 User timezone: ${user.timezone}`);

      const now = new Date();
      const weekdayIndex = new Date(
        now.toLocaleString("en-US", { timeZone: user.timezone })
      ).getDay();

      const { goal, time, label } = dayMap[weekdayIndex];
      console.log(`  📅 Today is ${label} (index: ${weekdayIndex})`);
      console.log(`  🎯 Goal field: ${goal}, Time field: ${time}`);
      console.log(`  📊 Plan goal: ${plan[goal]}, Plan time: ${plan[time]}`);

      if (!plan[goal] || !plan[time]) {
        console.log(`  ⏭️  No goal or time set for ${label} - skipping`);
        continue;
      }

      const currentTime = getCurrentTimeInTimezone(user.timezone);
      const currentMinutes = timeToMinutes(currentTime);
      const scheduledMinutes = timeToMinutes(plan[time]);

      console.log(`  ⏰ Current time: ${currentTime} (${currentMinutes} minutes)`);
      console.log(`  ⏰ Scheduled time: ${plan[time]} (${scheduledMinutes} minutes)`);
      console.log(`  📏 Difference: ${currentMinutes - scheduledMinutes} minutes`);

      if (currentMinutes < scheduledMinutes) {
        console.log(`  ⏭️  Current time (${currentTime}) is before scheduled time (${plan[time]}) - skipping`);
        continue;
      }

      // Normalize date
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      console.log(`  📆 Checking if already sent for date: ${today.toISOString()}`);

      // Check if already notified
      const alreadySent = await prisma.sentReminder.findUnique({
        where: {
          userId_date_day: {
            userId: user.id,
            date: today,
            day: label
          }
        }
      });

      if (alreadySent) {
        console.log(`  ✅ Already sent reminder for ${label} - skipping`);
        continue;
      }

      console.log(`  🔔 Sending notification...`);

      // Send notification
      const message = getMotivationalMessage(user, plan[goal], currentTime);
      
      try {
        await notifyUser(user, message, "/inkwellinky.vercel.app/dashboard");
        console.log(`  ✅ Notification sent successfully`);
      } catch (notifyError) {
        console.error(`  ❌ Failed to send notification:`, notifyError);
        throw notifyError;
      }

      // Record reminder
      try {
        await prisma.sentReminder.create({
          data: {
            userId: user.id,
            date: today,
            day: label
          }
        });
        console.log(`  ✅ Reminder record created`);
      } catch (recordError) {
        console.error(`  ❌ Failed to record reminder:`, recordError);
        throw recordError;
      }
    }
    
    console.log("\n✅ Writing Plan Reminder Job: Completed successfully");
  } catch (error) {
    console.error("\n❌ Writing plan reminder job failed:", error);
    console.error("Stack trace:", error.stack);
  }
});

// Verify the cron job is scheduled
if (task) {
  console.log("✅ Writing Plan Reminder Job: Successfully scheduled (runs every 5 minutes)");
} else {
  console.error("❌ Writing Plan Reminder Job: Failed to schedule!");
}

module.exports = task;