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

// Cache Directory (Persistent while app is open)
const CACHE_DIR = path.join(app.getPath("userData"), "print_cache");

// Ensure cache dir exists
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
      fs.unlink(destPath, () => {}); 
      reject(err);
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
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

  ipcMain.handle("get-printers", async () => {
    try {
      return await mainWindow.webContents.getPrintersAsync();
    } catch (e) {
      console.error("Error getting printers:", e);
      return [];
    }
  });

  // --- NEW: CLEANUP CACHE COMMAND ---
  ipcMain.handle("cleanup-cache", async () => {
    try {
      console.log("[Main] Cleaning up print cache...");
      const files = fs.readdirSync(CACHE_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(CACHE_DIR, file));
      }
      return { success: true };
    } catch (e) {
      console.error("Cleanup failed:", e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("print-job", async (event, { printerName, filePath }) => {
    return new Promise(async (resolve, reject) => {
      if (printerName === "Not Available") {
        return reject("Printer disabled.");
      }

      let localFilePath = filePath;

      // 1. Handle Remote URLs with Caching
      if (filePath.startsWith("http")) {
        try {
          // Generate a stable filename from the URL to allow caching
          // e.g., http://site.com/file.pdf?token=123 -> file.pdf
          const urlObj = new URL(filePath);
          const baseName = path.basename(urlObj.pathname) || `doc_${Date.now()}.pdf`;
          // Sanitize filename
          const safeName = baseName.replace(/[^a-z0-9.]/gi, '_');
          localFilePath = path.join(CACHE_DIR, safeName);

          // Only download if it doesn't exist yet!
          if (!fs.existsSync(localFilePath)) {
            console.log(`[Main] Downloading: ${baseName}`);
            await downloadFile(filePath, localFilePath);
          } else {
            console.log(`[Main] Using cached file: ${baseName}`);
          }
        } catch (err) {
          return reject(`Download Failed: ${err.message}`);
        }
      } else {
        if (!fs.existsSync(filePath)) return reject("Local file not found");
      }

      // 2. Print
      const args = ["-print-to", printerName, "-silent", localFilePath];
      
      execFile(sumatraPath, args, (error) => {
        if (error) {
          console.error("[Main] Print Error:", error);
          return reject(error.message);
        }
        resolve({ success: true });
      });
    });
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});