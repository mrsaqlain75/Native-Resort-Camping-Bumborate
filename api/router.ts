import { authRouter } from "./auth-router.js";
import { menuRouter } from "./menu-router.js";
import { salesRouter } from "./sales-router.js";
import { expensesRouter } from "./expenses-router.js";
import { campingRouter } from "./camping-router.js";
import { reportsRouter } from "./reports-router.js";
import { createRouter, publicQuery } from "./middleware.js";
import { dataRouter } from "./data-router.js";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  menu: menuRouter,
  sales: salesRouter,
  expenses: expensesRouter,
  camping: campingRouter,
  reports: reportsRouter,
  data: dataRouter,
});

export type AppRouter = typeof appRouter;
