import Razorpay from "razorpay";
import crypto from "crypto";
import axios from "axios";

// Initialize Razorpay
const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

// --- 1. ACCEPT PAYMENTS (Standard Gateway) ---

export const createRazorpayOrder = async (amount: number) => {
  // Amount expected in Rupees, Razorpay expects Paise
  const options = {
    amount: Math.round(amount * 100), 
    currency: "INR",
    payment_capture: 1, // Auto-capture
  };

  try {
    const order = await instance.orders.create(options);
    return order;
  } catch (error) {
    console.error("Razorpay Create Order Failed:", error);
    throw new Error("Payment Gateway Error");
  }
};

export const verifyPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  const secret = process.env.RAZORPAY_KEY_SECRET || "";
  const generated_signature = crypto
    .createHmac("sha256", secret)
    .update(orderId + "|" + paymentId)
    .digest("hex");

  return generated_signature === signature;
};

// --- 2. REFUNDS ---

export const refundRazorpayPayment = async (paymentId: string) => {
  try {
    const refund = await instance.payments.refund(paymentId, {});
    return refund;
  } catch (error) {
    console.error("Razorpay Refund Failed:", error);
    throw new Error("Refund failed at gateway");
  }
};

// --- 3. PAYOUTS (RazorpayX) ---

export const createPayout = async (
  amount: number,
  upiId: string,
  shopName: string,
  shopId: number
) => {
  // RazorpayX requires Basic Auth with Key ID and Secret
  const auth = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString("base64");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Basic ${auth}`,
  };

  const accountNumber = process.env.RAZORPAY_X_ACCOUNT_NUMBER; // Required for Payouts
  if (!accountNumber) {
    throw new Error("RazorpayX Account Number not configured");
  }

  try {
    // Step A: Create Contact (Idempotent if reference_id matches)
    const contactRes = await axios.post(
      "https://api.razorpay.com/v1/contacts",
      {
        name: shopName,
        // We use shop_id to create a unique reference so we don't duplicate contacts
        reference_id: `shop_${shopId}`, 
        type: "vendor",
      },
      { headers }
    );
    const contactId = contactRes.data.id;

    // Step B: Create Fund Account (UPI)
    const fundRes = await axios.post(
      "https://api.razorpay.com/v1/fund_accounts",
      {
        contact_id: contactId,
        account_type: "vpa",
        vpa: {
          address: upiId,
        },
      },
      { headers }
    );
    const fundAccountId = fundRes.data.id;

    // Step C: Initiate Payout
    const payoutRes = await axios.post(
      "https://api.razorpay.com/v1/payouts",
      {
        account_number: accountNumber,
        fund_account_id: fundAccountId,
        amount: Math.round(amount * 100), // In Paise
        currency: "INR",
        mode: "UPI",
        purpose: "payout",
        queue_if_low_balance: true,
        reference_id: `payout_${shopId}_${Date.now()}`,
        narration: `PrintQ Daily Settlement`,
      },
      { headers }
    );

    return {
      success: true,
      payout_id: payoutRes.data.id,
      status: payoutRes.data.status,
    };
  } catch (error: any) {
    console.error("RazorpayX Payout Failed:", error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.description || "Payout failed");
  }
};