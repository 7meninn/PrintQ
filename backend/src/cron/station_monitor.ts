import cron from "node-cron";
import { db } from "../db/connection";
import { orders, shops } from "../db/schema";
import { and, lt, eq, inArray } from "drizzle-orm";

const OFFLINE_FAIL_THRESHOLD_MINUTES = 15;

export const startStationMonitorJob = () => {
  // Run every minute to check for long-offline stations.
  cron.schedule("* * * * *", async () => {
    try {
        const offlineThreshold = new Date(Date.now() - OFFLINE_FAIL_THRESHOLD_MINUTES * 60 * 1000);

        // 1. Find shops that have been offline for more than 15 minutes.
        const longOfflineShops = await db
            .select({ id: shops.id, name: shops.name })
            .from(shops)
            .where(lt(shops.last_heartbeat, offlineThreshold));

        if (longOfflineShops.length === 0) {
            // console.log("📡 Station Monitor: No stations have been offline for >15m."); // Optional debug log
            return;
        }

        const deadShopIds = longOfflineShops.map(s => s.id);
        console.log(`📡 Station Monitor: Found ${deadShopIds.length} shops offline for >15m.`);
        
        // 2. Find any "QUEUED" orders at these specific shops.
        const stuckOrders = await db
            .select({ id: orders.id })
            .from(orders)
            .where(and(
                inArray(orders.shop_id, deadShopIds),
                eq(orders.status, "QUEUED")
            ));

        if (stuckOrders.length > 0) {
            console.log(`⚠️ Found ${stuckOrders.length} stuck orders at long-offline shops.`);
            const stuckOrderIds = stuckOrders.map(o => o.id);
            
            // 3. Mark them as FAILED.
            await db
                .update(orders)
                .set({ status: "FAILED" })
                .where(inArray(orders.id, stuckOrderIds));
            
            console.log(`❌ Auto-Failed ${stuckOrders.length} orders due to station offline timeout (>15m).`);
        }

    } catch (err) {
        console.error("❌ Station Monitor Error:", err);
    }
  });
};