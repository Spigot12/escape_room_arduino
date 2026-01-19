import '../../styles/style.css'
import '../../styles/components.css'
import '../../styles/animations.css'
import * as ArduinoManager from '../arduino/arduino-manager.js'

// ===== STATE =====
let debugLogs = [];
const MAX_DEBUG_LOGS = 50;

// ===== DOM ELEMENTE =====
const connectionScreen = document.querySelector('#connection-screen');
const connectBtn = document.querySelector('#connect-btn');
const disconnectBtn = document.querySelector('#disconnect-btn');
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
  if (!connectionStatus) return;
  
  // Übersetzung ins Deutsche
  let statusText = text;
  if (text.toLowerCase() === 'waiting...') statusText = 'Wartet...';
  if (text.toLowerCase() === 'connected') statusText = 'Verbunden';
  if (text.toLowerCase() === 'not connected') statusText = 'Nicht verbunden';
  if (text.toLowerCase() === 'connection failed') statusText = 'Verbindung fehlgeschlagen';
  if (text.toLowerCase() === 'connecting...') statusText = 'Prüfe Verbindung...';

  connectionStatus.textContent = `Status: ${statusText}`;
  
  if (statusText === 'Verbunden') {
    connectionStatus.style.color = 'var(--bs-success)';
  } else if (statusText === 'Prüfe Verbindung...') {
    connectionStatus.style.color = 'var(--bs-primary)';
  } else {
    connectionStatus.style.color = 'var(--bs-secondary)';
  }
}

function updatePortStatus() {
  if (portStatus) {
    if (ArduinoManager.isConnected()) {
      portStatus.textContent = '✅ Port offen & lesbar';
    } else {
      portStatus.textContent = '❌ Kein Port geöffnet';
    }
  }
}

function updateReadLoopStatus() {
  if (readLoopStatus) {
    readLoopStatus.textContent = ArduinoManager.isReadLoopActive()
      ? '✅ Aktiv (Daten werden gelesen)'
      : '❌ Nicht aktiv';
  }
}

function updateStartButton() {
  const isConnected = ArduinoManager.isConnected();
  console.log('Main: updateStartButton, isConnected:', isConnected);
  if (!startBtn) return; // Guard clause
  
  if (isConnected) {
    startBtn.disabled = false;
    startBtn.classList.remove('disabled');
    startBtn.classList.add('enabled');
    // Verhindert mehrfaches Loggen
    if (startBtn.getAttribute('data-notified') !== 'true') {
        addLog('Start-Button aktiviert ✅', 'success');
        startBtn.setAttribute('data-notified', 'true');
    }
  } else {
    startBtn.disabled = true;
    startBtn.classList.add('disabled');
    startBtn.classList.remove('enabled');
    startBtn.removeAttribute('data-notified');
  }
}

// ===== INITIALISIERUNG =====
async function init() {
  addLog('System gestartet', 'info');
  setupEventListeners();
  setupArduinoListeners();
  
  // Zuerst UI-Status prüfen (Persistenz beim Zurückgehen)
  const currentlyConnected = ArduinoManager.isConnected();
  console.log('Main: Initialer Check (init), isConnected:', currentlyConnected);
  
  if (currentlyConnected) {
    console.log('Main: Arduino ist bereits verbunden beim Laden');
    updateUIOnConnect();
  } else {
    // Wenn wir noch nicht wissen ob verbunden, zeigen wir "Prüfe Verbindung..." 
    // Aber nur wenn der Status noch auf dem Standard-HTML-Wert steht, um Überschreiben zu vermeiden
    const currentStatusText = connectionStatus ? connectionStatus.textContent : '';
    if (!currentStatusText.includes('Verbunden')) {
        updateConnectionStatus('connecting...', 'status-disconnected');
    }
    
    // Falls der Manager schon Daten hat aber das Event verpasst wurde
    // Wir machen mehrere Checks in kurzen Abständen
    [50, 150, 300, 600, 1000].forEach(delay => {
        setTimeout(() => {
            if (ArduinoManager.isConnected()) {
                console.log(`Main: Check nach ${delay}ms: Verbunden!`);
                updateUIOnConnect();
            }
        }, delay);
    });
  }

  await refreshPorts();

  // Falls nach den Ports immer noch nicht verbunden sind, forciere eine Status-Abfrage
  if (!ArduinoManager.isConnected()) {
      console.log('Main: Noch nicht verbunden nach Port-Refresh, triggere get-status über Socket...');
      // Wir senden ein Event an das Fenster, damit der Manager es hört und get-status sendet
      window.dispatchEvent(new CustomEvent('arduino:requestStatus'));
  }

  // Falls nach dem Port-Laden der Status immer noch unbekannt ist, 
  // aber der Socket verbunden ist, triggern wir nochmal eine Status-Abfrage
  setTimeout(() => {
    const finalCheck = ArduinoManager.isConnected();
    console.log('Main: Finaler Verbindungs-Check nach 2.5s, isConnected:', finalCheck);
    
    if (finalCheck) {
      updateUIOnConnect();
    } else {
       console.log('Main: Kein Arduino nach 2.5s gefunden. Aktueller Text:', connectionStatus ? connectionStatus.textContent : 'null');
       // Wenn nach 2.5 Sekunden immer noch nichts da ist, gehen wir auf "Wartet..."
       // Wir prüfen auf beide Varianten (Prüfe... und Verbinde...)
       const currentText = connectionStatus ? connectionStatus.textContent : '';
       if (currentText.includes('Prüfe Verbindung...') || currentText.includes('Verbinde...')) {
         updateConnectionStatus('waiting...', 'status-disconnected');
       }
    }
  }, 2500); // Etwas großzügigeres Timeout
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
  console.log('Main: updateUIOnConnect aufgerufen');
  
  // Guard: Wenn wir schon verbunden anzeigen, nichts tun (verhindert Flackern/Logs)
  if (connectionStatus && connectionStatus.textContent.includes('Verbunden')) {
    // Sicherstellen, dass der Start-Button trotzdem korrekt gesetzt ist (falls er durch ein Reset-Event deaktiviert wurde)
    updateStartButton();
    return;
  }

  updateConnectionStatus('connected', 'status-connected');
  updatePortStatus();
  updateReadLoopStatus();
  
  if (connectBtn) {
    connectBtn.disabled = true;
    connectBtn.classList.add('disabled');
    connectBtn.innerHTML = '<i class="bi bi-check-lg me-2"></i>Verbunden';
  }
  
  if (disconnectBtn) {
    disconnectBtn.classList.remove('hidden');
  }
  
  updateStartButton();
}

// ===== ARDUINO EVENTS =====
function setupArduinoListeners() {
  // Listen for the manager's state changes
  window.addEventListener('arduinoStatusUpdate', (event) => {
    const connected = event.detail.connected;
    console.log('Main: arduinoStatusUpdate empfangen, connected:', connected);
    if (connected) {
      updateUIOnConnect();
    } else {
      // Nur auf "nicht verbunden" setzen, wenn wir nicht gerade "Prüfe Verbindung..." anzeigen
      const currentText = connectionStatus ? connectionStatus.textContent : '';
      if (connectionStatus && !currentText.includes('Prüfe Verbindung...') && !currentText.includes('Verbinde...')) {
        updateConnectionStatus('not connected', 'status-disconnected');
      }
    }
  });

  ArduinoManager.addEventListener('arduinoConnected', () => {
    console.log('Main: arduinoConnected Event vom Manager empfangen');
    addLog('Arduino verbunden!', 'success');
    updateUIOnConnect();
  });

  ArduinoManager.addEventListener('arduinoDisconnected', () => {
    addLog('Arduino getrennt', 'warn');
    updateConnectionStatus('not connected', 'status-disconnected');
    updatePortStatus();
    updateReadLoopStatus();
    updateStartButton();
    connectBtn.disabled = false;
    connectBtn.classList.remove('disabled');
    connectBtn.innerHTML = '<i class="bi bi-plug-fill me-2"></i>Arduino verbinden';
    if (disconnectBtn) disconnectBtn.classList.add('hidden');
  });

  ArduinoManager.addEventListener('arduinoMessage', (data) => {
    const msg = data.message;
    addLog(`Arduino: "${msg}"`, 'success');
    
    if (msg === 'L1_SYSTEM_START' || msg === 'L1_ZUGANG_OK' || msg === 'L2_GELOEST' || msg === 'L3_ZUGANG_OK') {
      document.body.style.backgroundColor = '#f0f9ff';
      setTimeout(() => {
        document.body.style.backgroundColor = '';
      }, 500);
    }
  });

  ArduinoManager.addEventListener('arduinoSolved', () => {
    addLog('SOLVED-Signal erkannt!', 'success');
  });
}

// ===== ARDUINO VERBINDUNG =====
async function connect() {
  if (connectBtn.disabled) return; // Verhindert Mehrfachklicks

  try {
    const selectedPort = portSelect.value;
    if (!selectedPort) {
      alert('Bitte wähle einen Port aus!');
      return;
    }

    if (ArduinoManager.isConnected()) {
      addLog('Bereits verbunden.', 'warn');
      return;
    }

    // UI sperren während des Versuchs
    connectBtn.disabled = true;
    connectBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Verbinde...';
    addLog(`Verbindungsversuch mit ${selectedPort}...`, 'info');

    const result = await ArduinoManager.connectArduino(selectedPort);

    if (!result.success) {
      addLog(`Verbindungsfehler: ${result.message}`, 'error');
      updateConnectionStatus('Connection failed', 'status-disconnected');
      connectBtn.disabled = false;
      connectBtn.classList.remove('disabled');
      connectBtn.innerHTML = '<i class="bi bi-plug-fill me-2"></i>Arduino verbinden';
      updateStartButton();
    } else {
      addLog('Verbindung erfolgreich hergestellt', 'success');
      // Update UI manually in case the event was already dispatched or missed
      updateUIOnConnect();
    }
  } catch (error) {
    addLog(`Fehler: ${error.message}`, 'error');
    connectBtn.disabled = false;
    connectBtn.classList.remove('disabled');
    connectBtn.innerHTML = '<i class="bi bi-plug-fill me-2"></i>Connect Arduino';
  }
}

// ===== ZUM SPIEL STARTEN =====
async function startGame() {
  if (ArduinoManager.isConnected()) {
    addLog('Sende Reset-Signal an Arduino...', 'info');
    await ArduinoManager.sendToArduino('RESET'); // Sicherstellen, dass Level 0 aktiv ist
    
    addLog('Spiel wird gestartet...', 'info');
    setTimeout(() => {
      window.location.href = '/pages/level1.html';
    }, 500);
  } else {
    addLog('Fehler: Arduino nicht verbunden!', 'error');
  }
}

// ===== EVENT LISTENER =====
function setupEventListeners() {
  connectBtn.addEventListener('click', connect);
  
  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', () => {
      ArduinoManager.disconnectArduino();
    });
  }

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

// ===== HELPER =====

// ===== START =====
init();
