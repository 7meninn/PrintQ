import Razorpay from "razorpay";
import crypto from "crypto";
import * as dotenv from "dotenv";
dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// 1. Create an Order ID (For Frontend to open Popup)
export const createRazorpayOrder = async (amount: number) => {
  const options = {
    amount: amount * 100, // Razorpay takes amount in paise (₹1 = 100 paise)
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
  };
  const order = await razorpay.orders.create(options);
  return order;
};

// 2. Verify Payment Signature (Security Check)
export const verifyPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string
) => {
  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(orderId + "|" + paymentId)
    .digest("hex");

  return generated_signature === signature;
};

// 3. Refund Payment (For Cron Job)
export const refundPayment = async (paymentId: string, amount?: number) => {
  try {
    const options = amount ? { amount: amount * 100 } : undefined; // Full refund if no amount specified
    const refund = await razorpay.payments.refund(paymentId, options);
    return refund;
  } catch (error) {
    console.error("Refund Failed:", error);
    throw error;
  }
};