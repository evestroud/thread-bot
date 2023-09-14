import {
  AnyThreadChannel,
  CategoryChannel,
  Client,
  EmbedBuilder,
  Message,
  TextChannel,
} from "discord.js";
import moment from "moment";
import { LogLevel, logger } from "./logger";

/* Thread list management */

const IGNORED_CATEGORIES = ["Voice Channels"];

const updateThreadList = async (client: Client, category: CategoryChannel) => {
  if (IGNORED_CATEGORIES.includes(category.name)) return;
  const threadsWithTimestamps = await getThreadsWithTimestamps(
    client,
    category,
  );
  const past = {
    day: moment().subtract(1, "day").toDate(),
    week: moment().subtract(1, "week").toDate(),
    month: moment().subtract(1, "month").toDate(),
  };
  const threadsInPast = {
    day: threadsWithTimestamps.filter(
      (thread) => thread.mostRecentTimestamp > past.day,
    ),
    week: threadsWithTimestamps.filter(
      (thread) =>
        thread.mostRecentTimestamp > past.week &&
        thread.mostRecentTimestamp <= past.day,
    ),
    month: threadsWithTimestamps.filter(
      (thread) =>
        thread.mostRecentTimestamp > past.month &&
        thread.mostRecentTimestamp <= past.week,
    ),
  };
  const formatThreadsByTime = Object.entries(threadsInPast).map(
    ([timeUnit, threads]) => ({
      name: `Threads active in past ${timeUnit}:`,
      value:
        `${threads
          .map(
            (thread) =>
              `\t${thread} - last: ${thread.mostRecentTimestamp.toLocaleString()}`,
          )
          .join("\n")}` || "None",
    }),
  );
  const olderThreads = threadsWithTimestamps.filter(
    (thread) => thread.mostRecentTimestamp < past.month,
  );
  formatThreadsByTime.push({
    name: "Older threads:",
    value:
      olderThreads
        .map(
          (thread) =>
            `\t${thread} - last: ${thread.mostRecentTimestamp.toLocaleString()}`,
        )
        .join("\n") || "None",
  });
  const threadListEmbed = new EmbedBuilder()
    .setTitle("Recently Active Threads")
    .setFields(formatThreadsByTime)
    .setTimestamp(new Date());

  let threadListChannel = await getOrCreateThreadListChannel(category);
  let threadListMessage: Message = await getOrCreateThreadListMessage(
    client,
    threadListChannel,
  );

  threadListMessage?.edit({ embeds: [threadListEmbed], content: "" });
  logger({
    message: `Updated thread list for ${category.name} (${category.id})`,
    server: client.guilds.cache.last(),
    level: LogLevel.LOG,
  });
};

const getThreadsWithTimestamps = async (
  client: Client,
  category: CategoryChannel,
) =>
  (
    await Promise.all(
      client.channels.cache
        .filter((channel): channel is AnyThreadChannel => channel.isThread())
        .filter((thread) => thread.parent?.parent === category)
        .map(async (threadInCategory) => {
          const mostRecentTimestamp = (
            await threadInCategory.messages.fetch({ limit: 1 })
          ).first()?.createdAt;
          return Object.assign(threadInCategory, { mostRecentTimestamp });
        }),
    )
  )
    .filter(
      (thread): thread is AnyThreadChannel & { mostRecentTimestamp: Date } =>
        thread.mostRecentTimestamp instanceof Date,
    )
    .sort(
      (a, b) =>
        b.mostRecentTimestamp.getTime() - a.mostRecentTimestamp.getTime(),
    );

const getOrCreateThreadListChannel = async (
  category: CategoryChannel,
): Promise<TextChannel> => {
  let threadListChannel = category.children.cache.find(
    (c) => c.name === "thread-list",
  );
  // Should this automatically edit or delete any channels that match the name
  // but aren't set up properly?
  if (!isTextChannel(threadListChannel)) {
    threadListChannel = await category.children.create({
      name: "thread-list",
      permissionOverwrites: [
        { id: category.guild.roles.everyone, deny: ["SendMessages"] },
        { id: category.client.user.id, allow: ["SendMessages"] },
      ],
    });
  }
  return threadListChannel;
};

const isTextChannel = (channel: any): channel is TextChannel =>
  channel instanceof TextChannel;

const getOrCreateThreadListMessage = async (
  client: Client,
  threadListChannel: TextChannel,
): Promise<Message<boolean>> => {
  const messages = await threadListChannel.messages.fetch();
  const threadListMessage =
    messages.find((m) => client.user?.id && m.author.id === client.user.id) ||
    (await threadListChannel.send("Active Threads:"));
  messages
    .filter((m) => m.id !== threadListMessage?.id)
    .forEach(async (m) => {
      try {
        await m.delete();
      } catch (e) {
        logger({
          message: `Attempted to delete message '${m}' from channel but encountered ${e}`,
          server: client.guilds.cache.last(),
          level: LogLevel.WARN,
        });
      }
    });
  return threadListMessage;
};

export default updateThreadList;
