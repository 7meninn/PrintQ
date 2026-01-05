import cron from "node-cron";
import { db } from "../db/connection";
import { orders, users } from "../db/schema";
import { eq, and, gt } from "drizzle-orm";
import { sendRefundEmail } from "../services/email.service";
import { refundRazorpayPayment } from "../services/payment.service";

export const startRefundJob = () => {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    try {
      // 1. Find FAILED orders from the last 3 days
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const failedOrders = await db
        .select()
        .from(orders)
        .where(and(
            eq(orders.status, "FAILED"),
            gt(orders.created_at, threeDaysAgo)
        ));

      if (failedOrders.length === 0) return;

      console.log(`💸 Refund Job: Found ${failedOrders.length} failed orders (Last 3 days).`);

      for (const order of failedOrders) {
        // 2. Fetch User Email
        const user = await db.query.users.findFirst({
            where: eq(users.id, order.user_id)
        });

        if (!user) continue;

        // 3. Process Real Refund
        if (order.razorpay_payment_id) {
            try {
                await refundRazorpayPayment(order.razorpay_payment_id);
                console.log(`✅ Refund Successful: Order #${order.id} (Payment ID: ${order.razorpay_payment_id})`);
            } catch (payErr) {
                console.error(`❌ Refund Failed for Order #${order.id}:`, payErr);
                // Continue to next order, don't update status to REFUNDED if payment refund fails
                continue; 
            }
        } else {
            console.warn(`⚠️ Skipping Refund for Order #${order.id}: No Payment ID found.`);
            // Note: If there's no payment ID, we might still want to mark it as REFUNDED (or CANCELLED) to stop the loop.
            // But for safety, let's mark it REFUNDED so we don't spam the log, assuming it was a free/test order.
        }

        // 4. Send Email
        await sendRefundEmail(user.email, order.id, String(order.total_amount), "Printer unavailable at station.");

        // 5. Update Status to REFUNDED (so we don't process it again)
        await db
            .update(orders)
            .set({ status: "REFUNDED" })
            .where(eq(orders.id, order.id));
      }

    } catch (err) {
      console.error("Refund Job Error:", err);
    }
  });
};