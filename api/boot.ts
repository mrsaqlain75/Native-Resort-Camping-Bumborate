import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router.js";
import { createContext } from "./context.js";
import { env } from "./lib/env.js";

const app = new Hono<{ Bindings: HttpBindings }>();

// Add CORS middleware - allow all origins for testing
app.use("/*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
  credentials: true,
}));

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
const port = parseInt(process.env.PORT || env.port || "3000");
const hostname = '0.0.0.0';  // CRITICAL: Listen on all network interfaces

console.log(`Starting server on http://${hostname}:${port}`);

const { serve } = await import("@hono/node-server");
serve({ fetch: app.fetch, port, hostname }, () => {
  console.log(`✅ Server running on http://${hostname}:${port}`);
  console.log(`Health check: http://${hostname}:${port}/health`);
});