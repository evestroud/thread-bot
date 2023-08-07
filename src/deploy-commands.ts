import fs from "node:fs";
import path from "node:path";
import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
} from "discord.js";
import { configDotenv } from "dotenv";

configDotenv();
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const commands = [];
// Grab all the command files from the commands directory you created earlier
// const foldersPath = path.join(__dirname, "commands");
// const commandFolders = fs.readdirSync(foldersPath);

// for (const folder of commandFolders) {
// Grab all the command files from the commands directory you created earlier
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));
// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
    );
  }
  // }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(DISCORD_TOKEN || "");

// and deploy your commands!
(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID || "", GUILD_ID || ""),
      { body: commands }
    );

    console.log(
      `Successfully reloaded ${
        (data as any[]).length
      } application (/) commands.`
    );
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();
