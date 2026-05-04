import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";

const app = new Hono<{ Bindings: HttpBindings }>();

// Body limit middleware
app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// Health check endpoint
app.get("/health", (c) => c.json({ status: "ok" }));

// tRPC endpoint
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

// 404 for any unmatched API routes
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

// Always start the server when this file is run directly
const port = parseInt(env.port || "3000");
console.log(`Starting server on http://localhost:${port}`);

const { serve } = await import("@hono/node-server");
serve({ fetch: app.fetch, port }, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});
