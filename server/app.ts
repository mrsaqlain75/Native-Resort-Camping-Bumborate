import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";

const app = new Hono();

// Body limit (receipts/backups can be large-ish)
app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));
app.get("/api/health", (c) => c.json({ status: "ok" }));

// DB connectivity diagnostic — times each query shape separately, with a
// per-step cap so one hang can't take the whole response down.
app.get("/api/dbcheck", async (c) => {
  let host = "unknown";
  try {
    host = new URL(env.databaseUrl).host;
  } catch {
    /* ignore */
  }

  const { getDb } = await import("./queries/connection");
  const { sql } = await import("drizzle-orm");
  const schema = await import("../db/schema");
  const { eq } = await import("drizzle-orm");
  const bcrypt = (await import("bcryptjs")).default;

  const steps: Record<string, unknown>[] = [];
  const run = async (label: string, fn: () => Promise<unknown>) => {
    const t = Date.now();
    try {
      const r = await Promise.race([
        fn(),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("step exceeded 6s")), 6000)
        ),
      ]);
      steps.push({
        label,
        ok: true,
        ms: Date.now() - t,
        sample: JSON.stringify(r).slice(0, 100),
      });
    } catch (err) {
      steps.push({
        label,
        ok: false,
        ms: Date.now() - t,
        err: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      });
    }
  };

  const db = getDb();
  await run("raw: select 1", () => db.execute(sql`select 1 as ok`));
  await run("raw: select now()", () => db.execute(sql`select now()`));
  await run("raw: count users", () =>
    db.execute(sql`select count(*)::int as n from users`)
  );
  await run("raw: users by email ($1)", () =>
    db.execute(
      sql`select id, email from users where email = ${"owner@nativeresort.com"} limit 1`
    )
  );
  await run("drizzle: select users by email", () =>
    db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "owner@nativeresort.com"))
      .limit(1)
  );
  await run("bcrypt.compare", () =>
    bcrypt.compare("whatever", "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy")
  );

  return c.json({ host, steps });
});

// tRPC endpoint
app.use("/api/trpc/*", (c) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  })
);

// 404 for any unmatched API routes
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;
