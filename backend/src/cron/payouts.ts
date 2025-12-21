import cron from "node-cron";
import { db } from "../db/connection";
import { orders, order_files, shops, payouts } from "../db/schema";
import { eq, and, sql, inArray, isNotNull } from "drizzle-orm";
// import { createPayout } from "../services/payment.service"; // <--- NO LONGER NEEDED HERE

export const startPayoutJob = () => {
  // Run at 11:00 PM every day
  cron.schedule("0 23 * * *", async () => {
    console.log("💰 Starting Daily Payout Calculation...");
    
    try {
      // Fetch ALL shops with UPI ID (to know who to pay)
      const eligibleShops = await db.select()
        .from(shops)
        .where(isNotNull(shops.upi_id));

      console.log(`Processing payouts for ${eligibleShops.length} shops...`);

      for (const shop of eligibleShops) {
        
        // 1. Check if record already exists for today (Idempotency)
        const existingPayout = await db.select()
            .from(payouts)
            .where(and(
                eq(payouts.shop_id, shop.id),
                sql`DATE(${payouts.created_at}) = CURRENT_DATE`
            ));

        if (existingPayout.length > 0) continue;

        // 2. Fetch today's COMPLETED orders
        const todaysOrders = await db.select({ id: orders.id })
          .from(orders)
          .where(and(
            eq(orders.shop_id, shop.id),
            eq(orders.status, "COMPLETED"),
            sql`DATE(${orders.created_at}) = CURRENT_DATE`
          ));

        if (todaysOrders.length === 0) continue;

        const orderIds = todaysOrders.map(o => o.id);

        // 3. Calculate Earnings
        const files = await db.select()
          .from(order_files)
          .where(inArray(order_files.order_id, orderIds));

        let bwCount = 0;
        let colorCount = 0;

        files.forEach(f => {
            const totalPages = f.pages * (f.copies || 1);
            if (f.color) colorCount += totalPages;
            else bwCount += totalPages;
        });

        // 4. Calculate Amount
        const payoutAmount = (bwCount * 2) + (colorCount * 12);

        if (payoutAmount > 0) {
            // 5. JUST RECORD IT. DO NOT AUTO-PAY.
            await db.insert(payouts).values({
                shop_id: shop.id,
                amount: payoutAmount.toString(),
                bw_count: bwCount,
                color_count: colorCount,
                status: "PENDING", // <--- Waits for you to pay manually
                transaction_ref: null 
            });

            console.log(`✅ Payout Ledger Entry: Shop #${shop.id} -> ₹${payoutAmount} (Pending Manual Transfer)`);
        }
      }
    } catch (error) {
      console.error("❌ Payout Job Logic Error:", error);
    }
  });
};