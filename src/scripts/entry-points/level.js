import '../../styles/style.css'
import '../../styles/components.css'
import '../../styles/animations.css'
import * as ArduinoManager from '../arduino/arduino-manager.js'

// ===== DOM ELEMENTE =====
const backBtn = document.querySelector('#back-btn');
const resultDisplay = document.querySelector('#result-display');
const nextLevelBtn = document.querySelector('#next-level-btn');
const restartBtn = document.querySelector('#restart-btn');
const indicator = document.querySelector('#arduino-indicator');
const statusText = document.querySelector('#status-text');
const codeSection = document.querySelector('#code-section');
const codeInput = document.querySelector('#code-input');
const sendCodeBtn = document.querySelector('#send-code-btn');
const taskListItems = document.querySelectorAll('#task-list li');
const toggleLogBtn = document.querySelector('#toggle-log-btn');
const logPanel = document.querySelector('#log-panel');
const logContent = document.querySelector('#log-content');
const clearLogBtn = document.querySelector('#clear-log-btn');

// ===== STATE =====
let level1Step = 0; // 0: Bereit, 1: System gestartet, 2: Zugang gewährt

// ===== LOG STATE =====
let debugLogs = [];
const MAX_DEBUG_LOGS = 50;

// ===== JOYSTICK GAME STATE (Level 2) =====
let canvas, ctx;
let player = { x: 50, y: 200, radius: 15, speed: 3 };
let collectibles = [];
let collectedCount = 0;
let totalCollectibles = 5;
let joystickX = 0, joystickY = 0;

// ===== LOG FUNKTIONEN =====
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
  if (!logContent) return;

  logContent.innerHTML = debugLogs
    .map(log => `<div style="color: ${getLogColor(log.type)}">${log.message}</div>`)
    .join('');

  // Automatisch nach unten scrollen - sowohl im logContent als auch im Parent (card-body)
  requestAnimationFrame(() => {
    logContent.scrollTop = logContent.scrollHeight;
    if (logContent.parentElement) {
      logContent.parentElement.scrollTop = logContent.parentElement.scrollHeight;
    }
  });
}

function getLogColor(type) {
  switch(type) {
    case 'success': return '#28a745';
    case 'error': return '#dc3545';
    case 'warn': return '#ffc107';
    default: return '#6c757d';
  }
}

// ===== INITIALISIERUNG =====
function init() {
  console.log('--- LEVEL INIT START ---');
  level1Step = 0; // Reset state
  addLog('Level gestartet', 'info');
  setupEventListeners();
  setupArduinoListeners();

  // Sicherstellen, dass alles auf "Anfang" steht beim Laden
  if (statusText) {
    statusText.innerText = 'Warte auf Eingabe...';
    statusText.style.color = '';
  }
  if (resultDisplay) {
    console.log('Verstecke result-display initial');
    resultDisplay.classList.add('hidden');
  }

  updateTaskUI(0);

  // Level 2: Joystick Game initialisieren
  const isLevel2 = window.location.pathname.includes('level2');
  if (isLevel2) {
    initJoystickGame();
  }

  if (ArduinoManager.isConnected()) {
    console.log('Level Init: Arduino ist bereits verbunden');
    updateIndicator(true);
  } else {
    console.log('Level Init: Arduino ist noch nicht verbunden');
  }
  console.log('--- LEVEL INIT ENDE ---');
}

function updateIndicator(connected) {
  if (indicator) {
    if (connected) {
      indicator.classList.remove('disconnected');
      indicator.classList.add('connected');
    } else {
      indicator.classList.remove('connected');
      indicator.classList.add('disconnected');
    }
  }
}

// ===== ARDUINO EVENTS =====
function setupArduinoListeners() {
  console.log('Setup Arduino Listeners gestartet');

  ArduinoManager.addEventListener('arduinoConnected', () => {
    console.log('Level: Arduino verbunden Event empfangen');
    addLog('Arduino verbunden', 'success');
    updateIndicator(true);
  });

  ArduinoManager.addEventListener('arduinoDisconnected', () => {
    console.log('Level: Arduino getrennt Event empfangen');
    addLog('Arduino getrennt', 'warn');
    updateIndicator(false);
  });

  ArduinoManager.addEventListener('arduinoMessage', (data) => {
    const msg = data.message.trim();
    if (!msg) return;

    console.log('Arduino:', msg);

    // Log nur bestimmte Nachrichten (nicht JOYSTICK Spam)
    if (!msg.startsWith('JOYSTICK:')) {
      addLog(`Arduino: ${msg}`, 'info');
    }

    // LEVEL 1 LOGIK
    if (msg === 'L1_SYSTEM_START') {
      const isLevel1 = window.location.pathname.includes('level1');
      if (!isLevel1) return;

      console.log('Level 1: System gestartet (Nachricht empfangen)');
      level1Step = 1; // Lokaler Status-Update
      
      if (statusText) {
        statusText.innerText = 'System aktiv. Drücke den Button erneut.';
        statusText.style.color = 'var(--success)';
      }
      updateTaskUI(1);
    }
    else if (msg === 'L1_ZUGANG_OK') {
      const isLevel1 = window.location.pathname.includes('level1');
      if (!isLevel1) return;

      console.log('Level 1: Zugang OK (Nachricht empfangen), Aktueller Status:', level1Step);
      
      // Strikte Prüfung über lokale Variable
      if (level1Step === 1) {
        console.log('Level 1: BEDINGUNG ERFÜLLT. Zeige Erfolg an.');
        level1Step = 2;
        if (statusText) {
          statusText.innerText = 'Erfolg!';
          statusText.style.color = 'var(--success)';
        }
        updateTaskUI(2);
        handleSolve();
      } else {
        console.log('Level 1: Ignoriere L1_ZUGANG_OK, da level1Step nicht 1 ist (Step war:', level1Step, ')');
      }
    }
    // LEVEL 2 LOGIK - Joystick Daten
    else if (msg.startsWith('JOYSTICK:')) {
      const isLevel2 = window.location.pathname.includes('level2');
      if (isLevel2) {
        const parts = msg.replace('JOYSTICK:', '').split(',');
        joystickX = parseInt(parts[0]) || 0;
        joystickY = parseInt(parts[1]) || 0;
      }
    }
    else if (msg === 'L2_GELOEST') {
      const isLevel2 = window.location.pathname.includes('level2');
      if (isLevel2) {
        if (statusText) {
          statusText.innerText = 'Ziel erreicht!';
          statusText.style.color = 'var(--success)';
        }
        handleSolve();
        updateTaskUI(3);
      }
    }
    // LEVEL 3 LOGIK
    else if (msg === 'L3_ZUGANG_OK') {
      const isLevel3 = window.location.pathname.includes('level3');
      if (isLevel3) {
        if (statusText) {
          statusText.innerText = 'Bewegung erkannt!';
          statusText.style.color = 'var(--success)';
        }
        handleSolve();
        updateTaskUI(3);
      }
    }
  });

  ArduinoManager.addEventListener('arduinoSolved', () => {
    // In Level 1 ignorieren wir das generische Solved-Signal,
    // da wir hier zwei spezifische Button-Drücke brauchen.
    const isLevel1 = window.location.pathname.includes('level1');
    if (!isLevel1) {
      handleSolve();
    }
  });
}

function updateTaskUI(activeIndex) {
  if (!taskListItems.length) return;

  taskListItems.forEach((li, index) => {
    li.classList.remove('active-task', 'completed', 'pending');
    if (index < activeIndex) {
      li.classList.add('completed');
    } else if (index === activeIndex) {
      li.classList.add('active-task');
    } else {
      li.classList.add('pending');
    }
  });
}

// ===== EVENT LISTENER =====
function setupEventListeners() {
  if (toggleLogBtn) {
    toggleLogBtn.addEventListener('click', () => {
      if (logPanel) {
        if (logPanel.style.display === 'none') {
          logPanel.style.display = 'block';
          toggleLogBtn.classList.add('active');
        } else {
          logPanel.style.display = 'none';
          toggleLogBtn.classList.remove('active');
        }
      }
    });
  }

  if (clearLogBtn) {
    clearLogBtn.addEventListener('click', () => {
      debugLogs = [];
      updateLogDisplay();
      addLog('Log geleert', 'info');
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/pages/index.html';
    });
  }

  if (sendCodeBtn) {
    sendCodeBtn.addEventListener('click', async () => {
      const code = codeInput.value.trim();
      if (code) {
        const result = await ArduinoManager.sendToArduino(code);
        if (!result.success) {
          alert('Fehler beim Senden: ' + result.message);
        }
        codeInput.value = '';
      }
    });
  }

  if (codeInput) {
    codeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && sendCodeBtn) sendCodeBtn.click();
    });
  }

  if (nextLevelBtn) {
    nextLevelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const match = window.location.pathname.match(/level(\d+)/);
      if (match) {
        const currentLevel = match[1];
        const nextLevel = parseInt(currentLevel) + 1;
        window.location.href = `/pages/level${nextLevel}.html`;
      } else {
        window.location.href = '/pages/index.html';
      }
    });
  }

  if (restartBtn) {
    restartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/pages/index.html';
    });
  }
}

// ===== RÄTSEL GELÖST =====
function handleSolve() {
  if (resultDisplay) {
    console.log('🎉 handleSolve aufgerufen - Zeige DIV an');
    resultDisplay.style.display = 'block';
    resultDisplay.classList.remove('hidden');

    // Konfetti Effekt
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#007aff', '#34c759', '#ffcc00']
      });
    }

    // Automatisch zum Erfolgs-Div scrollen
    setTimeout(() => {
      resultDisplay.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
  console.log('🎉 Level gelöst!');
}

// ===== JOYSTICK GAME (Level 2) =====
function initJoystickGame() {
  canvas = document.getElementById('game-canvas');
  if (!canvas) return;

  ctx = canvas.getContext('2d');

  collectedCount = 0;
  collectibles = [];

  // Erstelle mehrere sammelbare Punkte
  for (let i = 0; i < totalCollectibles; i++) {
    collectibles.push({
      x: Math.random() * (canvas.width - 100) + 50,
      y: Math.random() * (canvas.height - 100) + 50,
      radius: 12,
      collected: false
    });
  }

  requestAnimationFrame(gameLoop);
}

function gameLoop() {
  if (!canvas || !ctx) return;

  // Canvas leeren
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Spieler bewegen basierend auf Joystick
  player.x += (joystickX / 100) * player.speed;
  player.y += (joystickY / 100) * player.speed;

  // Grenzen prüfen
  player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

  // Sammelbare Punkte zeichnen und Kollision prüfen
  collectibles.forEach((item, index) => {
    if (item.collected) return;

    const distance = Math.sqrt(
      Math.pow(player.x - item.x, 2) + Math.pow(player.y - item.y, 2)
    );

    if (distance < player.radius + item.radius) {
      // Punkt eingesammelt!
      item.collected = true;
      collectedCount++;

      if (statusText) {
        statusText.innerText = `${collectedCount}/${totalCollectibles} Punkte gesammelt`;
      }

      // Alle Punkte gesammelt?
      if (collectedCount >= totalCollectibles) {
        ArduinoManager.sendToArduino('L2_SOLVED');
        return;
      }
    }

    // Nicht eingesammelte Punkte zeichnen (grün)
    ctx.beginPath();
    ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#34c759';
    ctx.fill();
    ctx.strokeStyle = '#28a745';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Spieler zeichnen (blau)
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#007aff';
  ctx.fill();
  ctx.strokeStyle = '#0056b3';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Info anzeigen
  ctx.fillStyle = '#333';
  ctx.font = '14px monospace';
  ctx.fillText(`Punkte: ${collectedCount}/${totalCollectibles}`, 10, 20);
  ctx.fillText(`Joystick: X=${joystickX} Y=${joystickY}`, 10, 40);

  requestAnimationFrame(gameLoop);
}

// Sicherstellen, dass die DIV beim Laden wirklich weg ist
window.addEventListener('load', () => {
  if (resultDisplay) {
    resultDisplay.style.display = 'none';
  }
});

// ===== START =====
init();
