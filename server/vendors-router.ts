import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as schema from "../db/schema";
import { asc, eq } from "drizzle-orm";

export const vendorsRouter = createRouter({
  list: authedQuery.query(async () => {
    const db = getDb();
    return db.select().from(schema.vendors).orderBy(asc(schema.vendors.name));
  }),

  create: authedQuery
    .input(
      z.object({
        name: z.string().trim().min(1).max(255),
        phone: z.string().trim().max(32).optional(),
        note: z.string().trim().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      // Unique name — an existing vendor is a no-op, not an error, so repeated
      // submissions never disturb previously recorded data.
      const inserted = await db
        .insert(schema.vendors)
        .values({
          name: input.name,
          phone: input.phone || null,
          note: input.note || null,
        })
        .onConflictDoNothing({ target: schema.vendors.name })
        .returning({ id: schema.vendors.id });
      return { id: inserted[0]?.id ?? null, success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(schema.vendors).where(eq(schema.vendors.id, input.id));
      return { success: true };
    }),
});
