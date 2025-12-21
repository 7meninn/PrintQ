import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import multer from "multer";
import { startStationMonitorJob } from "./cron/station_monitor";
import { login, initiateSignup, completeSignup, forgotPassword, resetPassword } from "./controllers/auth.controller";
import { getShops } from "./controllers/shops.controller";
import { 
  prepareOrder, 
  initiatePayment, 
  handlePaymentCallback,
  cancelOrder,
  getUserHistory,      
  getUserActiveOrder   
} from "./controllers/orders.controller";
import { 
  shopLogin, getPendingJobs, completeJob, shopHeartbeat, failJob,
  createShop, deleteShop, getShopHistory
} from "./controllers/shop_client.controller";

import { 
  getAdminStats, getAllOrders, refundOrder, failOrder, 
  getAllShops, getPayouts, markPayoutAsPaid 
} from "./controllers/admin.controller";

import { startCleanupJob } from "./cron/cleanup";
import { startRefundJob } from "./cron/refund";
import { startAutoCompleteJob } from "./cron/auto_complete";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '50mb' })); 

const storage = multer.memoryStorage(); 

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'application/pdf', 
    'image/png', 
    'image/jpeg', 
    'image/jpg'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only PDF and Images are allowed.`));
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 60 * 1024 * 1024 } 
});

// 🔒 ADMIN SECURITY MIDDLEWARE
const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-admin-secret'];
  if (!apiKey || apiKey !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "Forbidden: Admin Access Only" });
  }
  next();
};

// --- ADMIN ROUTES ---
app.post("/admin/shops/create", adminAuth, createShop);
app.post("/admin/shops/delete", adminAuth, deleteShop);
app.get("/admin/stats", adminAuth, getAdminStats);
app.get("/admin/orders", adminAuth, getAllOrders);
app.post("/admin/orders/refund", adminAuth, refundOrder);
app.post("/admin/orders/fail", adminAuth, failOrder);
app.get("/admin/shops", adminAuth, getAllShops);
app.get("/admin/payouts", adminAuth, getPayouts);
app.post("/admin/payouts/mark-paid", adminAuth, markPayoutAsPaid);

// --- AUTH ROUTES ---
app.post("/auth/login", login);
app.post("/auth/signup/initiate", initiateSignup);
app.post("/auth/signup/complete", completeSignup);
app.post("/auth/forgot-password", forgotPassword);
app.post("/auth/reset-password", resetPassword);

// --- SHOP DISCOVERY ---
app.get("/shops", getShops);

// --- ORDER ROUTES ---
const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  const uploadMiddleware = upload.array("files");
  
  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (req.files) {
      const files = req.files as Express.Multer.File[];
      const totalSize = files.reduce((acc, file) => acc + file.size, 0);
      const MAX_TOTAL_SIZE = 60 * 1024 * 1024;

      if (totalSize > MAX_TOTAL_SIZE) {
        return res.status(400).json({ 
          error: `Total upload size exceeds 60MB limit.` 
        });
      }
    }

    next();
  });
};

app.post("/orders/preview", handleUpload, prepareOrder);
app.post("/orders/initiate", initiatePayment);
// ✅ PhonePe Callback (Replaces confirmOrder)
app.post("/orders/callback", handlePaymentCallback); 
app.post("/orders/cancel", cancelOrder);

// --- USER HISTORY ROUTES ---
app.get("/user/history", getUserHistory);
app.get("/user/active", getUserActiveOrder);

// --- SHOP/PRINTER APP API ---
app.post("/shop/login", shopLogin);
app.post("/shop/heartbeat", shopHeartbeat);
app.get("/shop/orders", getPendingJobs);
app.get("/shop/history", getShopHistory);
app.post("/shop/complete", completeJob);
app.post("/shop/fail", failJob);

// Start Background Jobs
startCleanupJob();
startRefundJob();
startStationMonitorJob();
startAutoCompleteJob();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});