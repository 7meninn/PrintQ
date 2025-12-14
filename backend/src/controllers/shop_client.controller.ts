import { Request, Response } from "express";
import { db } from "../db/connection";
import { orders, order_files, shops, users } from "../db/schema"; 
import { eq, and, inArray } from "drizzle-orm";
import { sendOrderReadyEmail } from "../services/email.service";

export const createShop = async (req: Request, res: Response) => {
  try {
    const { name, location, password } = req.body;

    if (!name || !location || !password) {
      return res.status(400).json({ error: "Name, Location, and Password are required" });
    }

    const [newShop] = await db.insert(shops).values({
      name,
      location,
      password,
      has_bw: false,
      has_color: false
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
      
    await db.delete(shops).where(eq(shops.id, Number(id)));

    console.log(`🗑️ Shop Deleted: ID ${id}`);
    res.json({ success: true, message: `Shop #${id} deleted.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

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
          color: f.color
        }));

        return {
          order_id: order.id,
          created_at: order.created_at,
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
          .where(eq(orders.id, order_id));
        console.log(`Order #${order_id} marked FAILED: ${reason}`);
        res.json({ success: true });
    } catch (error: any) {
        console.error("Fail Job Error:", error);
        res.status(500).json({ error: error.message });
    }
};