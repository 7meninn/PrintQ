const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getPrinters: () => ipcRenderer.invoke("get-printers"),
  printJob: (data) => ipcRenderer.invoke("print-job", data),
  cleanupCache: () => ipcRenderer.invoke("cleanup-cache"), // <--- Added
});