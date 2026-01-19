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

// ===== INITIALISIERUNG =====
function init() {
  setupEventListeners();
  setupArduinoListeners();
  updateTaskUI(0);

  if (ArduinoManager.isConnected()) {
    updateIndicator(true);
  }
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
    console.log('Arduino sagt:', msg);

    if (msg === 'System gestartet') {
      console.log('Level 1: System gestartet erkannt');
      if (statusText) statusText.innerText = 'System aktiv! Drücke den Button erneut für den Zugang.';
      updateTaskUI(1);
    }
    else if (msg === 'Zugang gewährt') {
      console.log('Level 1: Zugang gewährt erkannt');
      const pathname = window.location.pathname;
      const isLevel1 = pathname.includes('level1') || pathname.endsWith('level1.html');
      const isLevel2 = pathname.includes('level2') || pathname.endsWith('level2.html');
      const isLevel3 = pathname.includes('level3') || pathname.endsWith('level3.html');

      if (isLevel1) {
        if (statusText) statusText.innerText = 'Zugang gewährt!';
        handleSolve();
        updateTaskUI(2);
      } else if (isLevel2 || isLevel3) {
        handleSolve();
        updateTaskUI(3);
      }
    }
    else if (msg.startsWith('CODE:')) {
      const code = msg.split(':')[1];
      if (statusText) statusText.innerHTML = `LDR gelöst! <br><strong>Der Code lautet: ${code}</strong>`;
      if (codeSection) codeSection.classList.remove('hidden');
      updateTaskUI(2);
    }
    else if (msg === 'Code korrekt – Bewegung erforderlich') {
      if (statusText) statusText.innerText = 'Code korrekt! Jetzt bewege dich vor dem Sensor.';
      if (codeSection) codeSection.classList.add('hidden');
      updateTaskUI(3);
    }
  });

  ArduinoManager.addEventListener('arduinoSolved', () => {
    handleSolve();
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
      window.location.href = '/index.html';
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

    codeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendCodeBtn.click();
    });
  }

  if (nextLevelBtn) {
    nextLevelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const match = window.location.pathname.match(/level(\d+)/);
      if (match) {
        const currentLevel = match[1];
        const nextLevel = parseInt(currentLevel) + 1;
        window.location.href = `/level${nextLevel}.html`;
      } else {
        window.location.href = '/';
      }
    });
  }

  if (restartBtn) {
    restartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/index.html';
    });
  }
}

// ===== RÄTSEL GELÖST =====
function handleSolve() {
  if (resultDisplay) {
    resultDisplay.classList.remove('hidden');
  }
  console.log('🎉 Level gelöst!');
}

// ===== START =====
init();
