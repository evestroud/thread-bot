import fs from "node:fs";
import path from "node:path";
import {
  CategoryChannel,
  CategoryChildChannel,
  ChannelType,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Interaction,
  Message,
  SlashCommandBuilder,
  TextChannel,
  ThreadChannel,
} from "discord.js";
import { configDotenv } from "dotenv";

configDotenv();
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: Interaction) => Promise<void>;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildIntegrations,
  ],
});
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
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
    );
  }
}

client.once(Events.ClientReady, async (c) => {
  const channels = c.channels.cache.values();
  const categories = Array.from(channels).filter(
    (c) => c.type === ChannelType.GuildCategory,
  ) as CategoryChannel[];
  categories.forEach(async (c) => {
    if (c.name == "Voice Channels") return;
    let threadListChannel;
    threadListChannel = c.children.cache.find(
      (c) => c.name === "thread-list",
    ) as TextChannel;
    if (!threadListChannel) {
      threadListChannel = (await c.children.create({
        name: "thread-list",
      })) as TextChannel;
    }
    const messages = await threadListChannel.messages.fetch();
    let threadList: Message | undefined;
    threadList = messages.find((m) => m.content.includes("Active Threads:"));
    if (!threadList) {
      threadList = await threadListChannel.send("Active Threads:");
    }
    messages.filter((m) => m.id !== threadList?.id).forEach((m) => m.delete());
    const threads = client.channels.cache.filter(
      (channel) => channel.isThread() && channel.parent?.parent == c,
    );
    const formatThreads = await Promise.all(
      threads.map(
        async (t) =>
          `${t} ${(await (t as ThreadChannel).messages.fetch()).last()
            ?.createdAt}`,
      ),
    );
    threadList?.edit(`Active Threads:\n${formatThreads.join("\n")}`);
  });
  console.log(
    `Logged in to ${client.guilds.cache.last()?.name} as ${client.user
      ?.username}`,
  );
  process.stdout.write("\x07"); // system bell (lets me know when hot reload is finished)
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
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
