// api/lib/env.ts
import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

const envSchema = z.object({
  databaseUrl: z.string(),
  jwtSecret: z.string(),
  jwtExpiresIn: z.string().default('7d'),
  port: z.string().default('3000'),
  nodeEnv: z.string().default('development'),
  ownerEmail: z.string().email(),
  ownerPassword: z.string(),
});

// Debug: Log what we found (remove after debugging)
console.log('Environment variables loaded:', {
  hasDatabaseUrl: !!process.env.DATABASE_URL,
  hasJwtSecret: !!process.env.JWT_SECRET,
  hasOwnerEmail: !!process.env.OWNER_EMAIL,
  hasOwnerPassword: !!process.env.OWNER_PASSWORD,
});

export const env = envSchema.parse({
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV,
  ownerEmail: process.env.OWNER_EMAIL,
  ownerPassword: process.env.OWNER_PASSWORD,
});