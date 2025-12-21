import { Request, Response } from "express";
import { db } from "../db/connection";
import { shops, orders } from "../db/schema";
import { eq, sql, and, or, inArray, gt } from "drizzle-orm";

export const getShops = async (req: Request, res: Response) => {
  try {
    const thirtySecondsAgo = new Date(Date.now() - 45 * 1000); 

    // 1. Fetch ALL shops (We filter in memory to handle the Ghost Logic)
    const allShops = await db.select({
        id: shops.id,
        name: shops.name,
        location: shops.location,
        has_bw: shops.has_bw,
        has_color: shops.has_color,
        last_heartbeat: shops.last_heartbeat
      })
      .from(shops);

    const activeShops = allShops.filter(shop => {
        // --- 👻 GHOST MODE LOGIC ---
        // Always show these specific demo shops as ONLINE regardless of heartbeat
        if (shop.name.includes("PrintQ Demo") || shop.name.includes("PrintQ Color") || shop.name.includes("PrintQ B/W")) {
            return true;
        }
        // ---------------------------

        // Standard Logic for real shops
        const isRecent = shop.last_heartbeat && new Date(shop.last_heartbeat) > thirtySecondsAgo;
        const hasPrinter = shop.has_bw || shop.has_color;
        return isRecent && hasPrinter;
    });

    if (activeShops.length === 0) {
      return res.json([]);
    }

    const shopIds = activeShops.map((s) => s.id);
    
    // Get Queue Counts
    const queueCounts = await db
      .select({
        shop_id: orders.shop_id,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(orders)
      .where(
        and(
          inArray(orders.shop_id, shopIds),
          inArray(orders.status, ["QUEUED", "PRINTING"])
        )
      )
      .groupBy(orders.shop_id);

    const result = activeShops.map((shop) => {
      const queueData = queueCounts.find((q) => q.shop_id === shop.id);
      return {
        id: shop.id,
        name: shop.name,
        location: shop.location,
        has_bw: shop.has_bw,
        has_color: shop.has_color,
        queue: queueData ? queueData.count : 0,
      };
    });

    res.json(result);
  } catch (err) {
    console.error("Error fetching shops:", err);
    res.status(500).json({ error: "Failed to refresh station status" });
  }
};