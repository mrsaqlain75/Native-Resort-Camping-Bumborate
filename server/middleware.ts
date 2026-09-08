// server/middleware.ts
import { ErrorMessages } from "../contracts/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { isTransientDbError, isConnectPhaseError } from "./queries/connection";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;

// Absorbs transient DB connection errors (Neon compute waking from suspend).
// Queries retry on any transient error; mutations only on connect-phase
// errors, so a write is never replayed after it may have landed.
const retryColdStart = t.middleware(async ({ next, type }) => {
  const backoff = [0, 500, 1500, 3500];
  let result = await next();
  let i = 1;
  while (i < backoff.length && !result.ok) {
    const retryable =
      type === "query"
        ? isTransientDbError(result.error)
        : isConnectPhaseError(result.error);
    if (!retryable) break;
    await new Promise((r) => setTimeout(r, backoff[i++]));
    result = await next();
  }
  return result;
});

export const publicQuery = t.procedure.use(retryColdStart);

const requireAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ErrorMessages.unauthenticated,
    });
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

function requireRole(role: string | string[]) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: ErrorMessages.unauthenticated,
      });
    }

    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: ErrorMessages.insufficientRole,
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

export const authedQuery = publicQuery.use(requireAuth);
export const adminQuery = authedQuery.use(requireRole("admin"));
export const managerQuery = authedQuery.use(requireRole(["admin", "manager"]));