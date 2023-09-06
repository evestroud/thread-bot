import { Guild } from "discord.js";

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

export function logger({ message, server, level }: LoggerOptions): void {
  console.log(
    `[${level}] ${new Date().toISOString()}${
      server ? ` - ${server.name} (${server.id})` : ""
    }: ${message}`,
  );
}
