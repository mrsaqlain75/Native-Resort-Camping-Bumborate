// server/lib/env.ts
import { z } from "zod";
import dotenv from "dotenv";

// Load .env for local dev; a no-op on platforms that inject env vars directly.
dotenv.config({ quiet: true });

const envSchema = z.object({
  // Pooled connection string (runtime). On Neon this is the "-pooler" host.
  databaseUrl: z.string(),
  // Direct connection string (migrations / drizzle-kit push). Falls back to
  // databaseUrl when not provided.
  directUrl: z.string(),
  jwtSecret: z.string(),
  jwtExpiresIn: z.string().default("7d"),
  nodeEnv: z.string().default("development"),
  ownerEmail: z.string().email(),
  ownerPassword: z.string(),
  managerEmail: z.string().email().optional(),
  managerPassword: z.string().optional(),
  // Cloudinary (server-side signed uploads). Optional: receipt upload is
  // disabled gracefully when these are absent.
  cloudinaryCloudName: z.string().optional(),
  cloudinaryApiKey: z.string().optional(),
  cloudinaryApiSecret: z.string().optional(),
});

const parsed = envSchema.safeParse({
  databaseUrl: process.env.DATABASE_URL,
  directUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  nodeEnv: process.env.NODE_ENV,
  ownerEmail: process.env.OWNER_EMAIL,
  ownerPassword: process.env.OWNER_PASSWORD,
  managerEmail: process.env.MANAGER_EMAIL,
  managerPassword: process.env.MANAGER_PASSWORD,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
});

if (!parsed.success) {
  const fields = parsed.error.issues
    .map((i) => i.path.join(".") || "(root)")
    .join(", ");
  throw new Error(`Invalid or missing environment variables: ${fields}`);
}

export const env = parsed.data;
