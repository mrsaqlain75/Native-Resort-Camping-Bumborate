import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as schema from "../db/schema";
import { sql, eq, desc, isNotNull, and, gte, lt } from "drizzle-orm";

export type VendorPayable = {
  vendor: string;
  expensesTotal: number;
  expensesCount: number;
  paidTotal: number;
  paymentsCount: number;
  remaining: number;
};

export type VendorMonthlyPayable = {
  vendor: string;
  monthExpensesTotal: number;
  monthExpensesCount: number;
  monthPaidTotal: number;
  monthPaymentsCount: number;
  monthRemaining: number;
  // Lifetime remaining (expenses - payments across all months), i.e. any
  // amount still pending from previous months.
  totalPayable: number;
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

  // Per-vendor balances scoped to one calendar month (YYYY-MM), plus the
  // lifetime "Total Payable" so previous months' dues stay visible.
  monthlySummary: authedQuery
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM") }))
    .query(async ({ input }) => {
      const db = getDb();
      const monthStart = new Date(`${input.month}-01T00:00:00.000Z`);
      const monthEnd = new Date(monthStart);
      monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

      // Only registered vendors appear in the payable ledger.
      const vendorRows = await db.select({ name: schema.vendors.name }).from(schema.vendors);
      const vendorNames = new Set(vendorRows.map((v) => v.name));

      const [monthExpenseRows, monthPaymentRows, lifetimeExpenseRows, lifetimePaymentRows] =
        await Promise.all([
          db
            .select({
              vendor: schema.expenses.paidTo,
              total: sql<number>`COALESCE(SUM(${schema.expenses.total}), 0)::float`,
              count: sql<number>`COUNT(*)::int`,
            })
            .from(schema.expenses)
            .where(
              and(
                isNotNull(schema.expenses.paidTo),
                gte(schema.expenses.dateTime, monthStart),
                lt(schema.expenses.dateTime, monthEnd)
              )
            )
            .groupBy(schema.expenses.paidTo),
          db
            .select({
              vendor: schema.vendorPayments.vendorName,
              total: sql<number>`COALESCE(SUM(${schema.vendorPayments.amount}), 0)::float`,
              count: sql<number>`COUNT(*)::int`,
            })
            .from(schema.vendorPayments)
            .where(
              and(
                gte(schema.vendorPayments.dateTime, monthStart),
                lt(schema.vendorPayments.dateTime, monthEnd)
              )
            )
            .groupBy(schema.vendorPayments.vendorName),
          db
            .select({
              vendor: schema.expenses.paidTo,
              total: sql<number>`COALESCE(SUM(${schema.expenses.total}), 0)::float`,
            })
            .from(schema.expenses)
            .where(isNotNull(schema.expenses.paidTo))
            .groupBy(schema.expenses.paidTo),
          db
            .select({
              vendor: schema.vendorPayments.vendorName,
              total: sql<number>`COALESCE(SUM(${schema.vendorPayments.amount}), 0)::float`,
            })
            .from(schema.vendorPayments)
            .groupBy(schema.vendorPayments.vendorName),
        ]);

      const lifetimeExpense = new Map<string, number>();
      for (const row of lifetimeExpenseRows) {
        if (row.vendor && vendorNames.has(row.vendor)) {
          lifetimeExpense.set(row.vendor, Number(row.total ?? 0));
        }
      }
      const lifetimePaid = new Map<string, number>();
      for (const row of lifetimePaymentRows) {
        lifetimePaid.set(row.vendor, Number(row.total ?? 0));
      }
      const monthExpense = new Map<string, { total: number; count: number }>();
      for (const row of monthExpenseRows) {
        if (row.vendor && vendorNames.has(row.vendor)) {
          monthExpense.set(row.vendor, { total: Number(row.total ?? 0), count: Number(row.count ?? 0) });
        }
      }
      const monthPaid = new Map<string, { total: number; count: number }>();
      for (const row of monthPaymentRows) {
        monthPaid.set(row.vendor, { total: Number(row.total ?? 0), count: Number(row.count ?? 0) });
      }

      const list: VendorMonthlyPayable[] = [];
      for (const vendor of vendorNames) {
        const mExp = monthExpense.get(vendor) ?? { total: 0, count: 0 };
        const mPaid = monthPaid.get(vendor) ?? { total: 0, count: 0 };
        const totalPayable =
          Math.round(((lifetimeExpense.get(vendor) ?? 0) - (lifetimePaid.get(vendor) ?? 0)) * 100) /
          100;
        const monthRemaining = Math.round((mExp.total - mPaid.total) * 100) / 100;
        // Show vendors with activity this month, or anything still pending
        // from previous months (so old dues are never hidden).
        if (mExp.total > 0 || mPaid.total > 0 || totalPayable > 0) {
          list.push({
            vendor,
            monthExpensesTotal: mExp.total,
            monthExpensesCount: mExp.count,
            monthPaidTotal: mPaid.total,
            monthPaymentsCount: mPaid.count,
            monthRemaining,
            totalPayable,
          });
        }
      }
      list.sort((a, b) => b.totalPayable - a.totalPayable || b.monthRemaining - a.monthRemaining);
      return list;
    }),

  create: authedQuery
    .input(
      z.object({
        vendorName: z.string().trim().min(1).max(255),
        amount: z.number().positive(),
        paymentMethod: z.enum(["cash", "online"]).optional(),
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
          paymentMethod: input.paymentMethod ?? null,
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
