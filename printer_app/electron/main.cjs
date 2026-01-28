const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");
const https = require("https");
const http = require("http");
app.disableHardwareAcceleration();

let mainWindow;

const sumatraPath = app.isPackaged
  ? path.join(process.resourcesPath, "extraResources", "SumatraPDF.exe")
  : path.join(__dirname, "../extraResources/SumatraPDF.exe");

// Cache Directory
const CACHE_DIR = path.join(app.getPath("userData"), "print_cache");
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const protocol = url.startsWith("https") ? https : http;
    
    const request = protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download: Status Code ${response.statusCode}`));
      }
      response.pipe(file);
      file.on("finish", () => {
        file.close(() => resolve(destPath));
      });
    });

    request.on("error", (err) => {
      fs.unlink(destPath, (unlinkErr) => {
        if (unlinkErr) {
          // Log the unlink error but still reject with the original download error
          console.error(`[Main] Error unlinking file ${destPath}:`, unlinkErr);
        }
        reject(err);
      });
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#f8fafc",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, 
      preload: path.join(__dirname, "preload.cjs"),
    },
    autoHideMenuBar: true,
    show: false,
  });

  if (!app.isPackaged) {
    mainWindow.loadURL("http://localhost:5174");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle("get-printers", () => {
    if (!mainWindow) {
      throw new Error("Main window not available.");
    }
    try {
      // Using synchronous getPrinters() for Electron 22 compatibility (Windows 7 support)
      // Suppress deprecation warning - getPrintersAsync() not available in Electron 22
      process.emitWarning = () => {};
      const printers = mainWindow.webContents.getPrinters();
      process.emitWarning = console.warn;
      return printers;
    } catch (e) {
      console.error("[Main] Error getting printers:", e);
      throw new Error("Failed to get printer list.");
    }
  });

  ipcMain.handle("cleanup-cache", async () => {
    try {
      if (fs.existsSync(CACHE_DIR)) {
        const files = fs.readdirSync(CACHE_DIR);
        for (const file of files) {
          try { fs.unlinkSync(path.join(CACHE_DIR, file)); } catch(e){}
        }
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("print-job", async (event, { printerName, filePath, copies = 1, color = false }) => {
    if (printerName === "Not Available") {
      throw new Error("Printer is not available or disabled.");
    }

    let localFilePath = filePath;

    // 1. Download Handling
    if (filePath.startsWith("http")) {
      try {
        const urlObj = new URL(filePath);
        const safeName = `job_${Date.now()}_${path.basename(urlObj.pathname).replace(/[^a-zA-Z0-9._-]/g, '')}`;
        localFilePath = path.join(CACHE_DIR, safeName);

        if (!fs.existsSync(localFilePath)) {
          console.log(`[Main] Downloading: ${localFilePath}`);
          await downloadFile(filePath, localFilePath);
        }
      } catch (err) {
        throw new Error(`Download Failed: ${err.message}`);
      }
    }

    if (!fs.existsSync(localFilePath)) {
      throw new Error(`File not found: ${localFilePath}`);
    }

    // 2. Construct SumatraPDF Arguments
    const printSettings = [
      color ? "color" : "monochrome",
      `${copies}x` // Add copies to print settings
    ];

    const args = [
      "-print-to", printerName,
      "-silent",
      "-print-settings", printSettings.join(","),
      localFilePath
    ];

    console.log(`[Main] Printing ${copies} copies to ${printerName} [${color ? 'Color' : 'B/W'}] with args: ${args.join(' ')}`);

    // 3. Execute Print Command
    try {
      await new Promise((resolve, reject) => {
        execFile(sumatraPath, args, (error, stdout, stderr) => {
          if (error) {
            console.error(`[Main] Print Error:`, error);
            return reject(error);
          }
          if (stderr) {
            console.warn(`[Main] Print stderr:`, stderr);
          }
          resolve();
        });
      });
      return { success: true };
    } catch (e) {
      throw new Error(`Printing failed: ${e.message}`);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});