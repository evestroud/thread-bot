import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { threads } from "..";

const data = new SlashCommandBuilder()
  .setName("list")
  .setDescription("List active threads");
const execute = async (interaction: ChatInputCommandInteraction) => {
  let output = "";
  for (const key of threads.keys()) {
    output += key + "\n";
  }
  interaction.reply(output || "No threads found");
};

export { data, execute };
