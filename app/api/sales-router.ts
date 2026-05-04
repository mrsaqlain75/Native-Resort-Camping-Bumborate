import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as schema from "@db/schema";
import { eq, desc, gte, lte, and, sql } from "drizzle-orm";

export const salesRouter = createRouter({
  list: authedQuery.query(async () => {
    const db = getDb();
    return db.select().from(schema.sales).orderBy(desc(schema.sales.dateTime));
  }),

  listByDateRange: authedQuery
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(schema.sales)
        .where(
          and(
            gte(schema.sales.dateTime, new Date(input.from)),
            lte(schema.sales.dateTime, new Date(input.to))
          )
        )
        .orderBy(desc(schema.sales.dateTime));
    }),

  create: authedQuery
    .input(
      z.object({
        items: z.array(
          z.object({
            name: z.string(),
            quantity: z.number(),
            unitPrice: z.number(),
            total: z.number(),
          })
        ),
        totalAmount: z.number(),
        paymentMethod: z.enum(["cash", "e_transaction"]),
        source: z.enum(["dine_in", "online_order", "other"]),
        dateTime: z.string(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const result = await db.insert(schema.sales).values({
        items: input.items,
        totalAmount: input.totalAmount.toFixed(2),
        paymentMethod: input.paymentMethod,
        source: input.source,
        dateTime: new Date(input.dateTime),
        note: input.note || null,
        createdBy: ctx.user.id,
      });
      return { success: true, id: Number((result as unknown as { insertId: number }).insertId) };
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db.select().from(schema.sales).where(eq(schema.sales.id, input.id)).limit(1);
      return rows.at(0) ?? null;
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(schema.sales).where(eq(schema.sales.id, input.id));
      return { success: true };
    }),

  todaySummary: authedQuery.query(async () => {
    const db = getDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rows = await db
      .select({
        total: sql<number>`COALESCE(SUM(${schema.sales.totalAmount}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(schema.sales)
      .where(gte(schema.sales.dateTime, today));
    return rows[0];
  }),

  summaryByDateRange: authedQuery
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select({
          total: sql<number>`COALESCE(SUM(${schema.sales.totalAmount}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(schema.sales)
        .where(
          and(
            gte(schema.sales.dateTime, new Date(input.from)),
            lte(schema.sales.dateTime, new Date(input.to))
          )
        );
      return rows[0];
    }),

  dailyBreakdown: authedQuery
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select({
          date: sql<string>`DATE(${schema.sales.dateTime})`,
          total: sql<number>`COALESCE(SUM(${schema.sales.totalAmount}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(schema.sales)
        .where(
          and(
            gte(schema.sales.dateTime, new Date(input.from)),
            lte(schema.sales.dateTime, new Date(input.to))
          )
        )
        .groupBy(sql`DATE(${schema.sales.dateTime})`)
        .orderBy(sql`DATE(${schema.sales.dateTime})`);
      return rows;
    }),

  monthlyBreakdown: authedQuery
    .input(z.object({ year: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const from = new Date(input.year, 0, 1);
      const to = new Date(input.year + 1, 0, 1);
      const rows = await db
        .select({
          month: sql<number>`MONTH(${schema.sales.dateTime})`,
          total: sql<number>`COALESCE(SUM(${schema.sales.totalAmount}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(schema.sales)
        .where(
          and(
            gte(schema.sales.dateTime, from),
            lte(schema.sales.dateTime, to)
          )
        )
        .groupBy(sql`MONTH(${schema.sales.dateTime})`)
        .orderBy(sql`MONTH(${schema.sales.dateTime})`);
      return rows;
    }),

  yearlyBreakdown: authedQuery.query(async () => {
    const db = getDb();
    const rows = await db
      .select({
        year: sql<number>`YEAR(${schema.sales.dateTime})`,
        total: sql<number>`COALESCE(SUM(${schema.sales.totalAmount}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(schema.sales)
      .groupBy(sql`YEAR(${schema.sales.dateTime})`)
      .orderBy(sql`YEAR(${schema.sales.dateTime})`);
    return rows;
  }),

  sellingRankings: authedQuery
    .input(
      z.object({
        from: z.string(),
        to: z.string(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(schema.sales)
        .where(
          and(
            gte(schema.sales.dateTime, new Date(input.from)),
            lte(schema.sales.dateTime, new Date(input.to))
          )
        );

      const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
      for (const sale of rows) {
        for (const item of sale.items) {
          const existing = itemMap.get(item.name);
          if (existing) {
            existing.quantity += item.quantity;
            existing.revenue += item.total;
          } else {
            itemMap.set(item.name, {
              name: item.name,
              quantity: item.quantity,
              revenue: item.total,
            });
          }
        }
      }

      return Array.from(itemMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, input.limit);
    }),
});
