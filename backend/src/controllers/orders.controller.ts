import { Request, Response } from "express";
import { db } from "../db/connection";
import { orders, order_files } from "../db/schema";
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

function convertDocxToPdf(inputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const absoluteInput = path.resolve(inputPath); // full path
    const outDir = path.dirname(absoluteInput);    // same folder
    
    // ✅ FIX: LibreOffice REPLACES the extension, it does not append it.
    // Input:  myfile.docx
    // Output: myfile.pdf (NOT myfile.docx.pdf)
    const outputPath = absoluteInput.replace(path.extname(absoluteInput), ".pdf");

    const cmd = `soffice --headless --convert-to pdf --outdir "${outDir}" "${absoluteInput}"`;

    exec(cmd, (error) => {
      if (error) return reject(error);

      // Extra safety check: ensure the file actually exists before returning
      if (!fs.existsSync(outputPath)) {
        return reject(new Error(`LibreOffice failed to generate PDF at: ${outputPath}`));
      }

      resolve(outputPath);
    });
  });
}

export const prepareOrder = async (req: Request, res: Response) => {
  try {
    const files = req.files as unknown as MulterFile[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const results: any[] = [];

    for (let file of files) {
      const filePath = file.path;
      const ext = file.originalname.split(".").pop()?.toLowerCase();
      let pages = 1;

      try {
        // PDF
        if (ext === "pdf") {
          const buffer = fs.readFileSync(filePath);
          const pdfDoc = await PDFDocument.load(buffer);
          pages = pdfDoc.getPageCount();
        }

        // DOCX
        else if (ext === "doc" || ext === "docx") {
          const pdfPath = await convertDocxToPdf(filePath);

          const pdfBuffer = fs.readFileSync(pdfPath);
          const pdfDoc = await PDFDocument.load(pdfBuffer);

          pages = pdfDoc.getPageCount();

          // ✅ Clean up the temporary PDF created by LibreOffice
          fs.unlinkSync(pdfPath); 
        }

        // Images
        else if (["jpg", "jpeg", "png", "gif"].includes(ext!)) {
          pages = 1;
        }

      } catch (err) {
        console.error("Counting error:", err);
        pages = 1;
      }

      results.push({
        file_url: "/" + file.path.replace(/\\/g, "/"),
        pages,
        type: ext,
      });
    }

    const total_pages = results.reduce((sum, f) => sum + f.pages, 0);

    return res.json({
      files: results,
      total_pages,
    });
  } catch (err) {
    console.error("prepareOrder error:", err);
    res.status(500).json({ error: "Failed to prepare order" });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const {
      user_id,
      shop_id,
      copies,
      files
    } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "Files data required" });
    }

    // Handle stringified JSON from mobile/form-data
    const fileArray = typeof files === "string" ? JSON.parse(files) : files;

    let color_pages = 0;
    let bw_pages = 0;

    // Calculate pages breakdown
    fileArray.forEach((f: any) => {
      const pageCount = Number(f.pages) || 1;
      if (f.color) color_pages += pageCount;
      else bw_pages += pageCount;
    });

    const price_bw = 3;
    const price_color = 15;

    const amount =
      (bw_pages * price_bw + color_pages * price_color) * Number(copies);

    // 1️⃣ Insert into ORDERS TABLE
    const [order] = await db
      .insert(orders)
      .values({
        user_id: Number(user_id),
        shop_id: Number(shop_id),
        copies: Number(copies),
        color_pages,
        bw_pages,
        amount,
        status: "QUEUED",
      } as any)
      .returning();

    const orderId = order.id;

    // 2️⃣ Insert EACH FILE into order_files table
    for (const f of fileArray) {
      await db.insert(order_files).values({
        order_id: orderId,
        file_url: f.file_url,
        pages: f.pages,
        file_type: f.type,
        color: f.color,
      } as any);
    }

    return res.json({
      success: true,
      order_id: orderId,
      amount,
      color_pages,
      bw_pages,
      copies,
    });
  } catch (err: any) {
    console.error("Create Order Error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getUserOrders = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.userId);
    const data = await db.select().from(orders).where(eq(orders.user_id, id));
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getShopOrders = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.shopId);
    const data = await db.select().from(orders).where(eq(orders.shop_id, id));
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    const updated = await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();

    res.json({ success: true, order: updated[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};