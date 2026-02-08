import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import multer from "multer";

import { login, initiateSignup, completeSignup, forgotPassword, resetPassword } from "./controllers/auth.controller";
import { getShops } from "./controllers/shops.controller";
import { 
  prepareOrder, initiatePayment, confirmOrder, cancelOrder,
  getUserHistory, getUserActiveOrder
} from "./controllers/orders.controller";
import { 
  shopLogin, getPendingJobs, completeJob, shopHeartbeat, failJob, getShopHistory, getShopPayoutHistory
} from "./controllers/shop_client.controller";

import { startCleanupJob } from "./cron/cleanup";
import { startRefundJob } from "./cron/refund";
import { startStationMonitorJob } from "./cron/station_monitor";
import { createShop, deleteShop, failAllQueuedOrdersForShop, failOrder, getAdminStats, getAllOrders, getAllShops, getLiveQueues, getPayouts, getPendingPayouts, logPayment, markPayoutAsPaid, refundOrder } from "./controllers/admin.controller";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
const storage = multer.memoryStorage(); 

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
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

// Admin Middleware
const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-admin-secret'];
  if (!apiKey || apiKey !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "Forbidden: Admin Access Only" });
  }
  next();
};

// Admin Routes
app.post("/admin/shops/create", adminAuth, createShop);
app.post("/admin/shops/delete", adminAuth, deleteShop);
app.post("/admin/payouts/mark-paid", adminAuth, markPayoutAsPaid);
app.get("/admin/stats", adminAuth, getAdminStats);
app.get("/admin/orders", adminAuth, getAllOrders);
app.post("/admin/orders/refund", adminAuth, refundOrder);
app.get("/admin/shops", adminAuth, getAllShops);
app.get("/admin/payouts", adminAuth, getPayouts);
app.get("/admin/payouts/pending", adminAuth, getPendingPayouts);
app.post("/admin/payouts/log", adminAuth, logPayment);
app.post("/admin/orders/fail", adminAuth, failOrder);

// Live Queue Management
app.get("/admin/queues", adminAuth, getLiveQueues);
app.post("/admin/queues/fail-all", adminAuth, failAllQueuedOrdersForShop);

// Auth Routes
app.post("/auth/login", login);
app.post("/auth/signup/initiate", initiateSignup);
app.post("/auth/signup/complete", completeSignup);
app.post("/auth/forgot-password", forgotPassword);
app.post("/auth/reset-password", resetPassword);

// Public Routes
app.get("/api/time", (req, res) => {
  res.json({ now: new Date() });
});
app.get("/shops", getShops);

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
      if (totalSize > 60 * 1024 * 1024) {
        return res.status(400).json({ error: `Total upload size exceeds 60MB limit.` });
      }
    }
    next();
  });
};

// Order Routes
app.post("/orders/preview", handleUpload, prepareOrder);
app.post("/orders/initiate", initiatePayment);
app.post("/orders/confirm", confirmOrder);
app.post("/orders/cancel", cancelOrder);

// User Routes
app.get("/user/history", getUserHistory);
app.get("/user/active", getUserActiveOrder);

// Shop Client Routes
app.post("/shop/login", shopLogin);
app.post("/shop/heartbeat", shopHeartbeat);
app.get("/shop/orders", getPendingJobs);
app.get("/shop/history", getShopHistory);
app.get("/shop/payouts", getShopPayoutHistory);
app.post("/shop/complete", completeJob);
app.post("/shop/fail", failJob);

// Start Background Jobs
startCleanupJob();
startRefundJob();
startStationMonitorJob();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
