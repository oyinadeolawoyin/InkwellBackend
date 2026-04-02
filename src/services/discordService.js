// src/services/discordService.js
const BOT_URL = process.env.DISCORD_BOT_URL;       // e.g. https://your-bot.railway.app
const BOT_SECRET = process.env.BOT_SECRET;          // same shared secret

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

async function notifyGroupSprintStarted({ username, duration, soundscape, groupSprintId }) {
  await callBot("/notify/sprint-started", { username, duration, soundscape, groupSprintId });
}

async function notifyGroupSprintEnded({ username, groupSprintId, totalWordsWritten }) {
  await callBot("/notify/sprint-ended", { username, groupSprintId, totalWordsWritten });
}

module.exports = { notifyGroupSprintStarted, notifyGroupSprintEnded };