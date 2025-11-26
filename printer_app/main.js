const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const ptp = require('pdf-to-printer');
const { DownloaderHelper } = require('node-downloader-helper');

// 🔹 CONFIGURATION
// Use "http://localhost:3000" for local dev
// Use your cloud IP for production
const API_URL = "http://localhost:3000"; 

const TEMP_DIR = path.join(app.getPath('userData'), 'temp_prints');

// Ensure temp dir exists
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

let mainWindow;
let pollingInterval;
let currentShopId = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 700,
    webPreferences: {
      nodeIntegration: true, 
      contextIsolation: false, // Allows renderer.js to use 'require'
    },
  });

  mainWindow.loadFile('index.html');
}

// 🔹 PRINTING LOGIC
async function processOrder(order) {
  console.log(`Processing Order #${order.order_id}...`);
  mainWindow.webContents.send('log', `Starting Order #${order.order_id}`);

  for (const file of order.files) {
    try {
      // 1. Download
      mainWindow.webContents.send('log', `Downloading ${file.filename}...`);
      const dl = new DownloaderHelper(file.url, TEMP_DIR, { override: true });
      
      await new Promise((resolve, reject) => {
        dl.on('end', () => resolve());
        dl.on('error', (err) => reject(err));
        dl.start();
      });

      const localPath = path.join(TEMP_DIR, file.filename);

      // 2. Print
      mainWindow.webContents.send('log', `Printing ${file.filename} (${file.copies} copies)...`);
      
      if (fs.existsSync(localPath)) {
        await ptp.print(localPath, {
          copies: file.copies
        });
        mainWindow.webContents.send('log', `Sent to printer: ${file.filename}`);
      } else {
        throw new Error("File not found after download");
      }

    } catch (err) {
      console.error(`Failed to print file ${file.filename}`, err);
      mainWindow.webContents.send('error', `Failed file: ${file.filename}`);
    }
  }

  // 3. Mark Complete on Server
  try {
    await axios.post(`${API_URL}/shop/complete`, { order_id: order.order_id });
    mainWindow.webContents.send('log', `Order #${order.order_id} Completed! ✅`);
  } catch(e) {
    mainWindow.webContents.send('error', `Failed to update server for Order #${order.order_id}`);
  }
}

// 🔹 POLLING LOOP
async function checkOrders() {
  if (!currentShopId) return;

  try {
    const res = await axios.get(`${API_URL}/shop/orders?shop_id=${currentShopId}`);
    const orders = res.data;

    if (orders.length > 0) {
      mainWindow.webContents.send('status', `Found ${orders.length} new orders!`);
      
      for (const order of orders) {
        await processOrder(order);
      }
    } else {
      mainWindow.webContents.send('status', 'Waiting for orders... (Polling every 10s)');
    }
  } catch (err) {
    console.error("Polling error", err.message);
    mainWindow.webContents.send('status', 'Connection error. Retrying...');
  }
}

// 🔹 EVENTS FROM UI
ipcMain.on('start-service', (event, shopId) => {
  currentShopId = shopId;
  console.log(`Service started for Shop ID: ${shopId}`);
  
  checkOrders(); 
  pollingInterval = setInterval(checkOrders, 10000);
});

ipcMain.on('stop-service', () => {
  if (pollingInterval) clearInterval(pollingInterval);
  currentShopId = null;
  console.log("Service stopped.");
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});