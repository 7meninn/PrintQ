import { Request, Response } from "express";
import { db } from "../db/connection";
import { orders, order_files, shops, users } from "../db/schema";
import { eq } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";
import { sendOrderPlacedEmail } from "../services/email.service";
import { createRazorpayOrder, verifyPaymentSignature } from "../services/payment.service";
import { uploadFileToAzure } from "../services/storage.service"; 

interface MulterFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

interface FileConfig {
  color: boolean;
  copies: number;
}

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

    const processedFiles = [];
    
    // ✅ NEW PRICING CONSTANTS
    const BW_PRICE = 2;
    const COLOR_PRICE = 15;
    const SERVICE_CHARGE_PERCENTAGE = 0.25; // 25%
    const MAX_SERVICE_CHARGE = 30; // Max Cap

    let summary = {
      total_bw_pages: 0,
      total_color_pages: 0,
      bw_cost: 0,
      color_cost: 0,
      print_cost: 0,    // Pure cost of printing
      service_charge: 0, // The 25% fee
      total_amount: 0   // Final payable
    };

    // 1. Process Files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const conf = configs[i] || { color: false, copies: 1 };
      
      let detectedPages = 1;
      try {
        if (file.mimetype === 'application/pdf') {
          const pdfDoc = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
          detectedPages = pdfDoc.getPageCount();
        } 
      } catch (err) {
        console.error(`Error counting pages:`, err);
      }

      // Upload to Azure
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

    // ✅ CALCULATE FINAL TOTALS
    summary.print_cost = summary.bw_cost + summary.color_cost;
    
    // 🔹 Updated Logic: Service Charge = min(25% of print_cost, 30)
    const rawServiceCharge = summary.print_cost * SERVICE_CHARGE_PERCENTAGE;
    summary.service_charge = Math.ceil(Math.min(rawServiceCharge, MAX_SERVICE_CHARGE));

    summary.total_amount = summary.print_cost + summary.service_charge;

    // 2. Create Draft Order
    const [draftOrder] = await db.insert(orders).values({
        user_id: userId,
        shop_id: shopId,
        total_amount: String(summary.total_amount),
        status: "DRAFT",
    } as any).returning();

    // 3. Link Files
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

// 🟢 PAYMENT INITIATE (Secure)
export const initiatePayment = async (req: Request, res: Response) => {
  try {
    const { order_id } = req.body; 

    // Validate ID
    if (!order_id || isNaN(Number(order_id))) {
        return res.status(400).json({ error: "Invalid Order ID" });
    }

    // 1. Fetch Order from DB (Source of Truth)
    const order = await db.query.orders.findFirst({
        where: eq(orders.id, Number(order_id))
    });

    if (!order) return res.status(404).json({ error: "Order not found" });

    // 2. 🔒 SECURITY: Use DB Amount, ignore frontend amount
    const amount = Number(order.total_amount);
    
    // 3. Create Razorpay Order
    const rzOrder = await createRazorpayOrder(amount);
    
    await db.update(orders)
        .set({ razorpay_order_id: rzOrder.id })
        .where(eq(orders.id, order.id));
    
    res.json({ 
      success: true, 
      razorpay_order_id: rzOrder.id, 
      amount: rzOrder.amount, // Returns amount in paise
      key_id: process.env.RAZORPAY_KEY_ID 
    });

  } catch (err: any) {
    console.error("Payment Init Error:", err);
    res.status(500).json({ error: "Could not initiate payment" });
  }
};

// 🟢 CONFIRM ORDER
export const confirmOrder = async (req: Request, res: Response) => {
  try {
    const { 
      order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = req.body;

    const order = await db.query.orders.findFirst({ where: eq(orders.id, order_id) });
    if (!order || !order.razorpay_order_id) {
        return res.status(400).json({ error: "Invalid order state" });
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

export const createOrder = async (req: Request, res: Response) => { res.status(410).json({error: "Deprecated"}); };