import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

const data = new SlashCommandBuilder()
  .setName("list")
  .setDescription("List active threads");
const execute = async (interaction: ChatInputCommandInteraction) => {
  console.log(interaction);
  interaction.reply("Hi");
};

export { data, execute };
