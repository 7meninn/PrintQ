import { Request, Response } from "express";
import { db } from "../db/connection";
import { orders, order_files, shops, users } from "../db/schema"; 
import { eq, and, inArray } from "drizzle-orm";
import { sendOrderReadyEmail } from "../services/email.service";
import { uploadFileToAzure } from "../services/storage.service";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const createShop = async (req: Request, res: Response) => {
  try {
    const { name, location, password } = req.body;

    if (!name || !location || !password) {
      return res.status(400).json({ error: "Name, Location, and Password are required" });
    }

    // Insert new shop
    const [newShop] = await db.insert(shops).values({
      name,
      location,
      password, // In production, hash this password!
      has_bw: false,   // Default to false until they connect printer
      has_color: false // Default to false
    }).returning();

    console.log(`🆕 Shop Created: ${name} (ID: ${newShop.id})`);
    res.json({ success: true, shop: newShop });

  } catch (err: any) {
    console.error("Create Shop Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 🟢 ADMIN ONLY: Delete a Shop
export const deleteShop = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Shop ID required" });

    // Delete the shop (Cascading deletes might be needed for orders depending on DB setup)
    // For safety, this basic delete might fail if orders exist. 
    await db.delete(shops).where(eq(shops.id, Number(id)));

    console.log(`🗑️ Shop Deleted: ID ${id}`);
    res.json({ success: true, message: `Shop #${id} deleted.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

const generateCoverPage = async (orderId: number, userName: string, totalFiles: number, amount: string) => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 600]); 
  const { height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await doc.embedFont(StandardFonts.Helvetica);

  page.drawText("PrintQ", { x: 20, y: height - 50, size: 24, font, color: rgb(0, 0.4, 0.8) });
  page.drawText("ORDER RECEIPT", { x: 20, y: height - 80, size: 12, font: fontReg, color: rgb(0.5, 0.5, 0.5) });
  page.drawText(userName.toUpperCase(), { x: 20, y: height - 140, size: 28, font, color: rgb(0, 0, 0) });
  page.drawText(`Order ID: #${orderId}`, { x: 20, y: height - 180, size: 18, font });
  page.drawText(`Files: ${totalFiles}`, { x: 20, y: height - 210, size: 14, font: fontReg });
  page.drawText(`PAID: Rs. ${amount}`, { x: 20, y: height - 260, size: 18, font, color: rgb(0, 0.6, 0) });
  page.drawText("Please collect all documents below this sheet.", { x: 20, y: 30, size: 10, font: fontReg, color: rgb(0.5, 0.5, 0.5) });

  // Get PDF as Buffer
  const pdfBytes = await doc.save();
  const pdfBuffer = Buffer.from(pdfBytes);
  const filename = `cover_${orderId}.pdf`;
  
  // ✅ Upload to Azure immediately
  const azureUrl = await uploadFileToAzure(pdfBuffer, filename);
  
  return azureUrl;
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
  const shopId = Number(req.query.shop_id);

  const pendingOrders = await db.select({
      id: orders.id,
      created_at: orders.created_at,
      total_amount: orders.total_amount,
      user_name: users.name
    })
    .from(orders)
    .innerJoin(users, eq(orders.user_id, users.id))
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

  const jobs = await Promise.all(pendingOrders.map(async (order) => {
    const orderFiles = filesToPrint.filter(f => f.order_id === order.id);
    
    // 1. Generate Cover Page (Returns Azure URL)
    const coverUrl = await generateCoverPage(order.id, order.user_name, orderFiles.length, order.total_amount);
    
    const coverFile = {
      url: coverUrl, // ✅ Directly use the Azure URL
      filename: `cover_${order.id}.pdf`,
      copies: 1,
      color: false
    };

    // 2. Map Real Files (Already Azure URLs from DB)
    const realFiles = orderFiles.map(f => ({
      url: f.file_url, // ✅ Already Azure URL
      filename: f.file_url.split('/').pop(), // Extract filename
      copies: f.copies,
      color: f.color
    }));

    return {
      order_id: order.id,
      created_at: order.created_at,
      files: [coverFile, ...realFiles] 
    };
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

// what if we delete the file using cleanup job by the logic of cleaning up old files. and someone tries to proceed with the order can that happen ?