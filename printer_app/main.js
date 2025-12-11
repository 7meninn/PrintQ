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
const POLLING_INTERVAL_MS = 5000; 

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
let isPaused = false;

// 🔹 HEARTBEAT
async function sendHeartbeat() {
  if (!currentShopId) return;
  
  const hasBW = appConfig.printerBW !== "";
  const hasColor = appConfig.printerColor !== "";
  
  try {
    const payload = {
        id: currentShopId,
        has_bw: appConfig.mockMode ? (hasBW || true) : hasBW, 
        has_color: appConfig.mockMode ? (hasColor || true) : hasColor 
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
  isPaused = false;
  console.log(`Service started for Shop ID: ${shopId}`);
  
  checkOrders(); 
  
  pollingInterval = setInterval(() => {
      checkOrders();
      sendHeartbeat(); 
  }, POLLING_INTERVAL_MS);
  
  sendHeartbeat();
});

ipcMain.on('pause-service', () => {
    isPaused = true;
    console.log("Service Paused");
});

ipcMain.on('resume-service', () => {
    isPaused = false;
    console.log("Service Resumed");
    sendHeartbeat(); 
    checkOrders();
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
  if (isColor) return appConfig.printerColor;
  return appConfig.printerBW;
}

// 🔹 PRINTING LOGIC
async function processOrder(order) {
  mainWindow.webContents.send('log', `Processing Order #${order.order_id}...`);

  let orderFailed = false;
  let failReason = "";

  for (const file of order.files) {
     const printerName = await getTargetPrinter(file.color);
     const configType = file.color ? "COLOR" : "B/W";

     if (!printerName) {
         orderFailed = true;
         failReason = `Missing ${configType} printer for file: ${file.filename}`;
         break; 
     }
  }

  if (orderFailed) {
      console.error(failReason);
      mainWindow.webContents.send('error', `❌ Order #${order.order_id} FAILED: ${failReason}`);
      try {
          await axios.post(`${API_URL}/shop/fail`, { order_id: order.order_id, reason: failReason });
      } catch(e) {}
      return; 
  }

  // Execution Loop
  let executionSuccess = true;

  for (const file of order.files) {
    try {
      const printerName = await getTargetPrinter(file.color);

      // ✅ DECODE FILENAME: Convert "My%20File.pdf" -> "My File.pdf"
      // This ensures Windows saves it correctly and SumatraPDF can find it.
      const cleanFilename = decodeURIComponent(file.filename);

      if (!appConfig.mockMode) {
        let queueSize = await getWindowsPrinterQueue(printerName);
        while (queueSize >= MAX_PRINTER_QUEUE) {
          mainWindow.webContents.send('status', `⚠️ Printer Busy (${queueSize} jobs). Waiting...`);
          await new Promise(r => setTimeout(r, 5000)); 
          queueSize = await getWindowsPrinterQueue(printerName); 
        }
      }

      mainWindow.webContents.send('status', `Downloading ${cleanFilename}...`);
      
      const dl = new DownloaderHelper(file.url, TEMP_DIR, { 
          override: true,
          fileName: cleanFilename // ✅ Force correct name on disk
      });
      
      await new Promise((resolve, reject) => {
        dl.on('end', () => resolve());
        dl.on('error', (err) => reject(err));
        dl.start();
      });

      const localPath = path.join(TEMP_DIR, cleanFilename);

      // Print
      if (appConfig.mockMode) {
        const printDuration = 5000; 
        mainWindow.webContents.send('log', `[MOCK] 🖨️ Job: ${file.color ? "COLOR" : "B/W"} -> "${printerName}"`);
        await new Promise(r => setTimeout(r, printDuration));
        mainWindow.webContents.send('log', `[MOCK] ✅ Finished ${cleanFilename}`);
      } else {
        mainWindow.webContents.send('status', `Printing ${cleanFilename}...`);
        await ptp.print(localPath, { copies: file.copies, printer: printerName });
        mainWindow.webContents.send('log', `✅ Sent to printer: ${cleanFilename}`);
      }

      try { fs.unlinkSync(localPath); } catch(e) {}
      await new Promise(r => setTimeout(r, 1000));

    } catch (err) {
      console.error(err);
      mainWindow.webContents.send('error', `Failed file: ${file.filename}`);
      executionSuccess = false;
      failReason = `Failed to download/print: ${file.filename}`;
      break;
    }
  }

  if (executionSuccess) {
      try {
        await axios.post(`${API_URL}/shop/complete`, { order_id: order.order_id });
        mainWindow.webContents.send('log', `Order #${order.order_id} Finished & Closed.`);
      } catch(e) {
        mainWindow.webContents.send('error', `Server Update Failed for #${order.order_id}`);
      }
  } else {
      try {
        await axios.post(`${API_URL}/shop/fail`, { order_id: order.order_id, reason: failReason });
        mainWindow.webContents.send('error', `❌ Order #${order.order_id} FAILED & REFUNDED.`);
      } catch(e) {}
  }
}

// 🔹 POLLING LOOP
async function checkOrders() {
  if (!currentShopId || isProcessing) return;
  isProcessing = true; 

  try {
    const res = await axios.get(`${API_URL}/shop/orders?shop_id=${currentShopId}`);
    const orders = res.data;

    if(mainWindow) mainWindow.webContents.send('queue-update', orders.length);

    if (isPaused) {
        isProcessing = false;
        return;
    }

    if (orders.length > 0) {
      mainWindow.webContents.send('status', `Found ${orders.length} new orders`);
      for (const order of orders) {
        if (isPaused) break; 
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