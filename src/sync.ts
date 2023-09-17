import { LogLevel, logger } from "./logger";
import { TrackedThreads } from "./threadList";
import readline from "node:readline";

const sync = (force = false) =>
  TrackedThreads.sync({ force })
    .then((_) => {
      logger({
        message: force
          ? "Tracked threads database reset, all existing values have been deleted"
          : "Tracked threads synced successfully",
        level: LogLevel.LOG,
      });
    })
    .catch((error) => {
      logger({ message: error, level: LogLevel.ERROR });
    });

if (process.argv[2] === "reset") {
  const reader = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  reader.question(
    "This script will delete all stored threads in the database. Are you sure you want to continue? (y/n) ",
    (answer) => {
      if ("yes".includes(answer.toLowerCase())) {
        sync(true);
      } else {
        console.log("Aborting");
      }
      reader.close();
    },
  );
} else {
  sync();
}
