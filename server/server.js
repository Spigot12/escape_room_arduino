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
  // console.log('Initialer Status gesendet:', isConnected);

  // if (isConnected) {
  //   io.emit('status', { connected: true });
  // }

  socket.on('get-status', () => {
    socket.emit('status', { connected: isConnected });
  });

  socket.on('connect-arduino', async (data) => {
    const { path: portPath } = data;

    // Wenn bereits verbunden, lehne neue Verbindung ab, außer es ist derselbe Port
    if (isConnected && arduinoPort && arduinoPort.isOpen) {
      if (arduinoPort.path === portPath) {
        socket.emit('status', { connected: true });
        return;
      }

      console.log('Verbindung abgelehnt: Arduino ist bereits verbunden');
      io.emit('status', { connected: true });
      socket.emit('error', { message: 'Es ist bereits ein Arduino verbunden. Nur eine gleichzeitige Verbindung ist erlaubt.' });
      return;
    }

    try {
      console.log('Versuche Port zu öffnen:', portPath);
      arduinoPort = new SerialPort({
        path: portPath,
        baudRate: 9600,
        autoOpen: false
      });

      arduinoPort.open((err) => {
        if (err) {
          console.error('SERIAL ERROR (Open):', err.message);
          socket.emit('error', { message: err.message });
          return;
        }

        isConnected = true;
        console.log('--- Arduino erfolgreich verbunden ---');

        parser = arduinoPort.pipe(new ReadlineParser({ delimiter: '\n' }));

        parser.on('data', (data) => {
          const message = data.toString().trim();
          if (message) {
            console.log('Arduino ->', message);
            io.emit('arduino-data', message);
          }
        });

        arduinoPort.on('error', (err) => {
          console.error('SERIAL ERROR (Event):', err.message);
          io.emit('error', { message: err.message });
        });

        arduinoPort.on('close', () => {
          isConnected = false;
          console.log('--- Port geschlossen ---');
          io.emit('status', { connected: false });
        });

        // Sende Status sowohl an den anfragenden Client als auch an alle anderen
        socket.emit('status', { connected: true });
        io.emit('status', { connected: true });

        // Sende ein RESET-Signal an den Arduino, damit er bei Level 0 startet
        setTimeout(() => {
          if (arduinoPort && arduinoPort.isOpen) {
            console.log('Sende RESET an Arduino...');
            arduinoPort.write('RESET\n');
          }
        }, 1000); 
      });
    } catch (error) {
      console.error('CATCH ERROR:', error.message);
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
    console.log('Trennungs-Anfrage vom Client erhalten');
    if (arduinoPort && arduinoPort.isOpen) {
      arduinoPort.close((err) => {
        if (err) {
          console.error('Fehler beim Schließen des Ports:', err.message);
          socket.emit('error', { message: 'Fehler beim Trennen: ' + err.message });
        } else {
          console.log('Port manuell geschlossen');
          isConnected = false;
          io.emit('status', { connected: false });
        }
      });
    } else {
      console.log('Trennen nicht möglich: Kein Port offen oder bereits geschlossen');
      isConnected = false;
      io.emit('status', { connected: false });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
