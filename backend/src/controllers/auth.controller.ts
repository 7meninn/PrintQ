import { Request, Response } from "express";
import { db } from "../db/connection";
import { users, otp_verifications } from "../db/schema";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendOtpEmail } from "../services/email.service";
import { sendPasswordRecoveryEmail } from "../services/email.service";
import crypto from "crypto";

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

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    
    // Security: Don't reveal if user exists
    if (!user) return res.json({ success: true, message: "If account exists, email sent." });

    const now = new Date();

    // Rate Limit (e.g., wait 5 minutes between requests, not 24h for links)
    if (user.last_password_reset) {
        const lastReset = new Date(user.last_password_reset);
        const minsSinceLast = (now.getTime() - lastReset.getTime()) / (1000 * 60);
        if (minsSinceLast < 5) {
          return res.status(429).json({ error: "Please wait a few minutes before trying again." });
        }
    }

    // 1. Generate Token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(now.getTime() + 60 * 60 * 1000); // 1 Hour from now

    // 2. Save Token to DB
    await db.update(users)
      .set({ 
        reset_token: resetToken, 
        reset_token_expires: tokenExpiry,
        last_password_reset: now
      })
      .where(eq(users.id, user.id));

    // 3. Send Email with Frontend Link
    // Adjust logic to match your frontend URL (e.g., localhost:5173 or production URL)
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    await sendPasswordRecoveryEmail(user.email, resetLink);

    res.json({ success: true, message: "Reset link sent to your email." });

  } catch (err: any) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ error: "Failed to process request" });
  }
};

// 5. ✅ NEW: RESET PASSWORD (Verify & Change)
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password required" });
    }

    // Find user with matching token
    const user = await db.query.users.findFirst({ 
        where: eq(users.reset_token, token) 
    });

    if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token." });
    }

    // Check Expiry
    if (!user.reset_token_expires || new Date() > new Date(user.reset_token_expires)) {
        return res.status(400).json({ error: "Reset token has expired." });
    }

    // Hash New Password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update DB & Clear Token
    await db.update(users)
      .set({ 
        password: hashedPassword,
        reset_token: null,
        reset_token_expires: null
      })
      .where(eq(users.id, user.id));

    res.json({ success: true, message: "Password reset successfully. You can now login." });

  } catch (err: any) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
};