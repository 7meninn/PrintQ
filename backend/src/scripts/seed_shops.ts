import { db } from "../db/connection";
import { shops } from "../db/schema";
import { eq } from "drizzle-orm";

const SEED_SHOPS = [
    { name: "PrintQ Demo (All Printers)", location: "Main Campus - Block A", has_bw: true, has_color: true },
    { name: "PrintQ Color Station", location: "Design Block - Lab 1", has_bw: false, has_color: true },
    { name: "PrintQ B/W Express", location: "Library - Ground Floor", has_bw: true, has_color: false }
];

async function seed() {
    console.log("🌱 Seeding Demo Shops...");

    for (const s of SEED_SHOPS) {
        // Check if exists to avoid duplicates
        const existing = await db.query.shops.findFirst({ where: eq(shops.name, s.name) });
        
        if (!existing) {
            await db.insert(shops).values({
                name: s.name,
                location: s.location,
                password: "demo", // Simple password
                upi_id: "demo@upi",
                has_bw: s.has_bw,
                has_color: s.has_color,
                last_heartbeat: new Date() // Online now
            });
            console.log(`✅ Created: ${s.name}`);
        } else {
            console.log(`Skipping ${s.name} (Already exists)`);
        }
    }
    console.log("Done.");
    process.exit(0);
}

seed();