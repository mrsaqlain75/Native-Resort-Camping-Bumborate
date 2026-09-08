// server/lib/auth.ts
import bcrypt from "bcryptjs";
import jwt, { type SignOptions, type JwtPayload } from "jsonwebtoken";
import { env } from "./env";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(
  userId: number,
  email: string,
  role: string
): string {
  const options = {
    expiresIn: env.jwtExpiresIn || "7d",
  } as SignOptions;
  return jwt.sign({ userId, email, role }, env.jwtSecret, options);
}

export function verifyToken(
  token: string
): (JwtPayload & { userId?: number; email?: string; role?: string }) | null {
  try {
    return jwt.verify(token, env.jwtSecret) as JwtPayload & {
      userId?: number;
    };
  } catch {
    return null;
  }
}

export function getTokenFromHeaders(headers: Headers): string | null {
  const authHeader = headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}
