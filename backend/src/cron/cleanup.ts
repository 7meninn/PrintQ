import fs from "fs";
import path from "path";
import cron from "node-cron";
import { db } from "../db/connection";
import { order_files } from "../db/schema";
import { sql } from "drizzle-orm";

const UPLOADS_DIR = path.join(__dirname, "../../uploads");

// Helper: Check if file exists in DB
const isFileInDb = async (filename: string) => {
  // We store URLs like "/uploads/filename.pdf", so we search for that
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(order_files)
    .where(sql`${order_files.file_url} LIKE ${`%${filename}`}`); // Check if filename is in URL

  return Number(result[0].count) > 0;
};

export const startCleanupJob = () => {
  // Run every night at midnight: "0 0 * * *"
  // For testing, let's run every 1 hour: "0 * * * *"
  cron.schedule("0 * * * *", async () => {
    console.log("🧹 Running Cleanup Job: Checking for orphaned files...");

    try {
      if (!fs.existsSync(UPLOADS_DIR)) return;

      const files = fs.readdirSync(UPLOADS_DIR);
      const now = Date.now();
      const ONE_DAY = 24 * 60 * 60 * 1000; // 24 Hours

      for (const file of files) {
        const filePath = path.join(UPLOADS_DIR, file);
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtimeMs;

        // 1. Only check files older than 24 hours (give users time to complete order)
        if (fileAge > ONE_DAY) {
          
          // 2. Check if this file is actually attached to a paid order
          const isLinked = await isFileInDb(file);

          if (!isLinked) {
            // 3. Delete Orphan
            console.log(`🗑️ Deleting orphaned file: ${file}`);
            fs.unlinkSync(filePath);
          }
        }
      }
    } catch (err) {
      console.error("Cleanup Job Failed:", err);
    }
  });
};