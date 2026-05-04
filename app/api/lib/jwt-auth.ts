import { verifyToken, getTokenFromHeaders } from "./auth";
import { findUserById } from "../queries/users";

export async function authenticateRequest(headers: Headers) {
  const token = getTokenFromHeaders(headers);
  if (!token) return null;
  
  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) return null;
  
  const user = await findUserById(decoded.userId);
  return user || null;
}
