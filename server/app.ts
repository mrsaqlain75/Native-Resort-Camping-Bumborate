import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { dbPing } from "./queries/connection";
import { env } from "./lib/env";

const app = new Hono();

// Body limit (receipts/backups can be large-ish)
app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));
app.get("/api/health", (c) => c.json({ status: "ok" }));

// DB connectivity diagnostic — reports timing + error for a raw `select 1`.
app.get("/api/dbcheck", async (c) => {
  const which = env.directUrl || env.databaseUrl;
  let host = "unknown";
  try {
    host = new URL(which).host;
  } catch {
    /* ignore */
  }
  const result = await dbPing();
  return c.json({ host, ...result });
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
