import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { TrackedThreads } from "../threadList";
import { LogLevel, logger, replyAndLog } from "../logger";

const data = new SlashCommandBuilder()
  .setName("opt-in")
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
    replyAndLog(interaction, {
      message: `This thread is already opted-in to tracking`,
      level: LogLevel.LOG,
      server: interaction.guild,
    });
    return;
  }
  await TrackedThreads.create({
    id: thread.id,
    authorId: thread.ownerId,
    lastPost: thread.lastMessage?.createdTimestamp,
    server: thread.guildId,
    category: thread.parent?.parentId,
  });
  await interaction.reply({ content: `${thread} is now being tracked` });
  logger({
    message: `Thread ${thread.name}<@${thread.id}> is now being tracked`,
    server: interaction.guild,
    level: LogLevel.LOG,
  });
  // TODO update the thread list after using this command
};

export { data, execute };
