import fs from "node:fs";
import path from "node:path";
import {
  CategoryChannel,
  ChannelType,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Interaction,
  SlashCommandBuilder,
} from "discord.js";
import { configDotenv } from "dotenv";
import { LogLevel, logger } from "./logger";
import updateThreadList from "./threadList";

configDotenv();
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

/* Initialize client */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildIntegrations,
  ],
});

/* Initialize slash commands */

interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: Interaction) => Promise<void>;
}

const commands = new Collection<string, Command>();
const commandsPath = path.join(__dirname, "commands");
const commandsExtension = __filename.slice(-3);
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(commandsExtension));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  // Set a new item in the Collection with the key as the command name and the value as the exported module
  if ("data" in command && "execute" in command) {
    commands.set(command.data.name, command);
  } else {
    logger({
      message: `The command at ${filePath} is missing a required "data" or "execute" property.`,
      level: LogLevel.WARN,
    });
  }
}

/* Add event listeners */

client.once(Events.ClientReady, async (client) => {
  const categories = Array.from(client.channels.cache.values()).filter(
    (c) => c.type === ChannelType.GuildCategory,
  ) as CategoryChannel[];
  categories.forEach((category) => updateThreadList(client, category));
  logger({
    message: `Logged in as ${client.user.username}<@${client.user.id}>`,
    server: client.guilds.cache.last(),
    level: LogLevel.LOG,
  });
  process.stdout.write("\x07"); // system bell (helpful when hot reloading)
});

client.on(Events.MessageCreate, async (message) => {
  if (!message.channel.isThread()) return;
  const category = message.channel.parent?.parent;
  if (category) await updateThreadList(client, category);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);

  if (!command) {
    logger({
      message: `No command matching ${interaction.commandName} was found.`,
      server: interaction.guild,
      level: LogLevel.ERROR,
    });
    return;
  }

  try {
    await command.execute(interaction);
    logger({
      message: `${interaction.user.username}<@${interaction.user.id}}> used ${interaction.commandName}`,
      server: client.guilds.cache.last(),
      level: LogLevel.LOG,
    });
  } catch (error) {
    logger({
      message: `Error executing ${interaction.commandName}: ${error}`,
      server: interaction.guild,
      level: LogLevel.ERROR,
    });
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  }
});

client.login(DISCORD_TOKEN);
