import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import session from 'express-session';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(express.json());
app.use(session({
  secret: 'escape-room-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

let arduinoPort = null;
let parser = null;
let isConnected = false;

// User management functions
const USERS_FILE = path.join(__dirname, 'users.json');

async function loadUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function saveUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// Authentication routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, passwordConfirm } = req.body;

    if (!username || !password || !passwordConfirm) {
      return res.status(400).json({ error: 'Alle Felder sind erforderlich' });
    }

    if (password !== passwordConfirm) {
      return res.status(400).json({ error: 'Passwörter stimmen nicht überein' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Benutzername muss mindestens 3 Zeichen lang sein' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein' });
    }

    const users = await loadUsers();

    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'Benutzername bereits vergeben' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ username, password: hashedPassword });
    await saveUsers(users);

    req.session.user = { username };
    res.json({ success: true, username });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
    }

    const users = await loadUsers();
    const user = users.find(u => u.username === username);

    if (!user) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    req.session.user = { username };
    res.json({ success: true, username });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/check-auth', (req, res) => {
  if (req.session.user) {
    res.json({ authenticated: true, username: req.session.user.username });
  } else {
    res.json({ authenticated: false });
  }
});

// Leaderboard management
const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');

async function loadLeaderboard() {
  try {
    const data = await fs.readFile(LEADERBOARD_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function saveLeaderboard(leaderboard) {
  await fs.writeFile(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
}

// Get leaderboard (top 10)
app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await loadLeaderboard();
    // Sort by time (ascending) and return top 10
    const sorted = leaderboard.sort((a, b) => a.time - b.time).slice(0, 10);
    res.json(sorted);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Submit score to leaderboard
app.post('/api/leaderboard', async (req, res) => {
  try {
    const { username, time } = req.body;

    if (!username || !time) {
      return res.status(400).json({ error: 'Benutzername und Zeit erforderlich' });
    }

    if (typeof time !== 'number' || time <= 0) {
      return res.status(400).json({ error: 'Ungültige Zeit' });
    }

    const leaderboard = await loadLeaderboard();

    // Check if user already has a score
    const existingIndex = leaderboard.findIndex(entry => entry.username === username);

    if (existingIndex !== -1) {
      // Update if new time is better (faster)
      if (time < leaderboard[existingIndex].time) {
        leaderboard[existingIndex].time = time;
        leaderboard[existingIndex].date = new Date().toISOString();
      } else {
        return res.json({ success: true, message: 'Keine Verbesserung', improved: false });
      }
    } else {
      // Add new entry
      leaderboard.push({
        username,
        time,
        date: new Date().toISOString()
      });
    }

    await saveLeaderboard(leaderboard);
    res.json({ success: true, message: 'Score gespeichert', improved: true });
  } catch (error) {
    console.error('Submit score error:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

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

// Cleanup beim Beenden des Servers
function cleanup() {
  console.log('\n--- Server wird beendet ---');
  if (arduinoPort && arduinoPort.isOpen) {
    console.log('Schließe Arduino-Verbindung...');
    arduinoPort.close(() => {
      console.log('Arduino-Verbindung geschlossen');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
