let lastDiscordPing = 0;
const DISCORD_COOLDOWN_MS = 5000; // 5 seconds between pings

async function sendDiscordMessage(embed) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL?.trim().replace(/^["']|["']$/g, '');
    
    if (!webhookUrl) return console.warn("No DISCORD_WEBHOOK_URL set");

    try { new URL(webhookUrl); } catch {
        return console.error("DISCORD_WEBHOOK_URL is not a valid URL:", webhookUrl);
    }

    try {
        const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ embeds: [embed] })
        });

        if (res.status === 429) {
            const body = await res.json();
            console.warn("Discord rate limited — skipping. Body:", JSON.stringify(body));
            return; // don't retry, just skip
        }

        console.log("Discord response status:", res.status);
    } catch (error) {
        console.error("Discord notification error:", error);
    }
}

async function notifyGroupSprintStarted({ username, duration, soundscape, groupSprintId }) {
    await sendDiscordMessage({
        title: "✍️ New Group Sprint Started!",
        color: 0x6c63ff, // purple
        fields: [
            { name: "🧑 Host", value: username, inline: true },
            { name: "⏱ Duration", value: `${duration} mins`, inline: true },
            { name: "🎵 Soundscape", value: soundscape || "None", inline: true },
        ],
        url: `https://inkwellinky.vercel.app/group-sprint/${groupSprintId}`,
        footer: { text: "Join the sprint on Inkwell 🌱" },
        timestamp: new Date().toISOString()
    });
}

async function notifyGroupSprintEnded({ username, groupSprintId, totalWordsWritten }) {
    await sendDiscordMessage({
        title: "🏁 Group Sprint Ended!",
        color: 0x43b581, // green
        fields: [
            { name: "🧑 Host", value: username, inline: true },
            { name: "📝 Total Words Written", value: `${totalWordsWritten || 0} words`, inline: true },
        ],
        url: `https://inkwellinky.vercel.app/group-sprint/${groupSprintId}`,
        footer: { text: "Great writing session on Inkwell 🌱" },
        timestamp: new Date().toISOString()
    });
}

module.exports = { notifyGroupSprintStarted, notifyGroupSprintEnded };