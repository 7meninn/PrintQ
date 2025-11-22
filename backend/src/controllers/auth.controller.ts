import { Request, Response } from "express";
import { db } from "../db/connection";
import { users, shops } from "../db/schema";
import { eq } from "drizzle-orm";

export const userLogin = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    const found = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone));

    if (found.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    res.json({ success: true, user: found[0] });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};



export const shopLogin = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const found = await db
      .select()
      .from(shops)
      .where(eq(shops.username, username));

    if (found.length === 0)
      return res.status(400).json({ error: "Shop not found" });

    if (found[0].password !== password)
      return res.status(400).json({ error: "Incorrect password" });

    res.json({ success: true, shop: found[0] });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};


export const createShop = async (req: Request, res: Response) => {
  try {
    const { name, username, password } = req.body;

    const existing = await db
      .select()
      .from(shops)
      .where(eq(shops.username, username));

    if (existing.length > 0) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const inserted = await db
      .insert(shops)
      .values({
        name,
        username,
        password
      })
      .returning();

    res.json({
      success: true,
      shop: inserted[0]
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};


export const createUser = async (req: Request, res: Response) => {
  try {
    const phone = String(req.body.phone);
    const name = req.body.name ?? null;

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone));

    if (existing.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    const inserted = await db
      .insert(users)
      .values({
        phone,
        name
      })
      .returning();

    res.json({
      success: true,
      user: inserted[0]
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
