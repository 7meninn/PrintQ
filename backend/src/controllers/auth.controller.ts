import { Request, Response } from "express";
import { db } from "../db/connection";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.JWT_SECRET || "supersecretkey";
const ALLOWED_DOMAIN = "@cuchd.in";

// Helper to validate domain
const isValidDomain = (email: string) => {
  return email.toLowerCase().endsWith(ALLOWED_DOMAIN);
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // 1. Enforce Domain Restriction
    if (!isValidDomain(email)) {
      return res.status(400).json({ 
        error: `Access restricted. Only emails ending in ${ALLOWED_DOMAIN} are allowed.` 
      });
    }

    // 2. Check existing user
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Insert user
    const [newUser] = await db
      .insert(users)
      .values({ name, email, password: hashedPassword })
      .returning({ id: users.id, name: users.name, email: users.email });

    // 5. Generate Token
    const token = jwt.sign({ id: newUser.id, email: newUser.email }, SECRET_KEY, {
      expiresIn: "7d" // Token expires in 7 days
    });

    res.status(201).json({ user: newUser, token });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1. Enforce Domain Restriction (Optional but good for fast failure)
    if (!isValidDomain(email)) {
      return res.status(400).json({ 
        error: `Invalid domain. Please use your ${ALLOWED_DOMAIN} email.` 
      });
    }

    // 2. Find User
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    // 3. Check Password
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Invalid credentials" });

    // 4. Generate Token
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