import nodemailer from "nodemailer";
import * as dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    await transporter.sendMail({
      from: '"PrintQ Support" <no-reply@printq.com>',
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error("Email Error:", error);
    return false;
  }
};

// 1. Signup OTP
export const sendOtpEmail = async (email: string, otp: string) => {
  return sendEmail(email, "Your PrintQ OTP", `<h2>Your OTP: ${otp}</h2>`);
};

// 2. Order Placed
export const sendOrderPlacedEmail = async (email: string, orderId: number, amount: string) => {
  return sendEmail(email, `Order #${orderId} Confirmed`, `
    <h3>Order Received</h3>
    <p>Your order <strong>#${orderId}</strong> has been queued.</p>
    <p>Amount Paid: <strong>Rs. ${amount}</strong></p>
    <p>We will notify you when it is printed.</p>
  `);
};

// 3. Order Printed (Ready)
export const sendOrderReadyEmail = async (email: string, orderId: number, shopName: string) => {
  return sendEmail(email, `Order #${orderId} Ready for Pickup!`, `
    <h3 style="color:green;">Ready for Pickup!</h3>
    <p>Your documents for Order <strong>#${orderId}</strong> are waiting at <strong>${shopName}</strong>.</p>
    <p>Please collect them soon.</p>
  `);
};

// 4. Order Failed & Refunded
export const sendRefundEmail = async (email: string, orderId: number, amount: string, reason: string) => {
  return sendEmail(email, `Refund Initiated: Order #${orderId}`, `
    <h3 style="color:red;">Order Failed</h3>
    <p>We could not fulfill Order <strong>#${orderId}</strong>.</p>
    <p><strong>Reason:</strong> ${reason}</p>
    <p>A refund of <strong>Rs. ${amount}</strong> has been initiated to your original payment method.</p>
  `);
};