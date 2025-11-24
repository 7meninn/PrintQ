import { Request, Response } from "express";
import { db } from "../db/connection";
import { shops, orders } from "../db/schema";
import { eq, sql, and, or, inArray } from "drizzle-orm";

export const getShops = async (req: Request, res: Response) => {
  try {
    // 1. Fetch only "Active" Shops (Must support at least one print type)
    // This ensures shops that turn off both capabilities disappear from the frontend immediately.
    const activeShops = await db
      .select({
        id: shops.id,
        name: shops.name,
        location: shops.location,
        has_bw: shops.has_bw,
        has_color: shops.has_color,
      })
      .from(shops)
      .where(or(eq(shops.has_bw, true), eq(shops.has_color, true)));

    if (activeShops.length === 0) {
      return res.json([]);
    }

    // 2. Get Real-Time Queue Counts for these shops
    // OPTIMIZATION: Instead of N queries, we do 1 query grouped by shop_id.
    const shopIds = activeShops.map((s) => s.id);
    
    const queueCounts = await db
      .select({
        shop_id: orders.shop_id,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(orders)
      .where(
        and(
          inArray(orders.shop_id, shopIds),
          inArray(orders.status, ["QUEUED", "PRINTING"]) // Only count unfinished work
        )
      )
      .groupBy(orders.shop_id);

    // 3. Merge Counts into Shop Data
    const result = activeShops.map((shop) => {
      const queueData = queueCounts.find((q) => q.shop_id === shop.id);
      return {
        ...shop,
        queue: queueData ? queueData.count : 0, // Default to 0 if no orders
      };
    });

    res.json(result);
  } catch (err) {
    console.error("Error fetching shops:", err);
    res.status(500).json({ error: "Failed to refresh station status" });
  }
};