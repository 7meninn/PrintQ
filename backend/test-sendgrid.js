const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.sendgrid.net",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "apikey",
    pass: process.env.SMTP_PASS,
  },
});

async function testEmail() {
  try {
    console.log("Testing SendGrid connection...\n");
    
    const info = await transporter.sendMail({
      from: `"PrintQ Test" <noreply@printq.app>`,
      to: "bimaltyagi333@gmail.com", // Change this to your test email
      subject: "PrintQ SendGrid Test Email",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>SendGrid Configuration Test</h2>
          <p>If you're seeing this email, SendGrid is working correctly!</p>
          <p><strong>Status:</strong> ✅ Connected and sending</p>
          <p style="color: #2563eb; font-weight: bold;">Your PrintQ email system is now live.</p>
        </div>
      `,
    });

    console.log("✅ Email sent successfully!");
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log("\nSendGrid is configured and ready to use.");
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    process.exit(1);
  }
}

testEmail();
