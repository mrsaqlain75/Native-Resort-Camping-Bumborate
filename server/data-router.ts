import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as schema from "../db/schema";
import { sql } from "drizzle-orm";

// Tables managed by this app, in a foreign-key-safe insert order
// (children after parents). Delete happens in reverse.
const TABLES = [
  { name: "users", table: schema.users, dateFields: ["createdAt", "updatedAt", "lastSignInAt"] },
  { name: "menu_items", table: schema.menuItems, dateFields: ["createdAt", "updatedAt"] },
  { name: "sales", table: schema.sales, dateFields: ["dateTime", "createdAt"] },
  { name: "expenses", table: schema.expenses, dateFields: ["dateTime", "createdAt"] },
  {
    name: "camping_sales",
    table: schema.campingSales,
    dateFields: ["checkIn", "checkOut", "dateTime", "createdAt"],
  },
] as const;

function reviveDates(row: Record<string, unknown>, dateFields: readonly string[]) {
  const out: Record<string, unknown> = { ...row };
  for (const field of dateFields) {
    if (out[field] != null && typeof out[field] === "string") {
      out[field] = new Date(out[field] as string);
    }
  }
  return out;
}

export const dataRouter = createRouter({
  // Backup: export all application data as JSON
  backup: adminQuery.mutation(async () => {
    try {
      const db = getDb();
      const backupData: {
        exportedAt: string;
        version: string;
        dialect: string;
        tables: Record<string, unknown[]>;
      } = {
        exportedAt: new Date().toISOString(),
        version: "2.0",
        dialect: "postgresql",
        tables: {},
      };

      for (const { name, table } of TABLES) {
        backupData.tables[name] = await db.select().from(table);
      }

      return {
        success: true as const,
        backupData: JSON.stringify(backupData, null, 2),
      };
    } catch (error) {
      return {
        success: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }),

  // Restore: replace all application data from a backup file
  restore: adminQuery
    .input((val: unknown) => val as { backupData: string | object })
    .mutation(async ({ input }) => {
      try {
        const parsed =
          typeof input.backupData === "string"
            ? JSON.parse(input.backupData)
            : input.backupData;

        if (!parsed?.tables) {
          return { success: false as const, error: "Invalid backup file" };
        }

        const db = getDb();

        // neon-http has no interactive transactions; run sequentially. This
        // is an admin-only, destructive restore (truncate then load).
        // Delete children first
        for (const { table } of [...TABLES].reverse()) {
          await db.delete(table);
        }

        // Insert parents first
        for (const { name, table, dateFields } of TABLES) {
          const rows: Record<string, unknown>[] = parsed.tables[name] ?? [];
          if (rows.length === 0) continue;
          const revived = rows.map((r) => reviveDates(r, dateFields));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await db.insert(table).values(revived as any);
        }

        // Re-sync serial sequences to the max id in each table
        for (const { name } of TABLES) {
          await db.execute(
            sql`SELECT setval(
                  pg_get_serial_sequence(${name}, 'id'),
                  GREATEST((SELECT COALESCE(MAX(id), 0) FROM ${sql.identifier(name)}), 1)
                )`
          );
        }

        return {
          success: true as const,
          message: "Database restored successfully",
        };
      } catch (error) {
        return {
          success: false as const,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }),

  // Get backup size info
  backupInfo: adminQuery.query(async () => {
    try {
      const db = getDb();
      let totalRows = 0;

      for (const { table } of TABLES) {
        const [row] = await db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(table);
        totalRows += Number(row?.count ?? 0);
      }

      const sizeResult = await db.execute<{ size: string }>(
        sql`SELECT pg_size_pretty(pg_database_size(current_database())) AS size`
      );
      const sizeRows = (
        Array.isArray(sizeResult)
          ? sizeResult
          : (sizeResult as { rows?: { size: string }[] }).rows
      ) as { size: string }[] | undefined;
      const totalSize = sizeRows?.[0]?.size ?? "Unknown";

      return {
        success: true as const,
        tableCount: TABLES.length,
        totalRows,
        totalSize,
      };
    } catch (error) {
      return {
        success: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }),
});
