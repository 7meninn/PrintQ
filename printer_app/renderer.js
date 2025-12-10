const { ipcRenderer } = require('electron');
const axios = require('axios');

// --- DOM Elements ---
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');

// Login Inputs
const bwSelectLogin = document.getElementById('bw-printer-login');
const colorSelectLogin = document.getElementById('color-printer-login');
const mockCheckLogin = document.getElementById('mock-mode-login');
const loginBtn = document.getElementById('loginBtn');
const loginMsg = document.getElementById('login-msg');

// Dashboard Inputs
const bwSelectDash = document.getElementById('bw-printer-dash');
const colorSelectDash = document.getElementById('color-printer-dash');
const mockCheckDash = document.getElementById('mock-mode-dash');
const dashSettings = document.getElementById('dash-settings');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const pendingCount = document.getElementById('pending-count');

// Status & Logs
const logsDiv = document.getElementById('logs');
const connectionBadge = document.getElementById('connection-badge');
const statusText = document.getElementById('status-text'); // Fixed missing ref
const shopNameDisplay = document.getElementById('shop-name-display');
const shopIdDisplay = document.getElementById('shop-id-display');

const API_URL = "http://localhost:3000"; 

// --- State ---
let realPrinters = [];
const mockPrinters = [
    { name: "Mock Laserjet (B/W)" },
    { name: "Mock Inkjet (Color)" },
    { name: "Mock Universal Printer" }
];

// 🔹 HELPER: Populate a single dropdown
function populateSelect(selectElement, isMock, selectedValue) {
    const list = isMock ? mockPrinters : realPrinters;
    
    // 1. Generate Options HTML
    const defaultOption = `<option value="">-- None (Inactive) --</option>`;
    const optionsHTML = list.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
    selectElement.innerHTML = defaultOption + optionsHTML;

    // 2. Restore Selection if valid
    // Check if the previously selected value exists in the new list
    const exists = list.some(p => p.name === selectedValue);
    
    if (exists) {
        selectElement.value = selectedValue;
    } else if (isMock && !selectedValue) {
        // Smart Default for Mock Mode: Select the first items if nothing was selected
        // This saves the user from clicking dropdowns during testing
        if (selectElement.id.includes('bw')) selectElement.value = "Mock Laserjet (B/W)";
        if (selectElement.id.includes('color')) selectElement.value = "Mock Inkjet (Color)";
    } else {
        selectElement.value = ""; // Reset to None if printer not found (e.g. switching Real -> Mock)
    }
}

// 🔹 HELPER: Update ALL dropdowns based on mode
function updateAllDropdowns(isMock) {
    // Sync checkbox states
    mockCheckLogin.checked = isMock;
    mockCheckDash.checked = isMock;

    // Update Login Screen Dropdowns
    populateSelect(bwSelectLogin, isMock, bwSelectLogin.value);
    populateSelect(colorSelectLogin, isMock, colorSelectLogin.value);

    // Update Dashboard Dropdowns (using values from Login if Dash is empty initially)
    populateSelect(bwSelectDash, isMock, bwSelectDash.value || bwSelectLogin.value);
    populateSelect(colorSelectDash, isMock, colorSelectDash.value || colorSelectLogin.value);
}

// 🔹 INIT
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Fetch Real Printers from OS
        realPrinters = await ipcRenderer.invoke('get-printers');
        
        // 2. Load Saved Config
        const config = await ipcRenderer.invoke('get-config');
        
        // 3. Apply Config to Inputs
        if(config) {
            // Restore Checkbox
            mockCheckLogin.checked = config.mockMode;
            mockCheckDash.checked = config.mockMode;

            // Restore Credentials
            if(config.stationId) document.getElementById('shopId').value = config.stationId;
            if(config.stationPass) document.getElementById('password').value = config.stationPass;

            // Restore Selected Values (temporarily set value property so populateSelect can read it)
            bwSelectLogin.value = config.printerBW || "";
            colorSelectLogin.value = config.printerColor || "";
        }

        // 4. Populate Dropdowns (This handles the Real vs Mock logic immediately)
        updateAllDropdowns(mockCheckLogin.checked);

    } catch(e) {
        console.error("Init error:", e);
    }
});

// 🔹 UI EVENT: Toggle Mock Mode (Login Screen)
mockCheckLogin.addEventListener('change', (e) => {
    updateAllDropdowns(e.target.checked);
});

// 🔹 UI EVENT: Toggle Mock Mode (Dashboard Screen)
mockCheckDash.addEventListener('change', (e) => {
    updateAllDropdowns(e.target.checked);
});

// 🔹 LOGIN / START
loginBtn.addEventListener('click', async () => {
    const id = document.getElementById('shopId').value;
    const password = document.getElementById('password').value;
    
    if(!id || !password) {
        loginMsg.innerText = "Enter ID & Password";
        return;
    }

    const isMock = mockCheckLogin.checked;
    const hasBW = bwSelectLogin.value !== "";
    const hasColor = colorSelectLogin.value !== "";

    // Validation: Must select at least one printer (even in Mock mode, logic should hold)
    if (!hasBW && !hasColor) {
        loginMsg.innerText = "⚠️ Select at least one printer to start.";
        return;
    }

    // Save Config
    ipcRenderer.send('save-config', {
        printerBW: bwSelectLogin.value,
        printerColor: colorSelectLogin.value,
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
            
            // Switch to Dashboard
            loginScreen.classList.remove('active');
            dashboardScreen.classList.add('active');
            
            // Sync Dash Inputs one last time to be sure
            bwSelectDash.value = bwSelectLogin.value;
            colorSelectDash.value = colorSelectLogin.value;
            mockCheckDash.checked = isMock;

            ipcRenderer.send('start-service', Number(id));
            addLog(`✅ Connected to PrintQ`);
            if(isMock) addLog("⚠️ MOCK MODE: Using virtual printers.");
        }
    } catch (err) {
        console.error(err);
        const errorMsg = err.response?.data?.error || "Connection Failed";
        loginMsg.innerText = errorMsg;
        loginBtn.innerText = "Connect & Start";
        loginBtn.disabled = false;
    }
});

// 🔹 PAUSE SERVICE
pauseBtn.addEventListener('click', () => {
    ipcRenderer.send('pause-service');
    pauseBtn.classList.add('hidden');
    dashSettings.classList.remove('hidden'); // Show settings
    connectionBadge.className = "status-badge status-paused";
    connectionBadge.innerText = "PAUSED";
    addLog("⏸️ Service Paused. Update settings if needed.");
});

// 🔹 RESUME SERVICE
resumeBtn.addEventListener('click', () => {
    const isMock = mockCheckDash.checked;
    const hasBW = bwSelectDash.value !== "";
    const hasColor = colorSelectDash.value !== "";

    if (!hasBW && !hasColor) {
        alert("Select at least one printer.");
        return;
    }

    // Save new config
    ipcRenderer.send('save-config', {
        printerBW: bwSelectDash.value,
        printerColor: colorSelectDash.value,
        mockMode: isMock
    });

    // Resume
    ipcRenderer.send('resume-service');
    dashSettings.classList.add('hidden');
    pauseBtn.classList.remove('hidden');
    connectionBadge.className = "status-badge status-online";
    connectionBadge.innerText = "ONLINE";
    addLog("▶️ Service Resumed with updated settings.");
});

// 🔹 STOP / LOGOUT
document.getElementById('stopBtn').addEventListener('click', () => {
    ipcRenderer.send('stop-service');
    location.reload();
});

// 🔹 EVENTS
ipcRenderer.on('log', (_, msg) => addLog(msg));
ipcRenderer.on('error', (_, msg) => addLog(msg, true));

ipcRenderer.on('queue-update', (_, count) => {
    pendingCount.innerText = count;
    if(count > 0) pendingCount.style.color = "#dc2626"; 
    else pendingCount.style.color = "#2563eb"; 
});

ipcRenderer.on('connection-status', (_, isOnline) => {
    if (pauseBtn.classList.contains('hidden')) return; // Don't override Paused status
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


