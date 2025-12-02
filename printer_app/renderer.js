const { ipcRenderer } = require('electron');
const axios = require('axios');

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const bwSelect = document.getElementById('bw-printer');
const colorSelect = document.getElementById('color-printer');
const mockCheckbox = document.getElementById('mock-mode');
const loginBtn = document.getElementById('loginBtn');
const loginMsg = document.getElementById('login-msg');
const logsDiv = document.getElementById('logs');
const statusText = document.getElementById('status-text');
const connectionBadge = document.getElementById('connection-badge');
const shopNameDisplay = document.getElementById('shop-name-display');
const shopIdDisplay = document.getElementById('shop-id-display');

const API_URL = "http://localhost:3000"; 

// Data Store
let realPrinters = [];
const mockPrinters = [
    { name: "Mock Laserjet (B/W)" },
    { name: "Mock Inkjet (Color)" },
    { name: "Mock Universal Printer" }
];

// 🔹 HELPER: Populate Dropdowns
function updatePrinterDropdowns(isMock) {
    const list = isMock ? mockPrinters : realPrinters;
    const defaultOption = `<option value="">-- None (Inactive) --</option>`;
    const options = list.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
    
    // Save current values to restore if possible (or reset)
    const currentBW = bwSelect.value;
    const currentColor = colorSelect.value;

    bwSelect.innerHTML = defaultOption + options;
    colorSelect.innerHTML = defaultOption + options;

    // Try to keep selection if it exists in the new list, otherwise select first available for convenience
    if (isMock) {
        // Auto-select helpful defaults for mock mode
        bwSelect.value = "Mock Laserjet (B/W)";
        colorSelect.value = "Mock Inkjet (Color)";
    } else {
        // For real mode, try to restore or default to empty
        // (Checking if the previously selected printer exists in the real list)
        const bwExists = realPrinters.some(p => p.name === currentBW);
        const colorExists = realPrinters.some(p => p.name === currentColor);
        if (bwExists) bwSelect.value = currentBW;
        if (colorExists) colorSelect.value = currentColor;
    }
}

// 🔹 INIT: Load Printers & Config
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Fetch Real Printers from OS
        realPrinters = await ipcRenderer.invoke('get-printers');
        
        // 2. Load Saved Config
        const config = await ipcRenderer.invoke('get-config');
        
        // 3. Set Checkbox State
        if(config) {
            mockCheckbox.checked = config.mockMode;
            // Auto-fill credentials
            if(config.stationId) document.getElementById('shopId').value = config.stationId;
            if(config.stationPass) document.getElementById('password').value = config.stationPass;
        }

        // 4. Populate Dropdowns based on initial checkbox state
        updatePrinterDropdowns(mockCheckbox.checked);

        // 5. Restore saved selections if they match the current mode
        if (config) {
             // Only restore if the saved name exists in the current list (Mock vs Real)
             // This prevents "Mock Printer" appearing in the Real list visually
             const list = mockCheckbox.checked ? mockPrinters : realPrinters;
             const bwValid = list.some(p => p.name === config.printerBW);
             const colorValid = list.some(p => p.name === config.printerColor);

             if(bwValid) bwSelect.value = config.printerBW;
             if(colorValid) colorSelect.value = config.printerColor;
        }

    } catch(e) {
        console.error("Init error:", e);
    }
});

// 🔹 UI EVENT: Toggle Mock Mode
mockCheckbox.addEventListener('change', (e) => {
    updatePrinterDropdowns(e.target.checked);
});

// 🔹 START SERVICE
loginBtn.addEventListener('click', async () => {
    const id = document.getElementById('shopId').value;
    const password = document.getElementById('password').value;
    const isMock = mockCheckbox.checked;
    
    if(!id || !password) {
        loginMsg.innerText = "Please enter ID and Password";
        return;
    }

    // Validation: Must select at least one capability
    const hasBW = bwSelect.value !== "";
    const hasColor = colorSelect.value !== "";

    if (!hasBW && !hasColor) {
        loginMsg.innerText = "⚠️ Error: Select at least one printer (B/W or Color) to continue.";
        return;
    }

    // Save Config
    ipcRenderer.send('save-config', {
        printerBW: bwSelect.value,
        printerColor: colorSelect.value,
        mockMode: isMock,
        stationId: id,
        stationPass: password
    });

    loginBtn.innerText = "Verifying...";
    loginBtn.disabled = true;
    loginMsg.innerText = "";

    try {
        const res = await axios.post(`${API_URL}/shop/login`, { 
            id: Number(id), 
            password,
            has_bw: hasBW,      
            has_color: hasColor
        });
        
        if(res.data.success) {
            shopNameDisplay.innerText = res.data.shop.name;
            shopIdDisplay.innerText = `#${id}`;
            
            loginScreen.classList.remove('active');
            dashboardScreen.classList.add('active');
            
            ipcRenderer.send('start-service', Number(id));
            addLog(`✅ Connected to PrintQ Network`);
            if(isMock) addLog("⚠️ MOCK MODE ACTIVE: Using virtual printers.");
            addLog(`⚙️ Config: BW=[${hasBW ? 'ON' : 'OFF'}] Color=[${hasColor ? 'ON' : 'OFF'}]`);
        }
    } catch (err) {
        console.error(err);
        const errorMsg = err.response?.data?.error || "Connection Failed.";
        loginMsg.innerText = errorMsg;
        loginBtn.innerText = "Connect & Start Service";
        loginBtn.disabled = false;
    }
});

// 🔹 STOP SERVICE
document.getElementById('stopBtn').addEventListener('click', () => {
    ipcRenderer.send('stop-service');
    location.reload();
});

// 🔹 LOGGING & STATUS
ipcRenderer.on('log', (_, msg) => addLog(msg));
ipcRenderer.on('error', (_, msg) => addLog(msg, true));
ipcRenderer.on('status', (_, msg) => statusText.innerText = msg);

ipcRenderer.on('connection-status', (_, isOnline) => {
    if(isOnline) {
        connectionBadge.className = "status-badge status-online";
        connectionBadge.innerText = "ONLINE";
    } else {
        connectionBadge.className = "status-badge status-offline";
        connectionBadge.innerText = "OFFLINE";
    }
});

function addLog(msg, isError = false) {
    const div = document.createElement('div');
    div.className = isError ? 'log-entry error' : 'log-entry';
    div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logsDiv.appendChild(div);
    logsDiv.scrollTop = logsDiv.scrollHeight;
}