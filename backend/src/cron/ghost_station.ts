import cron from "node-cron";
import { db } from "../db/connection";
import { shops } from "../db/schema";
import { eq } from "drizzle-orm";

const GHOST_SHOP_NAME = "Razorpay Test Station";

/**
 * Ensures the ghost station for testing/verification exists.
 * If it doesn't, it creates it.
 * @returns The shop object.
 */
const ensureGhostStationExists = async () => {
    try {
        let shop = await db.query.shops.findFirst({
            where: eq(shops.name, GHOST_SHOP_NAME),
        });

        if (!shop) {
            console.log(`👻 Creating ghost station: ${GHOST_SHOP_NAME}`);
            [shop] = await db.insert(shops).values({
                name: GHOST_SHOP_NAME,
                location: "Virtual",
                password: "razorpay_verification", // Set a dummy password
                upi_id: "verification@razorpay", // Set a dummy UPI
                has_bw: true,
                has_color: true,
                last_heartbeat: new Date(),
            }).returning();
        }
        return shop;
    } catch (dbError) {
        console.error("👻 Ghost Station DB Error:", dbError.message);
        return null;
    }
};

/**
 * Updates the heartbeat of the given shop to the current time.
 * @param shop The shop to update.
 */
const pumpHeartbeat = async (shop) => {
    if (!shop) return;
    try {
        await db.update(shops)
            .set({ last_heartbeat: new Date() })
            .where(eq(shops.id, shop.id));
        // console.log(`👻 Pumped heartbeat for ${GHOST_SHOP_NAME} (ID: ${shop.id})`); // Uncomment for debugging
    } catch (error) {
        console.error("Error pumping ghost heartbeat:", error);
    }
};

/**
 * Starts the cron job to keep the ghost station online.
 */
export const startGhostStationJob = async () => {
    try {
        const shop = await ensureGhostStationExists();
        
        // Run every 10 seconds
        cron.schedule("*/10 * * * * *", () => {
            pumpHeartbeat(shop);
        });

        console.log("👻 Ghost Station Job started. A test station will always be online for verification.");
    } catch(err) {
        console.error("❌ Failed to start Ghost Station Job:", err);
    }
};
