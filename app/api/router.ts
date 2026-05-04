import { authRouter } from "./auth-router";
import { menuRouter } from "./menu-router";
import { salesRouter } from "./sales-router";
import { expensesRouter } from "./expenses-router";
import { campingRouter } from "./camping-router";
import { reportsRouter } from "./reports-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  menu: menuRouter,
  sales: salesRouter,
  expenses: expensesRouter,
  camping: campingRouter,
  reports: reportsRouter,
});

export type AppRouter = typeof appRouter;
