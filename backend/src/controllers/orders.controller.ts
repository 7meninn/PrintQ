import { Request, Response } from "express";
import { db } from "../db/connection";
import { orders, order_files, shops, users } from "../db/schema";
import { eq } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";
import { createSeparatorPdf } from "../services/separator.service";
import { sendOrderPlacedEmail } from "../services/email.service";
import { createRazorpayOrder, verifyPaymentSignature } from "../services/payment.service";
import { uploadFileToAzure } from "../services/storage.service";
import { and, inArray, sql, lt, desc } from "drizzle-orm";

interface MulterFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

interface FileConfig {
  color: boolean;
  copies: number;
  paper_size?: string;
}

export const prepareOrder = async (req: Request, res: Response) => {
  try {
    const files = req.files as unknown as MulterFile[];
    const configStr = req.body.config;
    const shopId = Number(req.body.shop_id);
    const userId = Number(req.body.user_id);
    const studentName = typeof req.body.student_name === "string" ? req.body.student_name : "";

    const configs: FileConfig[] = configStr ? JSON.parse(configStr) : [];
    
    if (!files || files.length === 0) return res.status(400).json({ error: "No files received" });
    if (files.length !== configs.length) return res.status(400).json({ error: "File and configuration count mismatch."});
    if (!shopId) return res.status(400).json({ error: "Shop ID required" });
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const shop = await db.query.shops.findFirst({ where: eq(shops.id, shopId) });
    if (!shop) return res.status(404).json({ error: "Selected shop not found" });

    const normalizedConfigs: FileConfig[] = files.map((_, i) => {
      const conf = configs[i] || { color: false, copies: 1, paper_size: "A4" };
      const paperSize = typeof conf.paper_size === "string" && conf.paper_size.toUpperCase() === "A3" ? "A3" : "A4";
      const copies = Number(conf.copies) > 0 ? Number(conf.copies) : 1;
      return { color: !!conf.color, copies, paper_size: paperSize };
    });

    const needsA3Color = normalizedConfigs.some(c => c.paper_size === "A3" && c.color);
    const needsA3BW = normalizedConfigs.some(c => c.paper_size === "A3" && !c.color);
    const needsA4Color = normalizedConfigs.some(c => c.paper_size === "A4" && c.color);
    const needsA4BW = normalizedConfigs.some(c => c.paper_size === "A4" && !c.color);

    const supportsA4Color = !!shop.has_color;
    const supportsA4BW = !!shop.has_bw;
    const supportsA3Color = !!shop.has_color_a3;
    const supportsA3BW = !!shop.has_bw_a3;

    if (needsA4Color && !supportsA4Color) {
      return res.status(400).json({ error: "Selected shop does not support A4 color printing." });
    }
    if (needsA4BW && !supportsA4BW) {
      return res.status(400).json({ error: "Selected shop does not support A4 B/W printing." });
    }
    if (needsA3Color && !supportsA3Color) {
      return res.status(400).json({ error: "Selected shop does not support A3 color printing." });
    }
    if (needsA3BW && !supportsA3BW) {
      return res.status(400).json({ error: "Selected shop does not support A3 B/W printing." });
    }

    const BW_PRICE = 2;
    const COLOR_PRICE = 12;
    const SERVICE_CHARGE_PERCENTAGE = 0.04; // 4%
    const hasA4Printer = !!shop.has_bw || !!shop.has_color;
    const separatorPaperSize = "A4";
    const separatorIsColor = false;
    const separatorPrice = BW_PRICE;

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

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const conf = normalizedConfigs[i];
      const paperSize = conf.paper_size === "A3" ? "A3" : "A4";
      
      let detectedPages = 1;
      try {
        if (file.mimetype === 'application/pdf') {
          const pdfDoc = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
          detectedPages = pdfDoc.getPageCount();
        } 
      } catch (err) {
        console.error(`Error counting pages:`, err);
      }

      const azureUrl = await uploadFileToAzure(file.buffer, file.originalname);
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
        paper_size: paperSize,
        file_url: azureUrl 
      });
    }

    if (hasA4Printer) {
      if (separatorIsColor) {
        summary.total_color_pages += 1;
        summary.color_cost += separatorPrice;
      } else {
        summary.total_bw_pages += 1;
        summary.bw_cost += separatorPrice;
      }
    }

    summary.print_cost = summary.bw_cost + summary.color_cost;
    summary.service_charge = Math.ceil(summary.print_cost * SERVICE_CHARGE_PERCENTAGE);
    summary.total_amount = summary.print_cost + summary.service_charge;


    const [draftOrder] = await db.insert(orders).values({
        user_id: userId,
        shop_id: shopId,
        total_amount: String(summary.total_amount),
        status: "DRAFT",
    } as any).returning();

    if (hasA4Printer) {
      const separatorBuffer = await createSeparatorPdf({
          orderId: draftOrder.id,
          studentName: studentName || "Student",
          paperSize: separatorPaperSize
      });
      const separatorFileName = `000_separator_order_${draftOrder.id}.pdf`;
      const separatorUrl = await uploadFileToAzure(separatorBuffer, separatorFileName, separatorFileName);

      await db.insert(order_files).values({
          order_id: draftOrder.id,
          file_url: separatorUrl,
          file_type: "pdf",
          pages: 1,
          copies: 1,
          color: separatorIsColor,
          paper_size: separatorPaperSize,
          cost: String(separatorPrice),
      } as any);
    }

    for (const f of processedFiles) {
        await db.insert(order_files).values({
            order_id: draftOrder.id,
            file_url: f.file_url,
            file_type: f.file_type,
            pages: f.detected_pages,
            copies: f.calculated_pages / f.detected_pages,
            color: f.color,
            paper_size: f.paper_size,
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

export const initiatePayment = async (req: Request, res: Response) => {
  try {
    const { order_id, user_id } = req.body; 

    if (!order_id || isNaN(Number(order_id))) {
        return res.status(400).json({ error: "Invalid Order ID" });
    }

    const order = await db.query.orders.findFirst({
        where: eq(orders.id, Number(order_id))
    });

    if (!order) return res.status(404).json({ error: "Order not found" });
    if (!user_id || Number(user_id) !== order.user_id) {
        return res.status(403).json({ error: "Unauthorized payment request" });
    }


    const amount = Number(order.total_amount);
    

    const rzOrder = await createRazorpayOrder(amount);
    
    await db.update(orders)
        .set({ razorpay_order_id: rzOrder.id })
        .where(eq(orders.id, order.id));
    
    res.json({ 
      success: true, 
      razorpay_order_id: rzOrder.id, 
      amount: rzOrder.amount,
      key_id: process.env.RAZORPAY_KEY_ID 
    });

  } catch (err: any) {
    console.error("Payment Init Error:", err);
    res.status(500).json({ error: "Could not initiate payment" });
  }
};

export const cancelOrder = async (req: Request, res: Response) => {
    try {
    const { order_id, user_id } = req.body;
    if (!order_id) return res.status(400).json({ error: "Order ID required" });

    const order = await db.query.orders.findFirst({ where: eq(orders.id, order_id) });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (!user_id || Number(user_id) !== order.user_id) {
        return res.status(403).json({ error: "Unauthorized cancellation" });
    }

    await db.update(orders)
        .set({ status: "CANCELLED" })
        .where(eq(orders.id, order_id));

        console.log(`Order #${order_id} cancelled by user.`);
        res.json({ success: true });
    } catch (err: any) {
        console.error("Cancel Order Error:", err);
        res.status(500).json({ error: err.message });
    }
};

export const confirmOrder = async (req: Request, res: Response) => {
  try {
    const { 
      order_id, 
      user_id,
      razorpay_payment_id, 
      razorpay_signature 
    } = req.body;

    const order = await db.query.orders.findFirst({ where: eq(orders.id, order_id) });
    if (!order || !order.razorpay_order_id) {
        return res.status(400).json({ error: "Invalid order state" });
    }

    if (!user_id || Number(user_id) !== order.user_id) {
        return res.status(403).json({ error: "Unauthorized order confirmation" });
    }
    
    // Security: Ensure order is in DRAFT state before confirming
    if (order.status !== 'DRAFT') {
        return res.status(400).json({ error: "Order has already been processed." });
    }

    const isValid = verifyPaymentSignature(
        order.razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature
    );

    if (!isValid) {
        return res.status(400).json({ error: "Payment verification failed." });
    }

    await db.update(orders).set({
        status: "QUEUED",
        razorpay_payment_id: razorpay_payment_id
    }).where(eq(orders.id, order_id));

    const user = await db.query.users.findFirst({ where: eq(users.id, order.user_id) });
    if (user) {
        sendOrderPlacedEmail(user.email, order.id, String(order.total_amount));
    }

    res.json({ success: true, order_id: order.id });

  } catch (err: any) {
    console.error("Confirm Order Error:", err);
    res.status(500).json({ error: err.message });
  }
};

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
        inArray(orders.status, ["COMPLETED", "FAILED", "REFUNDED"]),
        sql`DATE(${orders.created_at}) = ${dateStr}`
      ))
      .orderBy(desc(orders.created_at));

    if (historyOrders.length === 0) return res.json([]);

    // Fetch files
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

export const getUserActiveOrder = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.query.user_id);
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const activeOrders = await db.select({
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
      .orderBy(desc(orders.created_at));

    if (activeOrders.length === 0) return res.json([]);

    const shopIds = Array.from(new Set(activeOrders.map(order => order.shop_id)));
    const queueCounts = await db.select({
        shop_id: orders.shop_id,
        count: sql<number>`count(*)`
      })
      .from(orders)
      .where(and(
        inArray(orders.shop_id, shopIds),
        inArray(orders.status, ["QUEUED", "PRINTING"])
      ))
      .groupBy(orders.shop_id);

    const files = await db.select().from(order_files).where(inArray(order_files.order_id, activeOrders.map(o => o.id)));

    const result = activeOrders.map(order => {
      const totalFiles = files.filter(f => f.order_id === order.id);
      const isColor = totalFiles.some(f => f.color);
      const shopActiveOrders = activeOrders
        .filter(o => o.shop_id === order.shop_id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const queueIndex = shopActiveOrders.findIndex(o => o.id === order.id);
      return {
        id: order.id,
        status: order.status,
        shop_name: order.shop_name,
        queue_position: queueIndex >= 0 ? queueIndex + 1 : 0,
        file_count: totalFiles.length,
        has_color: isColor,
        total_amount: order.total_amount,
        created_at: order.created_at
      };
    });

    res.json(result);

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createOrder = async (req: Request, res: Response) => { res.status(410).json({error: "Deprecated"}); };
