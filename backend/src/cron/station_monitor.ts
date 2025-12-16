import cron from "node-cron";
import { db } from "../db/connection";
import { orders, shops } from "../db/schema";
import { eq, lt, and, inArray } from "drizzle-orm";

export const startStationMonitorJob = () => {
  // Run every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    console.log("📡 Station Monitor: Checking for offline stations...");

    try {
      const OFFLINE_THRESHOLD_MINUTES = 15;
      const thresholdDate = new Date(Date.now() - OFFLINE_THRESHOLD_MINUTES * 60 * 1000);

      // 1. Find shops that are effectively "Dead" (No heartbeat > 15 mins)
      const deadShops = await db
        .select({ id: shops.id, name: shops.name })
        .from(shops)
        .where(lt(shops.last_heartbeat, thresholdDate));

      if (deadShops.length === 0) return;

      const deadShopIds = deadShops.map(s => s.id);
      console.log(`⚠️ Found ${deadShops.length} offline shops: ${deadShops.map(s => s.name).join(", ")}`);

      // 2. Find "Stuck" orders (Status: QUEUED) at these shops
      const stuckOrders = await db
        .select({ id: orders.id })
        .from(orders)
        .where(and(
            inArray(orders.shop_id, deadShopIds),
            eq(orders.status, "QUEUED")
        ));

      if (stuckOrders.length === 0) return;

      const stuckOrderIds = stuckOrders.map(o => o.id);

      // 3. Mark them as FAILED
      // The existing 'Refund Job' will see status='FAILED' and process the refund automatically.
      await db
        .update(orders)
        .set({ 
            status: "FAILED",
            // If you have a 'failure_reason' column, uncomment the next line:
            // failure_reason: "Station Offline Timeout (>15m)" 
        })
        .where(inArray(orders.id, stuckOrderIds));

      console.log(`❌ Auto-Failed ${stuckOrders.length} stuck orders due to offline stations.`);

    } catch (err) {
      console.error("Station Monitor Error:", err);
    }
  });
};