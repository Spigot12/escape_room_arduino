/* main.js */
import "../../styles/style.css";
import "../../styles/components.css";
import "../../styles/animations.css";
import * as ArduinoManager from "../arduino/arduino-manager.js";
import { isAuthenticated } from "../auth.js";
import { resetTimer } from "../game-timer.js";

// ===== STATE =====
let debugLogs = [];
const MAX_DEBUG_LOGS = 50;

// ===== DOM ELEMENTE =====
const connectionScreen = document.querySelector("#connection-screen");
const connectBtn = document.querySelector("#connect-btn");
const disconnectBtn = document.querySelector("#disconnect-btn");
const portSelect = document.querySelector("#port-select");
const refreshPortsBtn = document.querySelector("#refresh-ports-btn");
const startBtn = document.querySelector("#start-btn");
const connectionStatus = document.querySelector("#connection-status");
const portStatus = document.querySelector("#port-status");
const readLoopStatus = document.querySelector("#read-loop-status");
const logContent = document.querySelector("#log-content");
const clearLogBtn = document.querySelector("#clear-log-btn");
const testBtn = document.querySelector("#test-btn");

// ===== DEBUG FUNKTIONEN =====
function addLog(message, type = "info") {
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
  if (!logContent) return;

  logContent.innerHTML = debugLogs
    .map((log) => `<div class="log-${log.type}">${log.message}</div>`)
    .join("");

  requestAnimationFrame(() => {
    logContent.scrollTop = logContent.scrollHeight;
  });
}

function updateConnectionStatus(text, className) {
  if (!connectionStatus) return;

  const currentText = connectionStatus.textContent;
  if (
    currentText.includes("Verbunden") &&
    (text.toLowerCase() === "waiting..." ||
      text.toLowerCase() === "not connected" ||
      text.toLowerCase() === "connecting..." ||
      text.toLowerCase() === "connection failed")
  ) {
    console.log("Main: Unterbinde Status-Wechsel von Verbunden zu", text);
    return;
  }

  let statusText = text;
  if (text.toLowerCase() === "waiting...") statusText = "Wartet...";
  if (text.toLowerCase() === "connected") statusText = "Verbunden";
  if (text.toLowerCase() === "not connected") statusText = "Nicht verbunden";
  if (text.toLowerCase() === "connection failed")
    statusText = "Verbindung fehlgeschlagen";
  if (text.toLowerCase() === "connecting...")
    statusText = "Prüfe Verbindung...";

  const newStatusString = `Status: ${statusText}`;
  if (connectionStatus.textContent === newStatusString) return;

  connectionStatus.textContent = newStatusString;

  if (statusText === "Verbunden") {
    connectionStatus.style.color = "var(--bs-success)";
  } else if (statusText === "Prüfe Verbindung...") {
    connectionStatus.style.color = "var(--bs-primary)";
  } else {
    connectionStatus.style.color = "var(--bs-secondary)";
  }
}

function updatePortStatus() {
  if (portStatus) {
    if (ArduinoManager.isConnected()) {
      portStatus.textContent = "✅ Port offen & lesbar";
    } else {
      portStatus.textContent = "❌ Kein Port geöffnet";
    }
  }
}

function updateReadLoopStatus() {
  if (readLoopStatus) {
    readLoopStatus.textContent = ArduinoManager.isReadLoopActive()
      ? "✅ Aktiv (Daten werden gelesen)"
      : "❌ Nicht aktiv";
  }
}

function updateStartButton() {
  const isConnected = ArduinoManager.isConnected();
  const userAuthenticated = isAuthenticated();
  if (!startBtn) return;

  const startHint = document.getElementById("start-hint");
  const startHintText = document.getElementById("start-hint-text");

  if (isConnected) {
    if (startBtn.disabled || startBtn.classList.contains("disabled")) {
      console.log("Main: Aktiviere Start-Button");
      startBtn.disabled = false;
      startBtn.classList.remove("disabled");
      startBtn.classList.add("enabled");
    }

    if (!userAuthenticated) {
      if (startHint && startHintText) {
        startHintText.innerHTML =
          '<span class="text-warning">Du spielst als <strong>Anonym</strong>. Jetzt <a href="#" class="text-decoration-underline" data-bs-toggle="modal" data-bs-target="#authModal">anmelden</a>, um im Leaderboard zu erscheinen</span>';
        startHint.style.display = "block";
      }
    } else {
      if (startHint) {
        startHint.style.display = "none";
      }
    }

    if (startBtn.getAttribute("data-notified") !== "true") {
      addLog("Start-Button aktiviert ✅", "success");
      startBtn.setAttribute("data-notified", "true");
    }
  } else {
    startBtn.disabled = true;
    startBtn.classList.add("disabled");
    startBtn.classList.remove("enabled");
    startBtn.removeAttribute("data-notified");

    if (startHint && startHintText) {
      startHintText.innerHTML =
        '<span class="text-muted">Bitte verbinde zuerst dein Arduino.</span>';
      startHint.style.display = "block";
    }
  }
}

// ===== INITIALISIERUNG =====
async function init() {
  addLog("System gestartet", "info");
  setupEventListeners();
  setupArduinoListeners();

  const currentlyConnected = ArduinoManager.isConnected();
  console.log("Main: Initialer Check (init), isConnected:", currentlyConnected);

  if (currentlyConnected) {
    console.log("Main: Arduino ist bereits verbunden beim Laden");
    updateUIOnConnect();
  } else {
    if (connectionStatus) {
      connectionStatus.textContent = "Status: Nicht verbunden";
      connectionStatus.style.color = "var(--bs-secondary)";
    }
  }

  await refreshPorts();
}

async function refreshPorts() {
  addLog("Lade verfügbare Ports...", "info");
  try {
    const ports = await ArduinoManager.listPorts();

    if (portSelect) {
      if (ports.length > 0) {
        portSelect.innerHTML = ports
          .map((p) => {
            const name = p.friendlyName || p.manufacturer || p.path;
            return `<option value="${p.path}">${name} (${p.path})</option>`;
          })
          .join("");
        addLog(`${ports.length} Ports gefunden`, "success");
      } else {
        portSelect.innerHTML = '<option value="">Keine Ports gefunden</option>';
        addLog("Keine Ports gefunden. Ist der Server gestartet?", "warn");
      }
    }
  } catch (error) {
    addLog(`Fehler beim Laden der Ports: ${error.message}`, "error");
  }
}

function updateUIOnConnect() {
  if (connectionStatus && connectionStatus.textContent.includes("Verbunden")) {
    updateStartButton();
    if (connectBtn && !connectBtn.innerHTML.includes("Verbunden")) {
      connectBtn.disabled = true;
      connectBtn.classList.add("disabled");
      connectBtn.innerHTML = '<i class="bi bi-check-lg me-2"></i>Verbunden';
    }
    if (disconnectBtn && disconnectBtn.classList.contains("hidden")) {
      disconnectBtn.classList.remove("hidden");
    }
    return;
  }

  updateConnectionStatus("connected", "status-connected");
  updatePortStatus();
  updateReadLoopStatus();

  if (connectBtn) {
    connectBtn.disabled = true;
    connectBtn.classList.add("disabled");
    connectBtn.innerHTML = '<i class="bi bi-check-lg me-2"></i>Verbunden';
  }

  if (disconnectBtn) {
    disconnectBtn.classList.remove("hidden");
  }

  updateStartButton();
  addLog("Arduino verbunden!", "success");
}

function setupArduinoListeners() {
  window.addEventListener("authStatusChanged", (event) => {
    console.log("Main: authStatusChanged empfangen", event.detail);
    updateStartButton();
  });

  window.addEventListener("arduinoStatusUpdate", (event) => {
    const connected = event.detail.connected;
    console.log("Main: arduinoStatusUpdate empfangen, connected:", connected);
    if (connected) {
      updateUIOnConnect();
    } else {
      const currentText = connectionStatus ? connectionStatus.textContent : "";
      if (
        connectionStatus &&
        !currentText.includes("Verbunden") &&
        !currentText.includes("Prüfe Verbindung...") &&
        !currentText.includes("Verbinde...")
      ) {
        connectionStatus.textContent = "Status: Nicht verbunden";
        connectionStatus.style.color = "var(--bs-secondary)";
      }
    }
  });

  ArduinoManager.addEventListener("arduinoConnected", () => {
    console.log("Main: arduinoConnected Event vom Manager empfangen");
    updateUIOnConnect();
  });

  ArduinoManager.addEventListener("arduinoDisconnected", () => {
    console.log("Main: arduinoDisconnected Event vom Manager empfangen");
    addLog("Arduino getrennt", "warn");

    if (connectionStatus) {
      connectionStatus.textContent = "Status: Nicht verbunden";
      connectionStatus.style.color = "var(--bs-secondary)";
    }

    updatePortStatus();
    updateReadLoopStatus();
    updateStartButton();

    if (connectBtn) {
      connectBtn.disabled = false;
      connectBtn.classList.remove("disabled");
      connectBtn.innerHTML =
        '<i class="bi bi-plug-fill me-2"></i>Arduino verbinden';
    }

    if (disconnectBtn) {
      disconnectBtn.classList.add("hidden");
      console.log("Main: Trennen-Button versteckt");
    }
  });

  ArduinoManager.addEventListener("arduinoMessage", (data) => {
    const msg = data.message;
    addLog(`Arduino: "${msg}"`, "success");

    if (
      msg === "L1_SYSTEM_START" ||
      msg === "L1_ZUGANG_OK" ||
      msg === "L2_GELOEST" ||
      msg === "L3_ZUGANG_OK"
    ) {
      document.body.style.backgroundColor = "#f0f9ff";
      setTimeout(() => {
        document.body.style.backgroundColor = "";
      }, 500);
    }
  });

  ArduinoManager.addEventListener("arduinoSolved", () => {
    addLog("SOLVED-Signal erkannt!", "success");
  });
}

// ===== ARDUINO VERBINDUNG =====
async function connect() {
  if (connectBtn.disabled && !connectBtn.innerHTML.includes("Verbunden"))
    return;

  try {
    const selectedPort = portSelect.value;
    if (!selectedPort) {
      alert("Bitte wähle einen Port aus!");
      return;
    }

    if (ArduinoManager.isConnected()) {
      addLog("Bereits verbunden.", "warn");
      return;
    }

    connectBtn.disabled = true;
    connectBtn.innerHTML =
      '<i class="bi bi-hourglass-split me-2"></i>Verbinde...';
    addLog(`Verbindungsversuch mit ${selectedPort}...`, "info");

    const result = await ArduinoManager.connectArduino(selectedPort);

    if (!result.success) {
      addLog(`Verbindungsfehler: ${result.message}`, "error");
      connectionStatus.textContent = "Status: Verbindung fehlgeschlagen";
      connectionStatus.style.color = "var(--bs-secondary)";

      connectBtn.disabled = false;
      connectBtn.classList.remove("disabled");
      connectBtn.innerHTML =
        '<i class="bi bi-plug-fill me-2"></i>Arduino verbinden';
      updateStartButton();
    }
  } catch (error) {
    addLog(`Fehler: ${error.message}`, "error");
    connectBtn.disabled = false;
    connectBtn.classList.remove("disabled");
    connectBtn.innerHTML =
      '<i class="bi bi-plug-fill me-2"></i>Connect Arduino';
  }
}

// ===== ZUM SPIEL STARTEN =====
async function startGame() {
  if (!ArduinoManager.isConnected()) {
    addLog("Fehler: Arduino nicht verbunden!", "error");
    return;
  }

  if (!isAuthenticated()) {
    addLog("Spiel wird im Anonym-Modus gestartet...", "info");
  } else {
    addLog("Spiel wird gestartet...", "info");
  }

  // ===== TIMER & SESSION ZURÜCKSETZEN =====
  resetTimer();
  sessionStorage.setItem("gameStartTime", Date.now().toString());
  // Sicherstellen, dass die Geheimtür beim neuen Run nicht als offen gilt
  localStorage.removeItem("secret_door_unlocked");
  addLog("Timer gestartet ⏱️", "success");

  addLog("Sende Reset-Signal an Arduino...", "info");
  await ArduinoManager.sendToArduino("RESET");

  setTimeout(() => {
    window.location.href = "/pages/map.html";
  }, 500);
}

// ===== EVENT LISTENER =====
function setupEventListeners() {
  connectBtn.addEventListener("click", connect);

  if (disconnectBtn) {
    disconnectBtn.addEventListener("click", () => {
      console.log("Main: Trennen-Button geklickt");
      addLog("Trennen angefordert...", "info");
      ArduinoManager.disconnectArduino();
    });
  }

  refreshPortsBtn.addEventListener("click", refreshPorts);
  startBtn.addEventListener("click", startGame);

  if (clearLogBtn) {
    clearLogBtn.addEventListener("click", () => {
      debugLogs = [];
      updateLogDisplay();
      addLog("Log geleert", "info");
    });
  }

  if (testBtn) {
    testBtn.addEventListener("click", async () => {
      try {
        const result = await ArduinoManager.sendToArduino("TEST");
        if (result.success) {
          addLog("Test-Nachricht gesendet", "info");
        } else {
          addLog(`Fehler beim Senden: ${result.message}`, "error");
        }
      } catch (error) {
        addLog(`Fehler: ${error.message}`, "error");
      }
    });
  }
}

// ===== START =====
init();
