import { Client, Events, GatewayIntentBits } from "discord.js";
import { configDotenv } from "dotenv";

configDotenv();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.login(DISCORD_TOKEN);
