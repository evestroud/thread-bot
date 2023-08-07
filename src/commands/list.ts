import { CommandInteraction, SlashCommandBuilder } from "discord.js";

const data = new SlashCommandBuilder()
  .setName("list")
  .setDescription("List active threads");
const execute = async (interaction: CommandInteraction) => {
  console.log(interaction);
  interaction.reply("Hi");
};

export { data, execute };
