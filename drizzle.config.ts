import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Use the direct (non-pooled) connection for schema changes.
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DIRECT_URL (or DATABASE_URL) is required to run drizzle commands"
  );
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
