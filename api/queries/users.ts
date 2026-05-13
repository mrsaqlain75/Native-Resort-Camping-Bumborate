import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertUser, User } from "@db/schema";
import { getDb } from "./connection";
import { env } from "../lib/env";
import { hashPassword } from "../lib/auth";

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  return rows.at(0);
}

export async function findUserById(id: number): Promise<User | undefined> {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  return rows.at(0);
}

export async function createUser(data: InsertUser): Promise<User> {
  const result = await getDb()
    .insert(schema.users)
    .values(data);
  
  const userId = result[0].insertId;
  const user = await findUserById(userId);
  if (!user) throw new Error("Failed to create user");
  return user;
}

export async function createOrGetOwner(): Promise<User> {
  const existingOwner = await findUserByEmail(env.ownerEmail);
  if (existingOwner) return existingOwner;
  
  const hashedPassword = await hashPassword(env.ownerPassword);
  return createUser({
    email: env.ownerEmail,
    passwordHash: hashedPassword,
    name: "Owner",
    role: "admin",
  });
}

export async function createOrGetManager(): Promise<User> {
  const managerEmail = env.managerEmail || "manager@nativeresort.com";
  const existingManager = await findUserByEmail(managerEmail);
  if (existingManager) return existingManager;
  
  const managerPassword = env.managerPassword || "Manager@123";
  const hashedPassword = await hashPassword(managerPassword);
  return createUser({
    email: managerEmail,
    passwordHash: hashedPassword,
    name: "Manager",
    role: "manager",
  });
}
