import { Request, Response } from "express";
import { db } from "../db/connection";
import { orders, shops, users, payouts, order_files } from "../db/schema";
import { eq, desc, sql, and, inArray, lt, gt, max } from "drizzle-orm";
import { refundRazorpayPayment } from "../services/payment.service"; 
import { sendRefundEmail } from "../services/email.service";

const STATION_BW_RATE = 2;
const STATION_COLOR_RATE = 12; 

export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const totalOrders = await db.select({ count: sql<number>`count(*)` }).from(orders);
    const totalShops = await db.select({ count: sql<number>`count(*)` }).from(shops);
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

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const orderId = req.query.order_id ? Number(req.query.order_id) : null;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    let conditions = [];

    if (orderId) {
      conditions.push(eq(orders.id, orderId));
    } else if (startDate && endDate) {
      conditions.push(sql`DATE(${orders.created_at}) >= ${startDate}`);
      conditions.push(sql`DATE(${orders.created_at}) <= ${endDate}`);
    }

    const query = db.select({
        id: orders.id,
        status: orders.status,
        amount: orders.total_amount,
        created_at: orders.created_at,
        shop: shops.name,
        shop_id: orders.shop_id,
        user: users.email,
        razorpay_payment_id: orders.razorpay_payment_id
    })
    .from(orders)
    .leftJoin(shops, eq(orders.shop_id, shops.id))
    .leftJoin(users, eq(orders.user_id, users.id))
    .orderBy(desc(orders.created_at));

    if (conditions.length > 0) {
      query.where(and(...conditions));
    } else {
      query.limit(50);
    }

    const rawOrders = await query;

    const enrichedOrders = await Promise.all(rawOrders.map(async (order) => {
        let queuePos = null;

        if (order.status === 'QUEUED' || order.status === 'PRINTING') {
            const [res] = await db.select({ count: sql<number>`count(*)` })
                .from(orders)
                .where(and(
                    eq(orders.shop_id, order.shop_id!), // Same shop
                    inArray(orders.status, ["QUEUED", "PRINTING"]), // Active Status
                    lt(orders.id, order.id) // Created before this one
                ));
            
            queuePos = Number(res.count) + 1;
        }

        return { ...order, queue_position: queuePos };
    }));

    res.json(enrichedOrders);

  } catch (e: any) { res.status(500).json({ error: e.message }); }
};

// --- MANUAL REFUND (For Completed/Old Orders) ---
export const refundOrder = async (req: Request, res: Response) => {
  try {
    const { order_id, reason } = req.body;
    
    // 1. Fetch Order + User Email (Using Left Join)
    const [data] = await db.select({
        order: orders,
        email: users.email
    })
    .from(orders)
    .leftJoin(users, eq(orders.user_id, users.id))
    .where(eq(orders.id, order_id));
    
    if (!data || !data.order) return res.status(404).json({ error: "Order not found" });

    const { order, email } = data;

    if (!order.razorpay_payment_id) {
        return res.status(400).json({ error: "No payment ID found for this order" });
    }

    // 2. Call Razorpay API
    await refundRazorpayPayment(order.razorpay_payment_id);

    // 3. Update DB -> REFUNDED (Instantly)
    await db.update(orders)
       .set({ status: "REFUNDED" })
       .where(eq(orders.id, order_id));

    // 4. Send Email (Because Cron won't see 'REFUNDED' status)
    if (email) {
        await sendRefundEmail(email, order.id, String(order.total_amount), reason || "Admin Manual Refund");
    }

    console.log(`Admin Manually Refunded Order #${order_id}: ${reason}`);
    res.json({ success: true, message: "Order Refunded Successfully" });

  } catch (e: any) {
    console.error("Refund Failed:", e);
    res.status(500).json({ error: e.message });
  }
};

// --- MANUAL FAIL (For Queued/Pending Orders) ---
export const failOrder = async (req: Request, res: Response) => {
    try {
        const { order_id, reason } = req.body;

        const [data] = await db.select({
            order: orders,
            email: users.email
        })
        .from(orders)
        .leftJoin(users, eq(orders.user_id, users.id))
        .where(eq(orders.id, order_id));

        if (!data || !data.order) return res.status(404).json({ error: "Order not found" });

        const { order, email } = data;
        
        // Check Age: If > 3 days, Cron won't pick it up. We MUST refund instantly.
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const isOldOrder = order.created_at && new Date(order.created_at) < threeDaysAgo;

        if (isOldOrder) {
            // --- SCENARIO A: Old Order (Manual Refund Required) ---
            if (order.razorpay_payment_id) {
                await refundRazorpayPayment(order.razorpay_payment_id);
            }
            
            await db.update(orders)
                .set({ status: "REFUNDED" }) // Mark REFUNDED directly
                .where(eq(orders.id, order_id));

            if (email) {
                await sendRefundEmail(email, order.id, String(order.total_amount), reason || "Order Failed (Admin)");
            }

            console.log(`Admin Force-Failed (Old) Order #${order_id}: Refunded Instantly.`);
            res.json({ success: true, message: "Old order failed and refunded instantly." });

        } else {
            // --- SCENARIO B: Recent Order (Let Cron Job Handle It) ---
            // User requested: "If pending... give to cron job"
            await db.update(orders)
                .set({ status: "FAILED" })
                .where(eq(orders.id, order_id));

            console.log(`Admin Force-Failed Order #${order_id}: Marked FAILED for Cron.`);
            res.json({ success: true, message: "Order marked FAILED. Refund will be processed by system shortly." });
        }

    } catch (e: any) {
        console.error("Force Fail Error:", e);
        res.status(500).json({ error: e.message });
    }
};

// --- 3. SHOP MANAGEMENT ---
export const getAllShops = async (req: Request, res: Response) => {
    try {
        // 1. Fetch only ACTIVE shops
        const activeShops = await db.select().from(shops).where(eq(shops.status, 'ACTIVE'));
        
        // 2. Add dynamic "online" status based on heartbeat
        const now = new Date().getTime();
    const data = activeShops.map(s => {
      const lastPing = s.last_heartbeat ? new Date(s.last_heartbeat).getTime() : 0;
      // Online if pinged in last 60 seconds
      const isOnline = (now - lastPing) < 60000; 
      return { ...s, liveStatus: isOnline ? "ONLINE" : "OFFLINE" };
    });

        res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
};

// --- 4. PAYOUTS ---
export const getPendingPayouts = async (req: Request, res: Response) => {
    try {
        // --- N+1 Query Optimization ---
        // 1. Get the last payout date for ALL shops in a single efficient query
        const lastPayouts = await db
            .select({
                shop_id: payouts.shop_id,
                last_paid_on: max(payouts.created_at)
            })
            .from(payouts)
            .where(eq(payouts.status, 'PROCESSED'))
            .groupBy(payouts.shop_id);

        const lastPayoutMap = new Map(lastPayouts.map(p => [p.shop_id, p.last_paid_on]));
        
        const allShops = await db.select().from(shops);
        const pendingPayouts = [];

        for (const shop of allShops) {
            const lastPayoutDate = lastPayoutMap.get(shop.id) || new Date(0);

            // 2. Find all completed orders since the last payout
            const newCompletedOrders = await db.select({ id: orders.id })
                .from(orders)
                .where(and(
                    eq(orders.shop_id, shop.id),
                    eq(orders.status, 'COMPLETED'),
                    gt(orders.created_at, lastPayoutDate)
                ));

            if (newCompletedOrders.length === 0) {
                continue;
            }

            const orderIds = newCompletedOrders.map(o => o.id);

            // 3. Get all files for these orders, selecting only necessary columns
            const files = await db.select({
                    pages: order_files.pages,
                    copies: order_files.copies,
                    color: order_files.color
                })
                .from(order_files)
                .where(inArray(order_files.order_id, orderIds));

            // 4. Calculate total pages and amount owed
            let bw_pages_total = 0;
            let color_pages_total = 0;

            files.forEach(file => {
                const totalPages = file.pages * file.copies;
                if (file.color) {
                    color_pages_total += totalPages;
                } else {
                    bw_pages_total += totalPages;
                }
            });

            const amount_owed = (bw_pages_total * STATION_BW_RATE) + (color_pages_total * STATION_COLOR_RATE);

            if (amount_owed > 0) {
                pendingPayouts.push({
                    shop_id: shop.id,
                    shop_name: shop.name,
                    shop_status: shop.status,
                    upi_id: shop.upi_id,
                    amount_owed: amount_owed.toFixed(2),
                    bw_pages_total,
                    color_pages_total,
                    last_paid_on: lastPayoutDate === new Date(0) ? null : lastPayoutDate
                });
            }
        }

        res.json(pendingPayouts);

    } catch (e: any) {
        console.error("Get Pending Payouts Error:", e);
        res.status(500).json({ error: e.message });
    }
};

export const logPayment = async (req: Request, res: Response) => {
    try {
        const { shop_id, amount, bw_pages_total, color_pages_total, transaction_ref } = req.body;

        if (!shop_id || !amount || !transaction_ref) {
            return res.status(400).json({ error: "Shop ID, amount, and transaction reference are required." });
        }

        await db.insert(payouts).values({
            shop_id,
            amount,
            bw_count: bw_pages_total,
            color_count: color_pages_total,
            transaction_ref,
            status: 'PROCESSED',
        });

        res.json({ success: true, message: "Payment logged successfully." });

    } catch (e: any) {
        console.error("Log Payment Error:", e);
        res.status(500).json({ error: e.message });
    }
};

export const getPayouts = async (req: Request, res: Response) => {
    try {
        const history = await db.select({
            id: payouts.id,
            shop_id: payouts.shop_id,
            amount: payouts.amount,
            status: payouts.status,
            bw_count: payouts.bw_count,
            color_count: payouts.color_count,
            transaction_ref: payouts.transaction_ref,
            created_at: payouts.created_at,
            shop_name: shops.name
        })
        .from(payouts)
        .leftJoin(shops, eq(payouts.shop_id, shops.id))
        .orderBy(desc(payouts.created_at))
        .limit(50);
        
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

export const createShop = async (req: Request, res: Response) => {
  try {
    const { name, location, password, upi_id, has_bw_a3, has_color_a3 } = req.body;

    if (!name || !location || !password) {
      return res.status(400).json({ error: "Name, Location, and Password are required" });
    }

    const [newShop] = await db.insert(shops).values({
      name,
      location,
      password,
      upi_id: upi_id || null,
      has_bw: false,
      has_color: false,
      has_bw_a3: !!has_bw_a3,
      has_color_a3: !!has_color_a3
    }).returning();

    console.log(`🆕 Shop Created: ${name} (ID: ${newShop.id})`);
    res.json({ success: true, shop: newShop });

  } catch (err: any) {
    console.error("Create Shop Error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const deleteShop = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Shop ID required" });

    await db.update(shops).set({ status: 'INACTIVE' }).where(eq(shops.id, Number(id)));

    console.log(`✅ Shop Deactivated: ID ${id}`);
    res.json({ success: true, message: `Shop #${id} deactivated.` });
  } catch (err: any) {
    console.error("Deactivate Shop Error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getLiveQueues = async (req: Request, res: Response) => {
    try {
        // Get all orders that are QUEUED or PRINTING
        const activeOrders = await db.select({
            id: orders.id,
            shop_id: orders.shop_id,
            created_at: orders.created_at,
            shop_name: shops.name
        })
        .from(orders)
        .innerJoin(shops, eq(orders.shop_id, shops.id))
        .where(inArray(orders.status, ["QUEUED", "PRINTING"]))
        .orderBy(orders.created_at);

        // Group by Shop
        const queues = activeOrders.reduce((acc: any[], order) => {
            let shopQueue = acc.find(q => q.shop_id === order.shop_id);
            if (!shopQueue) {
                shopQueue = {
                    shop_id: order.shop_id,
                    shop_name: order.shop_name,
                    orders: []
                };
                acc.push(shopQueue);
            }
            shopQueue.orders.push({
                id: order.id,
                created_at: order.created_at
            });
            return acc;
        }, []);

        res.json(queues);

    } catch (e: any) {
        console.error("Get Live Queues Error:", e);
        res.status(500).json({ error: e.message });
    }
};

export const failAllQueuedOrdersForShop = async (req: Request, res: Response) => {
    try {
        const { shop_id } = req.body;
        
        if (!shop_id) return res.status(400).json({ error: "Shop ID required" });

        await db.update(orders)
            .set({ status: "FAILED" })
            .where(and(
                eq(orders.shop_id, shop_id),
                inArray(orders.status, ["QUEUED", "PRINTING"])
            ));

        console.log(`Admin Force-Failed All Orders for Shop #${shop_id}`);
        res.json({ success: true, message: "All queued orders for this shop marked as FAILED." });

    } catch (e: any) {
        console.error("Fail All Error:", e);
        res.status(500).json({ error: e.message });
    }
};
