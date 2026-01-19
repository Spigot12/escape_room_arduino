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

// ===== STATE =====
let level1Step = 0; // 0: Bereit, 1: System gestartet, 2: Zugang gewährt

// ===== INITIALISIERUNG =====
function init() {
  console.log('--- LEVEL INIT START ---');
  level1Step = 0; // Reset state
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
    updateIndicator(true);
  });

  ArduinoManager.addEventListener('arduinoDisconnected', () => {
    console.log('Level: Arduino getrennt Event empfangen');
    updateIndicator(false);
  });

  ArduinoManager.addEventListener('arduinoMessage', (data) => {
    const msg = data.message.trim();
    if (!msg) return;

    console.log('Arduino:', msg);

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
    // LEVEL 2 LOGIK
    else if (msg === 'L2_GELOEST') {
      const isLevel2 = window.location.pathname.includes('level2');
      if (isLevel2) {
        if (statusText) {
          statusText.innerText = 'Licht stabilisiert.';
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

// Sicherstellen, dass die DIV beim Laden wirklich weg ist
window.addEventListener('load', () => {
  if (resultDisplay) {
    resultDisplay.style.display = 'none';
  }
});

// ===== START =====
init();
