import { Request, Response } from "express";
import { db } from "../db/connection";
import { orders, order_files, shops, users } from "../db/schema"; 
import { eq, and, inArray } from "drizzle-orm";
import { sendOrderReadyEmail } from "../services/email.service";


export const shopLogin = async (req: Request, res: Response) => {
  const { id, password, has_bw, has_color } = req.body;
  
  const shop = await db.query.shops.findFirst({ where: eq(shops.id, id) });

  if (!shop || shop.password !== password) {
    return res.status(401).json({ error: "Invalid Station ID or Password" });
  }

  if (has_bw !== undefined || has_color !== undefined) {
    await db.update(shops)
      .set({ 
        has_bw: !!has_bw, 
        has_color: !!has_color,
        last_heartbeat: new Date()
      })
      .where(eq(shops.id, id));
  }

  const updatedShop = await db.query.shops.findFirst({ where: eq(shops.id, id) });
  res.json({ success: true, shop: updatedShop });
};

// 2. Heartbeat
export const shopHeartbeat = async (req: Request, res: Response) => {
  const { id, has_bw, has_color } = req.body;
  await db.update(shops)
    .set({ 
        last_heartbeat: new Date(),
        has_bw: !!has_bw,
        has_color: !!has_color
    })
    .where(eq(shops.id, id));
  res.json({ success: true });
};

// 3. Get Pending Jobs
export const getPendingJobs = async (req: Request, res: Response) => {
  const shopId = Number(req.query.shop_id);

  const pendingOrders = await db.query.orders.findMany({
    where: and(eq(orders.shop_id, shopId), eq(orders.status, "QUEUED"))
  });

  if (pendingOrders.length === 0) return res.json([]);

  const orderIds = pendingOrders.map(o => o.id);
  const filesToPrint = await db.select().from(order_files).where(inArray(order_files.order_id, orderIds));

  const jobs = pendingOrders.map(order => ({
    order_id: order.id,
    created_at: order.created_at,
    files: filesToPrint.filter(f => f.order_id === order.id).map(f => ({
      url: `http://localhost:3000${f.file_url}`, 
      filename: f.file_url.split('/').pop(),
      copies: f.copies,
      color: f.color
    }))
  }));

  res.json(jobs);
};

// 4. Mark Job Complete
export const completeJob = async (req: Request, res: Response) => {
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
      // ✅ Now 'users' is defined, so this query works
      const user = await db.query.users.findFirst({ where: eq(users.id, order.user_id) });
      const shop = await db.query.shops.findFirst({ where: eq(shops.id, order.shop_id) });
      
      if (user && shop) {
          sendOrderReadyEmail(user.email, order.id, shop.name);
      }
  }
  
  res.json({ success: true });
};

// 5. Mark Job Failed
export const failJob = async (req: Request, res: Response) => {
    const { order_id, reason } = req.body;
    await db
      .update(orders)
      .set({ status: "FAILED" })
      .where(eq(orders.id, order_id));
    console.log(`Order #${order_id} marked FAILED: ${reason}`);
    res.json({ success: true });
};