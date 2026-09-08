// Source for the Vercel serverless function. `npm run build:api` bundles this
// (and everything under server/) into api/index.js so Vercel runs one
// self-contained file — no runtime module resolution of local paths.
import { getRequestListener } from "@hono/node-server";
import type { IncomingMessage, ServerResponse } from "node:http";
import app from "./app.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 30,
};

const listener = getRequestListener(app.fetch);

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return listener(req, res);
}
