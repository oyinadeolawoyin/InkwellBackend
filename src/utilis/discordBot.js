const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let isReady = false;

client.once("ready", () => {
  console.log(`🤖 Bot logged in as ${client.user.tag}`);
  isReady = true;
});

client.login(process.env.DISCORD_BOT_TOKEN);

async function sendBotMessage(channelId, embed) {
  if (!isReady) {
    console.warn("Bot not ready yet");
    return;
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) return console.error("Channel not found");

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Bot send error:", err);
  }
}

module.exports = { sendBotMessage };