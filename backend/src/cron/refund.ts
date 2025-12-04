import cron from "node-cron";
import { db } from "../db/connection";
import { orders, users } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { sendRefundEmail } from "../services/email.service";

export const startRefundJob = () => {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    try {
      // 1. Find all FAILED orders
      const failedOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.status, "FAILED"));

      if (failedOrders.length === 0) return;

      console.log(`💸 Refund Job: Found ${failedOrders.length} failed orders.`);

      for (const order of failedOrders) {
        // 2. Fetch User Email
        const user = await db.query.users.findFirst({
            where: eq(users.id, order.user_id)
        });

        if (!user) continue;

        // 3. Process Refund (Mock Logic)
        // In a real app, you would call Razorpay/Stripe API here:
        // await paymentGateway.refund(order.payment_id);
        console.log(`Processing Refund of ₹${order.total_amount} for Order #${order.id} to ${user.email}`);

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