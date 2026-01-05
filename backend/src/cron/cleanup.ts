import cron from "node-cron";
import { db } from "../db/connection";
import { order_files, orders } from "../db/schema";
import { inArray, or, eq, and } from "drizzle-orm";
import { deleteFileFromAzure, listFilesFromAzure } from "../services/storage.service";

export const startCleanupJob = () => {
  // Run every 3 minutes
  cron.schedule("*/3 * * * *", async () => {
    console.log("🧹 Cloud Cleanup: Starting 3-minute job...");

    try {
      // --- Stage 1: Fast, Status-Based Cleanup ---
      const terminalOrders = await db
        .select({ id: orders.id })
        .from(orders)
        .where(
          or(
            eq(orders.status, 'COMPLETED'),
            eq(orders.status, 'FAILED'),
            eq(orders.status, 'CANCELLED')
          )
        );

      if (terminalOrders.length > 0) {
        const orderIds = terminalOrders.map(o => o.id);
        
        const filesToClean = await db
          .select({ id: order_files.id, file_url: order_files.file_url })
          .from(order_files)
          .where(and(
              inArray(order_files.order_id, orderIds),
              eq(order_files.is_deleted_from_storage, false) // Only select records that haven't been cleaned
          ));

        if (filesToClean.length > 0) {
            console.log(`🧹 [Stage 1] Found ${filesToClean.length} files from terminal orders to process.`);
            
            // Delete from Azure
            for (const file of filesToClean) {
                if (file.file_url) await deleteFileFromAzure(file.file_url);
            }

            // "Mark" as cleaned by setting the flag
            const fileIdsToUpdate = filesToClean.map(f => f.id);
            await db.update(order_files)
              .set({ is_deleted_from_storage: true })
              .where(inArray(order_files.id, fileIdsToUpdate));
            
            console.log(`🧹 [Stage 1] Cleaned ${filesToClean.length} files and updated DB records.`);
        }
      }
      
      // --- Stage 2: Time-Based Failsafe Cleanup ---
      console.log("🧹 [Stage 2] Scanning all blobs for files older than 24 hours...");
      const allAzureFiles = await listFilesFromAzure();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      let oldFileCount = 0;

      for (const file of allAzureFiles) {
        if (file.createdOn && file.createdOn < oneDayAgo) {
          console.log(`🧹 [Stage 2] Deleting old file: ${file.name}`);
          await deleteFileFromAzure(file.url);
          oldFileCount++;
        }
      }
      
      if (oldFileCount > 0) {
          console.log(`🧹 [Stage 2] Successfully deleted ${oldFileCount} files older than 24 hours.`);
      } else {
          console.log("🧹 [Stage 2] No files older than 24 hours found.");
      }
      
      console.log("🧹 Cloud Cleanup: Job finished.");

    } catch (err) {
      console.error("❌ Cleanup Job Error:", err);
    }
  });
};