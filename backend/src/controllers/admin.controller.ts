import { Request, Response } from "express";
import { db } from "../db/connection";
import { orders, shops, users, payouts } from "../db/schema";
import { createPayout } from "../services/payment.service";
import { eq, desc, sql, and } from "drizzle-orm";
// Assume you have a refund service wrapper
import { refundRazorpayPayment } from "../services/payment.service"; 

// --- 1. DASHBOARD STATS ---
export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const totalOrders = await db.select({ count: sql<number>`count(*)` }).from(orders);
    const totalShops = await db.select({ count: sql<number>`count(*)` }).from(shops);
    
    // Revenue Calculation (approximate from total_amount)
    const [revenue] = await db.select({ 
        sum: sql<number>`sum(cast(${orders.total_amount} as decimal))` 
    }).from(orders).where(eq(orders.status, 'COMPLETED'));

    res.json({
        total_orders: totalOrders[0].count,
        total_shops: totalShops[0].count,
        total_revenue: revenue?.sum || 0
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};

// --- 2. ORDER MANAGEMENT ---
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    
    const allOrders = await db.select({
        id: orders.id,
        status: orders.status,
        amount: orders.total_amount,
        created_at: orders.created_at,
        shop: shops.name,
        user: users.email,
        razorpay_payment_id: orders.razorpay_payment_id
    })
    .from(orders)
    .leftJoin(shops, eq(orders.shop_id, shops.id))
    .leftJoin(users, eq(orders.user_id, users.id))
    .orderBy(desc(orders.created_at))
    .limit(limit)
    .offset(offset);

    res.json(allOrders);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};

// 🌟 CRITICAL: Manual Refund Logic
export const refundOrder = async (req: Request, res: Response) => {
  try {
    const { order_id, reason } = req.body;
    
    const order = await db.query.orders.findFirst({ where: eq(orders.id, order_id) });
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (!order.razorpay_payment_id) {
        return res.status(400).json({ error: "No payment ID found for this order" });
    }

    // Call Razorpay API
    await refundRazorpayPayment(order.razorpay_payment_id);

    // Update DB
    await db.update(orders)
       .set({ status: "REFUNDED" })
       .where(eq(orders.id, order_id));

    console.log(`Admin Refunded Order #${order_id}: ${reason}`);
    res.json({ success: true, message: "Order Refunded Successfully" });

  } catch (e: any) {
    console.error("Refund Failed:", e);
    res.status(500).json({ error: e.message });
  }
};

// --- 3. SHOP MANAGEMENT ---
export const getAllShops = async (req: Request, res: Response) => {
    try {
        const allShops = await db.select().from(shops);
        
        // Add "Status" based on heartbeat
        const now = new Date().getTime();
        const data = allShops.map(s => {
            const lastPing = s.last_heartbeat ? new Date(s.last_heartbeat).getTime() : 0;
            // Online if pinged in last 60 seconds
            const isOnline = (now - lastPing) < 60000; 
            return { ...s, status: isOnline ? "ONLINE" : "OFFLINE" };
        });

        res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
};

// --- 4. PAYOUTS ---
export const getPayouts = async (req: Request, res: Response) => {
    try {
        const history = await db.select().from(payouts).orderBy(desc(payouts.created_at)).limit(50);
        res.json(history);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
};

export const markPayoutAsPaid = async (req: Request, res: Response) => {
  try {
    const { payout_id, transaction_ref } = req.body; // You can manually enter the UPI Ref ID
    
    if (!payout_id || !transaction_ref) {
        return res.status(400).json({ error: "Payout ID and Transaction Ref required" });
    }

    // Update DB to mark as PROCESSED
    await db.update(payouts)
        .set({ 
            status: "PROCESSED", 
            transaction_ref: transaction_ref // Store the manual UPI ref you entered
        })
        .where(eq(payouts.id, payout_id));

    res.json({ success: true, message: "Payout marked as paid manually." });

  } catch (e: any) {
    console.error("Manual Mark-Paid Failed:", e);
    res.status(500).json({ error: e.message });
  }
};