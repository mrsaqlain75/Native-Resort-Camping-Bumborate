// Source for the Vercel serverless function. `npm run build:api` bundles this
// (and everything under server/) into api/index.js.
//
// We do NOT use @hono/node-server's getRequestListener here: on Vercel the
// request body stream is already consumed by the platform's body parser, so
// reading it hangs for any POST. Instead we build a Web `Request` from the
// pre-parsed `req.body` (falling back to reading the stream for local use).
import type { IncomingMessage, ServerResponse } from "node:http";
import app from "./app.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 30,
};

type VercelRequest = IncomingMessage & { body?: unknown };

async function readBody(req: VercelRequest): Promise<string | undefined> {
  if (req.method === "GET" || req.method === "HEAD") return undefined;

  if (req.body != null) {
    if (typeof req.body === "string") return req.body;
    if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
    return JSON.stringify(req.body);
  }

  // No pre-parsed body (local dev / unparsed) — drain the stream.
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw.length ? raw : undefined;
}

export default async function handler(
  req: VercelRequest,
  res: ServerResponse
) {
  try {
    const host = req.headers.host ?? "localhost";
    const proto =
      (Array.isArray(req.headers["x-forwarded-proto"])
        ? req.headers["x-forwarded-proto"][0]
        : req.headers["x-forwarded-proto"]) || "https";
    const url = `${proto}://${host}${req.url ?? "/"}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
      else if (value != null) headers.set(key, value);
    }

    const body = await readBody(req);

    const response = await app.fetch(
      new Request(url, { method: req.method ?? "GET", headers, body })
    );

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "content-length") res.setHeader(key, value);
    });
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (err) {
    console.error("[api] handler error:", err);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        error: "Handler error",
        detail: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      })
    );
  }
}
