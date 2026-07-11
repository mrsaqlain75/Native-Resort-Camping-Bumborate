// db/schema.ts
import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  decimal,
  int,
  json,
  bigint,
  date,
} from "drizzle-orm/mysql-core";

// ========== USERS TABLE (Modified for email/password auth) ==========
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin", "manager"]).default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignInAt: timestamp("last_sign_in_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ========== MENU ITEMS TABLE ==========
export const menuItems = mysqlTable("menu_items", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  stockCount: int("stock_count").default(0),
  active: mysqlEnum("active", ["yes", "no"]).default("yes").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = typeof menuItems.$inferInsert;

// ========== SALES TABLE ==========
export const sales = mysqlTable("sales", {
  id: serial("id").primaryKey(),
  customerName: varchar("customer_name", { length: 255 }).default("Walk-in Customer"),
  items: json("items").$type<{ name: string; quantity: number; unitPrice: number; total: number }[]>().notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0"),
  taxPercent: decimal("tax_percent", { precision: 5, scale: 2 }).default("0"),
  paymentMethod: mysqlEnum("payment_method", ["cash", "e_transaction"]).notNull(),
  source: mysqlEnum("source", ["dine_in", "online_order", "other"]).notNull(),
  dateTime: timestamp("date_time").notNull(),
  note: text("note"),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;

// ========== EXPENSES TABLE ==========
export const expenses = mysqlTable("expenses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  quantity: int("quantity").default(0), // Changed from varchar to int
  category: mysqlEnum("category", ["food", "supplies", "utilities", "staff", "maintenance", "rent", "other"]).notNull(),
  paymentMethod: mysqlEnum("payment_method", ["cash", "e_transaction", "bank_transfer"]).notNull(),
  paidTo: varchar("paid_to", { length: 255 }),
  receiptUrl: text("receipt_url"),
  dateTime: timestamp("date_time").notNull(),
  note: text("note"),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

// Update campingSales table
export const campingSales = mysqlTable("camping_sales", {
  id: serial("id").primaryKey(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  numberOfCamps: int("number_of_camps").notNull().default(1),
  checkIn: date("check_in").notNull(),
  checkOut: date("check_out").notNull(),
  peopleCount: int("people_count").notNull(),
  services: json("services").$type<{ name: string; price: number }[]>().notNull(),
  nights: int("nights").notNull(),
  spotTotal: decimal("spot_total", { precision: 12, scale: 2 }).notNull(),
  servicesTotal: decimal("services_total", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0"),
  taxPercent: decimal("tax_percent", { precision: 5, scale: 2 }).default("0"),
  paymentMethod: mysqlEnum("payment_method", ["cash", "e_transaction"]).notNull(),
  dateTime: timestamp("date_time").notNull(),
  note: text("note"),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CampingSale = typeof campingSales.$inferSelect;
export type InsertCampingSale = typeof campingSales.$inferInsert;