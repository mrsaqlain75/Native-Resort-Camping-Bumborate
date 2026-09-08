import { getDb } from "../server/queries/connection";
// TODO: import tables from "./schema"

async function seed() {
  const db = getDb();
  console.log("Seeding database...");
  void db;

  // TODO: insert seed data, e.g.
  // await db.insert(schema.posts).values([
  //   { title: "First post", content: "Hello world" },
  // ]);

  console.log("Done.");
  process.exit(0); // close Postgres connection pool
}

seed();
