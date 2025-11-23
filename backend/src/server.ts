import express from "express";
import cors from "cors";
import path from "path";
import { signup, login } from "./controllers/auth.controller";
import { getShops } from "./controllers/shops.controller";
import { prepareOrder, createOrder } from "./controllers/orders.controller"; // Your existing file
import multer from "multer";

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads"))); // Serve files

// File Upload Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});
const upload = multer({ storage });

// --- ROUTES ---

// 1. Auth
app.post("/auth/signup", signup);
app.post("/auth/login", login);

// 2. Shops
app.get("/shops", getShops);

// 3. Orders
// 'prepareOrder' is Preview API (Calculates pages & cost)
app.post("/orders/preview", upload.array("files"), prepareOrder); 
// 'createOrder' actually saves it to DB
app.post("/orders/create", createOrder); 

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});