import { ChatInputCommandInteraction, Guild } from "discord.js";

interface LoggerOptions {
  message: string | Error;
  server?: Guild | null;
  level: LogLevel;
}

export enum LogLevel {
  LOG = "LOG",
  WARN = "WARN",
  ERROR = "ERROR",
}

export function logger({ message, server, level }: LoggerOptions) {
  console.log(
    `[${level}] ${new Date().toISOString()}${
      server ? ` - ${server.name} (${server.id})` : ""
    }: ${message}`,
  );
}

export function replyAndLog(
  interaction: ChatInputCommandInteraction,
  options: LoggerOptions,
) {
  interaction.reply({
    content:
      options.message instanceof Error
        ? `Error: ${options.message.name}: ${options.message.message}`
        : options.message,
  });
  logger(options);
}
