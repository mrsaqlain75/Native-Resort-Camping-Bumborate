import { config } from "dotenv";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";

// Load .env file
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

console.log("Connecting to database...");
const connection = await mysql.createConnection(connectionString);
const db = drizzle(connection);

console.log("Running migrations...");
await migrate(db, { migrationsFolder: "./db/migrations" });
console.log("✅ Migration completed successfully!");

await connection.end();
