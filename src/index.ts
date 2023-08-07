import fs from "node:fs";
import path from "node:path";
import {
  Client,
  ClientOptions,
  Collection,
  Events,
  GatewayIntentBits,
  Interaction,
  SlashCommandBuilder,
  ThreadChannel,
} from "discord.js";
import { configDotenv } from "dotenv";

configDotenv();
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: Interaction) => Promise<void>;
}
class ClientCommands extends Client {
  commands: Collection<string, Command>;
  threads: Collection<string, ThreadChannel>;
  constructor(options: ClientOptions) {
    super(options);
    this.commands = new Collection();
    this.threads = new Collection();
  }
}
const client = new ClientCommands({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".ts"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  // Set a new item in the Collection with the key as the command name and the value as the exported module
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
    );
  }
}

client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.ThreadCreate, async (thread) => {
  console.log("Thread created");

  const { id } = thread;
  client.threads.set(id, thread);
});

client.on(Events.MessageCreate, async (message) => {
  const { channelId } = message;
  const channel = await client.channels.fetch(channelId);
  if (channel?.isThread()) {
    if (!client.threads.get(channelId)) client.threads.set(channelId, channel);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = (interaction.client as ClientCommands).commands?.get(
    interaction.commandName
  );

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
