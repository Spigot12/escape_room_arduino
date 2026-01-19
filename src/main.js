import './style.css'
import * as ArduinoManager from './arduino-manager.js'

// ===== STATE =====
let debugLogs = [];
const MAX_DEBUG_LOGS = 50;

// ===== DOM ELEMENTE =====
const connectionScreen = document.querySelector('#connection-screen');
const connectBtn = document.querySelector('#connect-btn');
const portSelect = document.querySelector('#port-select');
const refreshPortsBtn = document.querySelector('#refresh-ports-btn');
const startBtn = document.querySelector('#start-btn');
const connectionStatus = document.querySelector('#connection-status');
const portStatus = document.querySelector('#port-status');
const readLoopStatus = document.querySelector('#read-loop-status');
const logContent = document.querySelector('#log-content');
const clearLogBtn = document.querySelector('#clear-log-btn');
const testBtn = document.querySelector('#test-btn');

// ===== DEBUG FUNKTIONEN =====
function addLog(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = `[${timestamp}] ${message}`;
  debugLogs.push({ message: logEntry, type });

  if (debugLogs.length > MAX_DEBUG_LOGS) {
    debugLogs.shift();
  }

  updateLogDisplay();
  console.log(`[${type.toUpperCase()}]`, message);
}

function updateLogDisplay() {
  logContent.innerHTML = debugLogs
    .map(log => `<div class="log-${log.type}">${log.message}</div>`)
    .join('');

  logContent.scrollTop = logContent.scrollHeight;
}

function updateConnectionStatus(text, className) {
  connectionStatus.textContent = `Status: ${text}`;
  connectionStatus.className = className;
}

function updatePortStatus() {
  if (ArduinoManager.isConnected()) {
    portStatus.textContent = '✅ Port offen & lesbar';
  } else {
    portStatus.textContent = '❌ Kein Port geöffnet';
  }
}

function updateReadLoopStatus() {
  readLoopStatus.textContent = ArduinoManager.isReadLoopActive()
    ? '✅ Aktiv (Daten werden gelesen)'
    : '❌ Nicht aktiv';
}

function updateStartButton() {
  if (ArduinoManager.isConnected() && ArduinoManager.isReadLoopActive()) {
    startBtn.disabled = false;
    startBtn.classList.remove('disabled');
    startBtn.classList.add('enabled');
    addLog('Start-Button aktiviert ✅', 'success');
  } else {
    startBtn.disabled = true;
    startBtn.classList.add('disabled');
    startBtn.classList.remove('enabled');
  }
}

// ===== INITIALISIERUNG =====
async function init() {
  addLog('System gestartet', 'info');
  setupEventListeners();
  setupArduinoListeners();
  await refreshPorts();
  
  // Falls bereits verbunden (z.B. zurück von Level), UI aktualisieren
  if (ArduinoManager.isConnected()) {
    updateUIOnConnect();
  }
}

async function refreshPorts() {
  addLog('Lade verfügbare Ports...', 'info');
  try {
    const ports = await ArduinoManager.listPorts();
    
    if (portSelect) {
      if (ports.length > 0) {
        portSelect.innerHTML = ports.map(p => {
          const name = p.friendlyName || p.manufacturer || p.path;
          return `<option value="${p.path}">${name} (${p.path})</option>`;
        }).join('');
        addLog(`${ports.length} Ports gefunden`, 'success');
      } else {
        portSelect.innerHTML = '<option value="">Keine Ports gefunden</option>';
        addLog('Keine Ports gefunden. Ist der Server gestartet?', 'warn');
      }
    }
  } catch (error) {
    addLog(`Fehler beim Laden der Ports: ${error.message}`, 'error');
  }
}

function updateUIOnConnect() {
  updateConnectionStatus('Verbunden', 'status-connected');
  updatePortStatus();
  updateReadLoopStatus();
  connectBtn.disabled = true;
  connectBtn.textContent = '✓ Verbunden';
  setTimeout(updateStartButton, 500);
}

// ===== ARDUINO EVENTS =====
function setupArduinoListeners() {
  ArduinoManager.addEventListener('arduinoConnected', () => {
    addLog('Arduino verbunden!', 'success');
    updateUIOnConnect();
  });

  ArduinoManager.addEventListener('arduinoDisconnected', () => {
    addLog('Arduino getrennt', 'warn');
    updateConnectionStatus('Nicht verbunden', 'status-disconnected');
    updatePortStatus();
    updateReadLoopStatus();
    updateStartButton();
    connectBtn.disabled = false;
    connectBtn.textContent = 'Arduino verbinden';
  });

  ArduinoManager.addEventListener('arduinoMessage', (data) => {
    addLog(`Nachricht empfangen: "${data.message}"`, 'success');
  });

  ArduinoManager.addEventListener('arduinoSolved', () => {
    addLog('SOLVED-Signal erkannt!', 'success');
  });
}

// ===== ARDUINO VERBINDUNG =====
async function connect() {
  try {
    const selectedPort = portSelect.value;
    if (!selectedPort) {
      alert('Bitte wähle einen Port aus!');
      return;
    }

    addLog(`Verbindungsversuch mit ${selectedPort}...`, 'info');

    const result = await ArduinoManager.connectArduino(selectedPort);

    if (!result.success) {
      addLog(`Verbindungsfehler: ${result.message}`, 'error');
      updateConnectionStatus('Verbindung fehlgeschlagen', 'status-disconnected');
      updateStartButton();
    } else {
      addLog('Verbindung über Backend hergestellt', 'success');
    }
  } catch (error) {
    addLog(`Fehler: ${error.message}`, 'error');
  }
}

// ===== ZUM SPIEL STARTEN =====
function startGame() {
  if (ArduinoManager.isConnected()) {
    addLog('Spiel wird gestartet...', 'info');
    window.location.href = '/level1.html';
  } else {
    addLog('Fehler: Arduino nicht verbunden!', 'error');
  }
}

// ===== EVENT LISTENER =====
function setupEventListeners() {
  connectBtn.addEventListener('click', connect);
  refreshPortsBtn.addEventListener('click', refreshPorts);

  startBtn.addEventListener('click', startGame);

  clearLogBtn.addEventListener('click', () => {
    debugLogs = [];
    updateLogDisplay();
    addLog('Log geleert', 'info');
  });

  testBtn.addEventListener('click', async () => {
    try {
      const result = await ArduinoManager.sendToArduino('TEST');
      if (result.success) {
        addLog('Test-Nachricht gesendet', 'info');
      } else {
        addLog(`Fehler beim Senden: ${result.message}`, 'error');
      }
    } catch (error) {
      addLog(`Fehler: ${error.message}`, 'error');
    }
  });
}

// ===== START =====
init();
