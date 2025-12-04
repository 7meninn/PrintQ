import { Request, Response } from "express";
import { db } from "../db/connection";
import { users, otp_verifications } from "../db/schema";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendOtpEmail } from "../services/email.service";

const SECRET_KEY = process.env.JWT_SECRET || "supersecretkey";
const ALLOWED_DOMAIN = "@gmail.com"; // ✅ STRICT GMAIL ONLY

const isValidDomain = (email: string) => {
  return email.toLowerCase().endsWith(ALLOWED_DOMAIN);
};

// 🟢 STEP 1: Request OTP
export const initiateSignup = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // 1. Validate Domain
    if (!isValidDomain(email)) {
      return res.status(403).json({ error: `Only ${ALLOWED_DOMAIN} emails allowed.` });
    }

    // 2. Check if user already exists
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      return res.status(409).json({ error: "User already registered. Please login." });
    }

    // 3. Generate OTP (6 digits)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // 4. Save to DB
    await db.delete(otp_verifications).where(eq(otp_verifications.email, email));
    await db.insert(otp_verifications).values({ email, otp, expires_at: expiresAt });

    // 5. Send Email
    const sent = await sendOtpEmail(email, otp);
    if (!sent) throw new Error("Failed to send email");

    res.json({ success: true, message: "OTP sent to your email" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

// 🟢 STEP 2: Verify OTP & Create Account
export const completeSignup = async (req: Request, res: Response) => {
  try {
    const { name, email, password, otp } = req.body;

    const validOtp = await db.select().from(otp_verifications)
      .where(and(
        eq(otp_verifications.email, email),
        eq(otp_verifications.otp, otp),
        gt(otp_verifications.expires_at, new Date())
      ));

    if (validOtp.length === 0) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [newUser] = await db.insert(users)
      .values({ name, email, password: hashedPassword })
      .returning({ id: users.id, name: users.name, email: users.email });

    await db.delete(otp_verifications).where(eq(otp_verifications.email, email));

    const token = jwt.sign({ id: newUser.id, email: newUser.email }, SECRET_KEY, { expiresIn: "7d" });

    res.status(201).json({ user: newUser, token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: "7d" });
    res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
};