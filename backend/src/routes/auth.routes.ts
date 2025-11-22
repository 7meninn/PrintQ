import { Router } from "express";
import {
  createUser,
  userLogin,
  createShop,
  shopLogin
} from "../controllers/auth.controller";

const router = Router();

router.post("/user/signup", createUser);
router.post("/user/login", userLogin);

router.post("/shop/signup", createShop);
router.post("/shop/login", shopLogin);

export default router;
