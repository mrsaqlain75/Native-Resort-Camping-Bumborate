import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as schema from "@db/schema";
import { gte, lte, and, sql } from "drizzle-orm";

export const reportsRouter = createRouter({
  profitLoss: authedQuery
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const fromDate = new Date(input.from);
      const toDate = new Date(input.to);

      const [salesRows] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${schema.sales.totalAmount}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(schema.sales)
        .where(
          and(
            gte(schema.sales.dateTime, fromDate),
            lte(schema.sales.dateTime, toDate)
          )
        );

      const [expenseRows] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${schema.expenses.amount}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(schema.expenses)
        .where(
          and(
            gte(schema.expenses.dateTime, fromDate),
            lte(schema.expenses.dateTime, toDate)
          )
        );

      const [campingRows] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${schema.campingSales.totalAmount}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(schema.campingSales)
        .where(
          and(
            gte(schema.campingSales.dateTime, fromDate),
            lte(schema.campingSales.dateTime, toDate)
          )
        );

      const salesTotal = Number(salesRows?.total ?? 0);
      const expenseTotal = Number(expenseRows?.total ?? 0);
      const campingTotal = Number(campingRows?.total ?? 0);
      const totalIncome = salesTotal + campingTotal;
      const netProfit = totalIncome - expenseTotal;
      const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

      return {
        salesTotal,
        expenseTotal,
        campingTotal,
        totalIncome,
        netProfit,
        profitMargin,
        salesCount: Number(salesRows?.count ?? 0),
        expenseCount: Number(expenseRows?.count ?? 0),
        campingCount: Number(campingRows?.count ?? 0),
      };
    }),

  dailyProfitLoss: authedQuery
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const fromDate = new Date(input.from);
      const toDate = new Date(input.to);

      const salesRows = await db
        .select({
          date: sql<string>`DATE(${schema.sales.dateTime})`,
          total: sql<number>`COALESCE(SUM(${schema.sales.totalAmount}), 0)`,
        })
        .from(schema.sales)
        .where(
          and(
            gte(schema.sales.dateTime, fromDate),
            lte(schema.sales.dateTime, toDate)
          )
        )
        .groupBy(sql`DATE(${schema.sales.dateTime})`)
        .orderBy(sql`DATE(${schema.sales.dateTime})`);

      const expenseRows = await db
        .select({
          date: sql<string>`DATE(${schema.expenses.dateTime})`,
          total: sql<number>`COALESCE(SUM(${schema.expenses.amount}), 0)`,
        })
        .from(schema.expenses)
        .where(
          and(
            gte(schema.expenses.dateTime, fromDate),
            lte(schema.expenses.dateTime, toDate)
          )
        )
        .groupBy(sql`DATE(${schema.expenses.dateTime})`)
        .orderBy(sql`DATE(${schema.expenses.dateTime})`);

      const campingRows = await db
        .select({
          date: sql<string>`DATE(${schema.campingSales.dateTime})`,
          total: sql<number>`COALESCE(SUM(${schema.campingSales.totalAmount}), 0)`,
        })
        .from(schema.campingSales)
        .where(
          and(
            gte(schema.campingSales.dateTime, fromDate),
            lte(schema.campingSales.dateTime, toDate)
          )
        )
        .groupBy(sql`DATE(${schema.campingSales.dateTime})`)
        .orderBy(sql`DATE(${schema.campingSales.dateTime})`);

      const dateMap = new Map<string, { date: string; sales: number; expenses: number; camping: number; profit: number }>();

      for (const row of salesRows) {
        const d = dateMap.get(row.date) || { date: row.date, sales: 0, expenses: 0, camping: 0, profit: 0 };
        d.sales = Number(row.total);
        dateMap.set(row.date, d);
      }

      for (const row of expenseRows) {
        const d = dateMap.get(row.date) || { date: row.date, sales: 0, expenses: 0, camping: 0, profit: 0 };
        d.expenses = Number(row.total);
        dateMap.set(row.date, d);
      }

      for (const row of campingRows) {
        const d = dateMap.get(row.date) || { date: row.date, sales: 0, expenses: 0, camping: 0, profit: 0 };
        d.camping = Number(row.total);
        dateMap.set(row.date, d);
      }

      for (const d of dateMap.values()) {
        d.profit = d.sales + d.camping - d.expenses;
      }

      return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    }),

  monthlyProfitLoss: authedQuery
    .input(z.object({ year: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const fromDate = new Date(input.year, 0, 1);
      const toDate = new Date(input.year + 1, 0, 1);

      const salesRows = await db
        .select({
          month: sql<number>`MONTH(${schema.sales.dateTime})`,
          total: sql<number>`COALESCE(SUM(${schema.sales.totalAmount}), 0)`,
        })
        .from(schema.sales)
        .where(
          and(
            gte(schema.sales.dateTime, fromDate),
            lte(schema.sales.dateTime, toDate)
          )
        )
        .groupBy(sql`MONTH(${schema.sales.dateTime})`)
        .orderBy(sql`MONTH(${schema.sales.dateTime})`);

      const expenseRows = await db
        .select({
          month: sql<number>`MONTH(${schema.expenses.dateTime})`,
          total: sql<number>`COALESCE(SUM(${schema.expenses.amount}), 0)`,
        })
        .from(schema.expenses)
        .where(
          and(
            gte(schema.expenses.dateTime, fromDate),
            lte(schema.expenses.dateTime, toDate)
          )
        )
        .groupBy(sql`MONTH(${schema.expenses.dateTime})`)
        .orderBy(sql`MONTH(${schema.expenses.dateTime})`);

      const campingRows = await db
        .select({
          month: sql<number>`MONTH(${schema.campingSales.dateTime})`,
          total: sql<number>`COALESCE(SUM(${schema.campingSales.totalAmount}), 0)`,
        })
        .from(schema.campingSales)
        .where(
          and(
            gte(schema.campingSales.dateTime, fromDate),
            lte(schema.campingSales.dateTime, toDate)
          )
        )
        .groupBy(sql`MONTH(${schema.campingSales.dateTime})`)
        .orderBy(sql`MONTH(${schema.campingSales.dateTime})`);

      const monthMap = new Map<number, { month: number; sales: number; expenses: number; camping: number; profit: number }>();

      for (let i = 1; i <= 12; i++) {
        monthMap.set(i, { month: i, sales: 0, expenses: 0, camping: 0, profit: 0 });
      }

      for (const row of salesRows) {
        const m = monthMap.get(row.month)!;
        m.sales = Number(row.total);
      }

      for (const row of expenseRows) {
        const m = monthMap.get(row.month)!;
        m.expenses = Number(row.total);
      }

      for (const row of campingRows) {
        const m = monthMap.get(row.month)!;
        m.camping = Number(row.total);
      }

      for (const m of monthMap.values()) {
        m.profit = m.sales + m.camping - m.expenses;
      }

      return Array.from(monthMap.values());
    }),

  yearlyProfitLoss: authedQuery.query(async () => {
    const db = getDb();

    const salesRows = await db
      .select({
        year: sql<number>`YEAR(${schema.sales.dateTime})`,
        total: sql<number>`COALESCE(SUM(${schema.sales.totalAmount}), 0)`,
      })
      .from(schema.sales)
      .groupBy(sql`YEAR(${schema.sales.dateTime})`)
      .orderBy(sql`YEAR(${schema.sales.dateTime})`);

    const expenseRows = await db
      .select({
        year: sql<number>`YEAR(${schema.expenses.dateTime})`,
        total: sql<number>`COALESCE(SUM(${schema.expenses.amount}), 0)`,
      })
      .from(schema.expenses)
      .groupBy(sql`YEAR(${schema.expenses.dateTime})`)
      .orderBy(sql`YEAR(${schema.expenses.dateTime})`);

    const campingRows = await db
      .select({
        year: sql<number>`YEAR(${schema.campingSales.dateTime})`,
        total: sql<number>`COALESCE(SUM(${schema.campingSales.totalAmount}), 0)`,
      })
      .from(schema.campingSales)
      .groupBy(sql`YEAR(${schema.campingSales.dateTime})`)
      .orderBy(sql`YEAR(${schema.campingSales.dateTime})`);

    const yearMap = new Map<number, { year: number; sales: number; expenses: number; camping: number; profit: number }>();

    for (const row of salesRows) {
      const y = yearMap.get(row.year) || { year: row.year, sales: 0, expenses: 0, camping: 0, profit: 0 };
      y.sales = Number(row.total);
      yearMap.set(row.year, y);
    }

    for (const row of expenseRows) {
      const y = yearMap.get(row.year) || { year: row.year, sales: 0, expenses: 0, camping: 0, profit: 0 };
      y.expenses = Number(row.total);
      yearMap.set(row.year, y);
    }

    for (const row of campingRows) {
      const y = yearMap.get(row.year) || { year: row.year, sales: 0, expenses: 0, camping: 0, profit: 0 };
      y.camping = Number(row.total);
      yearMap.set(row.year, y);
    }

    for (const y of yearMap.values()) {
      y.profit = y.sales + y.camping - y.expenses;
    }

    return Array.from(yearMap.values()).sort((a, b) => a.year - b.year);
  }),

  yearByYearComparison: authedQuery
    .input(z.object({ year1: z.number(), year2: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();

      const getYearData = async (year: number) => {
        const fromDate = new Date(year, 0, 1);
        const toDate = new Date(year + 1, 0, 1);

        const [salesResult] = await db
          .select({ total: sql<number>`COALESCE(SUM(${schema.sales.totalAmount}), 0)` })
          .from(schema.sales)
          .where(
            and(
              gte(schema.sales.dateTime, fromDate),
              lte(schema.sales.dateTime, toDate)
            )
          );

        const [expenseResult] = await db
          .select({ total: sql<number>`COALESCE(SUM(${schema.expenses.amount}), 0)` })
          .from(schema.expenses)
          .where(
            and(
              gte(schema.expenses.dateTime, fromDate),
              lte(schema.expenses.dateTime, toDate)
            )
          );

        const [campingResult] = await db
          .select({ total: sql<number>`COALESCE(SUM(${schema.campingSales.totalAmount}), 0)` })
          .from(schema.campingSales)
          .where(
            and(
              gte(schema.campingSales.dateTime, fromDate),
              lte(schema.campingSales.dateTime, toDate)
            )
          );

        const sales = Number(salesResult?.total ?? 0);
        const expenses = Number(expenseResult?.total ?? 0);
        const camping = Number(campingResult?.total ?? 0);
        const income = sales + camping;
        const profit = income - expenses;
        const margin = income > 0 ? (profit / income) * 100 : 0;

        return { year, sales, expenses, camping, income, profit, margin };
      };

      const year1Data = await getYearData(input.year1);
      const year2Data = await getYearData(input.year2);

      return {
        year1: year1Data,
        year2: year2Data,
        comparison: {
          salesChange: year1Data.sales > 0 ? ((year2Data.sales - year1Data.sales) / year1Data.sales) * 100 : 0,
          expensesChange: year1Data.expenses > 0 ? ((year2Data.expenses - year1Data.expenses) / year1Data.expenses) * 100 : 0,
          incomeChange: year1Data.income > 0 ? ((year2Data.income - year1Data.income) / year1Data.income) * 100 : 0,
          profitChange: year1Data.profit !== 0 ? ((year2Data.profit - year1Data.profit) / Math.abs(year1Data.profit)) * 100 : 0,
        },
      };
    }),

  dashboardSummary: authedQuery.query(async () => {
    const db = getDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todaySales] = await db
      .select({ total: sql<number>`COALESCE(SUM(${schema.sales.totalAmount}), 0)` })
      .from(schema.sales)
      .where(gte(schema.sales.dateTime, today));

    const [weekSales] = await db
      .select({ total: sql<number>`COALESCE(SUM(${schema.sales.totalAmount}), 0)` })
      .from(schema.sales)
      .where(gte(schema.sales.dateTime, startOfWeek));

    const [monthSales] = await db
      .select({ total: sql<number>`COALESCE(SUM(${schema.sales.totalAmount}), 0)` })
      .from(schema.sales)
      .where(gte(schema.sales.dateTime, startOfMonth));

    const [todayExpenses] = await db
      .select({ total: sql<number>`COALESCE(SUM(${schema.expenses.amount}), 0)` })
      .from(schema.expenses)
      .where(gte(schema.expenses.dateTime, today));

    const [weekExpenses] = await db
      .select({ total: sql<number>`COALESCE(SUM(${schema.expenses.amount}), 0)` })
      .from(schema.expenses)
      .where(gte(schema.expenses.dateTime, startOfWeek));

    const [monthExpenses] = await db
      .select({ total: sql<number>`COALESCE(SUM(${schema.expenses.amount}), 0)` })
      .from(schema.expenses)
      .where(gte(schema.expenses.dateTime, startOfMonth));

    const [todayCamping] = await db
      .select({ total: sql<number>`COALESCE(SUM(${schema.campingSales.totalAmount}), 0)` })
      .from(schema.campingSales)
      .where(gte(schema.campingSales.dateTime, today));

    const [weekCamping] = await db
      .select({ total: sql<number>`COALESCE(SUM(${schema.campingSales.totalAmount}), 0)` })
      .from(schema.campingSales)
      .where(gte(schema.campingSales.dateTime, startOfWeek));

    const [monthCamping] = await db
      .select({ total: sql<number>`COALESCE(SUM(${schema.campingSales.totalAmount}), 0)` })
      .from(schema.campingSales)
      .where(gte(schema.campingSales.dateTime, startOfMonth));

    return {
      today: {
        sales: Number(todaySales?.total ?? 0),
        expenses: Number(todayExpenses?.total ?? 0),
        camping: Number(todayCamping?.total ?? 0),
        profit: Number(todaySales?.total ?? 0) + Number(todayCamping?.total ?? 0) - Number(todayExpenses?.total ?? 0),
      },
      week: {
        sales: Number(weekSales?.total ?? 0),
        expenses: Number(weekExpenses?.total ?? 0),
        camping: Number(weekCamping?.total ?? 0),
        profit: Number(weekSales?.total ?? 0) + Number(weekCamping?.total ?? 0) - Number(weekExpenses?.total ?? 0),
      },
      month: {
        sales: Number(monthSales?.total ?? 0),
        expenses: Number(monthExpenses?.total ?? 0),
        camping: Number(monthCamping?.total ?? 0),
        profit: Number(monthSales?.total ?? 0) + Number(monthCamping?.total ?? 0) - Number(monthExpenses?.total ?? 0),
      },
    };
  }),

  recentActivity: authedQuery.query(async () => {
    const db = getDb();

    const recentSales = await db
      .select()
      .from(schema.sales)
      .orderBy(sql`${schema.sales.createdAt} DESC`)
      .limit(5);

    const recentExpenses = await db
      .select()
      .from(schema.expenses)
      .orderBy(sql`${schema.expenses.createdAt} DESC`)
      .limit(5);

    const recentCamping = await db
      .select()
      .from(schema.campingSales)
      .orderBy(sql`${schema.campingSales.createdAt} DESC`)
      .limit(5);

    return {
      sales: recentSales,
      expenses: recentExpenses,
      camping: recentCamping,
    };
  }),
});
