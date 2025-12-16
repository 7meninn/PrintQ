import cron from "node-cron";
import { db } from "../db/connection";
import { order_files, orders } from "../db/schema";
import { eq } from "drizzle-orm";
import { deleteFileFromAzure, listFilesFromAzure } from "../services/storage.service";

const shouldKeepFile = async (azureUrl: string, fileAgeMs: number) => {
  const fileRecord = await db
    .select({ 
        orderId: order_files.order_id 
    })
    .from(order_files)
    .where(eq(order_files.file_url, azureUrl))
    .limit(1);

  if (fileRecord.length === 0) return false;

  const orderId = fileRecord[0].orderId;
  if (!orderId) return false; 

  // 2. Check Order Status
  const order = await db
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (order.length === 0) return false; // Order deleted? Delete file.

  const status = order[0].status;

  if (status === 'QUEUED' || status === 'PRINTING') {
      return true; 
  }
  const DRAFT_TTL = 60 * 60 * 1000; 
  
  if (status === 'DRAFT') {
      if (fileAgeMs < DRAFT_TTL) return true;
      return false;
  }
  if (status === 'CANCELLED' || status === 'COMPLETED' || status === 'FAILED') {
      return false; 
  }

  return false; // Default delete (safeguard)
};

export const startCleanupJob = () => {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    console.log("🧹 Cloud Cleanup: Checking for deletable blobs...");

    try {
      const files = await listFilesFromAzure();
      const now = Date.now();
      const SAFETY_BUFFER = 60 * 1000; 

      for (const file of files) {
        if (!file.createdOn) continue;
        
        const fileAge = now - file.createdOn.getTime();
        if (fileAge < SAFETY_BUFFER) continue;
        const keep = await shouldKeepFile(file.url, fileAge);

        if (!keep) {
            console.log(`🗑️ Deleting file: ${file.name}`);
            await deleteFileFromAzure(file.url);
        }
      }
    } catch (err) {
      console.error("Cleanup Error:", err);
    }
  });
};