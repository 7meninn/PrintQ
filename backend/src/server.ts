import express from "express";
import cors from "cors";
import path from "path";
import multer from "multer";

// Controllers
import { signup, login } from "./controllers/auth.controller";
import { getShops } from "./controllers/shops.controller"; // For Users (List shops)
import { prepareOrder, createOrder } from "./controllers/orders.controller";
import { shopLogin, getPendingJobs, completeJob, shopHeartbeat } from "./controllers/shop_client.controller";
// Cron
import { startCleanupJob } from "./cron/cleanup";

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// File Upload Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});
const upload = multer({ storage });

// --- ROUTES ---

// 1. User Authentication
app.post("/auth/signup", signup);
app.post("/auth/login", login);

// 2. User Order Flow
app.get("/shops", getShops); // Public list for users
app.post("/orders/preview", upload.array("files"), prepareOrder);
app.post("/orders/create", createOrder);

// 3. Shop/Printer App API (New Endpoints)
app.post("/shop/login", shopLogin);       // Shop logs in
app.post("/shop/heartbeat", shopHeartbeat);
app.get("/shop/orders", getPendingJobs);  // Shop fetches queue
app.post("/shop/complete", completeJob);  // Shop marks done

// Start Cleanup Job
startCleanupJob();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Background cleanup job scheduled.");
});