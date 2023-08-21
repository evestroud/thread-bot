import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

const data = new SlashCommandBuilder()
  .setName("list")
  .setDescription("List active threads");
const execute = async (interaction: ChatInputCommandInteraction) => {
  const threads = interaction.client.channels.cache.filter((channel) =>
    channel.isThread(),
  );
  interaction.reply(threads.toJSON().toString() || "No threads found");
  console.log("/list");
};

export { data, execute };
