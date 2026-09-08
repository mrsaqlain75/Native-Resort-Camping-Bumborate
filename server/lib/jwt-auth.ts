import { verifyToken, getTokenFromHeaders } from "./auth";
import { findUserById } from "../queries/users";
import { withDbRetry } from "../queries/connection";

export async function authenticateRequest(headers: Headers) {
  const token = getTokenFromHeaders(headers);
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) return null;

  // Retry through a Neon cold start so a valid session isn't rejected.
  const user = await withDbRetry(() => findUserById(decoded.userId!));
  return user || null;
}
