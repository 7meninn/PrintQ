import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import multer from "multer";

// Controllers
import { login, initiateSignup, completeSignup } from "./controllers/auth.controller";
import { getShops } from "./controllers/shops.controller";
import { prepareOrder, createOrder } from "./controllers/orders.controller";
import { shopLogin, getPendingJobs, completeJob, shopHeartbeat, failJob } from "./controllers/shop_client.controller";

// Cron
import { startCleanupJob } from "./cron/cleanup";
import { startRefundJob } from "./cron/refund";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// 🔒 SECURE FILE UPLOAD CONFIGURATION
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});

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
    // Reject file
    cb(new Error(`Invalid file type: ${file.mimetype}. Only PDF and Images are allowed.`));
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // Limit to 20MB per file to prevent DoS
});

// --- ROUTES ---
app.post("/auth/login", login);
app.post("/auth/signup/initiate", initiateSignup);
app.post("/auth/signup/complete", completeSignup);

app.get("/shops", getShops);

// Wrap upload in a helper to catch multer errors nicely
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

app.post("/orders/preview", handleUpload, prepareOrder);
app.post("/orders/create", createOrder);

// Shop API
app.post("/shop/login", shopLogin);
app.post("/shop/heartbeat", shopHeartbeat);
app.get("/shop/orders", getPendingJobs);
app.post("/shop/complete", completeJob);
app.post("/shop/fail", failJob);

// Start Jobs
startCleanupJob();
startRefundJob();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});