import { Request, Response } from "express";
import { db } from "../db/connection";
import { orders, order_files } from "../db/schema";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import { exec } from "child_process";
import path from "path";

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

// Helper: Convert DOCX to PDF using LibreOffice (Docker)
function convertDocxToPdf(inputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const absoluteInput = path.resolve(inputPath);
    const outDir = path.dirname(absoluteInput);
    // LibreOffice replaces extension with .pdf
    const outputPath = absoluteInput.replace(path.extname(absoluteInput), ".pdf");

    const cmd = `soffice --headless --convert-to pdf --outdir "${outDir}" "${absoluteInput}"`;

    exec(cmd, (error) => {
      if (error) return reject(error);
      if (!fs.existsSync(outputPath)) {
        return reject(new Error(`LibreOffice failed to generate PDF at: ${outputPath}`));
      }
      resolve(outputPath);
    });
  });
}

// 🟢 API: Prepare Order (Preview)
// Receives: Files + JSON Config (copies/color for each file)
export const prepareOrder = async (req: Request, res: Response) => {
  try {
    const files = req.files as unknown as MulterFile[];
    
    // Parse the config array sent from frontend (FormData)
    const configStr = req.body.config; 
    const configs: FileConfig[] = configStr ? JSON.parse(configStr) : [];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
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
      const fileConfig = configs[i] || { color: false, copies: 1 }; // Default fallback

      const filePath = file.path;
      const ext = file.originalname.split(".").pop()?.toLowerCase();
      let detectedPages = 1;

      try {
        // 1. Count Pages
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
          fs.unlinkSync(pdfPath); // Cleanup temp PDF
        }
        // Images default to 1 page
      } catch (err) {
        console.error(`Error processing ${file.originalname}:`, err);
        detectedPages = 1; // Fallback
      }

      // 2. Calculate Totals for this file
      const calculatedPages = detectedPages * fileConfig.copies;
      const cost = calculatedPages * (fileConfig.color ? COLOR_PRICE : BW_PRICE);

      // 3. Update Summary
      if (fileConfig.color) {
        summary.total_color_pages += calculatedPages;
        summary.color_cost += cost;
      } else {
        summary.total_bw_pages += calculatedPages;
        summary.bw_cost += cost;
      }

      processedFiles.push({
        original_name: file.originalname,
        file_type: ext || "unknown",
        detected_pages: detectedPages,
        calculated_pages: calculatedPages,
        cost: cost,
        color: fileConfig.color,
        file_url: `/uploads/${file.filename}` // Store this to return to frontend
      });
    }

    summary.total_amount = summary.bw_cost + summary.color_cost;

    // Return the exact structure the frontend expects
    return res.json({
      files: processedFiles,
      summary
    });

  } catch (err) {
    console.error("prepareOrder error:", err);
    res.status(500).json({ error: "Failed to calculate preview" });
  }
};

// 🟢 API: Create Order (Finalize)
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { user_id, shop_id, total_amount, files } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "Order data required" });
    }

    // 1. Create Order Record
    const [newOrder] = await db
      .insert(orders)
      .values({
        user_id: Number(user_id),
        shop_id: Number(shop_id),
        total_amount: String(total_amount), // Drizzle decimal is string in JS
        status: "QUEUED",
      } as any)
      .returning();

    // 2. Insert File Records
    // 'files' here is the array returned from the preview step, now confirmed by user
    for (const f of files) {
      await db.insert(order_files).values({
        order_id: newOrder.id,
        file_url: f.file_url,
        file_type: f.file_type,
        pages: f.detected_pages,
        copies: f.calculated_pages / f.detected_pages, // Deriving copies back
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

// ... (Other getters like getUserOrders can remain the same)