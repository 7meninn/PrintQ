import nodemailer from "nodemailer";
import * as dotenv from "dotenv";
dotenv.config();

// ✅ 1. TITAN MAIL CONFIGURATION
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.titan.email",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true, // true for port 465
  auth: {
    user: process.env.SMTP_USER, // Your support@printq.app
    pass: process.env.SMTP_PASS, // Your Password
  },
  // Debug logging
  logger: true,
  debug: true 
});

// ✅ 2. HELPER FUNCTION
const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"PrintQ Support" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("Email Error:", error);
    return false;
  }
};

// --- EMAIL TEMPLATES ---

// 1. Signup OTP
export const sendOtpEmail = async (email: string, otp: string) => {
  return sendEmail(email, "Your PrintQ OTP", `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Your Verification Code</h2>
      <p style="font-size: 24px; font-weight: bold; color: #2563eb;">${otp}</p>
      <p>This code expires in 10 minutes.</p>
    </div>
  `);
};

// 2. Order Placed
export const sendOrderPlacedEmail = async (email: string, orderId: number, amount: string) => {
  return sendEmail(email, `Order #${orderId} Confirmed`, `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h3 style="color: #2563eb;">Order Received</h3>
      <p>Your order <strong>#${orderId}</strong> has been queued.</p>
      <p>Amount Paid: <strong>Rs. ${amount}</strong></p>
      <p>Please visit the station to verify and collect your prints.</p>
    </div>
  `);
};

// 3. Order Printed (Ready)
export const sendOrderReadyEmail = async (email: string, orderId: number, shopName: string) => {
  return sendEmail(email, `Order #${orderId} Ready for Pickup!`, `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h3 style="color:green;">Ready for Pickup!</h3>
      <p>Your documents for Order <strong>#${orderId}</strong> are waiting at <strong>${shopName}</strong>.</p>
      <p>Please collect them soon.</p>
    </div>
  `);
};

// 4. Order Failed & Refunded
export const sendRefundEmail = async (email: string, orderId: number, amount: string, reason: string) => {
  return sendEmail(email, `Refund Initiated: Order #${orderId}`, `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h3 style="color:red;">Order Failed</h3>
      <p>We could not fulfill Order <strong>#${orderId}</strong>.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>A refund of <strong>Rs. ${amount}</strong> has been initiated to your original payment method.</p>
    </div>
  `);
};

// 5. Password Reset Link (NEW)
export const sendPasswordRecoveryEmail = async (email: string, resetLink: string) => {
  return sendEmail(email, "Reset Your Password - PrintQ", `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #2563eb;">Reset Password</h2>
      <p>Hello,</p>
      <p>You requested to reset your password. Click the button below to proceed:</p>
      
      <a href="${resetLink}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 20px 0;">Reset Password</a>
      
      <p style="font-size: 14px;">Or copy this link: <br/><a href="${resetLink}">${resetLink}</a></p>
      <p style="font-size: 12px; color: #666; margin-top: 20px;">Link expires in 1 hour.</p>
    </div>
  `);
};