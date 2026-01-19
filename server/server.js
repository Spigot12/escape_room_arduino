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

// Statische Dateien aus dem Vite-Build-Ordner servieren
app.use(express.static(path.join(__dirname, '../dist')));
// Fallback für Entwicklung - serviere src/pages als Root für statische Dateien
app.use(express.static(path.join(__dirname, '../src/pages')));
// Erlaube Zugriff auf scripts und styles während der Entwicklung
app.use('/scripts', express.static(path.join(__dirname, '../src/scripts')));
app.use('/styles', express.static(path.join(__dirname, '../src/styles')));
app.use('/assets', express.static(path.join(__dirname, '../src/assets')));

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

// Fallback für Single Page Application
app.get('/level:id', (req, res) => {
  const levelId = req.params.id;
  res.sendFile(path.join(__dirname, `../src/pages/level${levelId}.html`));
});

app.get('/level:id.html', (req, res) => {
  const levelId = req.params.id;
  res.sendFile(path.join(__dirname, `../src/pages/level${levelId}.html`));
});

io.on('connection', (socket) => {
  console.log('Client verbunden:', socket.id);

  socket.emit('status', { connected: isConnected });
  console.log('Initialer Status gesendet:', isConnected);

  if (isConnected) {
    io.emit('status', { connected: true });
  }

  socket.on('get-status', () => {
    socket.emit('status', { connected: isConnected });
    console.log('Status explizit angefragt. Gesendet:', isConnected);
  });

  socket.on('connect-arduino', async (data) => {
    const { path: portPath } = data;

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
          const message = data.toString().trim();
          console.log('Arduino ->', message);
          io.emit('arduino-data', message);
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
