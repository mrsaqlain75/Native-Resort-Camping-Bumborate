import { createRequire } from 'module'; const require = createRequire(import.meta.url);
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/lib/env.ts
import { z } from "zod";
import dotenv from "dotenv";
var envSchema, parsed, env;
var init_env = __esm({
  "server/lib/env.ts"() {
    "use strict";
    dotenv.config({ quiet: true });
    envSchema = z.object({
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
      cloudinaryApiSecret: z.string().optional()
    });
    parsed = envSchema.safeParse({
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
      cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET
    });
    if (!parsed.success) {
      const fields = parsed.error.issues.map((i) => i.path.join(".") || "(root)").join(", ");
      throw new Error(`Invalid or missing environment variables: ${fields}`);
    }
    env = parsed.data;
  }
});

// db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  activeEnum: () => activeEnum,
  campingSales: () => campingSales,
  expenseCategoryEnum: () => expenseCategoryEnum,
  expensePaymentMethodEnum: () => expensePaymentMethodEnum,
  expenses: () => expenses,
  menuItems: () => menuItems,
  paymentMethodEnum: () => paymentMethodEnum,
  sales: () => sales,
  salesSourceEnum: () => salesSourceEnum,
  userRoleEnum: () => userRoleEnum,
  users: () => users
});
import {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  numeric,
  jsonb,
  date
} from "drizzle-orm/pg-core";
var userRoleEnum, activeEnum, paymentMethodEnum, expensePaymentMethodEnum, salesSourceEnum, expenseCategoryEnum, users, menuItems, sales, expenses, campingSales;
var init_schema = __esm({
  "db/schema.ts"() {
    "use strict";
    userRoleEnum = pgEnum("user_role", ["user", "admin", "manager"]);
    activeEnum = pgEnum("active_flag", ["yes", "no"]);
    paymentMethodEnum = pgEnum("payment_method", ["cash", "e_transaction"]);
    expensePaymentMethodEnum = pgEnum("expense_payment_method", [
      "cash",
      "e_transaction",
      "bank_transfer"
    ]);
    salesSourceEnum = pgEnum("sales_source", ["dine_in", "online_order", "other"]);
    expenseCategoryEnum = pgEnum("expense_category", [
      "food",
      "supplies",
      "utilities",
      "staff",
      "maintenance",
      "rent",
      "other"
    ]);
    users = pgTable("users", {
      id: serial("id").primaryKey(),
      email: varchar("email", { length: 320 }).notNull().unique(),
      passwordHash: varchar("password_hash", { length: 255 }).notNull(),
      name: varchar("name", { length: 255 }),
      avatar: text("avatar"),
      role: userRoleEnum("role").default("user").notNull(),
      createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
      updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull().$onUpdate(() => /* @__PURE__ */ new Date()),
      lastSignInAt: timestamp("last_sign_in_at", { mode: "date" }).defaultNow().notNull()
    });
    menuItems = pgTable("menu_items", {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 255 }).notNull(),
      category: varchar("category", { length: 100 }).notNull(),
      price: numeric("price", { precision: 12, scale: 2 }).notNull(),
      stockCount: integer("stock_count").default(0),
      active: activeEnum("active").default("yes").notNull(),
      createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
      updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull().$onUpdate(() => /* @__PURE__ */ new Date())
    });
    sales = pgTable("sales", {
      id: serial("id").primaryKey(),
      customerName: varchar("customer_name", { length: 255 }).default("Walk-in Customer"),
      items: jsonb("items").$type().notNull(),
      totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
      discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).default("0"),
      taxPercent: numeric("tax_percent", { precision: 5, scale: 2 }).default("0"),
      paymentMethod: paymentMethodEnum("payment_method").notNull(),
      source: salesSourceEnum("source").notNull(),
      dateTime: timestamp("date_time", { mode: "date" }).notNull(),
      note: text("note"),
      createdBy: integer("created_by").notNull(),
      createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
    });
    expenses = pgTable("expenses", {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 255 }).notNull(),
      amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
      // Unit price
      quantity: integer("quantity").default(0),
      // Quantity
      total: numeric("total", { precision: 12, scale: 2 }).default("0"),
      // Total = amount × quantity
      category: expenseCategoryEnum("category").notNull(),
      paymentMethod: expensePaymentMethodEnum("payment_method").notNull(),
      paidTo: varchar("paid_to", { length: 255 }),
      receiptUrl: text("receipt_url"),
      dateTime: timestamp("date_time", { mode: "date" }).notNull(),
      note: text("note"),
      createdBy: integer("created_by").notNull(),
      createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
    });
    campingSales = pgTable("camping_sales", {
      id: serial("id").primaryKey(),
      customerName: varchar("customer_name", { length: 255 }).notNull(),
      numberOfCamps: integer("number_of_camps").notNull().default(1),
      checkIn: date("check_in", { mode: "date" }).notNull(),
      checkOut: date("check_out", { mode: "date" }).notNull(),
      peopleCount: integer("people_count").notNull(),
      services: jsonb("services").$type().notNull(),
      nights: integer("nights").notNull(),
      spotTotal: numeric("spot_total", { precision: 12, scale: 2 }).notNull(),
      servicesTotal: numeric("services_total", { precision: 12, scale: 2 }).default("0.00").notNull(),
      totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
      discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).default("0"),
      taxPercent: numeric("tax_percent", { precision: 5, scale: 2 }).default("0"),
      paymentMethod: paymentMethodEnum("payment_method").notNull(),
      dateTime: timestamp("date_time", { mode: "date" }).notNull(),
      note: text("note"),
      createdBy: integer("created_by").notNull(),
      createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull()
    });
  }
});

// server/queries/connection.ts
var connection_exports = {};
__export(connection_exports, {
  dbPing: () => dbPing,
  getDb: () => getDb,
  isConnectPhaseError: () => isConnectPhaseError,
  isTransientDbError: () => isTransientDbError,
  withDbRetry: () => withDbRetry
});
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
function cleanUrl(raw) {
  try {
    const u = new URL(raw);
    const keep = new URLSearchParams();
    keep.set("sslmode", "require");
    u.search = keep.toString();
    return u.toString();
  } catch {
    return raw;
  }
}
function getDb() {
  if (!instance) {
    client = postgres(cleanUrl(env.databaseUrl), {
      max: 1,
      prepare: false,
      ssl: "require",
      idle_timeout: 20,
      connect_timeout: 15,
      // Server-side guards so a stuck query becomes a fast error, never a hang.
      connection: {
        statement_timeout: 12e3,
        idle_in_transaction_session_timeout: 12e3
      }
    });
    instance = drizzle(client, { schema: schema_exports });
  }
  return instance;
}
async function dbPing() {
  const started = Date.now();
  try {
    const rows = await getDb().execute(sql`select 1 as ok`);
    return {
      ok: true,
      ms: Date.now() - started,
      detail: JSON.stringify(rows)
    };
  } catch (err) {
    return {
      ok: false,
      ms: Date.now() - started,
      detail: err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    };
  }
}
function matches(err, patterns) {
  let cur = err;
  for (let depth = 0; depth < 5 && cur; depth++) {
    const text2 = (cur instanceof Error ? `${cur.name} ${cur.message} ${cur.code ?? ""}` : String(cur)).toLowerCase();
    if (patterns.some((p) => text2.includes(p))) return true;
    cur = cur instanceof Error ? cur.cause : void 0;
  }
  return false;
}
function isTransientDbError(err) {
  return matches(err, [...CONNECT_PHASE_ERRORS, ...IN_FLIGHT_ERRORS]);
}
function isConnectPhaseError(err) {
  return matches(err, CONNECT_PHASE_ERRORS);
}
async function withDbRetry(fn) {
  const backoff = [0, 400, 1200, 2500];
  let lastErr;
  for (let i = 0; i < backoff.length; i++) {
    if (backoff[i]) await new Promise((r) => setTimeout(r, backoff[i]));
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransientDbError(err)) throw err;
    }
  }
  throw lastErr;
}
var client, instance, CONNECT_PHASE_ERRORS, IN_FLIGHT_ERRORS;
var init_connection = __esm({
  "server/queries/connection.ts"() {
    "use strict";
    init_env();
    init_schema();
    CONNECT_PHASE_ERRORS = [
      "econnrefused",
      "enotfound",
      "getaddrinfo",
      "connect_timeout",
      "connection timeout",
      "timeout expired",
      "the database system is starting up",
      "fetch failed",
      "failed to fetch",
      "und_err",
      "timeouterror",
      "aborted",
      "the operation was aborted",
      "connect timeout",
      "write connect_timeout"
    ];
    IN_FLIGHT_ERRORS = [
      "econnreset",
      "epipe",
      "connection terminated",
      "connection closed",
      "terminating connection",
      "server closed the connection",
      "connection ended unexpectedly",
      "socket hang up",
      "client has encountered a connection error",
      "terminated",
      "cannot use a pool after calling end"
    ];
  }
});

// server/vercel-entry.ts
import { getRequestListener } from "@hono/node-server";

// server/app.ts
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

// server/auth-router.ts
import { TRPCError as TRPCError2 } from "@trpc/server";
import { z as z2 } from "zod";

// contracts/constants.ts
var Session = {
  cookieName: "auth_token",
  maxAgeMs: 7 * 24 * 60 * 60 * 1e3
  // 7 days
};
var ErrorMessages = {
  unauthenticated: "Authentication required",
  insufficientRole: "Insufficient permissions",
  invalidCredentials: "Invalid email or password"
};

// server/middleware.ts
init_connection();
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var createRouter = t.router;
var retryColdStart = t.middleware(async ({ next, type }) => {
  const backoff = [0, 500, 1500, 3500];
  let result = await next();
  let i = 1;
  while (i < backoff.length && !result.ok) {
    const retryable = type === "query" ? isTransientDbError(result.error) : isConnectPhaseError(result.error);
    if (!retryable) break;
    await new Promise((r) => setTimeout(r, backoff[i++]));
    result = await next();
  }
  return result;
});
var publicQuery = t.procedure.use(retryColdStart);
var requireAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ErrorMessages.unauthenticated
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
function requireRole(role) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: ErrorMessages.unauthenticated
      });
    }
    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: ErrorMessages.insufficientRole
      });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}
var authedQuery = publicQuery.use(requireAuth);
var adminQuery = authedQuery.use(requireRole("admin"));
var managerQuery = authedQuery.use(requireRole(["admin", "manager"]));

// server/queries/users.ts
init_schema();
init_connection();
init_env();
import { eq } from "drizzle-orm";

// server/lib/auth.ts
init_env();
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
var SALT_ROUNDS = 10;
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
function generateToken(userId, email, role) {
  const options = {
    expiresIn: env.jwtExpiresIn || "7d"
  };
  return jwt.sign({ userId, email, role }, env.jwtSecret, options);
}
function verifyToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch {
    return null;
  }
}
function getTokenFromHeaders(headers) {
  const authHeader = headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

// server/queries/users.ts
async function findUserByEmail(email) {
  const rows = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  return rows.at(0);
}
async function findUserById(id) {
  const rows = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
  return rows.at(0);
}
async function createUser(data) {
  const [row] = await getDb().insert(users).values(data).returning({ id: users.id });
  const user = await findUserById(row.id);
  if (!user) throw new Error("Failed to create user");
  return user;
}
async function createOrGetOwner() {
  const existingOwner = await findUserByEmail(env.ownerEmail);
  if (existingOwner) return existingOwner;
  const hashedPassword = await hashPassword(env.ownerPassword);
  return createUser({
    email: env.ownerEmail,
    passwordHash: hashedPassword,
    name: "Owner",
    role: "admin"
  });
}
async function createOrGetManager() {
  const managerEmail = env.managerEmail || "manager@nativeresort.com";
  const existingManager = await findUserByEmail(managerEmail);
  if (existingManager) return existingManager;
  const managerPassword = env.managerPassword || "Manager@123";
  const hashedPassword = await hashPassword(managerPassword);
  return createUser({
    email: managerEmail,
    passwordHash: hashedPassword,
    name: "Manager",
    role: "manager"
  });
}

// server/auth-router.ts
var loginSchema = z2.object({
  email: z2.string().email(),
  password: z2.string().min(6)
});
var authRouter = createRouter({
  login: publicQuery.input(loginSchema).mutation(async ({ input }) => {
    const { email, password } = input;
    let user = await findUserByEmail(email);
    if (!user) {
      await createOrGetOwner();
      await createOrGetManager();
      user = await findUserByEmail(email);
    }
    if (!user) {
      throw new TRPCError2({
        code: "UNAUTHORIZED",
        message: "Invalid email or password"
      });
    }
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new TRPCError2({
        code: "UNAUTHORIZED",
        message: "Invalid email or password"
      });
    }
    const token = generateToken(user.id, user.email, user.role);
    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
  }),
  me: authedQuery.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError2({
        code: "UNAUTHORIZED",
        message: ErrorMessages.unauthenticated
      });
    }
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
      role: ctx.user.role,
      avatar: ctx.user.avatar
    };
  }),
  logout: authedQuery.mutation(async () => {
    return { success: true };
  })
});

// server/menu-router.ts
import { z as z3 } from "zod";
init_connection();
init_schema();
import { eq as eq2, desc } from "drizzle-orm";
var menuRouter = createRouter({
  list: authedQuery.query(async () => {
    const db = getDb();
    return db.select().from(menuItems).where(eq2(menuItems.active, "yes")).orderBy(desc(menuItems.createdAt));
  }),
  listAll: authedQuery.query(async () => {
    const db = getDb();
    return db.select().from(menuItems).orderBy(desc(menuItems.createdAt));
  }),
  getById: authedQuery.input(z3.object({ id: z3.number() })).query(async ({ input }) => {
    const db = getDb();
    const rows = await db.select().from(menuItems).where(eq2(menuItems.id, input.id)).limit(1);
    return rows.at(0) ?? null;
  }),
  create: authedQuery.input(
    z3.object({
      name: z3.string().min(1),
      category: z3.string().min(1),
      price: z3.string().or(z3.number()),
      stockCount: z3.number().optional()
    })
  ).mutation(async ({ input }) => {
    const db = getDb();
    const price = typeof input.price === "string" ? parseFloat(input.price) : input.price;
    await db.insert(menuItems).values({
      name: input.name,
      category: input.category,
      price: price.toFixed(2),
      stockCount: input.stockCount ?? 0
    });
    return { success: true };
  }),
  update: authedQuery.input(
    z3.object({
      id: z3.number(),
      name: z3.string().min(1),
      category: z3.string().min(1),
      price: z3.string().or(z3.number()),
      stockCount: z3.number().optional(),
      active: z3.enum(["yes", "no"]).optional()
    })
  ).mutation(async ({ input }) => {
    const db = getDb();
    const price = typeof input.price === "string" ? parseFloat(input.price) : input.price;
    await db.update(menuItems).set({
      name: input.name,
      category: input.category,
      price: price.toFixed(2),
      stockCount: input.stockCount ?? 0,
      ...input.active && { active: input.active }
    }).where(eq2(menuItems.id, input.id));
    return { success: true };
  }),
  delete: authedQuery.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
    const db = getDb();
    await db.update(menuItems).set({ active: "no" }).where(eq2(menuItems.id, input.id));
    return { success: true };
  }),
  categories: authedQuery.query(async () => {
    const db = getDb();
    const rows = await db.select({ category: menuItems.category }).from(menuItems).where(eq2(menuItems.active, "yes")).groupBy(menuItems.category);
    return rows.map((r) => r.category);
  })
});

// server/sales-router.ts
import { z as z4 } from "zod";
init_connection();
init_schema();
import { eq as eq3, desc as desc2, gte, lte, and, sql as sql2 } from "drizzle-orm";
var salesRouter = createRouter({
  list: authedQuery.query(async () => {
    const db = getDb();
    return db.select().from(sales).orderBy(desc2(sales.dateTime));
  }),
  listByDateRange: authedQuery.input(z4.object({ from: z4.string(), to: z4.string() })).query(async ({ input }) => {
    const db = getDb();
    return db.select().from(sales).where(
      and(
        gte(sales.dateTime, new Date(input.from)),
        lte(sales.dateTime, new Date(input.to))
      )
    ).orderBy(desc2(sales.dateTime));
  }),
  create: authedQuery.input(
    z4.object({
      customerName: z4.string().optional().default("Walk-in Customer"),
      items: z4.array(
        z4.object({
          name: z4.string(),
          quantity: z4.number(),
          unitPrice: z4.number(),
          total: z4.number()
        })
      ),
      totalAmount: z4.number(),
      discountPercent: z4.number().optional().default(0),
      taxPercent: z4.number().optional().default(0),
      paymentMethod: z4.enum(["cash", "e_transaction"]),
      source: z4.enum(["dine_in", "online_order", "other"]),
      dateTime: z4.string(),
      note: z4.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = getDb();
    const [row] = await db.insert(sales).values({
      customerName: input.customerName || "Walk-in Customer",
      items: input.items,
      totalAmount: input.totalAmount.toString(),
      discountPercent: input.discountPercent?.toString() || "0",
      taxPercent: input.taxPercent?.toString() || "0",
      paymentMethod: input.paymentMethod,
      source: input.source,
      dateTime: new Date(input.dateTime),
      note: input.note || null,
      createdBy: ctx.user.id
    }).returning({ id: sales.id });
    return { id: row.id, success: true };
  }),
  getById: authedQuery.input(z4.object({ id: z4.number() })).query(async ({ input }) => {
    const db = getDb();
    const rows = await db.select().from(sales).where(eq3(sales.id, input.id)).limit(1);
    return rows.at(0) ?? null;
  }),
  delete: authedQuery.input(z4.object({ id: z4.number() })).mutation(async ({ input }) => {
    const db = getDb();
    await db.delete(sales).where(eq3(sales.id, input.id));
    return { success: true };
  }),
  todaySummary: authedQuery.query(async () => {
    const db = getDb();
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const rows = await db.select({
      total: sql2`COALESCE(SUM(${sales.totalAmount}), 0)::float`,
      count: sql2`COUNT(*)::int`
    }).from(sales).where(gte(sales.dateTime, today));
    return rows[0];
  }),
  summaryByDateRange: authedQuery.input(z4.object({ from: z4.string(), to: z4.string() })).query(async ({ input }) => {
    const db = getDb();
    const rows = await db.select({
      total: sql2`COALESCE(SUM(${sales.totalAmount}), 0)::float`,
      count: sql2`COUNT(*)::int`
    }).from(sales).where(
      and(
        gte(sales.dateTime, new Date(input.from)),
        lte(sales.dateTime, new Date(input.to))
      )
    );
    return rows[0];
  }),
  dailyBreakdown: authedQuery.input(z4.object({ from: z4.string(), to: z4.string() })).query(async ({ input }) => {
    const db = getDb();
    const rows = await db.select({
      date: sql2`to_char(${sales.dateTime}, 'YYYY-MM-DD')`,
      total: sql2`COALESCE(SUM(${sales.totalAmount}), 0)::float`,
      count: sql2`COUNT(*)::int`
    }).from(sales).where(
      and(
        gte(sales.dateTime, new Date(input.from)),
        lte(sales.dateTime, new Date(input.to))
      )
    ).groupBy(sql2`to_char(${sales.dateTime}, 'YYYY-MM-DD')`).orderBy(sql2`to_char(${sales.dateTime}, 'YYYY-MM-DD')`);
    return rows;
  }),
  update: authedQuery.input(
    z4.object({
      id: z4.number(),
      customerName: z4.string().optional(),
      items: z4.array(
        z4.object({
          name: z4.string(),
          quantity: z4.number(),
          unitPrice: z4.number(),
          total: z4.number()
        })
      ),
      totalAmount: z4.number(),
      discountPercent: z4.number().optional(),
      taxPercent: z4.number().optional(),
      paymentMethod: z4.enum(["cash", "e_transaction"]),
      source: z4.enum(["dine_in", "online_order", "other"]),
      dateTime: z4.string(),
      note: z4.string().optional()
    })
  ).mutation(async ({ input }) => {
    const db = getDb();
    await db.update(sales).set({
      customerName: input.customerName || "Walk-in Customer",
      items: input.items,
      totalAmount: input.totalAmount.toString(),
      discountPercent: input.discountPercent?.toString() || "0",
      taxPercent: input.taxPercent?.toString() || "0",
      paymentMethod: input.paymentMethod,
      source: input.source,
      dateTime: new Date(input.dateTime),
      note: input.note || null
    }).where(eq3(sales.id, input.id));
    return { success: true };
  }),
  monthlyBreakdown: authedQuery.input(z4.object({ year: z4.number() })).query(async ({ input }) => {
    const db = getDb();
    const from = new Date(input.year, 0, 1);
    const to = new Date(input.year + 1, 0, 1);
    const rows = await db.select({
      month: sql2`EXTRACT(MONTH FROM ${sales.dateTime})::int`,
      total: sql2`COALESCE(SUM(${sales.totalAmount}), 0)::float`,
      count: sql2`COUNT(*)::int`
    }).from(sales).where(
      and(
        gte(sales.dateTime, from),
        lte(sales.dateTime, to)
      )
    ).groupBy(sql2`EXTRACT(MONTH FROM ${sales.dateTime})`).orderBy(sql2`EXTRACT(MONTH FROM ${sales.dateTime})`);
    return rows;
  }),
  yearlyBreakdown: authedQuery.query(async () => {
    const db = getDb();
    const rows = await db.select({
      year: sql2`EXTRACT(YEAR FROM ${sales.dateTime})::int`,
      total: sql2`COALESCE(SUM(${sales.totalAmount}), 0)::float`,
      count: sql2`COUNT(*)::int`
    }).from(sales).groupBy(sql2`EXTRACT(YEAR FROM ${sales.dateTime})`).orderBy(sql2`EXTRACT(YEAR FROM ${sales.dateTime})`);
    return rows;
  }),
  sellingRankings: authedQuery.input(
    z4.object({
      from: z4.string(),
      to: z4.string(),
      limit: z4.number().default(10)
    })
  ).query(async ({ input }) => {
    const db = getDb();
    const rows = await db.select().from(sales).where(
      and(
        gte(sales.dateTime, new Date(input.from)),
        lte(sales.dateTime, new Date(input.to))
      )
    );
    const itemMap = /* @__PURE__ */ new Map();
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
            revenue: item.total
          });
        }
      }
    }
    return Array.from(itemMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, input.limit);
  })
});

// server/expenses-router.ts
import { z as z5 } from "zod";
init_connection();
init_schema();
import { eq as eq4, desc as desc3, gte as gte2, lte as lte2, and as and2, sql as sql3 } from "drizzle-orm";
var expensesRouter = createRouter({
  list: authedQuery.query(async () => {
    const db = getDb();
    return db.select().from(expenses).orderBy(desc3(expenses.dateTime));
  }),
  delete: authedQuery.input(z5.object({ id: z5.number() })).mutation(async ({ input }) => {
    const db = getDb();
    await db.delete(expenses).where(eq4(expenses.id, input.id));
    return { success: true };
  }),
  listByDateRange: authedQuery.input(z5.object({ from: z5.string(), to: z5.string() })).query(async ({ input }) => {
    const db = getDb();
    return db.select().from(expenses).where(
      and2(
        gte2(expenses.dateTime, new Date(input.from)),
        lte2(expenses.dateTime, new Date(input.to))
      )
    ).orderBy(desc3(expenses.dateTime));
  }),
  create: authedQuery.input(
    z5.object({
      name: z5.string().min(1),
      amount: z5.number(),
      quantity: z5.number().int().min(0).default(0),
      total: z5.number().default(0),
      category: z5.enum([
        "food",
        "supplies",
        "utilities",
        "staff",
        "maintenance",
        "rent",
        "other"
      ]),
      paymentMethod: z5.enum(["cash", "e_transaction", "bank_transfer"]),
      paidTo: z5.string().optional(),
      receiptUrl: z5.string().optional(),
      dateTime: z5.string(),
      note: z5.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = getDb();
    await db.insert(expenses).values({
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
      createdBy: ctx.user.id
    });
    return { success: true };
  }),
  createMultiple: authedQuery.input(
    z5.object({
      expenses: z5.array(
        z5.object({
          name: z5.string().min(1),
          amount: z5.number(),
          quantity: z5.number().int().min(0).default(0),
          total: z5.number().default(0),
          category: z5.enum([
            "food",
            "supplies",
            "utilities",
            "staff",
            "maintenance",
            "rent",
            "other"
          ]),
          paymentMethod: z5.enum(["cash", "e_transaction", "bank_transfer"]),
          paidTo: z5.string().optional().nullable(),
          receiptUrl: z5.string().optional(),
          dateTime: z5.string(),
          note: z5.string().optional()
        })
      )
    })
  ).mutation(async ({ input, ctx }) => {
    const db = getDb();
    const rows = await db.insert(expenses).values(
      input.expenses.map((expense) => ({
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
        createdBy: ctx.user.id
      }))
    ).returning({ id: expenses.id });
    return { success: true, count: rows.length };
  }),
  update: authedQuery.input(
    z5.object({
      id: z5.number(),
      name: z5.string(),
      amount: z5.number(),
      quantity: z5.number().int().min(0).optional(),
      total: z5.number().optional(),
      category: z5.enum([
        "food",
        "supplies",
        "utilities",
        "staff",
        "maintenance",
        "rent",
        "other"
      ]),
      paymentMethod: z5.enum(["cash", "e_transaction", "bank_transfer"]),
      paidTo: z5.string().nullable().optional(),
      receiptUrl: z5.string().nullable().optional(),
      dateTime: z5.string(),
      note: z5.string().nullable().optional()
    })
  ).mutation(async ({ input }) => {
    const db = getDb();
    const total = input.total || input.amount * (input.quantity || 0);
    await db.update(expenses).set({
      name: input.name,
      amount: input.amount.toString(),
      quantity: input.quantity || 0,
      total: total.toString(),
      category: input.category,
      paymentMethod: input.paymentMethod,
      paidTo: input.paidTo || null,
      receiptUrl: input.receiptUrl || null,
      dateTime: new Date(input.dateTime),
      note: input.note || null
    }).where(eq4(expenses.id, input.id));
    return { success: true };
  }),
  todaySummary: authedQuery.query(async () => {
    const db = getDb();
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const rows = await db.select({
      total: sql3`COALESCE(SUM(${expenses.total}), 0)::float`,
      count: sql3`COUNT(*)::int`
    }).from(expenses).where(gte2(expenses.dateTime, today));
    return rows[0];
  }),
  summaryByDateRange: authedQuery.input(z5.object({ from: z5.string(), to: z5.string() })).query(async ({ input }) => {
    const db = getDb();
    const rows = await db.select({
      total: sql3`COALESCE(SUM(${expenses.total}), 0)::float`,
      count: sql3`COUNT(*)::int`
    }).from(expenses).where(
      and2(
        gte2(expenses.dateTime, new Date(input.from)),
        lte2(expenses.dateTime, new Date(input.to))
      )
    );
    return rows[0];
  }),
  dailyBreakdown: authedQuery.input(z5.object({ from: z5.string(), to: z5.string() })).query(async ({ input }) => {
    const db = getDb();
    const rows = await db.select({
      date: sql3`to_char(${expenses.dateTime}, 'YYYY-MM-DD')`,
      total: sql3`COALESCE(SUM(${expenses.total}), 0)::float`,
      count: sql3`COUNT(*)::int`
    }).from(expenses).where(
      and2(
        gte2(expenses.dateTime, new Date(input.from)),
        lte2(expenses.dateTime, new Date(input.to))
      )
    ).groupBy(sql3`to_char(${expenses.dateTime}, 'YYYY-MM-DD')`).orderBy(sql3`to_char(${expenses.dateTime}, 'YYYY-MM-DD')`);
    return rows;
  }),
  monthlyBreakdown: authedQuery.input(z5.object({ year: z5.number() })).query(async ({ input }) => {
    const db = getDb();
    const from = new Date(input.year, 0, 1);
    const to = new Date(input.year + 1, 0, 1);
    const rows = await db.select({
      month: sql3`EXTRACT(MONTH FROM ${expenses.dateTime})::int`,
      total: sql3`COALESCE(SUM(${expenses.total}), 0)::float`,
      count: sql3`COUNT(*)::int`
    }).from(expenses).where(
      and2(
        gte2(expenses.dateTime, from),
        lte2(expenses.dateTime, to)
      )
    ).groupBy(sql3`EXTRACT(MONTH FROM ${expenses.dateTime})`).orderBy(sql3`EXTRACT(MONTH FROM ${expenses.dateTime})`);
    return rows;
  }),
  yearlyBreakdown: authedQuery.query(async () => {
    const db = getDb();
    const rows = await db.select({
      year: sql3`EXTRACT(YEAR FROM ${expenses.dateTime})::int`,
      total: sql3`COALESCE(SUM(${expenses.total}), 0)::float`,
      count: sql3`COUNT(*)::int`
    }).from(expenses).groupBy(sql3`EXTRACT(YEAR FROM ${expenses.dateTime})`).orderBy(sql3`EXTRACT(YEAR FROM ${expenses.dateTime})`);
    return rows;
  }),
  categoryBreakdown: authedQuery.input(z5.object({ from: z5.string(), to: z5.string() })).query(async ({ input }) => {
    const db = getDb();
    const rows = await db.select({
      category: expenses.category,
      total: sql3`COALESCE(SUM(${expenses.total}), 0)::float`,
      count: sql3`COUNT(*)::int`
    }).from(expenses).where(
      and2(
        gte2(expenses.dateTime, new Date(input.from)),
        lte2(expenses.dateTime, new Date(input.to))
      )
    ).groupBy(expenses.category);
    return rows;
  })
});

// server/camping-router.ts
import { z as z6 } from "zod";
init_connection();
init_schema();
import { eq as eq5, desc as desc4, gte as gte3, lte as lte3, and as and3, sql as sql4 } from "drizzle-orm";
var campingRouter = createRouter({
  sales: {
    list: authedQuery.query(async () => {
      const db = getDb();
      return db.select().from(campingSales).orderBy(desc4(campingSales.dateTime));
    }),
    listByDateRange: authedQuery.input(z6.object({ from: z6.string(), to: z6.string() })).query(async ({ input }) => {
      const db = getDb();
      return db.select().from(campingSales).where(
        and3(
          gte3(campingSales.dateTime, new Date(input.from)),
          lte3(campingSales.dateTime, new Date(input.to))
        )
      ).orderBy(desc4(campingSales.dateTime));
    }),
    create: authedQuery.input(
      z6.object({
        customerName: z6.string().min(1),
        checkIn: z6.string(),
        checkOut: z6.string(),
        peopleCount: z6.number(),
        numberOfCamps: z6.number(),
        services: z6.array(z6.object({ name: z6.string(), price: z6.number() })),
        nights: z6.number(),
        spotTotal: z6.number(),
        servicesTotal: z6.number(),
        totalAmount: z6.number(),
        discountPercent: z6.number().optional().default(0),
        taxPercent: z6.number().optional().default(0),
        paymentMethod: z6.enum(["cash", "e_transaction"]),
        dateTime: z6.string(),
        note: z6.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [row] = await db.insert(campingSales).values({
        customerName: input.customerName,
        checkIn: new Date(input.checkIn),
        checkOut: new Date(input.checkOut),
        peopleCount: input.peopleCount,
        numberOfCamps: input.numberOfCamps,
        services: input.services,
        nights: input.nights,
        spotTotal: input.spotTotal.toString(),
        servicesTotal: input.servicesTotal.toString(),
        totalAmount: input.totalAmount.toString(),
        discountPercent: input.discountPercent?.toString() || "0",
        taxPercent: input.taxPercent?.toString() || "0",
        paymentMethod: input.paymentMethod,
        dateTime: new Date(input.dateTime),
        note: input.note || null,
        createdBy: ctx.user.id
      }).returning({ id: campingSales.id });
      return { id: row.id, success: true };
    }),
    delete: authedQuery.input(z6.object({ id: z6.number() })).mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(campingSales).where(eq5(campingSales.id, input.id));
      return { success: true };
    }),
    todaySummary: authedQuery.query(async () => {
      const db = getDb();
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      const rows = await db.select({
        total: sql4`COALESCE(SUM(${campingSales.totalAmount}), 0)::float`,
        count: sql4`COUNT(*)::int`
      }).from(campingSales).where(gte3(campingSales.dateTime, today));
      return rows[0];
    }),
    summaryByDateRange: authedQuery.input(z6.object({ from: z6.string(), to: z6.string() })).query(async ({ input }) => {
      const db = getDb();
      const rows = await db.select({
        total: sql4`COALESCE(SUM(${campingSales.totalAmount}), 0)::float`,
        count: sql4`COUNT(*)::int`
      }).from(campingSales).where(
        and3(
          gte3(campingSales.dateTime, new Date(input.from)),
          lte3(campingSales.dateTime, new Date(input.to))
        )
      );
      return rows[0];
    }),
    dailyBreakdown: authedQuery.input(z6.object({ from: z6.string(), to: z6.string() })).query(async ({ input }) => {
      const db = getDb();
      const rows = await db.select({
        date: sql4`to_char(${campingSales.dateTime}, 'YYYY-MM-DD')`,
        total: sql4`COALESCE(SUM(${campingSales.totalAmount}), 0)::float`,
        count: sql4`COUNT(*)::int`
      }).from(campingSales).where(
        and3(
          gte3(campingSales.dateTime, new Date(input.from)),
          lte3(campingSales.dateTime, new Date(input.to))
        )
      ).groupBy(sql4`to_char(${campingSales.dateTime}, 'YYYY-MM-DD')`).orderBy(sql4`to_char(${campingSales.dateTime}, 'YYYY-MM-DD')`);
      return rows;
    }),
    monthlyBreakdown: authedQuery.input(z6.object({ year: z6.number() })).query(async ({ input }) => {
      const db = getDb();
      const from = new Date(input.year, 0, 1);
      const to = new Date(input.year + 1, 0, 1);
      const rows = await db.select({
        month: sql4`EXTRACT(MONTH FROM ${campingSales.dateTime})::int`,
        total: sql4`COALESCE(SUM(${campingSales.totalAmount}), 0)::float`,
        count: sql4`COUNT(*)::int`
      }).from(campingSales).where(
        and3(
          gte3(campingSales.dateTime, from),
          lte3(campingSales.dateTime, to)
        )
      ).groupBy(sql4`EXTRACT(MONTH FROM ${campingSales.dateTime})`).orderBy(sql4`EXTRACT(MONTH FROM ${campingSales.dateTime})`);
      return rows;
    }),
    update: authedQuery.input(
      z6.object({
        id: z6.number(),
        customerName: z6.string(),
        checkIn: z6.string(),
        checkOut: z6.string(),
        peopleCount: z6.number(),
        numberOfCamps: z6.number(),
        services: z6.array(z6.object({ name: z6.string(), price: z6.number() })),
        nights: z6.number(),
        spotTotal: z6.number(),
        servicesTotal: z6.number(),
        totalAmount: z6.number(),
        discountPercent: z6.number().optional(),
        taxPercent: z6.number().optional(),
        paymentMethod: z6.enum(["cash", "e_transaction"]),
        dateTime: z6.string(),
        note: z6.string().optional()
      })
    ).mutation(async ({ input }) => {
      const db = getDb();
      await db.update(campingSales).set({
        customerName: input.customerName,
        checkIn: new Date(input.checkIn),
        checkOut: new Date(input.checkOut),
        peopleCount: input.peopleCount,
        numberOfCamps: input.numberOfCamps,
        services: input.services,
        nights: input.nights,
        spotTotal: input.spotTotal.toString(),
        servicesTotal: input.servicesTotal.toString(),
        totalAmount: input.totalAmount.toString(),
        discountPercent: input.discountPercent?.toString() || "0",
        taxPercent: input.taxPercent?.toString() || "0",
        paymentMethod: input.paymentMethod,
        dateTime: new Date(input.dateTime),
        note: input.note || null
      }).where(eq5(campingSales.id, input.id));
      return { success: true };
    }),
    yearlyBreakdown: authedQuery.query(async () => {
      const db = getDb();
      const rows = await db.select({
        year: sql4`EXTRACT(YEAR FROM ${campingSales.dateTime})::int`,
        total: sql4`COALESCE(SUM(${campingSales.totalAmount}), 0)::float`,
        count: sql4`COUNT(*)::int`
      }).from(campingSales).groupBy(sql4`EXTRACT(YEAR FROM ${campingSales.dateTime})`).orderBy(sql4`EXTRACT(YEAR FROM ${campingSales.dateTime})`);
      return rows;
    })
  }
});

// server/reports-router.ts
import { z as z7 } from "zod";
init_connection();
init_schema();
import { gte as gte4, lte as lte4, and as and4, desc as desc5, sql as sql5 } from "drizzle-orm";
var reportsRouter = createRouter({
  profitLoss: authedQuery.input(z7.object({ from: z7.string(), to: z7.string() })).query(async ({ input }) => {
    const db = getDb();
    const fromDate = new Date(input.from);
    const toDate = new Date(input.to);
    const [salesRows] = await db.select({
      total: sql5`COALESCE(SUM(${sales.totalAmount}), 0)::float`,
      count: sql5`COUNT(*)::int`
    }).from(sales).where(
      and4(
        gte4(sales.dateTime, fromDate),
        lte4(sales.dateTime, toDate)
      )
    );
    const [expenseRows] = await db.select({
      total: sql5`COALESCE(SUM(${expenses.total}), 0)::float`,
      count: sql5`COUNT(*)::int`
    }).from(expenses).where(
      and4(
        gte4(expenses.dateTime, fromDate),
        lte4(expenses.dateTime, toDate)
      )
    );
    const [campingRows] = await db.select({
      total: sql5`COALESCE(SUM(${campingSales.totalAmount}), 0)::float`,
      count: sql5`COUNT(*)::int`
    }).from(campingSales).where(
      and4(
        gte4(campingSales.dateTime, fromDate),
        lte4(campingSales.dateTime, toDate)
      )
    );
    const salesTotal = Number(salesRows?.total ?? 0);
    const expenseTotal = Number(expenseRows?.total ?? 0);
    const campingTotal = Number(campingRows?.total ?? 0);
    const totalIncome = salesTotal + campingTotal;
    const netProfit = totalIncome - expenseTotal;
    const profitMargin = totalIncome > 0 ? netProfit / totalIncome * 100 : 0;
    return {
      salesTotal,
      expenseTotal,
      campingTotal,
      totalIncome,
      netProfit,
      profitMargin,
      salesCount: Number(salesRows?.count ?? 0),
      expenseCount: Number(expenseRows?.count ?? 0),
      campingCount: Number(campingRows?.count ?? 0)
    };
  }),
  dailyProfitLoss: authedQuery.input(z7.object({ from: z7.string(), to: z7.string() })).query(async ({ input }) => {
    const db = getDb();
    const fromDate = new Date(input.from);
    const toDate = new Date(input.to);
    const salesRows = await db.select({
      date: sql5`to_char(${sales.dateTime}, 'YYYY-MM-DD')`,
      total: sql5`COALESCE(SUM(${sales.totalAmount}), 0)::float`
    }).from(sales).where(
      and4(
        gte4(sales.dateTime, fromDate),
        lte4(sales.dateTime, toDate)
      )
    ).groupBy(sql5`to_char(${sales.dateTime}, 'YYYY-MM-DD')`).orderBy(sql5`to_char(${sales.dateTime}, 'YYYY-MM-DD')`);
    const expenseRows = await db.select({
      date: sql5`to_char(${expenses.dateTime}, 'YYYY-MM-DD')`,
      total: sql5`COALESCE(SUM(${expenses.total}), 0)::float`
    }).from(expenses).where(
      and4(
        gte4(expenses.dateTime, fromDate),
        lte4(expenses.dateTime, toDate)
      )
    ).groupBy(sql5`to_char(${expenses.dateTime}, 'YYYY-MM-DD')`).orderBy(sql5`to_char(${expenses.dateTime}, 'YYYY-MM-DD')`);
    const campingRows = await db.select({
      date: sql5`to_char(${campingSales.dateTime}, 'YYYY-MM-DD')`,
      total: sql5`COALESCE(SUM(${campingSales.totalAmount}), 0)::float`
    }).from(campingSales).where(
      and4(
        gte4(campingSales.dateTime, fromDate),
        lte4(campingSales.dateTime, toDate)
      )
    ).groupBy(sql5`to_char(${campingSales.dateTime}, 'YYYY-MM-DD')`).orderBy(sql5`to_char(${campingSales.dateTime}, 'YYYY-MM-DD')`);
    const dateMap = /* @__PURE__ */ new Map();
    for (const row of salesRows) {
      const d = dateMap.get(row.date) || {
        date: row.date,
        sales: 0,
        expenses: 0,
        camping: 0,
        profit: 0
      };
      d.sales = Number(row.total);
      dateMap.set(row.date, d);
    }
    for (const row of expenseRows) {
      const d = dateMap.get(row.date) || {
        date: row.date,
        sales: 0,
        expenses: 0,
        camping: 0,
        profit: 0
      };
      d.expenses = Number(row.total);
      dateMap.set(row.date, d);
    }
    for (const row of campingRows) {
      const d = dateMap.get(row.date) || {
        date: row.date,
        sales: 0,
        expenses: 0,
        camping: 0,
        profit: 0
      };
      d.camping = Number(row.total);
      dateMap.set(row.date, d);
    }
    for (const d of dateMap.values()) {
      d.profit = d.sales + d.camping - d.expenses;
    }
    return Array.from(dateMap.values()).sort(
      (a, b) => a.date.localeCompare(b.date)
    );
  }),
  monthlyProfitLoss: authedQuery.input(z7.object({ year: z7.number() })).query(async ({ input }) => {
    const db = getDb();
    const fromDate = new Date(input.year, 0, 1);
    const toDate = new Date(input.year + 1, 0, 1);
    const salesRows = await db.select({
      month: sql5`EXTRACT(MONTH FROM ${sales.dateTime})::int`,
      total: sql5`COALESCE(SUM(${sales.totalAmount}), 0)::float`
    }).from(sales).where(
      and4(
        gte4(sales.dateTime, fromDate),
        lte4(sales.dateTime, toDate)
      )
    ).groupBy(sql5`EXTRACT(MONTH FROM ${sales.dateTime})`).orderBy(sql5`EXTRACT(MONTH FROM ${sales.dateTime})`);
    const expenseRows = await db.select({
      month: sql5`EXTRACT(MONTH FROM ${expenses.dateTime})::int`,
      total: sql5`COALESCE(SUM(${expenses.total}), 0)::float`
    }).from(expenses).where(
      and4(
        gte4(expenses.dateTime, fromDate),
        lte4(expenses.dateTime, toDate)
      )
    ).groupBy(sql5`EXTRACT(MONTH FROM ${expenses.dateTime})`).orderBy(sql5`EXTRACT(MONTH FROM ${expenses.dateTime})`);
    const campingRows = await db.select({
      month: sql5`EXTRACT(MONTH FROM ${campingSales.dateTime})::int`,
      total: sql5`COALESCE(SUM(${campingSales.totalAmount}), 0)::float`
    }).from(campingSales).where(
      and4(
        gte4(campingSales.dateTime, fromDate),
        lte4(campingSales.dateTime, toDate)
      )
    ).groupBy(sql5`EXTRACT(MONTH FROM ${campingSales.dateTime})`).orderBy(sql5`EXTRACT(MONTH FROM ${campingSales.dateTime})`);
    const monthMap = /* @__PURE__ */ new Map();
    for (let i = 1; i <= 12; i++) {
      monthMap.set(i, {
        month: i,
        sales: 0,
        expenses: 0,
        camping: 0,
        profit: 0
      });
    }
    for (const row of salesRows) {
      const m = monthMap.get(Number(row.month));
      if (m) m.sales = Number(row.total);
    }
    for (const row of expenseRows) {
      const m = monthMap.get(Number(row.month));
      if (m) m.expenses = Number(row.total);
    }
    for (const row of campingRows) {
      const m = monthMap.get(Number(row.month));
      if (m) m.camping = Number(row.total);
    }
    for (const m of monthMap.values()) {
      m.profit = m.sales + m.camping - m.expenses;
    }
    return Array.from(monthMap.values());
  }),
  yearlyProfitLoss: authedQuery.query(async () => {
    const db = getDb();
    const salesRows = await db.select({
      year: sql5`EXTRACT(YEAR FROM ${sales.dateTime})::int`,
      total: sql5`COALESCE(SUM(${sales.totalAmount}), 0)::float`
    }).from(sales).groupBy(sql5`EXTRACT(YEAR FROM ${sales.dateTime})`).orderBy(sql5`EXTRACT(YEAR FROM ${sales.dateTime})`);
    const expenseRows = await db.select({
      year: sql5`EXTRACT(YEAR FROM ${expenses.dateTime})::int`,
      total: sql5`COALESCE(SUM(${expenses.total}), 0)::float`
    }).from(expenses).groupBy(sql5`EXTRACT(YEAR FROM ${expenses.dateTime})`).orderBy(sql5`EXTRACT(YEAR FROM ${expenses.dateTime})`);
    const campingRows = await db.select({
      year: sql5`EXTRACT(YEAR FROM ${campingSales.dateTime})::int`,
      total: sql5`COALESCE(SUM(${campingSales.totalAmount}), 0)::float`
    }).from(campingSales).groupBy(sql5`EXTRACT(YEAR FROM ${campingSales.dateTime})`).orderBy(sql5`EXTRACT(YEAR FROM ${campingSales.dateTime})`);
    const yearMap = /* @__PURE__ */ new Map();
    for (const row of salesRows) {
      const y = yearMap.get(Number(row.year)) || {
        year: Number(row.year),
        sales: 0,
        expenses: 0,
        camping: 0,
        profit: 0
      };
      y.sales = Number(row.total);
      yearMap.set(Number(row.year), y);
    }
    for (const row of expenseRows) {
      const y = yearMap.get(Number(row.year)) || {
        year: Number(row.year),
        sales: 0,
        expenses: 0,
        camping: 0,
        profit: 0
      };
      y.expenses = Number(row.total);
      yearMap.set(Number(row.year), y);
    }
    for (const row of campingRows) {
      const y = yearMap.get(Number(row.year)) || {
        year: Number(row.year),
        sales: 0,
        expenses: 0,
        camping: 0,
        profit: 0
      };
      y.camping = Number(row.total);
      yearMap.set(Number(row.year), y);
    }
    for (const y of yearMap.values()) {
      y.profit = y.sales + y.camping - y.expenses;
    }
    return Array.from(yearMap.values()).sort((a, b) => a.year - b.year);
  }),
  yearByYearComparison: authedQuery.input(z7.object({ year1: z7.number(), year2: z7.number() })).query(async ({ input }) => {
    const db = getDb();
    const getYearData = async (year) => {
      const fromDate = new Date(year, 0, 1);
      const toDate = new Date(year + 1, 0, 1);
      const [salesResult] = await db.select({
        total: sql5`COALESCE(SUM(${sales.totalAmount}), 0)::float`
      }).from(sales).where(
        and4(
          gte4(sales.dateTime, fromDate),
          lte4(sales.dateTime, toDate)
        )
      );
      const [expenseResult] = await db.select({
        total: sql5`COALESCE(SUM(${expenses.total}), 0)::float`
      }).from(expenses).where(
        and4(
          gte4(expenses.dateTime, fromDate),
          lte4(expenses.dateTime, toDate)
        )
      );
      const [campingResult] = await db.select({
        total: sql5`COALESCE(SUM(${campingSales.totalAmount}), 0)::float`
      }).from(campingSales).where(
        and4(
          gte4(campingSales.dateTime, fromDate),
          lte4(campingSales.dateTime, toDate)
        )
      );
      const sales2 = Number(salesResult?.total ?? 0);
      const expenses2 = Number(expenseResult?.total ?? 0);
      const camping = Number(campingResult?.total ?? 0);
      const income = sales2 + camping;
      const profit = income - expenses2;
      const margin = income > 0 ? profit / income * 100 : 0;
      return { year, sales: sales2, expenses: expenses2, camping, income, profit, margin };
    };
    const year1Data = await getYearData(input.year1);
    const year2Data = await getYearData(input.year2);
    return {
      year1: year1Data,
      year2: year2Data,
      comparison: {
        salesChange: year1Data.sales > 0 ? (year2Data.sales - year1Data.sales) / year1Data.sales * 100 : 0,
        expensesChange: year1Data.expenses > 0 ? (year2Data.expenses - year1Data.expenses) / year1Data.expenses * 100 : 0,
        incomeChange: year1Data.income > 0 ? (year2Data.income - year1Data.income) / year1Data.income * 100 : 0,
        profitChange: year1Data.profit !== 0 ? (year2Data.profit - year1Data.profit) / Math.abs(year1Data.profit) * 100 : 0
      }
    };
  }),
  dashboardSummary: authedQuery.query(async () => {
    const db = getDb();
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const [todaySales] = await db.select({
      total: sql5`COALESCE(SUM(${sales.totalAmount}), 0)::float`
    }).from(sales).where(gte4(sales.dateTime, today));
    const [weekSales] = await db.select({
      total: sql5`COALESCE(SUM(${sales.totalAmount}), 0)::float`
    }).from(sales).where(gte4(sales.dateTime, startOfWeek));
    const [monthSales] = await db.select({
      total: sql5`COALESCE(SUM(${sales.totalAmount}), 0)::float`
    }).from(sales).where(gte4(sales.dateTime, startOfMonth));
    const [todayExpenses] = await db.select({
      total: sql5`COALESCE(SUM(${expenses.total}), 0)::float`
    }).from(expenses).where(gte4(expenses.dateTime, today));
    const [weekExpenses] = await db.select({
      total: sql5`COALESCE(SUM(${expenses.total}), 0)::float`
    }).from(expenses).where(gte4(expenses.dateTime, startOfWeek));
    const [monthExpenses] = await db.select({
      total: sql5`COALESCE(SUM(${expenses.total}), 0)::float`
    }).from(expenses).where(gte4(expenses.dateTime, startOfMonth));
    const [todayCamping] = await db.select({
      total: sql5`COALESCE(SUM(${campingSales.totalAmount}), 0)::float`
    }).from(campingSales).where(gte4(campingSales.dateTime, today));
    const [weekCamping] = await db.select({
      total: sql5`COALESCE(SUM(${campingSales.totalAmount}), 0)::float`
    }).from(campingSales).where(gte4(campingSales.dateTime, startOfWeek));
    const [monthCamping] = await db.select({
      total: sql5`COALESCE(SUM(${campingSales.totalAmount}), 0)::float`
    }).from(campingSales).where(gte4(campingSales.dateTime, startOfMonth));
    return {
      today: {
        sales: Number(todaySales?.total ?? 0),
        expenses: Number(todayExpenses?.total ?? 0),
        camping: Number(todayCamping?.total ?? 0),
        profit: Number(todaySales?.total ?? 0) + Number(todayCamping?.total ?? 0) - Number(todayExpenses?.total ?? 0)
      },
      week: {
        sales: Number(weekSales?.total ?? 0),
        expenses: Number(weekExpenses?.total ?? 0),
        camping: Number(weekCamping?.total ?? 0),
        profit: Number(weekSales?.total ?? 0) + Number(weekCamping?.total ?? 0) - Number(weekExpenses?.total ?? 0)
      },
      month: {
        sales: Number(monthSales?.total ?? 0),
        expenses: Number(monthExpenses?.total ?? 0),
        camping: Number(monthCamping?.total ?? 0),
        profit: Number(monthSales?.total ?? 0) + Number(monthCamping?.total ?? 0) - Number(monthExpenses?.total ?? 0)
      }
    };
  }),
  recentActivity: authedQuery.query(async () => {
    const db = getDb();
    const recentSales = await db.select().from(sales).orderBy(desc5(sales.createdAt)).limit(5);
    const recentExpenses = await db.select().from(expenses).orderBy(desc5(expenses.createdAt)).limit(5);
    const recentCamping = await db.select().from(campingSales).orderBy(desc5(campingSales.createdAt)).limit(5);
    return {
      sales: recentSales,
      expenses: recentExpenses,
      camping: recentCamping
    };
  })
});

// server/data-router.ts
init_connection();
init_schema();
import { sql as sql6 } from "drizzle-orm";
var TABLES = [
  { name: "users", table: users, dateFields: ["createdAt", "updatedAt", "lastSignInAt"] },
  { name: "menu_items", table: menuItems, dateFields: ["createdAt", "updatedAt"] },
  { name: "sales", table: sales, dateFields: ["dateTime", "createdAt"] },
  { name: "expenses", table: expenses, dateFields: ["dateTime", "createdAt"] },
  {
    name: "camping_sales",
    table: campingSales,
    dateFields: ["checkIn", "checkOut", "dateTime", "createdAt"]
  }
];
function reviveDates(row, dateFields) {
  const out = { ...row };
  for (const field of dateFields) {
    if (out[field] != null && typeof out[field] === "string") {
      out[field] = new Date(out[field]);
    }
  }
  return out;
}
var dataRouter = createRouter({
  // Backup: export all application data as JSON
  backup: adminQuery.mutation(async () => {
    try {
      const db = getDb();
      const backupData = {
        exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
        version: "2.0",
        dialect: "postgresql",
        tables: {}
      };
      for (const { name, table } of TABLES) {
        backupData.tables[name] = await db.select().from(table);
      }
      return {
        success: true,
        backupData: JSON.stringify(backupData, null, 2)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }),
  // Restore: replace all application data from a backup file
  restore: adminQuery.input((val) => val).mutation(async ({ input }) => {
    try {
      const parsed2 = typeof input.backupData === "string" ? JSON.parse(input.backupData) : input.backupData;
      if (!parsed2?.tables) {
        return { success: false, error: "Invalid backup file" };
      }
      const db = getDb();
      for (const { table } of [...TABLES].reverse()) {
        await db.delete(table);
      }
      for (const { name, table, dateFields } of TABLES) {
        const rows = parsed2.tables[name] ?? [];
        if (rows.length === 0) continue;
        const revived = rows.map((r) => reviveDates(r, dateFields));
        await db.insert(table).values(revived);
      }
      for (const { name } of TABLES) {
        await db.execute(
          sql6`SELECT setval(
                  pg_get_serial_sequence(${name}, 'id'),
                  GREATEST((SELECT COALESCE(MAX(id), 0) FROM ${sql6.identifier(name)}), 1)
                )`
        );
      }
      return {
        success: true,
        message: "Database restored successfully"
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }),
  // Get backup size info
  backupInfo: adminQuery.query(async () => {
    try {
      const db = getDb();
      let totalRows = 0;
      for (const { table } of TABLES) {
        const [row] = await db.select({ count: sql6`COUNT(*)::int` }).from(table);
        totalRows += Number(row?.count ?? 0);
      }
      const sizeResult = await db.execute(
        sql6`SELECT pg_size_pretty(pg_database_size(current_database())) AS size`
      );
      const sizeRows = Array.isArray(sizeResult) ? sizeResult : sizeResult.rows;
      const totalSize = sizeRows?.[0]?.size ?? "Unknown";
      return {
        success: true,
        tableCount: TABLES.length,
        totalRows,
        totalSize
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  })
});

// server/cloudinary-router.ts
import { createHash } from "node:crypto";
import { z as z8 } from "zod";
import { TRPCError as TRPCError3 } from "@trpc/server";
init_env();
var cloudinaryRouter = createRouter({
  signUpload: authedQuery.input(
    z8.object({
      folder: z8.string().default("native-resort/expense-receipts")
    })
  ).mutation(({ input }) => {
    if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
      throw new TRPCError3({
        code: "PRECONDITION_FAILED",
        message: "Image uploads are not configured"
      });
    }
    const timestamp2 = Math.floor(Date.now() / 1e3);
    const toSign = `folder=${input.folder}&timestamp=${timestamp2}`;
    const signature = createHash("sha1").update(toSign + env.cloudinaryApiSecret).digest("hex");
    return {
      cloudName: env.cloudinaryCloudName,
      apiKey: env.cloudinaryApiKey,
      timestamp: timestamp2,
      folder: input.folder,
      signature
    };
  })
});

// server/router.ts
var appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  menu: menuRouter,
  sales: salesRouter,
  expenses: expensesRouter,
  camping: campingRouter,
  reports: reportsRouter,
  data: dataRouter,
  cloudinary: cloudinaryRouter
});

// server/lib/jwt-auth.ts
init_connection();
async function authenticateRequest(headers) {
  const token = getTokenFromHeaders(headers);
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) return null;
  const user = await withDbRetry(() => findUserById(decoded.userId));
  return user || null;
}

// server/context.ts
async function createContext(opts) {
  const ctx = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    ctx.user = await authenticateRequest(opts.req.headers) ?? void 0;
  } catch {
  }
  return ctx;
}

// server/app.ts
init_env();
var app = new Hono();
app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.get("/health", (c) => c.json({ status: "ok" }));
app.get("/api/health", (c) => c.json({ status: "ok" }));
app.get("/api/dbcheck", async (c) => {
  let host = "unknown";
  try {
    host = new URL(env.databaseUrl).host;
  } catch {
  }
  const { getDb: getDb2 } = await Promise.resolve().then(() => (init_connection(), connection_exports));
  const { sql: sql7 } = await import("drizzle-orm");
  const schema = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const { eq: eq6 } = await import("drizzle-orm");
  const bcrypt2 = (await import("bcryptjs")).default;
  const steps = [];
  const run = async (label, fn) => {
    const t2 = Date.now();
    try {
      const r = await Promise.race([
        fn(),
        new Promise(
          (_, rej) => setTimeout(() => rej(new Error("step exceeded 6s")), 6e3)
        )
      ]);
      steps.push({
        label,
        ok: true,
        ms: Date.now() - t2,
        sample: JSON.stringify(r).slice(0, 100)
      });
    } catch (err) {
      steps.push({
        label,
        ok: false,
        ms: Date.now() - t2,
        err: err instanceof Error ? `${err.name}: ${err.message}` : String(err)
      });
    }
  };
  const db = getDb2();
  await run("raw: select 1", () => db.execute(sql7`select 1 as ok`));
  await run("raw: select now()", () => db.execute(sql7`select now()`));
  await run(
    "raw: count users",
    () => db.execute(sql7`select count(*)::int as n from users`)
  );
  await run(
    "raw: users by email ($1)",
    () => db.execute(
      sql7`select id, email from users where email = ${"owner@nativeresort.com"} limit 1`
    )
  );
  await run(
    "drizzle: select users by email",
    () => db.select().from(schema.users).where(eq6(schema.users.email, "owner@nativeresort.com")).limit(1)
  );
  await run(
    "bcrypt.compare",
    () => bcrypt2.compare("whatever", "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy")
  );
  return c.json({ host, steps });
});
app.use(
  "/api/trpc/*",
  (c) => fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext
  })
);
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));
var app_default = app;

// server/vercel-entry.ts
var config = {
  runtime: "nodejs",
  maxDuration: 30
};
var listener = getRequestListener(app_default.fetch);
function handler(req, res) {
  return listener(req, res);
}
export {
  config,
  handler as default
};
