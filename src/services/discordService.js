// src/services/discordService.js
const BOT_URL = process.env.DISCORD_BOT_URL;   // e.g. https://your-bot.railway.app
const BOT_SECRET = process.env.BOT_SECRET;      // same shared secret

async function callBot(path, body) {
  const res = await fetch(`${BOT_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bot-secret": BOT_SECRET,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Discord bot call failed [${path}]:`, text);
  }
}

// ─── Sprint lifecycle ─────────────────────────────────────────

async function notifyGroupSprintStarted({ username, duration, groupSprintId }) {
  await callBot("/notify/sprint-started", { username, duration, groupSprintId });
}

async function notifyGroupSprintEnded({ groupSprintId, totalWordsWritten }) {
  await callBot("/notify/sprint-ended", { groupSprintId, totalWordsWritten });
}

// ─── Member events ────────────────────────────────────────────

// Called when a member joins from the SITE (web join)
async function notifyMemberCheckedIn({ username, startWords, groupSprintId }) {
  await callBot("/notify/member-checked-in", { username, startWords, groupSprintId });
}

// Called when a member checks out (submits word count)
async function notifyMemberCheckedOut({ username, wordsWritten, groupSprintId }) {
  await callBot("/notify/member-checked-out", { username, wordsWritten, groupSprintId });
}

module.exports = {
  notifyGroupSprintStarted,
  notifyGroupSprintEnded,
  notifyMemberCheckedIn,
  notifyMemberCheckedOut,
};