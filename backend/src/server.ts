import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import multer from "multer";

// Controllers
import { login, initiateSignup, completeSignup } from "./controllers/auth.controller";
import { getShops } from "./controllers/shops.controller";
import { prepareOrder, initiatePayment, confirmOrder } from "./controllers/orders.controller";
import { 
  shopLogin, getPendingJobs, completeJob, shopHeartbeat, failJob,
  createShop, deleteShop // ✅ Added Admin Controllers
} from "./controllers/shop_client.controller";

// Jobs
import { startCleanupJob } from "./cron/cleanup";
import { startRefundJob } from "./cron/refund";

const app = express();
const PORT = process.env.PORT || 3000; // Azure friendly port

app.use(cors());
app.use(express.json());
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
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// 🔒 ADMIN SECURITY MIDDLEWARE
const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-admin-secret'];
  if (!apiKey || apiKey !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "Forbidden: Admin Access Only" });
  }
  next();
};

// --- ROUTES ---

// 🛡️ Admin API (Protected)
app.post("/admin/shops/create", adminAuth, createShop);
app.post("/admin/shops/delete", adminAuth, deleteShop);

// Auth
app.post("/auth/login", login);
app.post("/auth/signup/initiate", initiateSignup);
app.post("/auth/signup/complete", completeSignup);

// User Flow
app.get("/shops", getShops);

// Upload Handler Wrapper
const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  const uploadMiddleware = upload.array("files");
  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

app.post("/orders/preview", handleUpload, prepareOrder); // Creates DRAFT
app.post("/orders/initiate", initiatePayment);           // Secure Init
app.post("/orders/confirm", confirmOrder);

// Shop/Printer App API
app.post("/shop/login", shopLogin);
app.post("/shop/heartbeat", shopHeartbeat);
app.get("/shop/orders", getPendingJobs);
app.post("/shop/complete", completeJob);
app.post("/shop/fail", failJob);

// Start Background Jobs
startCleanupJob();
startRefundJob();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});