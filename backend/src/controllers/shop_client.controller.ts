import { Request, Response } from "express";
import { db } from "../db/connection";
import { orders, order_files, shops, users, payouts } from "../db/schema"; 
import { eq, and, inArray, desc } from "drizzle-orm";
import { sendOrderReadyEmail } from "../services/email.service";
import { sql } from "drizzle-orm";



export const shopLogin = async (req: Request, res: Response) => {
  const { id, password, has_bw, has_color, has_bw_a3, has_color_a3 } = req.body;
  
  const shop = await db.query.shops.findFirst({ where: eq(shops.id, id) });

  if (!shop || shop.password !== password || shop.status !== 'ACTIVE') {
    return res.status(401).json({ error: "Invalid Station ID or Password" });
  }

  const loginUpdate: Partial<typeof shops.$inferInsert> = {
    last_heartbeat: new Date()
  };

  if (has_bw !== undefined) loginUpdate.has_bw = !!has_bw;
  if (has_color !== undefined) loginUpdate.has_color = !!has_color;
  if (has_bw_a3 !== undefined) loginUpdate.has_bw_a3 = !!has_bw_a3;
  if (has_color_a3 !== undefined) loginUpdate.has_color_a3 = !!has_color_a3;

  await db.update(shops)
    .set(loginUpdate)
    .where(eq(shops.id, id));

  const updatedShop = await db.query.shops.findFirst({ where: eq(shops.id, id) });
  res.json({ success: true, shop: updatedShop, server_time: new Date() });
};

// 2. Heartbeat
export const shopHeartbeat = async (req: Request, res: Response) => {
  const { id, has_bw, has_color, has_bw_a3, has_color_a3 } = req.body;

  const heartbeatUpdate: Partial<typeof shops.$inferInsert> = {
    last_heartbeat: new Date()
  };

  if (has_bw !== undefined) heartbeatUpdate.has_bw = !!has_bw;
  if (has_color !== undefined) heartbeatUpdate.has_color = !!has_color;
  if (has_bw_a3 !== undefined) heartbeatUpdate.has_bw_a3 = !!has_bw_a3;
  if (has_color_a3 !== undefined) heartbeatUpdate.has_color_a3 = !!has_color_a3;

  await db.update(shops)
    .set(heartbeatUpdate)
    .where(eq(shops.id, id));
  res.json({ success: true });
};

// 3. Get Pending Jobs
export const getPendingJobs = async (req: Request, res: Response) => {
  try {
      const shopId = Number(req.query.shop_id);

      if (!shopId || isNaN(shopId)) {
        return res.status(400).json({ error: "Invalid Shop ID" });
      }

      // Use leftJoin to be safe against deleted users
      const pendingOrders = await db.select({
          id: orders.id,
          created_at: orders.created_at,
          total_amount: orders.total_amount,
          user_name: users.name
        })
        .from(orders)
        .leftJoin(users, eq(orders.user_id, users.id))
        .where(and(
          eq(orders.shop_id, shopId),
          eq(orders.status, "QUEUED")
        ));

      if (pendingOrders.length === 0) return res.json([]);

      const orderIds = pendingOrders.map(o => o.id);
      
      const filesToPrint = await db
        .select()
        .from(order_files)
        .where(inArray(order_files.order_id, orderIds));

      const jobs = pendingOrders.map((order) => {
        const orderFiles = filesToPrint.filter(f => f.order_id === order.id);
        
        const realFiles = orderFiles.map(f => ({
          url: f.file_url,
          filename: f.file_url.split('/').pop() || `file_${f.id}`,
          copies: f.copies,
          color: f.color,
          pages: f.pages,
          paper_size: f.paper_size
        }));

        return {
          order_id: order.id,
          created_at: order.created_at,
          user_name: order.user_name,
          files: realFiles 
        };
      });

      res.json(jobs);

  } catch (error: any) {
      console.error("Get Pending Jobs Error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch jobs" });
  }
};

// 4. Mark Job Complete
export const completeJob = async (req: Request, res: Response) => {
  try {
      const { order_id } = req.body;
      
      // Update Order Status
      await db
        .update(orders)
        .set({ status: "COMPLETED" })
        .where(eq(orders.id, order_id));

      // Send Email 📧
      const order = await db.query.orders.findFirst({ 
          where: eq(orders.id, order_id)
      });
      
      if (order) {
          const user = await db.query.users.findFirst({ where: eq(users.id, order.user_id) });
          const shop = await db.query.shops.findFirst({ where: eq(shops.id, order.shop_id) });
          
          if (user && shop) {
              sendOrderReadyEmail(user.email, order.id, shop.name);
          }
      }
      
      res.json({ success: true });
  } catch (error: any) {
      console.error("Complete Job Error:", error);
      res.status(500).json({ error: error.message });
  }
};

// 5. Mark Job Failed
export const failJob = async (req: Request, res: Response) => {
    try {
        const { order_id, reason } = req.body;
        await db
          .update(orders)
          .set({ status: "FAILED" })
          .where(and(
            eq(orders.id, order_id),
            inArray(orders.status, ["QUEUED", "PRINTING"])
          ));
        console.log(`Order #${order_id} marked FAILED by shop operator: ${reason}`);
        res.json({ success: true });
    } catch (error: any) {
        console.error("Fail Job Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const getShopHistory = async (req: Request, res: Response) => {
  try {
    const shopId = Number(req.query.shop_id);
    const dateStr = req.query.date as string; // Format: YYYY-MM-DD

    if (!shopId || isNaN(shopId) || !dateStr) {
      return res.status(400).json({ error: "Invalid Shop ID or Date" });
    }

    // 1. Fetch Orders for the date
    const historyOrders = await db.select({
        id: orders.id,
        created_at: orders.created_at,
        status: orders.status,
        user_name: users.name
      })
      .from(orders)
      .leftJoin(users, eq(orders.user_id, users.id))
      .where(and(
        eq(orders.shop_id, shopId),
        inArray(orders.status, ["COMPLETED", "FAILED"]),
        sql`DATE(${orders.created_at}) = ${dateStr}`
      ))
      .orderBy(sql`${orders.created_at} DESC`);

    if (historyOrders.length === 0) {
      return res.json({ 
        summary: { total_earnings: 0, total_orders: 0, bw_pages: 0, color_pages: 0 }, 
        orders: [] 
      });
    }

    const orderIds = historyOrders.map(o => o.id);

    // 2. Fetch Files
    const fileData = await db
      .select({
        order_id: order_files.order_id,
        color: order_files.color,
        pages: order_files.pages,
        copies: order_files.copies
      })
      .from(order_files)
      .where(inArray(order_files.order_id, orderIds));

    // 3. Process & Calculate Earnings (Station Rates)
    const STATION_BW_RATE = 2;
    const STATION_COLOR_RATE = 12;

    let dailyEarnings = 0;
    let dailyBW = 0;
    let dailyColor = 0;

    const formattedOrders = historyOrders.map(order => {
      const files = fileData.filter(f => f.order_id === order.id);
      
      let bwPages = 0;
      let colorPages = 0;

      files.forEach(f => {
        const pgs = (f.pages || 1) * (f.copies || 1);
        if (f.color) colorPages += pgs;
        else bwPages += pgs;
      });

      // Calculate Earnings based on Station Rates
      const earning = (bwPages * STATION_BW_RATE) + (colorPages * STATION_COLOR_RATE);

      // Only add to totals if completed
      if (order.status === 'COMPLETED') {
        dailyEarnings += earning;
        dailyBW += bwPages;
        dailyColor += colorPages;
      }

      return {
        order_id: order.id,
        timestamp: order.created_at,
        status: order.status,
        customer: order.user_name || "Guest",
        details: {
          bw_pages: bwPages,
          color_pages: colorPages
        },
        financials: {
          shop_earnings: earning
        }
      };
    });

    res.json({
      summary: {
        total_earnings: dailyEarnings,
        total_orders: historyOrders.length,
        bw_pages: dailyBW,
        color_pages: dailyColor
      },
      orders: formattedOrders
    });

  } catch (error: any) {
    console.error("History Error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getShopPayoutHistory = async (req: Request, res: Response) => {
  try {
    const shopId = Number(req.query.shop_id);
    if (!shopId || isNaN(shopId)) {
      return res.status(400).json({ error: "Invalid Shop ID" });
    }

    const history = await db.select()
      .from(payouts)
      .where(and(
        eq(payouts.shop_id, shopId),
        eq(payouts.status, 'PROCESSED')
      ))
      .orderBy(desc(payouts.created_at))
      .limit(100);
      
    res.json(history);

  } catch (error: any) {
    console.error("Shop Payout History Error:", error);
    res.status(500).json({ error: error.message });
  }
};
