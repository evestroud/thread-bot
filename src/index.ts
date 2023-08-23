import fs from "node:fs";
import path from "node:path";
import {
  CategoryChannel,
  Channel,
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
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
    );
  }
}

/* Add event listeners */

client.once(Events.ClientReady, async () => {
  const categories = Array.from(client.channels.cache.values()).filter(
    (c) => c.type === ChannelType.GuildCategory,
  ) as CategoryChannel[];
  categories.forEach((category) => updateThreadList(category));
  console.log(
    `${new Date().toISOString()} Logged in to ${client.guilds.cache.last()
      ?.name} as ${client.user?.username}`,
  );
  process.stdout.write("\x07"); // system bell (helpful when hot reloading)
});

client.on(Events.MessageCreate, async (message) => {
  if (!message.channel.isThread()) return;
  const category = message.channel.parent?.parent;
  if (category) await updateThreadList(category);
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

/* Thread list management */

// TODO Allow customizing this programatically?
const THREAD_CUTOFF_TIME = 7;
const IGNORED_CATEGORIES = ["Voice Channels"];

const updateThreadList = async (category: CategoryChannel) => {
  if (IGNORED_CATEGORIES.includes(category.name)) return;
  let threadListChannel;
  threadListChannel = category.children.cache.find(
    (c) => c.name === "thread-list",
  ) as TextChannel;
  if (!threadListChannel) {
    threadListChannel = (await category.children.create({
      name: "thread-list",
      permissionOverwrites: [
        { id: category.guild.roles.everyone, deny: ["SendMessages"] },
        { id: category.client.user.id, allow: ["SendMessages"] },
      ],
    })) as TextChannel;
  }
  const messages = await threadListChannel.messages.fetch();
  let threadList: Message | undefined;
  threadList = messages.find((m) => m.content.includes("Active Threads:"));
  if (!threadList) {
    threadList = await threadListChannel.send("Active Threads:");
  }
  messages
    .filter((m) => m.id !== threadList?.id)
    .forEach(async (m) => {
      try {
        await m.delete();
      } catch (e) {
        console.warn(
          `Attempted to delete message '${m}' from channel but encountered ${e}`,
        );
      }
    });
  const threads = client.channels.cache.filter(
    (channel) => channel.isThread() && channel.parent?.parent == category,
  );
  const timestamps = await Promise.all(
    threads.map(async (thread) => {
      const timestamp = (
        await (thread as ThreadChannel).messages.fetch({ limit: 1 })
      ).first()?.createdAt;
      return { timestamp, thread };
    }),
  );
  const now = new Date();
  const sortedThreads = timestamps
    // type guard ensuring all messages have a timestamp
    .filter(
      (
        threadWithTimestamp,
      ): threadWithTimestamp is { thread: Channel; timestamp: Date } =>
        threadWithTimestamp.timestamp instanceof Date,
    )
    // filter threads not updated in the past week
    .filter(
      ({ timestamp }) =>
        now.getDate() - timestamp.getDate() < THREAD_CUTOFF_TIME,
    )
    // sort by most recent
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const formatThreads = await Promise.all(
    sortedThreads.map(
      async ({ thread, timestamp }) =>
        `${thread} - last: ${timestamp.toLocaleString()}`,
    ),
  );
  threadList?.edit(`Active Threads:\n${formatThreads.join("\n")}`);
  console.log(`Updated thread list for ${category}`);
};

client.login(DISCORD_TOKEN);
