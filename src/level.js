import './style.css'
import * as ArduinoManager from './arduino-manager.js'

// ===== DOM ELEMENTE =====
const backBtn = document.querySelector('#back-btn');
const resultDisplay = document.querySelector('#result-display');
const nextLevelBtn = document.querySelector('#next-level-btn');
const restartBtn = document.querySelector('#restart-btn');

// ===== INITIALISIERUNG =====
function init() {
  setupEventListeners();
  setupArduinoListeners();
}

// ===== ARDUINO EVENTS =====
function setupArduinoListeners() {
  ArduinoManager.addEventListener('arduinoSolved', () => {
    handleSolve();
  });

  // Log den Status beim Laden der Seite
  console.log('Level geladen - Arduino verbunden?', ArduinoManager.isConnected());
  console.log('Leseschleife aktiv?', ArduinoManager.isReadLoopActive());
}

// ===== EVENT LISTENER =====
function setupEventListeners() {
  backBtn.addEventListener('click', () => {
    window.location.href = '/';
  });

  if (nextLevelBtn) {
    nextLevelBtn.addEventListener('click', () => {
      const currentLevel = window.location.pathname.match(/level(\d+)/)[1];
      const nextLevel = parseInt(currentLevel) + 1;
      window.location.href = `/level${nextLevel}.html`;
    });
  }

  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      window.location.href = '/';
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