import { Request, Response } from "express";
import { db } from "../db/connection";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Use a strong secret in production (e.g., from .env)
const SECRET_KEY = process.env.JWT_SECRET || "supersecretkey";
const ALLOWED_DOMAIN = "@cuchd.in";

const isValidDomain = (email: string) => {
  return email.toLowerCase().endsWith(ALLOWED_DOMAIN);
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // 1. Strict Domain Check
    if (!isValidDomain(email)) {
      return res.status(403).json({ 
        error: `Access denied. You must use a ${ALLOWED_DOMAIN} email.` 
      });
    }

    // 2. Check if user exists
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      return res.status(409).json({ error: "User already exists" });
    }

    // 3. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Insert into Database
    const [newUser] = await db
      .insert(users)
      .values({ name, email, password: hashedPassword })
      .returning({ id: users.id, name: users.name, email: users.email });

    // 5. Generate JWT
    const token = jwt.sign({ id: newUser.id, email: newUser.email }, SECRET_KEY, {
      expiresIn: "7d" // User stays logged in for 7 days
    });

    res.status(201).json({ user: newUser, token });

  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1. Find User
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 2. Compare Password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 3. Generate JWT
    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, {
      expiresIn: "7d"
    });

    res.json({ 
      user: { id: user.id, name: user.name, email: user.email }, 
      token 
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Login failed" });
  }
};