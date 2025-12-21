import axios from "axios";
import crypto from "crypto";

const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || "PGTESTPAYUAT";
const SALT_KEY = process.env.PHONEPE_SALT_KEY || "099eb0cd-02cf-4e2a-8aca-3e6c6aff0399";
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX || "1";
const HOST_URL = process.env.PHONEPE_HOST_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox";
const APP_BE_URL = process.env.BACKEND_URL || "http://localhost:3000"; 
const APP_FE_URL = process.env.FRONTEND_URL || "http://localhost:5173";

export const initiatePhonePePayment = async (orderId: number, amount: number, userId: number) => {
  try {
    const transactionId = `TXN_${orderId}_${Date.now()}`;

    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId: transactionId,
      merchantUserId: `MUSER_${userId}`,
      amount: Math.round(amount * 100), 
      redirectUrl: `${APP_BE_URL}/orders/callback`,
      redirectMode: "POST",
      callbackUrl: `${APP_BE_URL}/orders/callback`,
      paymentInstrument: {
        type: "PAY_PAGE" // This generates the payment link
      }
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
    const apiEndpoint = "/pg/v1/pay";
    const stringToSign = base64Payload + apiEndpoint + SALT_KEY;
    const sha256 = crypto.createHash("sha256").update(stringToSign).digest("hex");
    const checksum = `${sha256}###${SALT_INDEX}`;

    console.log(`[PhonePe] Initiating Payment: ${transactionId} | Merchant: ${MERCHANT_ID}`);

    const response = await axios.post(
      `${HOST_URL}${apiEndpoint}`,
      { request: base64Payload },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
        },
      }
    );

    // 4. Return the Redirect URL
    return {
      success: true,
      url: response.data.data.instrumentResponse.redirectInfo.url,
      transactionId
    };

  } catch (error: any) {
    console.error("PhonePe Init Failed:", error.response?.data || error.message);
    // If it's a configuration error, throw a clear message
    if (error.response?.data?.code === 'KEY_NOT_CONFIGURED') {
        throw new Error("PhonePe Configuration Error: Invalid Merchant ID or Salt Key.");
    }
    throw new Error("Payment Gateway Unavailable");
  }
};

export const verifyPhonePeCallback = (base64Response: string, checksumHeader: string) => {
    try {
        const stringToSign = base64Response + SALT_KEY;
        const calculatedChecksum = crypto.createHash("sha256").update(stringToSign).digest("hex") + "###" + SALT_INDEX;
        
        return calculatedChecksum === checksumHeader;
    } catch (e) {
        console.error("Checksum verification failed", e);
        return false;
    }
};

export const createPayout = async (
    amount: number,
    upiId: string,
    shopName: string,
    shopId: number
  ) => {
    console.log(`[Mock Payout] Sending ₹${amount} to ${upiId} (${shopName})`);

    await new Promise(r => setTimeout(r, 1000));
  
    return {
      success: true,
      payout_id: `payout_${Date.now()}_${shopId}`,
      status: "PROCESSED",
    };
  };

export const createRazorpayOrder = async (amount: number) => { throw new Error("Use PhonePe"); };
export const refundRazorpayPayment = async (id: string) => { 
    console.log(`[Mock Refund] Refunded ${id}`);
    return { status: "processed" }; 
};
export const verifyPaymentSignature = () => true;