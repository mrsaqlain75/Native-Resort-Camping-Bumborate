// Vercel serverless entrypoint. All backend source lives in ../server so that
// Vercel does not try to treat each backend module as its own function.
// The import of ../server/app must be static so Vercel's function bundler
// traces and includes the whole server/ tree.
import { getRequestListener } from "@hono/node-server";
import type { IncomingMessage, ServerResponse } from "node:http";
import app from "../server/app";

export const config = {
  runtime: "nodejs",
};

const listener = getRequestListener(app.fetch);

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return listener(req, res);
}
