import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let arduinoPort = null;
let parser = null;
let isConnected = false;

// Statische Dateien aus dem Vite-Build-Ordner servieren (falls vorhanden)
app.use(express.static(path.join(__dirname, 'dist')));
// Falls wir im Root arbeiten (Entwicklung ohne dist)
app.use(express.static(__dirname));

// API Endpunkt zum Auflisten der Ports
app.get('/api/ports', async (req, res) => {
  console.log('Port-Liste angefragt');
  try {
    const ports = await SerialPort.list();
    console.log(`${ports.length} Ports gefunden`);
    res.json(ports);
  } catch (error) {
    console.error('Fehler beim Auflisten der Ports:', error);
    res.status(500).json({ error: error.message });
  }
});

// WICHTIG: Fallback für Single Page Application / HTML Dateien
app.get('/level:id', (req, res) => {
  const levelId = req.params.id;
  res.sendFile(path.join(__dirname, `level${levelId}.html`));
});

app.get('/level:id.html', (req, res) => {
  const levelId = req.params.id;
  res.sendFile(path.join(__dirname, `level${levelId}.html`));
});

io.on('connection', (socket) => {
  console.log('Client verbunden:', socket.id);
  
  // Aktuellen Status senden
  socket.emit('status', { connected: isConnected });
  console.log('Initialer Status gesendet:', isConnected);

  // Status an alle senden, falls jemand neu verbindet und der Arduino bereits offen ist
  if (isConnected) {
    io.emit('status', { connected: true });
  }

  socket.on('get-status', () => {
    socket.emit('status', { connected: isConnected });
    console.log('Status explizit angefragt. Gesendet:', isConnected);
  });

  socket.on('connect-arduino', async (data) => {
    const { path: portPath } = data;
    
    // Falls bereits eine Verbindung besteht, diese erst schließen
    if (arduinoPort && arduinoPort.isOpen) {
      console.log('Schließe bestehende Verbindung zu:', arduinoPort.path);
      await new Promise(resolve => arduinoPort.close(resolve));
    }

    try {
      arduinoPort = new SerialPort({
        path: portPath,
        baudRate: 9600,
        autoOpen: false
      });

      arduinoPort.open((err) => {
        if (err) {
          socket.emit('error', { message: err.message });
          return;
        }
        
        isConnected = true;
        console.log('Arduino verbunden auf:', portPath);
        
        parser = arduinoPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));
        
        parser.on('data', (data) => {
          console.log('Arduino ->', data);
          io.emit('arduino-data', data);
        });

        arduinoPort.on('close', () => {
          isConnected = false;
          console.log('Arduino Verbindung geschlossen');
          io.emit('status', { connected: false });
        });

        io.emit('status', { connected: true });
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('send-to-arduino', (data) => {
    if (arduinoPort && arduinoPort.isOpen) {
      arduinoPort.write(data + '\n', (err) => {
        if (err) {
          console.error('Fehler beim Schreiben:', err.message);
        }
      });
    }
  });

  socket.on('disconnect-arduino', () => {
    if (arduinoPort && arduinoPort.isOpen) {
      arduinoPort.close();
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
