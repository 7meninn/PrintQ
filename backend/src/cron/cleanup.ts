import cron from "node-cron";
import { db } from "../db/connection";
import { order_files, orders } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { deleteFileFromAzure, listFilesFromAzure } from "../services/storage.service";

const shouldKeepFile = async (azureUrl: string) => {
  const fileRecord = await db
    .select({ 
        orderId: order_files.order_id 
    })
    .from(order_files)
    .where(eq(order_files.file_url, azureUrl))
    .limit(1);

  // If not in DB, it's an orphan -> Delete (Return false)
  if (fileRecord.length === 0) return false;

  const orderId = fileRecord[0].orderId;
  
  if (!orderId) return false; // Should not happen given schema, but safe check

  // 2. Check the Order Status
  const order = await db
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (order.length === 0) return false; // Order deleted? Delete file.

  const status = order[0].status;

  // 3. Logic: Keep only if Active
  // Active statuses: QUEUED, PRINTING
  // Delete if: COMPLETED, FAILED, REFUNDED
  if (status === 'QUEUED' || status === 'PRINTING' || status === "DRAFT") {
      return true; // Keep it
  }

  return false; // Delete it
};

export const startCleanupJob = () => {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    console.log("🧹 Cloud Cleanup: Checking for deletable blobs...");

    try {
      const files = await listFilesFromAzure();
      const now = Date.now();
      // const TIME_LIMIT = 24 * 60 * 60 * 1000; // 24 Hours (Production)
      const TIME_LIMIT = 3 * 60 * 1000; // 3 Minutes (Testing)

      for (const file of files) {
        if (!file.createdOn) continue;
        
        const fileAge = now - file.createdOn.getTime();

        if (fileAge > TIME_LIMIT) {
            // Check comprehensive logic
            const keep = await shouldKeepFile(file.url);

            if (!keep) {
                console.log(`🗑️ Deleting file: ${file.name}`);
                await deleteFileFromAzure(file.url);
            } else {
                // console.log(`🛡️ Keeping active file: ${file.name}`);
            }
        }
      }
    } catch (err) {
      console.error("Cleanup Error:", err);
    }
  });
};