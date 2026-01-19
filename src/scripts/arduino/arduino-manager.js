/**
 * Globales Arduino Manager mit WebSocket-Backend
 * Diese Datei verwaltet die Arduino-Verbindung über ein Node.js Backend
 */
// import { io } from "/socket.io/socket.io.esm.min.js";

// Wir nutzen die globale io Instanz, die vom Server bereitgestellt wird
// Oder wir importieren sie korrekt, falls Vite sie auflösen kann.
// Da sie in vite.config.js als external markiert ist, 
// sollte sie zur Laufzeit verfügbar sein, wenn das Skript im HTML geladen wird.

const socket = typeof io !== 'undefined' ? io({
    transports: ['websocket']
}) : null;

if (!socket) {
    console.error("Socket.io (io) ist nicht definiert! Prüfe ob /socket.io/socket.io.js geladen wurde.");
}

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

    if (event === 'arduinoConnected' || event === 'arduinoDisconnected') {
        updateGlobalStatusUI();
    }

    window.dispatchEvent(new CustomEvent(`arduino:${event}`, { detail: data }));
}

// Initialer Status-Check für die UI
if (typeof document !== 'undefined') {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        updateGlobalStatusUI();
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
        if (globalIsConnected) {
            indicator.classList.remove('disconnected');
            indicator.classList.add('connected');
        } else {
            indicator.classList.remove('connected');
            indicator.classList.add('disconnected');
        }
    }
    
    // Dispatch an event so other components can react to the loaded status
    const event = new CustomEvent('arduinoStatusUpdate', { detail: { connected: globalIsConnected } });
    window.dispatchEvent(event);
    console.log('Manager: Dispatching arduinoStatusUpdate, connected:', globalIsConnected);
}

// Sofortige Ausführung beim Import (falls möglich)
if (typeof window !== 'undefined') {
    window.addEventListener('arduinoStatusUpdate', (e) => {
        // Log für Debugging
        console.log('Global Status Update:', e.detail.connected);
    });

    window.addEventListener('arduino:requestStatus', () => {
        if (socket) {
            console.log('Manager: Manuelle Status-Abfrage angefordert');
            socket.emit('get-status');
        }
    });
}

// ===== SOCKET LISTENERS =====
if (socket) {
    socket.on('connect', () => {
        console.log('Socket.io verbunden');
        socket.emit('get-status');
    });

    socket.on('status', (data) => {
        console.log('Manager: Status vom Server empfangen (connected:', data.connected, ')');
        const wasConnected = globalIsConnected;
        globalIsConnected = data.connected;

        updateGlobalStatusUI();
        
        // Dispatch events properly
        if (globalIsConnected && !wasConnected) {
            console.log('Manager: Dispatching arduinoConnected');
            dispatchEvent('arduinoConnected', { connected: true });
        } else if (wasConnected && !globalIsConnected) {
            console.log('Manager: Dispatching arduinoDisconnected');
            dispatchEvent('arduinoDisconnected', { connected: false });
        }
        
        // Immer ein generisches Status-Update feuern für die UI-Synchronisation
        console.log('Manager: Dispatching arduinoStatusUpdate (generic), connected:', globalIsConnected);
        window.dispatchEvent(new CustomEvent('arduinoStatusUpdate', { detail: { connected: globalIsConnected } }));
    });

    if (socket.connected) {
        console.log('Manager: Socket bereits verbunden, frage Status ab...');
        socket.emit('get-status');
    }

    socket.on('arduino-data', (data) => {
        console.log('Rohdaten vom Arduino:', data);
        const cleanData = data.toString().trim();
        dispatchEvent('arduinoMessage', { message: cleanData });

        if (cleanData === 'SOLVED') {
            dispatchEvent('arduinoSolved', {});
        }
    });

    socket.on('error', (data) => {
        console.error('Socket Fehler:', data.message);
    });
}

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
    if (!socket) return { success: false, message: 'Keine Socket-Verbindung' };

    socket.emit('connect-arduino', { path: portPath });

    return new Promise((resolve) => {
        const checkStatus = (data) => {
            if (data.connected) {
                socket.off('status', checkStatus);
                resolve({ success: true, message: 'Verbunden' });
            }
        };
        socket.on('status', checkStatus);

        // Erhöhtes Timeout auf 10 Sekunden
        setTimeout(() => {
            socket.off('status', checkStatus);
            if (!globalIsConnected) {
                resolve({ success: false, message: 'Timeout bei der Verbindung (Arduino reagiert nicht)' });
            }
        }, 10000);
    });
}

export async function disconnectArduino() {
    if (socket) socket.emit('disconnect-arduino');
}

// ===== STATUS GETTERS =====
export function isConnected() {
    return globalIsConnected;
}

export function isReadLoopActive() {
    return globalIsConnected;
}

// ===== SENDE-FUNKTION =====
export async function sendToArduino(message) {
    if (!globalIsConnected || !socket) {
        return { success: false, message: 'Arduino nicht verbunden oder Socket fehlt' };
    }

    socket.emit('send-to-arduino', message);
    return { success: true };
}
