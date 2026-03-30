const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => {
  console.log(`🤖 Bot logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_BOT_TOKEN);

// 👇 Better wait logic
async function waitForReady() {
  if (client.isReady()) return;
  await new Promise(resolve => client.once("ready", resolve));
}

async function sendBotMessage(channelId, embed) {
  await waitForReady();

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) return console.error("Channel not found");

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Bot send error:", err);
  }
}

module.exports = { sendBotMessage };