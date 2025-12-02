import { Request, Response } from "express";
import { db } from "../db/connection";
import { orders, order_files, shops } from "../db/schema"; // ✅ Added 'shops'
import { eq } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import { exec } from "child_process";
import path from "path";

interface MulterFile {
  path: string;
  originalname: string;
  filename: string;
}

interface FileConfig {
  color: boolean;
  copies: number;
}

function convertDocxToPdf(inputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const absoluteInput = path.resolve(inputPath);
    const outDir = path.dirname(absoluteInput);
    const outputPath = absoluteInput.replace(path.extname(absoluteInput), ".pdf");
    
    const cmd = `soffice --headless --convert-to pdf --outdir "${outDir}" "${absoluteInput}"`;

    exec(cmd, (error) => {
      if (error) return reject(error);
      if (!fs.existsSync(outputPath)) return reject(new Error("PDF conversion failed"));
      resolve(outputPath);
    });
  });
}

// 🟢 PREVIEW API
export const prepareOrder = async (req: Request, res: Response) => {
  try {
    const files = req.files as unknown as MulterFile[];
    const configStr = req.body.config;
    const shopId = Number(req.body.shop_id); // ✅ Get Shop ID

    const configs: FileConfig[] = configStr ? JSON.parse(configStr) : [];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files received" });
    }

    if (!shopId) {
      return res.status(400).json({ error: "Shop ID is required for pricing" });
    }

    // ✅ Fetch Shop Capabilities
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
      const ext = file.originalname.split(".").pop()?.toLowerCase();
      
      let detectedPages = 1;

      try {
        if (ext === "pdf") {
          const buffer = fs.readFileSync(filePath);
          const pdfDoc = await PDFDocument.load(buffer);
          detectedPages = pdfDoc.getPageCount();
        } 
        else if (ext === "docx" || ext === "doc") {
          const pdfPath = await convertDocxToPdf(filePath);
          const pdfBuffer = fs.readFileSync(pdfPath);
          const pdfDoc = await PDFDocument.load(pdfBuffer);
          detectedPages = pdfDoc.getPageCount();
          fs.unlinkSync(pdfPath); 
        }
      } catch (err) {
        console.error(`Error processing ${file.originalname}:`, err);
        detectedPages = 1; 
      }

      const calculatedPages = detectedPages * conf.copies;
      
      // 💰 PRICING LOGIC
      let pricePerSheet = BW_PRICE;
      let isChargedAsColor = false;

      if (conf.color) {
        // User requested Color -> Always Color Price
        pricePerSheet = COLOR_PRICE;
        isChargedAsColor = true;
      } else {
        // User requested B/W -> Check Hardware
        if (shop.has_bw) {
            // Shop has B/W printer -> Standard B/W Price
            pricePerSheet = BW_PRICE;
        } else if (shop.has_color) {
            // Shop ONLY has Color printer -> Charge Color Price
            pricePerSheet = COLOR_PRICE;
            isChargedAsColor = true; // It counts towards color totals financially
        }
      }

      const cost = calculatedPages * pricePerSheet;

      // Update Totals
      if (isChargedAsColor) {
        summary.total_color_pages += calculatedPages;
        summary.color_cost += cost;
      } else {
        summary.total_bw_pages += calculatedPages;
        summary.bw_cost += cost;
      }

      processedFiles.push({
        original_name: file.originalname,
        file_type: ext || "file",
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

// 🟢 CREATE API
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { user_id, shop_id, total_amount, files } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No file data provided" });
    }

    // 1. Create Order
    const [newOrder] = await db
      .insert(orders)
      .values({
        user_id: Number(user_id),
        shop_id: Number(shop_id),
        total_amount: String(total_amount),
        status: "QUEUED",
      } as any)
      .returning();

    // 2. Link Files
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

    res.json({ success: true, order_id: newOrder.id });

  } catch (err: any) {
    console.error("Create Order Error:", err);
    res.status(500).json({ error: err.message });
  }
};