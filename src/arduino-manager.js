
/**
 * Globales Arduino Manager mit WebSocket-Backend
 * Diese Datei verwaltet die Arduino-Verbindung über ein Node.js Backend
 */
import { io } from "/socket.io/socket.io.esm.min.js";

const socket = io({
    transports: ['websocket']
});

let globalIsConnected = false;

// Event-Listener für globale Arduino-Events
const listeners = {
    'arduinoSolved': [],
    'arduinoConnected': [],
    'arduinoDisconnected': [],
    'arduinoMessage': []
};

// ===== GLOBALE EVENTS =====
export function addEventListener(event, callback) {
    if (listeners[event]) {
        listeners[event].push(callback);
    }
}

export function removeEventListener(event, callback) {
    if (listeners[event]) {
        listeners[event] = listeners[event].filter(cb => cb !== callback);
    }
}

function dispatchEvent(event, data) {
    if (listeners[event]) {
        listeners[event].forEach(callback => callback(data));
    }
    
    // UI Update bei Statusänderung
    if (event === 'arduinoConnected' || event === 'arduinoDisconnected') {
        updateGlobalStatusUI();
    }

    // Auch als globales Event senden
    window.dispatchEvent(new CustomEvent(`arduino:${event}`, { detail: data }));
}

// Initialer Status-Check für die UI
if (typeof document !== 'undefined') {
    // Sofortiger Check, falls das DOM bereits geladen ist
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(updateGlobalStatusUI, 100);
    }
    
    window.addEventListener('load', () => {
        updateGlobalStatusUI();
    });
    
    document.addEventListener('DOMContentLoaded', () => {
        updateGlobalStatusUI();
    });
}

function updateGlobalStatusUI() {
    const indicator = document.querySelector('#arduino-indicator');
    if (indicator) {
        console.log('Update Indicator UI. Connected:', globalIsConnected, 'Path:', window.location.pathname);
        if (globalIsConnected) {
            indicator.classList.remove('disconnected');
            indicator.classList.add('connected');
        } else {
            indicator.classList.remove('connected');
            indicator.classList.add('disconnected');
        }
    }
}

// ===== SOCKET LISTENERS =====
socket.on('connect', () => {
    console.log('Socket.io verbunden');
    socket.emit('get-status');
});

socket.on('status', (data) => {
    console.log('Verbindungsstatus vom Server:', data.connected);
    globalIsConnected = data.connected;
    
    // UI Update triggern
    updateGlobalStatusUI();
    
    if (globalIsConnected) {
        dispatchEvent('arduinoConnected', {});
    } else {
        dispatchEvent('arduinoDisconnected', {});
    }
});

// Fordere den aktuellen Status explizit an, falls die Verbindung bereits steht
socket.emit('get-status');

socket.on('arduino-data', (data) => {
    console.log('Rohdaten vom Arduino:', data);
    const cleanData = data.trim();
    dispatchEvent('arduinoMessage', { message: cleanData });
    
    if (cleanData === 'SOLVED') {
        dispatchEvent('arduinoSolved', {});
    }
});

socket.on('error', (data) => {
    console.error('Socket Fehler:', data.message);
});

// ===== ARDUINO VERBINDUNG =====
export async function listPorts() {
    try {
        console.log('Versuche Ports zu laden...');
        const response = await fetch('/api/ports');
        if (!response.ok) throw new Error('Backend nicht erreichbar');
        return await response.json();
    } catch (error) {
        console.error('Fehler beim Laden der Ports:', error);
        return [];
    }
}

export async function connectArduino(portPath) {
    if (!portPath) return { success: false, message: 'Kein Port ausgewählt' };
    
    socket.emit('connect-arduino', { path: portPath });
    
    // Wir warten kurz auf die Bestätigung via 'status' Event
    return new Promise((resolve) => {
        const checkStatus = (data) => {
            if (data.connected) {
                socket.off('status', checkStatus);
                resolve({ success: true, message: 'Verbunden' });
            }
        };
        socket.on('status', checkStatus);
        
        // Timeout nach 5 Sekunden
        setTimeout(() => {
            socket.off('status', checkStatus);
            if (!globalIsConnected) {
                resolve({ success: false, message: 'Timeout bei der Verbindung' });
            }
        }, 5000);
    });
}

export async function disconnectArduino() {
    socket.emit('disconnect-arduino');
}

// ===== STATUS GETTERS =====
export function isConnected() {
    return globalIsConnected;
}

export function isReadLoopActive() {
    // Da das Backend liest, ist die "Loop" immer aktiv wenn verbunden
    return globalIsConnected;
}

// ===== SENDE-FUNKTION =====
export async function sendToArduino(message) {
    if (!globalIsConnected) {
        return { success: false, message: 'Arduino nicht verbunden' };
    }

    socket.emit('send-to-arduino', message);
    return { success: true };
}