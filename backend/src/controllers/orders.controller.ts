import { Request, Response } from "express";
import { db } from "../db/connection";
import { orders, order_files, shops, users } from "../db/schema";
import { eq } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import { sendOrderPlacedEmail } from "../services/email.service";
import { createRazorpayOrder, verifyPaymentSignature } from "../services/payment.service";

interface MulterFile {
  path: string;
  originalname: string;
  filename: string;
  mimetype: string;
}

interface FileConfig {
  color: boolean;
  copies: number;
}

// 🟢 PREVIEW API
export const prepareOrder = async (req: Request, res: Response) => {
  try {
    const files = req.files as unknown as MulterFile[];
    const configStr = req.body.config;
    const shopId = Number(req.body.shop_id);

    const configs: FileConfig[] = configStr ? JSON.parse(configStr) : [];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files received" });
    }

    if (!shopId) {
      return res.status(400).json({ error: "Shop ID is required for pricing" });
    }

    const shop = await db.query.shops.findFirst({
        where: eq(shops.id, shopId)
    });

    if (!shop) {
        return res.status(404).json({ error: "Selected shop not found" });
    }

    const processedFiles = [];
    let summary = {
      total_bw_pages: 0,
      total_color_pages: 0,
      bw_cost: 0,
      color_cost: 0,
      total_amount: 0
    };

    const BW_PRICE = 3;
    const COLOR_PRICE = 15;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const conf = configs[i] || { color: false, copies: 1 };
      const filePath = file.path;
      
      let detectedPages = 1;

      try {
        // ✅ Efficient PDF Page Counting
        if (file.mimetype === 'application/pdf') {
          const buffer = fs.readFileSync(filePath);
          // 'ignoreEncryption' allows counting pages even if PDF is password protected
          const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
          detectedPages = pdfDoc.getPageCount();
        } 
        // For Images (png, jpg), detectedPages remains 1, which is correct.
      } catch (err) {
        console.error(`Error counting pages for ${file.originalname}:`, err);
        // Fallback to 1 page if file is corrupted or unreadable
        detectedPages = 1; 
      }

      const calculatedPages = detectedPages * conf.copies;
      
      // 💰 Pricing Logic
      let pricePerSheet = conf.color ? COLOR_PRICE : BW_PRICE;
      
      const cost = calculatedPages * pricePerSheet;

      if (conf.color) {
        summary.total_color_pages += calculatedPages;
        summary.color_cost += cost;
      } else {
        summary.total_bw_pages += calculatedPages;
        summary.bw_cost += cost;
      }

      processedFiles.push({
        original_name: file.originalname,
        file_type: file.mimetype.split('/')[1] || 'file', // e.g. 'pdf', 'png'
        detected_pages: detectedPages,
        calculated_pages: calculatedPages,
        cost: cost,
        color: conf.color,
        file_url: `/uploads/${file.filename}` 
      });
    }

    summary.total_amount = summary.bw_cost + summary.color_cost;

    res.json({ files: processedFiles, summary });

  } catch (err) {
    console.error("Prepare Order Error:", err);
    res.status(500).json({ error: "Failed to process files" });
  }
};

export const initiatePayment = async (req: Request, res: Response) => {
  try {
    const { total_amount } = req.body;

    // In a real app, you should re-calculate total_amount here to prevent tampering.
    // For now, we trust the preview calculation passed from frontend.
    
    const rzOrder = await createRazorpayOrder(Number(total_amount));
    
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

// 🟢 CREATE API (Remains standard)
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { 
      user_id, shop_id, total_amount, files,
      razorpay_order_id, razorpay_payment_id, razorpay_signature // ✅ New Fields
    } = req.body;

    // 1. Verify Signature
    const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
        return res.status(400).json({ error: "Payment verification failed. Invalid signature." });
    }

    // 2. Create Order in DB
    const [newOrder] = await db
      .insert(orders)
      .values({
        user_id: Number(user_id),
        shop_id: Number(shop_id),
        total_amount: String(total_amount),
        status: "QUEUED",
        razorpay_order_id,    // ✅ Save IDs for refunds later
        razorpay_payment_id,  // ✅
      } as any)
      .returning();

    // 3. Link Files
    for (const f of files) {
      await db.insert(order_files).values({
        order_id: newOrder.id,
        file_url: f.file_url,
        file_type: f.file_type,
        pages: f.detected_pages,
        copies: f.calculated_pages / f.detected_pages,
        color: f.color,
        cost: String(f.cost),
      } as any);
    }

    // 4. Email
    const user = await db.query.users.findFirst({ where: eq(users.id, Number(user_id)) });
    if (user) {
        sendOrderPlacedEmail(user.email, newOrder.id, String(total_amount));
    }

    res.json({ success: true, order_id: newOrder.id });

  } catch (err: any) {
    console.error("Create Order Error:", err);
    res.status(500).json({ error: err.message });
  }
};