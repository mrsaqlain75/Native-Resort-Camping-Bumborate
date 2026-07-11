import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as schema from "@db/schema";
import { eq, desc, gte, lte, and, sql } from "drizzle-orm";

export const expensesRouter = createRouter({

  list: authedQuery.query(async () => {
    const db = getDb();
    return db.select().from(schema.expenses).orderBy(desc(schema.expenses.dateTime));
  }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(schema.expenses).where(eq(schema.expenses.id, input.id));
      return { success: true };
    }),

  listByDateRange: authedQuery
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(schema.expenses)
        .where(
          and(
            gte(schema.expenses.dateTime, new Date(input.from)),
            lte(schema.expenses.dateTime, new Date(input.to))
          )
        )
        .orderBy(desc(schema.expenses.dateTime));
    }),

  create: authedQuery
    .input(
      z.object({
        name: z.string().min(1),
        amount: z.number(), // Unit price
        quantity: z.number().int().min(0).default(0),
        total: z.number().default(0), // Total = amount × quantity
        category: z.enum(["food", "supplies", "utilities", "staff", "maintenance", "rent", "other"]),
        paymentMethod: z.enum(["cash", "e_transaction", "bank_transfer"]),
        paidTo: z.string().optional(),
        receiptUrl: z.string().optional(),
        dateTime: z.string(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.insert(schema.expenses).values({
        name: input.name,
        amount: input.amount.toFixed(2),
        quantity: input.quantity || 0,
        total: input.total.toFixed(2),
        category: input.category,
        paymentMethod: input.paymentMethod,
        paidTo: input.paidTo || null,
        receiptUrl: input.receiptUrl || null,
        dateTime: new Date(input.dateTime),
        note: input.note || null,
        createdBy: ctx.user.id,
      });
      return { success: true };
    }),

  createMultiple: authedQuery
    .input(
      z.object({
        expenses: z.array(
          z.object({
            name: z.string().min(1),
            amount: z.number(),
            quantity: z.number().int().min(0).default(0),
            total: z.number().default(0),
            category: z.enum(["food", "supplies", "utilities", "staff", "maintenance", "rent", "other"]),
            paymentMethod: z.enum(["cash", "e_transaction", "bank_transfer"]),
            paidTo: z.string().optional().nullable(),
            receiptUrl: z.string().optional(),
            dateTime: z.string(),
            note: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const results = [];
      
      for (const expense of input.expenses) {
        const result = await db.insert(schema.expenses).values({
          name: expense.name,
          amount: expense.amount.toString(),
          quantity: expense.quantity || 0,
          total: expense.total.toString(),
          category: expense.category,
          paymentMethod: expense.paymentMethod,
          paidTo: expense.paidTo || null,
          receiptUrl: expense.receiptUrl || null,
          dateTime: new Date(expense.dateTime),
          note: expense.note || null,
          createdBy: ctx.user.id,
        });
        results.push({ id: Number(result[0].insertId) });
      }
      
      return { success: true, count: results.length };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      name: z.string(),
      amount: z.number(),
      quantity: z.number().int().min(0).optional(),
      total: z.number().optional(),
      category: z.enum(["food", "supplies", "utilities", "staff", "maintenance", "rent", "other"]),
      paymentMethod: z.enum(["cash", "e_transaction", "bank_transfer"]),
      paidTo: z.string().optional(),
      receiptUrl: z.string().optional(),
      dateTime: z.string(),
      note: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const total = input.total || (input.amount * (input.quantity || 0));
      await db.update(schema.expenses)
        .set({
          name: input.name,
          amount: input.amount.toString(),
          quantity: input.quantity || 0,
          total: total.toString(),
          category: input.category,
          paymentMethod: input.paymentMethod,
          paidTo: input.paidTo || null,
          receiptUrl: input.receiptUrl || null,
          dateTime: new Date(input.dateTime),
          note: input.note || null,
        })
        .where(eq(schema.expenses.id, input.id));
      return { success: true };
    }),

  todaySummary: authedQuery.query(async () => {
    const db = getDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rows = await db
      .select({
        total: sql<number>`COALESCE(SUM(${schema.expenses.total}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(schema.expenses)
      .where(gte(schema.expenses.dateTime, today));
    return rows[0];
  }),

  summaryByDateRange: authedQuery
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select({
          total: sql<number>`COALESCE(SUM(${schema.expenses.total}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(schema.expenses)
        .where(
          and(
            gte(schema.expenses.dateTime, new Date(input.from)),
            lte(schema.expenses.dateTime, new Date(input.to))
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
          date: sql<string>`DATE(${schema.expenses.dateTime})`,
          total: sql<number>`COALESCE(SUM(${schema.expenses.total}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(schema.expenses)
        .where(
          and(
            gte(schema.expenses.dateTime, new Date(input.from)),
            lte(schema.expenses.dateTime, new Date(input.to))
          )
        )
        .groupBy(sql`DATE(${schema.expenses.dateTime})`)
        .orderBy(sql`DATE(${schema.expenses.dateTime})`);
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
          month: sql<number>`MONTH(${schema.expenses.dateTime})`,
          total: sql<number>`COALESCE(SUM(${schema.expenses.total}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(schema.expenses)
        .where(
          and(
            gte(schema.expenses.dateTime, from),
            lte(schema.expenses.dateTime, to)
          )
        )
        .groupBy(sql`MONTH(${schema.expenses.dateTime})`)
        .orderBy(sql`MONTH(${schema.expenses.dateTime})`);
      return rows;
    }),

  yearlyBreakdown: authedQuery.query(async () => {
    const db = getDb();
    const rows = await db
      .select({
        year: sql<number>`YEAR(${schema.expenses.dateTime})`,
        total: sql<number>`COALESCE(SUM(${schema.expenses.total}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(schema.expenses)
      .groupBy(sql`YEAR(${schema.expenses.dateTime})`)
      .orderBy(sql`YEAR(${schema.expenses.dateTime})`);
    return rows;
  }),

  categoryBreakdown: authedQuery
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select({
          category: schema.expenses.category,
          total: sql<number>`COALESCE(SUM(${schema.expenses.total}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(schema.expenses)
        .where(
          and(
            gte(schema.expenses.dateTime, new Date(input.from)),
            lte(schema.expenses.dateTime, new Date(input.to))
          )
        )
        .groupBy(schema.expenses.category);
      return rows;
    }),
});