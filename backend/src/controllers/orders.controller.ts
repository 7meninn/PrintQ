import { Request, Response } from "express";
import { db } from "../db/connection";
import { orders, order_files, shops, users } from "../db/schema"; // Ensure users is imported
import { eq, and, inArray, sql, lt, desc } from "drizzle-orm";
import { uploadFileToAzure } from "../services/storage.service";
import { PDFDocument } from "pdf-lib";
import { sendOrderPlacedEmail } from "../services/email.service"; // ✅ Import email service

// NOTE: PhonePe service imported but NOT used for Verification Mode
// import { initiatePhonePePayment } from "../services/payment.service";

interface MulterFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

interface FileConfig {
  color: boolean;
  copies: number;
}

// 1. PREPARE ORDER (Upload & Draft) - KEEP AS IS
export const prepareOrder = async (req: Request, res: Response) => {
  try {
    const files = req.files as unknown as MulterFile[];
    const configStr = req.body.config;
    const shopId = Number(req.body.shop_id);
    const userId = Number(req.body.user_id);

    const configs: FileConfig[] = configStr ? JSON.parse(configStr) : [];
    
    if (!files || files.length === 0) return res.status(400).json({ error: "No files received" });
    if (!shopId) return res.status(400).json({ error: "Shop ID required" });
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const shop = await db.query.shops.findFirst({ where: eq(shops.id, shopId) });
    if (!shop) return res.status(404).json({ error: "Selected shop not found" });

    // ✅ UPDATED PRICING
    const BW_PRICE = 2;
    const COLOR_PRICE = 12;
    const SERVICE_CHARGE_PERCENTAGE = 0.25;
    const MAX_SERVICE_CHARGE = 4;

    let summary = {
      total_bw_pages: 0,
      total_color_pages: 0,
      bw_cost: 0,
      color_cost: 0,
      print_cost: 0,
      service_charge: 0,
      total_amount: 0
    };

    const processedFiles = [];

    // 1. Process Files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let conf = configs[i] || { color: false, copies: 1 };
      
      let detectedPages = 1;
      try {
        if (file.mimetype === 'application/pdf') {
          const pdfDoc = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
          detectedPages = pdfDoc.getPageCount();
        } 
      } catch (err) {
        console.error(`Error counting pages:`, err);
      }

      // Upload
      const azureUrl = await uploadFileToAzure(file.buffer, file.originalname);

      // Calc Cost
      const calculatedPages = detectedPages * conf.copies;
      const pricePerSheet = conf.color ? COLOR_PRICE : BW_PRICE;
      const fileCost = calculatedPages * pricePerSheet;

      if (conf.color) {
        summary.total_color_pages += calculatedPages;
        summary.color_cost += fileCost;
      } else {
        summary.total_bw_pages += calculatedPages;
        summary.bw_cost += fileCost;
      }

      processedFiles.push({
        original_name: file.originalname,
        file_type: file.mimetype.split('/')[1] || 'file',
        detected_pages: detectedPages,
        calculated_pages: calculatedPages,
        cost: fileCost,
        color: conf.color,
        file_url: azureUrl 
      });
    }

    // 2. Totals
    summary.print_cost = summary.bw_cost + summary.color_cost;
    const rawServiceCharge = summary.print_cost * SERVICE_CHARGE_PERCENTAGE;
    summary.service_charge = Math.ceil(Math.min(rawServiceCharge, MAX_SERVICE_CHARGE));
    summary.total_amount = summary.print_cost + summary.service_charge;

    // 3. Create Draft Order
    const [draftOrder] = await db.insert(orders).values({
        user_id: userId,
        shop_id: shopId,
        total_amount: String(summary.total_amount),
        status: "DRAFT",
    } as any).returning();

    // 4. Link Files
    for (const f of processedFiles) {
        await db.insert(order_files).values({
            order_id: draftOrder.id,
            file_url: f.file_url,
            file_type: f.file_type,
            pages: f.detected_pages,
            copies: f.calculated_pages / f.detected_pages,
            color: f.color,
            cost: String(f.cost),
        } as any);
    }

    res.json({ 
        files: processedFiles, 
        summary,
        order_id: draftOrder.id 
    });

  } catch (err) {
    console.error("Prepare Order Error:", err);
    res.status(500).json({ error: "Failed to process files" });
  }
};

// 2. INITIATE PAYMENT (VERIFICATION MODE: MOCK SUCCESS)
export const initiatePayment = async (req: Request, res: Response) => {
  try {
    const { order_id, user_id } = req.body;

    const order = await db.query.orders.findFirst({ where: eq(orders.id, Number(order_id)) });
    if (!order) return res.status(404).json({ error: "Order not found" });

    // --- MOCK PAYMENT LOGIC START ---
    console.log(`[Mock Payment] Bypassing Gateway for Verification. Order #${order.id}`);

    // 1. Create a fake Transaction ID
    const mockTxnId = `MOCK_${Date.now()}_${order.id}`;

    // 2. Immediately mark order as QUEUED (Paid)
    await db.update(orders)
       .set({ 
           status: "QUEUED", 
           razorpay_payment_id: mockTxnId 
       }) 
       .where(eq(orders.id, order.id));

    // 3. ✅ SEND CONFIRMATION EMAIL (Crucial for Verification)
    const user = await db.query.users.findFirst({ where: eq(users.id, Number(user_id)) });
    if (user) {
        // Send email in background (no await) so UI is snappy
        sendOrderPlacedEmail(user.email, order.id, String(order.total_amount))
            .then(() => console.log(`📧 Sent Mock Success Email to ${user.email}`))
            .catch(e => console.error("❌ Email Failed:", e));
    }

    // 4. Return the Frontend Success URL directly
    const successUrl = `${process.env.FRONTEND_URL}/success?order_id=${order.id}`;

    res.json({ success: true, url: successUrl });
    // --- MOCK PAYMENT LOGIC END ---

  } catch (err: any) {
    console.error("Payment Init Error:", err);
    res.status(500).json({ error: "Mock Payment Failed" });
  }
};

// 3. PAYMENT CALLBACK (Not used in Mock Mode, but kept for future)
export const handlePaymentCallback = async (req: Request, res: Response) => {
    // This won't be called in the mock flow
    res.redirect(`${process.env.FRONTEND_URL}/upload`);
};

// 4. CANCEL ORDER (Manual)
export const cancelOrder = async (req: Request, res: Response) => {
    try {
        const { order_id } = req.body;
        if (!order_id) return res.status(400).json({ error: "Order ID required" });

        await db.update(orders)
            .set({ status: "CANCELLED" })
            .where(eq(orders.id, order_id));

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

// 5. GET USER HISTORY
export const getUserHistory = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.query.user_id);
    const dateStr = req.query.date as string; 

    if (!userId || !dateStr) {
      return res.status(400).json({ error: "User ID and Date required" });
    }

    const historyOrders = await db.select({
        id: orders.id,
        created_at: orders.created_at,
        status: orders.status,
        total_amount: orders.total_amount,
        shop_name: shops.name,
        shop_location: shops.location
      })
      .from(orders)
      .leftJoin(shops, eq(orders.shop_id, shops.id))
      .where(and(
        eq(orders.user_id, userId),
        inArray(orders.status, ["COMPLETED", "FAILED", "REFUNDED", "CANCELLED"]),
        sql`DATE(${orders.created_at}) = ${dateStr}`
      ))
      .orderBy(desc(orders.created_at));

    if (historyOrders.length === 0) return res.json([]);

    const orderIds = historyOrders.map(o => o.id);
    const files = await db.select().from(order_files).where(inArray(order_files.order_id, orderIds));

    const result = historyOrders.map(order => ({
      ...order,
      files: files.filter(f => f.order_id === order.id).map(f => ({
        filename: f.file_url.split('/').pop(),
        pages: f.pages,
        copies: f.copies,
        color: f.color
      }))
    }));

    res.json(result);

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 6. GET ACTIVE ORDER
export const getUserActiveOrder = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.query.user_id);
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const [activeOrder] = await db.select({
        id: orders.id,
        status: orders.status,
        shop_id: orders.shop_id,
        total_amount: orders.total_amount,
        created_at: orders.created_at,
        shop_name: shops.name
      })
      .from(orders)
      .leftJoin(shops, eq(orders.shop_id, shops.id))
      .where(and(
        eq(orders.user_id, userId),
        inArray(orders.status, ["QUEUED", "PRINTING"])
      ))
      .orderBy(desc(orders.created_at))
      .limit(1);

    if (!activeOrder) return res.json(null);

    const [queueResult] = await db.select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(and(
        eq(orders.shop_id, activeOrder.shop_id),
        inArray(orders.status, ["QUEUED", "PRINTING"]),
        lt(orders.id, activeOrder.id)
      ));

    const files = await db.select().from(order_files).where(eq(order_files.order_id, activeOrder.id));
    const totalFiles = files.length;
    const isColor = files.some(f => f.color);

    res.json({
      id: activeOrder.id,
      status: activeOrder.status,
      shop_name: activeOrder.shop_name,
      queue_position: Number(queueResult.count) + 1, 
      file_count: totalFiles,
      has_color: isColor,
      total_amount: activeOrder.total_amount,
      created_at: activeOrder.created_at
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const confirmOrder = async (req: Request, res: Response) => { res.status(410).json({error: "Deprecated in Mock Mode"}); };