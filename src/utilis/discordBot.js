console.log("🔥 discordBot.js is running");
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => {
  console.log(`🤖 Bot logged in as ${client.user.tag}`);
});

console.log("🔑 TOKEN VALUE:", process.env.DISCORD_BOT_TOKEN);
console.log("🔑 TOKEN LENGTH:", process.env.DISCORD_BOT_TOKEN?.length);

async function loginWithRetry(retries = 5) {
    try {
      console.log("🔌 Attempting to connect to Discord...");
      await client.login(process.env.DISCORD_BOT_TOKEN);
      console.log("🚀 Login attempt sent");
    } catch (err) {
      console.error("❌ Login failed:", err.message);
  
      if (retries > 0) {
        console.log(`🔄 Retrying in 5s... (${retries})`);
        await new Promise(res => setTimeout(res, 5000));
        return loginWithRetry(retries - 1);
      } else {
        console.error("💀 Could not connect to Discord");
      }
    }
  }
  
  // ⏳ Delay before first login (VERY IMPORTANT)
  setTimeout(() => {
    loginWithRetry();
}, 5000);

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