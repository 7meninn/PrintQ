PrintQ - Smart Campus Printing System 🖨️🚀

Live: www.printq.app

PrintQ is a cloud-based printing ecosystem designed to eliminate long queues at campus photocopy shops. It connects students directly with print stations, allowing them to upload documents, pay online, and collect their prints without the wait.

🌟 The Problem

Students often waste valuable time standing in lines just to print a few pages. Shop owners struggle with file management (WhatsApp/Email) and manual payment collection.

💡 The Solution

PrintQ automates the entire workflow:

Students upload files and pay securely via the Web App.

Shop Owners receive orders instantly on the PrintQ Station App (Desktop).

Automatic Processing queues the files for printing.

Notifications alert the student when the job is ready for pickup.

⚡ Key Features

🎓 For Students (Web App)

Instant Upload: Support for PDF, Images, and Docs.

Live Price Calculation: Instant quote based on page count, color (B/W vs Color), and copies.

Secure Payments: Integrated with PhonePe/Razorpay for seamless transactions.

Real-time Tracking: See queue position and "Ready for Pickup" status.

Order History: Track past prints and expenses.

🏪 For Shop Owners (Station Desktop App)

Auto-Queue: Orders appear automatically without refreshing.

One-Click Print: Integrated with local printers for fast execution.

Sequential Locking: Enforces First-Come-First-Serve processing.

Hardware Config: Dynamic routing to B/W or Color printers based on file type.

Daily Stats: Track pages printed and earnings for the day.

🛡️ For Admins (Control Panel)

Network Oversight: Monitor online/offline status of all shops.

Financial Settlement: Automated daily payout calculations for shop owners.

Order Management: Handle refunds and force-fail stuck orders.

Analytics: View total revenue, active users, and system health.

🛠️ Tech Stack

Frontend (User App): React.js, Tailwind CSS, Lucide Icons, Vite.

Desktop App (Station): Electron.js, React, Node.js (Serial/Printer Access).

Backend: Node.js, Express.js, TypeScript.

Database: PostgreSQL (managed via Drizzle ORM).

Cloud/Storage: Microsoft Azure Blob Storage (File Hosting).

Deployment: Azure App Service (Backend), Azure Static Web Apps (Frontend).

Payments: PhonePe / Razorpay / RazorpayX (Payouts).

🚀 Local Setup Guide

Prerequisites

Node.js (v18 or higher)

PostgreSQL Database

Git

1. Clone the Repository

git clone [https://github.com/7meninn/PrintQ.git](https://github.com/7meninn/PrintQ.git)
cd printq


2. Backend Setup

cd backend
npm install

# Create a .env file (see Configuration below)
# Run Database Migrations
npx drizzle-kit push:pg

# Start Server
npm run dev


3. User App (Frontend) Setup

cd frontend
npm install
npm run dev


4. Station App (Electron) Setup

cd printer_app
npm install

# Run in Development Mode
npm run electron:dev


📸 Project Architecture

graph TD
    User[Student Mobile/Web] -->|Uploads File| Cloud[Azure Storage]
    User -->|Payment| PG[PhonePe Gateway]
    PG -->|Webhook| Backend[Node.js API]
    Backend -->|Push Order| DB[(PostgreSQL)]
    
    Station[Station Desktop App] -->|Polls/Socket| Backend
    Station -->|Fetches File| Cloud
    Station -->|Print Command| LocalPrinter[Physical Printer]
    
    Admin[Admin Panel] -->|Manage| Backend
    Cron[Cron Jobs] -->|Daily Payouts| Bank[Shop Owner Bank]


🤝 Contributors

[Bimal Tyagi] - Lead Full Stack Developer

📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
