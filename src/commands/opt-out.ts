import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { TrackedThreads } from "../threadList";
import { LogLevel, logger, replyAndLog } from "../logger";

const data = new SlashCommandBuilder()
  .setName("opt-out")
  .setDescription("Opt this thread in to being tracked for recent activity");

const execute = async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.channel?.isThread()) {
    interaction.reply({
      content: "This command is only available in a thread",
      ephemeral: true,
    });
    return;
  }
  const thread = await interaction.channel.fetch();
  if (await TrackedThreads.findOne({ where: { id: thread.id } })) {
    TrackedThreads.destroy({ where: { id: thread.id } });
    await interaction.reply({
      content: `${thread} removed from thread tracking`,
    });
    logger({
      message: `Thread ${thread.name}<@${thread.id}> removed from thread tracking`,
      level: LogLevel.LOG,
      server: interaction.guild,
    });
  } else {
    replyAndLog(interaction, {
      message: "This thread is not being tracked",
      level: LogLevel.LOG,
      server: interaction.guild,
    });
  }
};

export { data, execute };
