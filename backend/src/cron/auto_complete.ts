import cron from "node-cron";
import { db } from "../db/connection";
import { orders, shops, users } from "../db/schema";
import { eq, and, inArray, lt } from "drizzle-orm";
import { sendOrderReadyEmail } from "../services/email.service";

// IDs of your Ghost/Mock Shops (Ensure these match what you seeded or hardcoded)
// If you used the seed script, check your DB for the actual IDs.
// Assuming IDs 1, 2, 3 are your demo shops.
const DEMO_SHOP_IDS = [2, 3, 4]; 

export const startAutoCompleteJob = () => {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    console.log("🤖 Auto-Completer: Checking for demo orders...");
    
    try {
      // Find orders that are QUEUED for > 30 seconds
      const timeThreshold = new Date(Date.now() - 5 * 1000);

      const stuckOrders = await db.select({
        id: orders.id,
        user_id: orders.user_id,
        shop_id: orders.shop_id,
      })
      .from(orders)
      .where(and(
        inArray(orders.shop_id, DEMO_SHOP_IDS), // Only for Demo Shops
        eq(orders.status, "QUEUED"),
        lt(orders.created_at, timeThreshold) // Older than 30s
      ));

      if (stuckOrders.length === 0) return;

      console.log(`🤖 Found ${stuckOrders.length} demo orders to auto-complete.`);

      for (const order of stuckOrders) {
        // 1. Mark Completed
        await db.update(orders)
            .set({ status: "COMPLETED" })
            .where(eq(orders.id, order.id));

        // 2. Send Email
        const user = await db.query.users.findFirst({ where: eq(users.id, order.user_id!) });
        const shop = await db.query.shops.findFirst({ where: eq(shops.id, order.shop_id!) });

        if (user && shop) {
            console.log(`🤖 Sending Auto-Complete Email to ${user.email}`);
            await sendOrderReadyEmail(user.email, order.id, shop.name);
        }
      }

    } catch (error) {
      console.error("❌ Auto-Completer Error:", error);
    }
  });
};