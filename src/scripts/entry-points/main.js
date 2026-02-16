/* main.js */
import "../../styles/style.css";
import "../../styles/components.css";
import "../../styles/animations.css";
import * as ArduinoManager from "../arduino/arduino-manager.js";
import { isAuthenticated } from "../auth.js";

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

  // Automatisch nach unten scrollen
  requestAnimationFrame(() => {
    logContent.scrollTop = logContent.scrollHeight;
  });
}

function updateConnectionStatus(text, className) {
  if (!connectionStatus) return;

  // Guard: Wenn wir bereits "Verbunden" sind, erlauben wir keine Änderung zu "Wartet..." oder "Nicht verbunden"
  // außer es kommt explizit ein Disconnect-Event (das wird über className oder spezifischen Text gesteuert)
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

  // Übersetzung ins Deutsche
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
  if (!startBtn) return; // Guard clause

  const startHint = document.getElementById("start-hint");
  const startHintText = document.getElementById("start-hint-text");

  // Button is enabled if Arduino is connected (user can be anonymous)
  if (isConnected) {
    if (startBtn.disabled || startBtn.classList.contains("disabled")) {
      console.log("Main: Aktiviere Start-Button");
      startBtn.disabled = false;
      startBtn.classList.remove("disabled");
      startBtn.classList.add("enabled");
    }

    // Show hint if not authenticated (playing anonymously)
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

    // Verhindert mehrfaches Loggen
    if (startBtn.getAttribute("data-notified") !== "true") {
      addLog("Start-Button aktiviert ✅", "success");
      startBtn.setAttribute("data-notified", "true");
    }
  } else {
    startBtn.disabled = true;
    startBtn.classList.add("disabled");
    startBtn.classList.remove("enabled");
    startBtn.removeAttribute("data-notified");

    // Show hint about what's missing
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

  // Zuerst UI-Status prüfen (Persistenz beim Zurückgehen)
  const currentlyConnected = ArduinoManager.isConnected();
  console.log("Main: Initialer Check (init), isConnected:", currentlyConnected);

  if (currentlyConnected) {
    console.log("Main: Arduino ist bereits verbunden beim Laden");
    updateUIOnConnect();
  } else {
    // Status bleibt auf Standard
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
  // console.log('Main: updateUIOnConnect aufgerufen');

  // Guard: Wenn wir schon verbunden anzeigen, nichts tun (verhindert Flackern/Logs)
  if (connectionStatus && connectionStatus.textContent.includes("Verbunden")) {
    // Sicherstellen, dass der Start-Button trotzdem korrekt gesetzt ist (falls er durch ein Reset-Event deaktiviert wurde)
    updateStartButton();
    // Prüfe ob der Connect-Button korrekt aussieht
    if (connectBtn && !connectBtn.innerHTML.includes("Verbunden")) {
      connectBtn.disabled = true;
      connectBtn.classList.add("disabled");
      connectBtn.innerHTML = '<i class="bi bi-check-lg me-2"></i>Verbunden';
    }
    // Prüfe ob Trennen-Button sichtbar ist
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
  // Listen for auth status changes
  window.addEventListener("authStatusChanged", (event) => {
    console.log("Main: authStatusChanged empfangen", event.detail);
    updateStartButton();
  });

  // Listen for the manager's state changes
  window.addEventListener("arduinoStatusUpdate", (event) => {
    const connected = event.detail.connected;
    console.log("Main: arduinoStatusUpdate empfangen, connected:", connected);
    if (connected) {
      updateUIOnConnect();
    } else {
      // Nur auf "nicht verbunden" setzen, wenn wir nicht gerade "Prüfe Verbindung..." oder "Verbinde..." anzeigen
      const currentText = connectionStatus ? connectionStatus.textContent : "";
      if (
        connectionStatus &&
        !currentText.includes("Verbunden") &&
        !currentText.includes("Prüfe Verbindung...") &&
        !currentText.includes("Verbinde...")
      ) {
        // Forciere Status-Update auf "Nicht verbunden"
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

    // Forciere Status-Update auf "Nicht verbunden"
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
    return; // Verhindert Mehrfachklicks, außer wir wollen re-connecten

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

    // UI sperren während des Versuchs
    connectBtn.disabled = true;
    connectBtn.innerHTML =
      '<i class="bi bi-hourglass-split me-2"></i>Verbinde...';
    addLog(`Verbindungsversuch mit ${selectedPort}...`, "info");

    const result = await ArduinoManager.connectArduino(selectedPort);

    if (!result.success) {
      addLog(`Verbindungsfehler: ${result.message}`, "error");
      // Update status manually since the guard might prevent updateConnectionStatus
      connectionStatus.textContent = "Status: Verbindung fehlgeschlagen";
      connectionStatus.style.color = "var(--bs-secondary)";

      connectBtn.disabled = false;
      connectBtn.classList.remove("disabled");
      connectBtn.innerHTML =
        '<i class="bi bi-plug-fill me-2"></i>Arduino verbinden';
      updateStartButton();
    } else {
      // updateUIOnConnect wird durch das Event aufgerufen
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

  // Allow anonymous play - no authentication required
  if (!isAuthenticated()) {
    addLog("Spiel wird im Anonym-Modus gestartet...", "info");
  } else {
    addLog("Spiel wird gestartet...", "info");
  }

  // Timer starten
  try {
    const response = await fetch("/api/timer/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      addLog("Timer gestartet ⏱️", "success");
    }
  } catch (error) {
    console.error("Timer start fehler:", error);
  }

  addLog("Sende Reset-Signal an Arduino...", "info");
  await ArduinoManager.sendToArduino("RESET"); // Sicherstellen, dass Level 0 aktiv ist

  setTimeout(() => {
    window.location.href = "/pages/level1.html";
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

// ===== HELPER =====

// ===== START =====
init();
