// server/queries/connection.ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { env } from "../lib/env";
import * as schema from "../../db/schema";

// Neon's pooled endpoint is pgbouncer in transaction mode: no session-level
// prepared statements, so `prepare: false`. SSL + SNI (from the hostname) is
// how Neon routes to the right compute, so it must stay on.
function cleanUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const keep = new URLSearchParams();
    keep.set("sslmode", "require");
    u.search = keep.toString();
    return u.toString();
  } catch {
    return raw;
  }
}

let client: ReturnType<typeof postgres> | undefined;
let instance: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (!instance) {
    client = postgres(cleanUrl(env.databaseUrl), {
      max: 1,
      prepare: false,
      ssl: "require",
      idle_timeout: 20,
      connect_timeout: 15,
    });
    instance = drizzle(client, { schema });
  }
  return instance;
}

/** Raw one-shot connectivity probe for the /api/dbcheck route. */
export async function dbPing(): Promise<{
  ok: boolean;
  ms: number;
  detail?: string;
}> {
  const started = Date.now();
  try {
    const rows = await getDb().execute(sql`select 1 as ok`);
    return {
      ok: true,
      ms: Date.now() - started,
      detail: JSON.stringify(rows),
    };
  } catch (err) {
    return {
      ok: false,
      ms: Date.now() - started,
      detail: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    };
  }
}

// ── Cold-start resilience ─────────────────────────────────────

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
  "timeouterror",
  "aborted",
  "the operation was aborted",
  "connect timeout",
  "write connect_timeout",
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
  "cannot use a pool after calling end",
];

function matches(err: unknown, patterns: string[]): boolean {
  let cur: unknown = err;
  for (let depth = 0; depth < 5 && cur; depth++) {
    const text = (
      cur instanceof Error
        ? `${cur.name} ${cur.message} ${(cur as { code?: string }).code ?? ""}`
        : String(cur)
    ).toLowerCase();
    if (patterns.some((p) => text.includes(p))) return true;
    cur = cur instanceof Error ? (cur as { cause?: unknown }).cause : undefined;
  }
  return false;
}

export function isTransientDbError(err: unknown): boolean {
  return matches(err, [...CONNECT_PHASE_ERRORS, ...IN_FLIGHT_ERRORS]);
}

export function isConnectPhaseError(err: unknown): boolean {
  return matches(err, CONNECT_PHASE_ERRORS);
}

export async function withDbRetry<T>(fn: () => Promise<T>): Promise<T> {
  const backoff = [0, 400, 1200, 2500];
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
