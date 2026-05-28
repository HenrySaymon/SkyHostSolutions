import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

const rawPort = process.env["API_PORT"] ?? process.env["PORT"] ?? "5000";

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

try {
  const { rowCount } = await pool.query(
    "SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'service_id'",
  );
  if (!rowCount) {
    await pool.query("ALTER TABLE tickets ADD COLUMN service_id integer");
  }
  process.env.TICKETS_SERVICE_ID_AVAILABLE = "true";
} catch (err) {
  process.env.TICKETS_SERVICE_ID_AVAILABLE = "false";
  logger.warn({ err }, "Could not ensure tickets.service_id exists");
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
