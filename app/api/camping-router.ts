import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import * as schema from "@db/schema";
import { eq, desc, gte, lte, and, sql } from "drizzle-orm";

export const campingRouter = createRouter({
  spots: {
    list: authedQuery.query(async () => {
      const db = getDb();
      return db.select().from(schema.campingSpots).where(eq(schema.campingSpots.active, "yes")).orderBy(desc(schema.campingSpots.createdAt));
    }),

    listAll: authedQuery.query(async () => {
      const db = getDb();
      return db.select().from(schema.campingSpots).orderBy(desc(schema.campingSpots.createdAt));
    }),

    create: authedQuery
      .input(
        z.object({
          name: z.string().min(1),
          capacity: z.number(),
          pricePerNight: z.number(),
          amenities: z.array(z.string()),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = getDb();
        await db.insert(schema.campingSpots).values({
          name: input.name,
          capacity: input.capacity,
          pricePerNight: input.pricePerNight.toFixed(2),
          amenities: input.amenities,
          description: input.description || null,
        });
        return { success: true };
      }),

    update: authedQuery
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1),
          capacity: z.number(),
          pricePerNight: z.number(),
          amenities: z.array(z.string()),
          description: z.string().optional(),
          active: z.enum(["yes", "no"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = getDb();
        await db
          .update(schema.campingSpots)
          .set({
            name: input.name,
            capacity: input.capacity,
            pricePerNight: input.pricePerNight.toFixed(2),
            amenities: input.amenities,
            description: input.description || null,
            ...(input.active && { active: input.active }),
          })
          .where(eq(schema.campingSpots.id, input.id));
        return { success: true };
      }),

    delete: authedQuery
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        await db.update(schema.campingSpots).set({ active: "no" }).where(eq(schema.campingSpots.id, input.id));
        return { success: true };
      }),
  },

  sales: {
    list: authedQuery.query(async () => {
      const db = getDb();
      return db.select().from(schema.campingSales).orderBy(desc(schema.campingSales.dateTime));
    }),

    listByDateRange: authedQuery
      .input(z.object({ from: z.string(), to: z.string() }))
      .query(async ({ input }) => {
        const db = getDb();
        return db
          .select()
          .from(schema.campingSales)
          .where(
            and(
              gte(schema.campingSales.dateTime, new Date(input.from)),
              lte(schema.campingSales.dateTime, new Date(input.to))
            )
          )
          .orderBy(desc(schema.campingSales.dateTime));
      }),

    create: authedQuery
      .input(
        z.object({
          spotId: z.number(),
          customerName: z.string().min(1),
          checkIn: z.string(),
          checkOut: z.string(),
          peopleCount: z.number(),
          services: z.array(z.object({ name: z.string(), price: z.number() })),
          nights: z.number(),
          spotTotal: z.number(),
          servicesTotal: z.number(),
          totalAmount: z.number(),
          paymentMethod: z.enum(["cash", "e_transaction"]),
          dateTime: z.string(),
          note: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = getDb();
        await db.insert(schema.campingSales).values({
          spotId: input.spotId,
          customerName: input.customerName,
          checkIn: new Date(input.checkIn),
          checkOut: new Date(input.checkOut),
          peopleCount: input.peopleCount,
          services: input.services,
          nights: input.nights,
          spotTotal: input.spotTotal.toFixed(2),
          servicesTotal: input.servicesTotal.toFixed(2),
          totalAmount: input.totalAmount.toFixed(2),
          paymentMethod: input.paymentMethod,
          dateTime: new Date(input.dateTime),
          note: input.note || null,
          createdBy: ctx.user.id,
        });
        return { success: true };
      }),

    delete: authedQuery
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        await db.delete(schema.campingSales).where(eq(schema.campingSales.id, input.id));
        return { success: true };
      }),

    todaySummary: authedQuery.query(async () => {
      const db = getDb();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const rows = await db
        .select({
          total: sql<number>`COALESCE(SUM(${schema.campingSales.totalAmount}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(schema.campingSales)
        .where(gte(schema.campingSales.dateTime, today));
      return rows[0];
    }),

    summaryByDateRange: authedQuery
      .input(z.object({ from: z.string(), to: z.string() }))
      .query(async ({ input }) => {
        const db = getDb();
        const rows = await db
          .select({
            total: sql<number>`COALESCE(SUM(${schema.campingSales.totalAmount}), 0)`,
            count: sql<number>`COUNT(*)`,
          })
          .from(schema.campingSales)
          .where(
            and(
              gte(schema.campingSales.dateTime, new Date(input.from)),
              lte(schema.campingSales.dateTime, new Date(input.to))
            )
          );
        return rows[0];
      }),

    dailyBreakdown: authedQuery
      .input(z.object({ from: z.string(), to: z.string() }))
      .query(async ({ input }) => {
        const db = getDb();
        const rows = await db
          .select({
            date: sql<string>`DATE(${schema.campingSales.dateTime})`,
            total: sql<number>`COALESCE(SUM(${schema.campingSales.totalAmount}), 0)`,
            count: sql<number>`COUNT(*)`,
          })
          .from(schema.campingSales)
          .where(
            and(
              gte(schema.campingSales.dateTime, new Date(input.from)),
              lte(schema.campingSales.dateTime, new Date(input.to))
            )
          )
          .groupBy(sql`DATE(${schema.campingSales.dateTime})`)
          .orderBy(sql`DATE(${schema.campingSales.dateTime})`);
        return rows;
      }),

    monthlyBreakdown: authedQuery
      .input(z.object({ year: z.number() }))
      .query(async ({ input }) => {
        const db = getDb();
        const from = new Date(input.year, 0, 1);
        const to = new Date(input.year + 1, 0, 1);
        const rows = await db
          .select({
            month: sql<number>`MONTH(${schema.campingSales.dateTime})`,
            total: sql<number>`COALESCE(SUM(${schema.campingSales.totalAmount}), 0)`,
            count: sql<number>`COUNT(*)`,
          })
          .from(schema.campingSales)
          .where(
            and(
              gte(schema.campingSales.dateTime, from),
              lte(schema.campingSales.dateTime, to)
            )
          )
          .groupBy(sql`MONTH(${schema.campingSales.dateTime})`)
          .orderBy(sql`MONTH(${schema.campingSales.dateTime})`);
        return rows;
      }),

    yearlyBreakdown: authedQuery.query(async () => {
      const db = getDb();
      const rows = await db
        .select({
          year: sql<number>`YEAR(${schema.campingSales.dateTime})`,
          total: sql<number>`COALESCE(SUM(${schema.campingSales.totalAmount}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(schema.campingSales)
        .groupBy(sql`YEAR(${schema.campingSales.dateTime})`)
        .orderBy(sql`YEAR(${schema.campingSales.dateTime})`);
      return rows;
    }),
  },
});
