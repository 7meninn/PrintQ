import express from "express";
import cors from "cors";
import path from "path";
import { signup, login } from "./controllers/auth.controller";
import { getShops } from "./controllers/shops.controller";
import { prepareOrder, createOrder } from "./controllers/orders.controller";
import multer from "multer";
import { startCleanupJob } from "./cron/cleanup"; // ✅ Import the function

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});
const upload = multer({ storage });

// Routes
app.post("/auth/signup", signup);
app.post("/auth/login", login);
app.get("/shops", getShops);
app.post("/orders/preview", upload.array("files"), prepareOrder);
app.post("/orders/create", createOrder);
startCleanupJob();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Background cleanup job scheduled.");
});