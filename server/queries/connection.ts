// server/queries/connection.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "../lib/env";
import * as schema from "../../db/schema";

let instance: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (!instance) {
    // HTTP (fetch) driver: no WebSocket, no connection pool. Each query is a
    // single HTTPS request to Neon's SQL endpoint, which holds the request
    // briefly while a suspended compute resumes. This is the robust choice
    // for serverless (and for cross-region function <-> DB).
    const sql = neon(env.databaseUrl);
    instance = drizzle(sql, { schema });
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
  "failed to fetch",
  "und_err",
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
  "terminated",
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
