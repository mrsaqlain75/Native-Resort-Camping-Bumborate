import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as schema from "../db/schema";
import { sql, eq, desc, isNotNull } from "drizzle-orm";

export type VendorPayable = {
  vendor: string;
  expensesTotal: number;
  expensesCount: number;
  paidTotal: number;
  paymentsCount: number;
  remaining: number;
};

export const vendorPaymentsRouter = createRouter({
  // Per-vendor ledger: recorded expenses vs. payments actually made.
  list: authedQuery.query(async () => {
    const db = getDb();
    return db
      .select()
      .from(schema.vendorPayments)
      .orderBy(desc(schema.vendorPayments.dateTime));
  }),

  summary: authedQuery.query(async () => {
    const db = getDb();

    // Only registered vendors appear in the payable ledger — free-text
    // payees like "Salaries" / "Rent" are expense categories, not vendors.
    const vendorRows = await db.select({ name: schema.vendors.name }).from(schema.vendors);
    const vendorNames = new Set(vendorRows.map((v) => v.name));

    const expenseRows = await db
      .select({
        vendor: schema.expenses.paidTo,
        total: sql<number>`COALESCE(SUM(${schema.expenses.total}), 0)::float`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(schema.expenses)
      .where(isNotNull(schema.expenses.paidTo))
      .groupBy(schema.expenses.paidTo);

    const paymentRows = await db
      .select({
        vendor: schema.vendorPayments.vendorName,
        total: sql<number>`COALESCE(SUM(${schema.vendorPayments.amount}), 0)::float`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(schema.vendorPayments)
      .groupBy(schema.vendorPayments.vendorName);

    const byVendor = new Map<string, VendorPayable>();
    for (const row of expenseRows) {
      if (!row.vendor || !vendorNames.has(row.vendor)) continue;
      byVendor.set(row.vendor, {
        vendor: row.vendor,
        expensesTotal: Number(row.total ?? 0),
        expensesCount: Number(row.count ?? 0),
        paidTotal: 0,
        paymentsCount: 0,
        remaining: 0,
      });
    }
    for (const row of paymentRows) {
      const entry = byVendor.get(row.vendor) ?? {
        vendor: row.vendor,
        expensesTotal: 0,
        expensesCount: 0,
        paidTotal: 0,
        paymentsCount: 0,
        remaining: 0,
      };
      entry.paidTotal = Number(row.total ?? 0);
      entry.paymentsCount = Number(row.count ?? 0);
      byVendor.set(row.vendor, entry);
    }

    const list = [...byVendor.values()].map((entry) => ({
      ...entry,
      remaining: Math.round((entry.expensesTotal - entry.paidTotal) * 100) / 100,
    }));
    list.sort((a, b) => b.remaining - a.remaining);
    return list;
  }),

  create: authedQuery
    .input(
      z.object({
        vendorName: z.string().trim().min(1).max(255),
        amount: z.number().positive(),
        dateTime: z.string().optional(),
        note: z.string().trim().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Guard: a payment cannot exceed what is still payable to this vendor.
      const [expenseAgg] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${schema.expenses.total}), 0)::float`,
        })
        .from(schema.expenses)
        .where(eq(schema.expenses.paidTo, input.vendorName));
      const [paidAgg] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${schema.vendorPayments.amount}), 0)::float`,
        })
        .from(schema.vendorPayments)
        .where(eq(schema.vendorPayments.vendorName, input.vendorName));
      const remaining =
        Math.round((Number(expenseAgg?.total ?? 0) - Number(paidAgg?.total ?? 0)) * 100) / 100;
      if (input.amount > remaining + 0.01) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Amount exceeds the remaining payable (${remaining}) for this vendor`,
        });
      }

      const [row] = await db
        .insert(schema.vendorPayments)
        .values({
          vendorName: input.vendorName,
          amount: input.amount.toFixed(2),
          dateTime: input.dateTime ? new Date(input.dateTime) : new Date(),
          note: input.note || null,
          createdBy: ctx.user.id,
        })
        .returning({ id: schema.vendorPayments.id });
      return { id: row.id, success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(schema.vendorPayments).where(eq(schema.vendorPayments.id, input.id));
      return { success: true };
    }),
});
