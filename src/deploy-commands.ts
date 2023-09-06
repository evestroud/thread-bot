import fs from "node:fs";
import path from "node:path";
import { REST, Routes } from "discord.js";
import { configDotenv } from "dotenv";
import { LogLevel, logger } from "./logger";

configDotenv();
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const commands = [];
const commandsPath = path.join(__dirname, "commands");
const commandsExtension = __filename.slice(-3);
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(commandsExtension));

// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
  } else {
    logger({
      message: `The command at ${filePath} is missing a required "data" or "execute" property.`,
      level: LogLevel.WARN,
    });
  }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(DISCORD_TOKEN || "");

// and deploy your commands!
(async () => {
  try {
    logger({
      message: `Started refreshing ${commands.length} application (/) commands.`,
      level: LogLevel.LOG,
    });

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID || "", GUILD_ID || ""),
      { body: commands },
    );

    logger({
      message: `Successfully reloaded ${
        (data as any[]).length
      } application (/) commands.`,
      level: LogLevel.LOG,
    });
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    logger({
      message: `Error deploying commands: ${error}`,
      level: LogLevel.ERROR,
    });
  }
})();
