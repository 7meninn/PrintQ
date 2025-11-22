import { Request, Response } from "express";
import { db } from "../db/connection";
import { orders } from "../db/schema";
import { eq } from "drizzle-orm";

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { user_id, shop_id, pages, copies, color, amount } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "File is required" });
    }

    const file_url = "/uploads/" + req.file?.filename;

    const inserted = await db
      .insert(orders)
      .values({
        user_id: Number(user_id),
        shop_id: Number(shop_id),
        pages: Number(pages),
        copies: Number(copies),
        color: color === "true",
        amount: Number(amount),
        file_url,
        status: "QUEUED",
        payment_status: "PAID"
      })
      .returning();

    res.json({ success: true, order: inserted[0] });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getUserOrders = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.userId);

    const data = await db.select().from(orders).where(eq(orders.user_id, id));

    res.json(data);

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getShopOrders = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.shopId);

    const data = await db.select().from(orders).where(eq(orders.shop_id, id));

    res.json(data);

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    const updated = await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();

    res.json({ success: true, order: updated[0] });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
