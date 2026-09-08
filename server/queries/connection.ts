// server/queries/connection.ts
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { env } from "../lib/env";
import * as schema from "../../db/schema";

// Neon's serverless driver talks over WebSockets; Node (Vercel functions,
// local dev) needs a WebSocket implementation supplied.
neonConfig.webSocketConstructor = ws;

let pool: Pool | undefined;
let instance: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (!instance) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      max: 1,
      // A suspended Neon compute resumes on the first connection. Give it
      // room to wake instead of throwing a "can't reach database" error.
      connectionTimeoutMillis: 30_000,
      idleTimeoutMillis: 20_000,
    });
    instance = drizzle(pool, { schema });
  }
  return instance;
}

// ── Cold-start resilience ─────────────────────────────────────
// Neon's free-tier compute suspends after inactivity. The first hit has to
// wake it, and can occasionally fail with a transient connection error
// before it comes up. These helpers absorb that so it never surfaces on the
// login screen.

const CONNECT_PHASE_ERRORS = [
  "econnrefused",
  "enotfound",
  "getaddrinfo",
  "connect_timeout",
  "connection timeout",
  "timeout expired",
  "the database system is starting up",
  "fetch failed",
];

const IN_FLIGHT_ERRORS = [
  "econnreset",
  "epipe",
  "connection terminated",
  "connection closed",
  "terminating connection",
  "server closed the connection",
  "connection ended unexpectedly",
  "socket hang up",
  "client has encountered a connection error",
];

function matches(err: unknown, patterns: string[]): boolean {
  let cur: unknown = err;
  for (let depth = 0; depth < 5 && cur; depth++) {
    const text = (
      cur instanceof Error
        ? `${cur.message} ${(cur as { code?: string }).code ?? ""}`
        : String(cur)
    ).toLowerCase();
    if (patterns.some((p) => text.includes(p))) return true;
    cur = cur instanceof Error ? (cur as { cause?: unknown }).cause : undefined;
  }
  return false;
}

/** True for any transient connection error (wake-up or dropped socket). */
export function isTransientDbError(err: unknown): boolean {
  return matches(err, [...CONNECT_PHASE_ERRORS, ...IN_FLIGHT_ERRORS]);
}

/**
 * True only for errors that provably happened before any statement ran, so
 * retrying is safe even for a write.
 */
export function isConnectPhaseError(err: unknown): boolean {
  return matches(err, CONNECT_PHASE_ERRORS);
}

/** Runs a read, retrying a few times while the Neon compute wakes up. */
export async function withDbRetry<T>(fn: () => Promise<T>): Promise<T> {
  const backoff = [0, 500, 1500, 3500];
  let lastErr: unknown;
  for (let i = 0; i < backoff.length; i++) {
    if (backoff[i]) await new Promise((r) => setTimeout(r, backoff[i]));
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransientDbError(err)) throw err;
    }
  }
  throw lastErr;
}
