import { Request, Response } from "express";
import { db } from "../db/connection";
import { shops, orders } from "../db/schema";
import { eq, sql, and } from "drizzle-orm";

export const getShops = async (req: Request, res: Response) => {
  try {
    // Fetch all active shops
    const activeShops = await db.select().from(shops).where(eq(shops.is_active, true));

    // Calculate queue for each shop
    // (Count orders where status is 'QUEUED' or 'PRINTING')
    const shopsWithQueue = await Promise.all(
      activeShops.map(async (shop) => {
        const queueCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(orders)
          .where(
            and(
              eq(orders.shop_id, shop.id),
              sql`${orders.status} IN ('QUEUED', 'PRINTING')`
            )
          );

        return {
          id: shop.id,
          name: shop.name,
          location: shop.location,
          queue: Number(queueCount[0].count),
        };
      })
    );

    res.json(shopsWithQueue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch shops" });
  }
};