const { sendBotMessage } = require("../utilis/discordBot");

const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

async function notifyGroupSprintStarted({ username, duration, soundscape, groupSprintId }) {
    await sendBotMessage(CHANNEL_ID, {
        title: "✍️ A Quiet Room Just Opened",
        color: 0x6c63ff,
        description: `${username} started a ${duration} min writing session`,
        fields: [
            { name: "🎵 Sound", value: soundscape || "None", inline: true },
        ],
        url: `https://inkwellinky.vercel.app/group-sprint/${groupSprintId}`,
        footer: { text: "Join if you feel like writing 🌱" },
        timestamp: new Date().toISOString()
    });
}

async function notifyGroupSprintEnded({ username, groupSprintId, totalWordsWritten }) {
    await sendBotMessage(CHANNEL_ID, {
        title: "🏁 Session Ended",
        color: 0x43b581,
        description: `${username} wrapped up a writing session`,
        fields: [
            { name: "📝 Words Written", value: `${totalWordsWritten || 0}`, inline: true },
        ],
        url: `https://inkwellinky.vercel.app/group-sprint/${groupSprintId}`,
        footer: { text: "Every word counts 🌱" },
        timestamp: new Date().toISOString()
    });
}

module.exports = { notifyGroupSprintStarted, notifyGroupSprintEnded };