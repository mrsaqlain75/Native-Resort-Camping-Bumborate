// Vercel serverless entrypoint. All backend source lives in ../server so that
// Vercel does not try to treat each backend module as its own function.
import { getRequestListener } from "@hono/node-server";
import type { IncomingMessage, ServerResponse } from "node:http";

export const config = {
  runtime: "nodejs",
};

type NodeHandler = (req: IncomingMessage, res: ServerResponse) => void;

let listener: NodeHandler | null = null;
let initError: Error | null = null;

async function getListener(): Promise<NodeHandler> {
  if (listener) return listener;
  if (initError) throw initError;
  try {
    const { default: app } = await import("../server/app");
    listener = getRequestListener(app.fetch);
    return listener;
  } catch (err) {
    initError = err instanceof Error ? err : new Error(String(err));
    throw initError;
  }
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  try {
    const l = await getListener();
    l(req, res);
  } catch (err) {
    // Surfaces startup failures (missing env vars, bad imports) as readable
    // JSON instead of Vercel's opaque "A server error has occurred".
    console.error("[api] initialization error:", err);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        error: "API failed to initialize",
        detail: err instanceof Error ? err.message : String(err),
      })
    );
  }
}
