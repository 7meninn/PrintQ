import { Router } from "express";
import { uploadMultiple } from "../upload";
import {
  createOrder,
  getUserOrders,
  getShopOrders,
  updateOrderStatus,
  prepareOrder
} from "../controllers/orders.controller";

const router = Router();

router.post("/prepare", uploadMultiple, prepareOrder);
router.get("/user/:userId", getUserOrders);
router.get("/shop/:shopId", getShopOrders);
router.put("/:id/status", updateOrderStatus);

export default router;
