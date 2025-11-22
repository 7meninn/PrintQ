import { Router } from "express";
import { upload } from "../upload";
import {
  createOrder,
  getUserOrders,
  getShopOrders,
  updateOrderStatus
} from "../controllers/orders.controller";

const router = Router();

router.post("/create", upload.single("file"), createOrder);
router.get("/user/:userId", getUserOrders);
router.get("/shop/:shopId", getShopOrders);
router.put("/:id/status", updateOrderStatus);

export default router;
