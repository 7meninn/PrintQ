const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const ptp = require('pdf-to-printer');
const { DownloaderHelper } = require('node-downloader-helper');
const { exec } = require('child_process');

// 🔹 CONFIGURATION
const API_URL = "http://localhost:3000"; 
const DATA_PATH = app.getPath('userData');
const TEMP_DIR = path.join(DATA_PATH, 'temp_prints');
const CONFIG_FILE = path.join(DATA_PATH, 'printer_config.json');
const MAX_PRINTER_QUEUE = 3; 
const POLLING_INTERVAL_MS = 5000; // 5 seconds

// Default Config
let appConfig = {
  printerBW: "",
  printerColor: "",
  mockMode: true,
  stationId: "",
  stationPass: ""
};

if (fs.existsSync(CONFIG_FILE)) {
  try { appConfig = JSON.parse(fs.readFileSync(CONFIG_FILE)); } catch(e) {}
}
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

let mainWindow;
let pollingInterval;
let currentShopId = null;
let isProcessing = false; 
let isOnline = false;

// 🔹 HEARTBEAT
async function sendHeartbeat() {
  if (!currentShopId) return;
  
  // ✅ FIXED: Respect user selection strictly, even in Mock Mode.
  // If dropdown is empty (""), capability is FALSE.
  const hasBW = appConfig.printerBW !== "";
  const hasColor = appConfig.printerColor !== "";
  
  try {
    const payload = {
        id: currentShopId,
        has_bw: hasBW, 
        has_color: hasColor 
    };

    await axios.post(`${API_URL}/shop/heartbeat`, payload);

    if (!isOnline) {
        isOnline = true;
        if(mainWindow) mainWindow.webContents.send('connection-status', true);
    }
  } catch(e) {
    if (isOnline) {
        isOnline = false;
        if(mainWindow) mainWindow.webContents.send('connection-status', false);
    }
  }
}

// 🔹 EVENTS FROM UI
ipcMain.on('start-service', (event, shopId) => {
  currentShopId = shopId;
  console.log(`Service started for Shop ID: ${shopId}`);
  
  checkOrders(); 
  pollingInterval = setInterval(() => {
      checkOrders();
      sendHeartbeat(); 
  }, POLLING_INTERVAL_MS);
  
  sendHeartbeat();
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600, height: 850,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    autoHideMenuBar: true
  });
  mainWindow.loadFile('index.html');
}

function getWindowsPrinterQueue(printerName) {
  return new Promise((resolve) => {
    if (!printerName) return resolve(0);
    const cmd = `powershell -command "(Get-PrintJob -PrinterName '${printerName}').Count"`;
    exec(cmd, (error, stdout, stderr) => {
      if (error || stderr) { resolve(0); } else {
        const count = parseInt(stdout.trim());
        resolve(isNaN(count) ? 0 : count);
      }
    });
  });
}

async function getTargetPrinter(isColor) {
  return isColor ? appConfig.printerColor : appConfig.printerBW;
}

// 🔹 PRINTING LOGIC
async function processOrder(order) {
  mainWindow.webContents.send('log', `Processing Order #${order.order_id}...`);

  for (const file of order.files) {
    try {
      const printerName = await getTargetPrinter(file.color);
      const configType = file.color ? "COLOR" : "B/W";

      // Skip if no printer configured for this file type
      if (!printerName) {
         mainWindow.webContents.send('error', `Skipping ${file.filename}: No ${configType} printer assigned.`);
         continue;
      }

      // Queue Watchdog (Skip in Mock Mode)
      if (!appConfig.mockMode) {
        let queueSize = await getWindowsPrinterQueue(printerName);
        while (queueSize >= MAX_PRINTER_QUEUE) {
          mainWindow.webContents.send('status', `⚠️ Printer Busy (${queueSize} jobs). Waiting...`);
          await new Promise(r => setTimeout(r, 5000)); 
          queueSize = await getWindowsPrinterQueue(printerName); 
        }
      }

      // Download
      mainWindow.webContents.send('status', `Downloading ${file.filename}...`);
      const dl = new DownloaderHelper(file.url, TEMP_DIR, { override: true });
      await new Promise((resolve, reject) => {
        dl.on('end', () => resolve());
        dl.on('error', (err) => reject(err));
        dl.start();
      });
      const localPath = path.join(TEMP_DIR, file.filename);

      // Print Action
      if (appConfig.mockMode) {
        const printDuration = 5000; // 5 seconds per file for quicker testing

        mainWindow.webContents.send('log', `[MOCK] 🖨️ Routing: ${configType} Job`);
        mainWindow.webContents.send('log', `[MOCK] Device: "${printerName}"`);
        mainWindow.webContents.send('log', `[MOCK] Simulating print...`);
        
        await new Promise(r => setTimeout(r, printDuration));
        mainWindow.webContents.send('log', `[MOCK] ✅ Finished ${file.filename}`);

      } else {
        mainWindow.webContents.send('status', `Printing ${file.filename}...`);
        await ptp.print(localPath, {
          copies: file.copies,
          printer: printerName
        });
        mainWindow.webContents.send('log', `✅ Sent to printer: ${file.filename}`);
      }

      try { fs.unlinkSync(localPath); } catch(e) {}
      await new Promise(r => setTimeout(r, 1000));

    } catch (err) {
      console.error(err);
      mainWindow.webContents.send('error', `Failed file: ${file.filename}`);
    }
  }

  try {
    await axios.post(`${API_URL}/shop/complete`, { order_id: order.order_id });
    mainWindow.webContents.send('log', `Order #${order.order_id} Finished & Closed.`);
  } catch(e) {
    mainWindow.webContents.send('error', `Server Update Failed for #${order.order_id}`);
  }
}

// 🔹 POLLING LOOP
async function checkOrders() {
  if (!currentShopId || isProcessing) return;
  isProcessing = true; 

  try {
    const res = await axios.get(`${API_URL}/shop/orders?shop_id=${currentShopId}`);
    const orders = res.data;

    if (orders.length > 0) {
      mainWindow.webContents.send('status', `Found ${orders.length} new orders`);
      for (const order of orders) {
        await processOrder(order);
      }
    } else {
      mainWindow.webContents.send('status', 'Monitoring... (Idle)');
    }
  } catch (err) {
    mainWindow.webContents.send('status', 'Network Error. Retrying...');
  } finally {
    isProcessing = false; 
  }
}

ipcMain.handle('get-printers', async () => { try { return await ptp.getPrinters(); } catch (e) { return []; } });
ipcMain.handle('get-config', () => appConfig);
ipcMain.on('save-config', (event, newConfig) => {
  appConfig = { ...appConfig, ...newConfig };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(appConfig));
});
ipcMain.on('stop-service', () => {
  if (pollingInterval) clearInterval(pollingInterval);
  currentShopId = null;
  isProcessing = false;
  isOnline = false;
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });