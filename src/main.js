import './style.css'

// DOM Elemente
const connectBtn = document.querySelector('#connect-btn');
const statusDisplay = document.querySelector('#status-display');
const resultDisplay = document.querySelector('#result-display');

let port;
let reader;

/**
 * Funktion zum Verbinden mit dem Arduino
 */
async function connect() {
  try {
    // Port anfordern (Benutzer muss ihn im Browser-Dialog auswählen)
    port = await navigator.serial.requestPort();
    
    // Öffne den Port mit der im Arduino eingestellten Baudrate
    await port.open({ baudRate: 9600 });
    
    updateStatus('Verbunden', 'status-connected');
    connectBtn.disabled = true;

    // Starte das Lesen der Daten
    readLoop();
    
  } catch (error) {
    console.error('Verbindungsfehler:', error);
    updateStatus('Verbindung fehlgeschlagen', 'status-disconnected');
  }
}

/**
 * Kontinuierliche Leseschleife für serielle Daten
 */
async function readLoop() {
  while (port.readable) {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          // Reader wurde gestoppt
          break;
        }
        if (value) {
          processMessage(value);
        }
      }
    } catch (error) {
      console.error('Lesefehler:', error);
    } finally {
      reader.releaseLock();
    }
  }
}

/**
 * Verarbeitet die empfangenen Nachrichten vom Arduino
 * @param {string} message 
 */
function processMessage(message) {
  // Entferne Leerzeichen/Zeilenumbrüche
  const cleanMessage = message.trim();
  console.log('Empfangen:', cleanMessage);

  if (cleanMessage === 'SOLVED') {
    handleSolve();
  }
}

/**
 * Reaktion auf das gelöste Rätsel
 */
function handleSolve() {
  // Zeige das Resultat-Div an
  resultDisplay.classList.remove('hidden');
  
  // Löse einen Alarm aus
  alert('🎉 Herzlichen Glückwunsch! Das Rätsel wurde gelöst!');
  
  // Optional: Visuelle Bestätigung im Status
  updateStatus('Rätsel gelöst!', 'status-connected');
}

/**
 * Hilfsfunktion zum Aktualisieren des Status-Textes
 */
function updateStatus(text, className) {
  statusDisplay.textContent = `Status: ${text}`;
  statusDisplay.className = className;
}

// Event Listener
connectBtn.addEventListener('click', () => {
  if ('serial' in navigator) {
    connect();
  } else {
    alert('Web Serial API wird von diesem Browser nicht unterstützt. Bitte verwende Chrome oder Edge.');
  }
});
