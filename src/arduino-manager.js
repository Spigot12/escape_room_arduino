
/**
 * Globales Arduino Manager
 * Diese Datei verwaltet die Arduino-Verbindung über alle Seiten hinweg
 */

let globalPort = null;
let globalReader = null;
let globalIsConnected = false;
let globalReadLoopActive = false;

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
    // Auch als globales Event senden
    window.dispatchEvent(new CustomEvent(`arduino:${event}`, { detail: data }));
}

// ===== ARDUINO VERBINDUNG =====
export async function connectArduino() {
    try {
        globalPort = await navigator.serial.requestPort();
        await globalPort.open({ baudRate: 9600 });

        globalIsConnected = true;
        startReadLoop();
        dispatchEvent('arduinoConnected', { port: globalPort });

        return { success: true, message: 'Arduino verbunden' };
    } catch (error) {
        globalIsConnected = false;
        return { success: false, message: error.message };
    }
}

export async function disconnectArduino() {
    if (globalPort) {
        try {
            await globalPort.close();
        } catch (error) {
            console.error('Fehler beim Trennen:', error);
        }
    }

    globalPort = null;
    globalReader = null;
    globalIsConnected = false;
    globalReadLoopActive = false;
    dispatchEvent('arduinoDisconnected', {});
}

// ===== STATUS GETTERS =====
export function isConnected() {
    return globalIsConnected;
}

export function isReadLoopActive() {
    return globalReadLoopActive;
}

export function getPort() {
    return globalPort;
}

// ===== LESESCHLEIFE =====
async function startReadLoop() {
    globalReadLoopActive = true;

    while (globalPort && globalIsConnected) {
        try {
            const textDecoder = new TextDecoderStream();
            const readableStreamClosed = globalPort.readable.pipeTo(textDecoder.writable);
            globalReader = textDecoder.readable.getReader();

            try {
                while (true) {
                    const { value, done } = await globalReader.read();

                    if (done) {
                        break;
                    }

                    if (value) {
                        processArduinoMessage(value);
                    }
                }
            } catch (error) {
                console.error('Lesefehler:', error);
                globalIsConnected = false;
            } finally {
                globalReader.releaseLock();
            }
        } catch (error) {
            console.error('Leseschleife Fehler:', error);
            globalIsConnected = false;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
    }

    globalReadLoopActive = false;
}

// ===== NACHRICHTENVERARBEITUNG =====
function processArduinoMessage(message) {
    const cleanMessage = message.trim();
    dispatchEvent('arduinoMessage', { message: cleanMessage });

    if (cleanMessage === 'SOLVED') {
        dispatchEvent('arduinoSolved', {});
    }
}

// ===== SENDE-FUNKTION =====
export async function sendToArduino(message) {
    if (!globalPort || !globalIsConnected) {
        throw new Error('Arduino nicht verbunden');
    }

    try {
        const writer = globalPort.writable.getWriter();
        await writer.write(new TextEncoder().encode(message + '\n'));
        writer.releaseLock();
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
}