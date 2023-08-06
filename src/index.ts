import { Client, Events, GatewayIntentBits, ThreadChannel } from "discord.js";
import { configDotenv } from "dotenv";

configDotenv();
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});
const allThreads = new Map();

client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.ThreadCreate, async (thread) => {
  console.log("Thread created");

  const { id } = thread;
  allThreads.set(id, thread.createdTimestamp);
});

client.on(Events.MessageCreate, async ({ channelId, createdTimestamp }) => {
  const channel = await client.channels.fetch(channelId);
  if (channel?.isThread()) {
    if (!allThreads.get(channelId)) allThreads.set(channelId, createdTimestamp);
    console.log(createdTimestamp, "in thread: ", channelId);
  }
  console.log(allThreads);
});

client.login(DISCORD_TOKEN);
