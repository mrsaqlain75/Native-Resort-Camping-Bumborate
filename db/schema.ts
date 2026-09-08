// db/schema.ts
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
  date,
} from "drizzle-orm/pg-core";

// ========== ENUM TYPES ==========
// Postgres enum types live in a single global namespace, so each distinct
// value-set needs its own name (unlike MySQL inline enums).
export const userRoleEnum = pgEnum("user_role", ["user", "admin", "manager"]);
export const activeEnum = pgEnum("active_flag", ["yes", "no"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "e_transaction"]);
export const expensePaymentMethodEnum = pgEnum("expense_payment_method", [
  "cash",
  "e_transaction",
  "bank_transfer",
]);
export const salesSourceEnum = pgEnum("sales_source", ["dine_in", "online_order", "other"]);
export const expenseCategoryEnum = pgEnum("expense_category", [
  "food",
  "supplies",
  "utilities",
  "staff",
  "maintenance",
  "rent",
  "other",
]);

// ========== USERS TABLE (email/password auth) ==========
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  avatar: text("avatar"),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("last_sign_in_at", { mode: "date" }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ========== MENU ITEMS TABLE ==========
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  stockCount: integer("stock_count").default(0),
  active: activeEnum("active").default("yes").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = typeof menuItems.$inferInsert;

// ========== SALES TABLE ==========
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  customerName: varchar("customer_name", { length: 255 }).default("Walk-in Customer"),
  items: jsonb("items")
    .$type<{ name: string; quantity: number; unitPrice: number; total: number }[]>()
    .notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).default("0"),
  taxPercent: numeric("tax_percent", { precision: 5, scale: 2 }).default("0"),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  source: salesSourceEnum("source").notNull(),
  dateTime: timestamp("date_time", { mode: "date" }).notNull(),
  note: text("note"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;

// ========== EXPENSES TABLE ==========
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(), // Unit price
  quantity: integer("quantity").default(0), // Quantity
  total: numeric("total", { precision: 12, scale: 2 }).default("0"), // Total = amount × quantity
  category: expenseCategoryEnum("category").notNull(),
  paymentMethod: expensePaymentMethodEnum("payment_method").notNull(),
  paidTo: varchar("paid_to", { length: 255 }),
  receiptUrl: text("receipt_url"),
  dateTime: timestamp("date_time", { mode: "date" }).notNull(),
  note: text("note"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

// ========== CAMPING SALES TABLE ==========
export const campingSales = pgTable("camping_sales", {
  id: serial("id").primaryKey(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  numberOfCamps: integer("number_of_camps").notNull().default(1),
  checkIn: date("check_in", { mode: "date" }).notNull(),
  checkOut: date("check_out", { mode: "date" }).notNull(),
  peopleCount: integer("people_count").notNull(),
  services: jsonb("services").$type<{ name: string; price: number }[]>().notNull(),
  nights: integer("nights").notNull(),
  spotTotal: numeric("spot_total", { precision: 12, scale: 2 }).notNull(),
  servicesTotal: numeric("services_total", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).default("0"),
  taxPercent: numeric("tax_percent", { precision: 5, scale: 2 }).default("0"),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  dateTime: timestamp("date_time", { mode: "date" }).notNull(),
  note: text("note"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export type CampingSale = typeof campingSales.$inferSelect;
export type InsertCampingSale = typeof campingSales.$inferInsert;
