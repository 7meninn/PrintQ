import { Request, Response } from "express";
import { db } from "../db/connection";
import { orders, order_files, shops } from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";

// 1. Shop Login (Simple check)
export const shopLogin = async (req: Request, res: Response) => {
  const { id, password } = req.body;
  
  const shop = await db.query.shops.findFirst({ // error is in this line Property 'shops' does not exist on type 'DrizzleTypeError<"Seems like the schema generic is missing - did you forget to add it to your DB type?">'.
    where: eq(shops.id, id)
  });

  if (!shop || shop.password !== password) {
    return res.status(401).json({ error: "Invalid Station ID or Password" });
  }

  res.json({ success: true, shop });
};

// 2. Get Pending Jobs
export const getPendingJobs = async (req: Request, res: Response) => {
  const shopId = Number(req.query.shop_id);

  // Fetch orders that are explicitly QUEUED for this shop
  const pendingOrders = await db.query.orders.findMany({
    where: and(
      eq(orders.shop_id, shopId),
      eq(orders.status, "QUEUED")
    ),
    with: {
      // We need the user name to print a cover page (optional)
      // And we need the files to print
    }
  });

  // Get the files for these orders
  if (pendingOrders.length === 0) return res.json([]);

  const orderIds = pendingOrders.map(o => o.id);
  
  const filesToPrint = await db
    .select()
    .from(order_files)
    .where(inArray(order_files.order_id, orderIds));

  // Structure response: Group files by Order
  const jobs = pendingOrders.map(order => ({
    order_id: order.id,
    created_at: order.created_at,
    files: filesToPrint.filter(f => f.order_id === order.id).map(f => ({
      url: `http://localhost:3000${f.file_url}`, // Full URL for download
      filename: f.file_url.split('/').pop(),
      copies: f.copies,
      color: f.color
    }))
  }));

  res.json(jobs);
};

// 3. Mark Job Complete
export const completeJob = async (req: Request, res: Response) => {
  const { order_id } = req.body;
  
  await db
    .update(orders)
    .set({ status: "COMPLETED" })
    .where(eq(orders.id, order_id));

  res.json({ success: true });
};