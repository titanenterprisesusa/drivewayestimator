import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  console.log("[startup] EMAIL_USER loaded:", !!process.env.EMAIL_USER);
  console.log("[startup] EMAIL_PASS loaded:", !!process.env.EMAIL_PASS);
  console.log("[startup] NOTIFY_EMAIL loaded:", !!process.env.NOTIFY_EMAIL);
});
