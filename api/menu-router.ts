import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as schema from "@db/schema";
import { eq, desc } from "drizzle-orm";

export const menuRouter = createRouter({
  list: authedQuery.query(async () => {
    const db = getDb();
    return db.select().from(schema.menuItems).where(eq(schema.menuItems.active, "yes")).orderBy(desc(schema.menuItems.createdAt));
  }),

  listAll: authedQuery.query(async () => {
    const db = getDb();
    return db.select().from(schema.menuItems).orderBy(desc(schema.menuItems.createdAt));
  }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db.select().from(schema.menuItems).where(eq(schema.menuItems.id, input.id)).limit(1);
      return rows.at(0) ?? null;
    }),

  create: authedQuery
    .input(
      z.object({
        name: z.string().min(1),
        category: z.string().min(1),
        price: z.string().or(z.number()),
        stockCount: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const price = typeof input.price === "string" ? parseFloat(input.price) : input.price;
      await db.insert(schema.menuItems).values({
        name: input.name,
        category: input.category,
        price: price.toFixed(2),
        stockCount: input.stockCount ?? 0,
      });
      return { success: true };
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1),
        category: z.string().min(1),
        price: z.string().or(z.number()),
        stockCount: z.number().optional(),
        active: z.enum(["yes", "no"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const price = typeof input.price === "string" ? parseFloat(input.price) : input.price;
      await db
        .update(schema.menuItems)
        .set({
          name: input.name,
          category: input.category,
          price: price.toFixed(2),
          stockCount: input.stockCount ?? 0,
          ...(input.active && { active: input.active }),
        })
        .where(eq(schema.menuItems.id, input.id));
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(schema.menuItems).set({ active: "no" }).where(eq(schema.menuItems.id, input.id));
      return { success: true };
    }),

  categories: authedQuery.query(async () => {
    const db = getDb();
    const rows = await db.select({ category: schema.menuItems.category }).from(schema.menuItems).where(eq(schema.menuItems.active, "yes")).groupBy(schema.menuItems.category);
    return rows.map((r) => r.category);
  }),
});
