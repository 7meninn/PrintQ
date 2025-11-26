const { ipcRenderer } = require('electron');
const axios = require('axios');

const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginBtn = document.getElementById('loginBtn');
const stopBtn = document.getElementById('stopBtn');
const logsDiv = document.getElementById('logs');
const statusBar = document.getElementById('status-bar');
const loginMsg = document.getElementById('login-msg');

// Matches what is in main.js
const API_URL = "http://localhost:3000"; 

// 1. Handle Login
loginBtn.addEventListener('click', async () => {
    const id = document.getElementById('shopId').value;
    const password = document.getElementById('password').value;

    if(!id || !password) {
        loginMsg.innerText = "Please fill in all fields";
        return;
    }

    loginBtn.innerText = "Verifying...";
    loginBtn.disabled = true;
    loginMsg.innerText = "";

    try {
        const res = await axios.post(`${API_URL}/shop/login`, { id: Number(id), password });
        
        if(res.data.success) {
            loginScreen.style.display = 'none';
            dashboardScreen.style.display = 'block';
            
            ipcRenderer.send('start-service', Number(id));
            addLog(`✅ Connected as ${res.data.shop.name}`);
        }
    } catch (err) {
        console.error(err);
        const errorMsg = err.response?.data?.error || "Connection Failed. Check Server.";
        loginMsg.innerText = errorMsg;
        loginBtn.innerText = "Connect Printer";
        loginBtn.disabled = false;
    }
});

// 2. Handle Stop
stopBtn.addEventListener('click', () => {
    ipcRenderer.send('stop-service');
    location.reload();
});

// 3. Listen for Logs
ipcRenderer.on('log', (event, message) => {
    addLog(message);
});

ipcRenderer.on('status', (event, message) => {
    statusBar.innerText = message;
});

ipcRenderer.on('error', (event, message) => {
    addLog(message, true);
});

function addLog(msg, isError = false) {
    const div = document.createElement('div');
    div.className = isError ? 'log-entry error' : 'log-entry';
    div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logsDiv.appendChild(div);
    logsDiv.scrollTop = logsDiv.scrollHeight;
}