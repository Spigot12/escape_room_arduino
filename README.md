# 🎮 Escape Room Arduino - Multi-Level Game

Ein interaktives Web-basiertes Escape Room Spiel mit Arduino-Hardware-Integration. Spieler müssen 8 verschiedene Level lösen, die Tasten, Joystick, Sensoren und LEDs nutzen.

**🌐 Stack:** Node.js + Express + Vite + Socket.io + Arduino

---

## 📋 Übersicht

| Level | Challenge | Hardware |
|-------|-----------|----------|
| **L1** | Button 2x drücken | Taster (Pin 6) |
| **L2** | Joystick-Spiel | Joystick (A0, A1, Pin 3) |
| **L3** | Labyrinth-Navigierung | Joystick |
| **L4** | Snake Game | Joystick |
| **L5** | Button-Sequenz (2-4-1-3) | 4 Taster (Pins 6-9) + 4 LEDs |
| **L6** | Eisblock schmelzen | Temperatursensor KY-013 (A2) |
| **L7** | Mikrofon-Schwellenwert | Mikrofon KY-037 (A3) |
| **L8** | LED Memory Game (3 Level) | 3 LEDs (Pins 10-12) |

---

## 🔧 Hardwareanforderungen

### Komponenten

- **Arduino Uno R3** (oder kompatibel)
- **Taster/Buttons**: 5 Stück
- **Joystick-Modul** (2-Achsen + Button)
- **Temperatursensor KY-013**
- **Mikrofon-Modul KY-037**
- **LEDs**: 7 Stück (4x für Level 5 + 3x für Level 8)
- **Widerstände**: 220Ω für LEDs
- **USB-Kabel** (Arduino ↔ Computer)

### Pin-Belegung

```text
DIGITAL PINS: 
Pin 3 → Joystick Button 
Pin 6 → Button Level 1 & 5 (BTN1) 
Pin 7 → Button Level 5 (BTN2) 
Pin 8 → Button Level 5 (BTN3) 
Pin 9 → Button Level 5 (BTN4) 
Pin 10 → LED Red (Level 8) 
Pin 11 → LED Yellow (Level 8) 
Pin 12 → LED Blue (Level 8)

ANALOG PINS: 
A0 → Joystick X-Achse 
A1 → Joystick Y-Achse 
A2 → Temperatursensor (KY-013) 
A3 → Mikrofon (KY-037)
```

---

## 💾 Voraussetzungen - Software

### Erforderlich

- **Node.js** ≥ 18.x ([Download](https://nodejs.org/))
- **Arduino CLI** ([Installation](#arduino-cli-installation))
- **Moderner Browser**: Chrome, Edge, Opera (Web Serial API)

### Optional

- **Docker** (für Containerisierung)
- **Arduino IDE** (falls Arduino CLI Probleme macht)

---

## ⚙️ Einrichtung

### 1. Arduino CLI Installation

#### macOS
```bash
brew install arduino-cli
```

#### Windows (PowerShell)
```powershell
winget install ArduinoSA.CLI
# oder manuell: https://arduino.cc/pro/software
```

#### Linux
```bash
curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh
```

#### Board-Konfiguration (einmalig)
```bash
arduino-cli core update-index
arduino-cli core install arduino:avr
```

Verifizieren:
```bash
arduino-cli version
arduino-cli board list
```

### 2. Arduino Code hochladen

**Schritt 1:** Arduino mit USB verbinden

**Schritt 2:** Port und Board identifizieren
```bash
arduino-cli board list
```
Ausgabe (Beispiel macOS):
```text
Port          Type              Board Name    FQBN            Core
/dev/cu.usb*  Serial Port (USB) Arduino Uno   arduino:avr:uno arduino:avr
```

**Schritt 3:** Code hochladen - Wähle eine Methode:

**Methode A: npm (empfohlen)**
```bash
npm run arduino:upload
```

**Methode B: Manuell mit Arduino CLI**
```bash
# Schritt für Schritt
arduino-cli compile --fqbn arduino:avr:uno arduino_sketch
arduino-cli upload -p /dev/cu.usbmodem* --fqbn arduino:avr:uno arduino_sketch
```
*macOS Port-Beispiele: /dev/cu.usbmodem12301, /dev/cu.usbserial-**
*Windows Port-Beispiele: COM3, COM4*

### 3. Node Abhängigkeiten installieren
```bash
npm install
```

Installierte Packages:
- **express** - HTTP Server
- **socket.io** - Echtzeit-Kommunikation
- **serialport** - Arduino Serienschnittstelle
- **bcrypt** - Passwort-Hashing
- **express-session** - Session-Management
- **vite** - Frontend Build-Tool
- **concurrently** - Paralleles Ausführen

---

## 🚀 Projekt starten

### Development Mode (mit Hot-Reload)
```bash
# Startet Backend + Frontend + Arduino Upload
npm run dev:all

# Oder ohne Arduino Upload (schneller!)
npm run dev:all:no-arduino
```
Zugriff:
- Frontend (Vite Dev Server): http://localhost:5173
- Backend API (Port 3000): http://localhost:3000

### Production Mode
```bash
# Build Frontend
npm run build

# Starte Server
npm start
```
Zugriff: http://localhost:3000

### Nur Backend / Frontend
```bash
# Nur Backend (Port 3000)
npm run server

# Nur Frontend mit Vite (Port 5173)
npm run dev
```

---

## 🐳 Docker

Mit Dockerfile starten:
```bash
# Image bauen
docker build -t escape-room-arduino .

# Container starten (Mapped Host 5173 auf Container 3000)
docker run -p 5173:3000 escape-room-arduino

# Mit Arduino-Zugriff (Linux/macOS)
docker run -p 5173:3000 --device=/dev/ttyUSB0 escape-room-arduino

# Mit Port-Mapping
docker run -p 8080:3000 escape-room-arduino
```
Zugriff: http://localhost:5173 (oder localhost:8080)

---

## 🎮 Spielablauf

### Startseite
1. Melde dich an (optional) oder spiele anonym
2. Verbinde deinen Arduino über "🔌 Arduino verbinden"
3. Wähle einen Port aus der Liste
4. Klicke "🚀 Spiel starten"

### Während des Spiels
- Timer läuft automatisch
- Jedes Level hat eigene Challenges
- Fehler werden geloggt (Debug-Panel oben rechts)
- Leaderboard speichert die beste Zeit

### Nach Completion
- Endzeit wird gezeigt
- Leaderboard-Eintrag wird gespeichert
- Du kannst alle Level wiederholen

---

## 📁 Projektstruktur
```text
escape_room_arduino/
├── arduino_sketch/          # Arduino C++ Code
│   └── arduino_sketch.ino    # Hauptsketch (8 Level)
├── server/
│   ├── server.js            # Express + Socket.io Server
│   ├── users.json           # Benutzer-Datenbank
│   └── leaderboard.json     # Leaderboard
├── src/
│   ├── pages/               # HTML für jedes Level
│   │   ├── index.html       # Startseite
│   │   ├── level1-8.html    # Level-Seiten
│   │   ├── leaderboard.html # Rangliste
│   │   └── map.html         # Übersichtsseite
│   ├── scripts/
│   │   ├── entry-points/
│   │   │   ├── main.js      # Startseite-Logik
│   │   │   ├── level.js     # Level-Logik (alle Level)
│   │   │   └── leaderboard.js
│   │   ├── arduino/
│   │   │   └── arduino-manager.js  # Serial Communication
│   │   ├── auth.js          # Login/Register
│   │   ├── auth-check.js    # Session-Prüfung
│   │   └── game-timer.js    # Zeitmessung
│   └── styles/              # CSS
│       ├── style.css        # Main
│       ├── components.css   # UI Komponenten
│       └── animations.css   # Animationen
├── dist/                    # Build-Output (nach npm run build)
├── Dockerfile               # Containerisierung
├── package.json
├── vite.config.js          # Vite-Konfiguration
└── README.md
```

---

## 🔌 Arduino Serial-Protokoll

### Befehle (Frontend → Arduino)
| Befehl | Bedeutung |
|--------|-----------|
| RESET | Zurück zu Level 0 |
| SET_LEVEL_N | Jump zu Level N (Testing) |
| L2_SOLVED | Level 2 erfolgreich |
| L3_SOLVED | Level 3 erfolgreich |
| CODE_CORRECT | Level 6 Code korrekt |
| START | Level 8 Start |
| NEXT | Level 8 nächstes Sublevel |
| RELOADLEVEL | Level 8 neu laden |
| BTN:COLOR | Level 8 Button-Druck (RED/YELLOW/BLUE) |

### Antworten (Arduino → Frontend)
| Message | Bedeutung |
|---------|-----------|
| L1_SYSTEM_START | Level 1 Button 1 gedrückt |
| L1_ZUGANG_OK | Level 1 Button 2 gedrückt (Level gelöst) |
| JOYSTICK:x,y,btn | Joystick-Werte (L2-L4) |
| L2_GELOEST | Level 2 Erfolg |
| L3_GELOEST | Level 3 Erfolg |
| L4_GELOEST | Level 4 Erfolg |
| LED_ON:N | LED N aktiviert (L5) |
| RESET_SEQUENCE | Falsche Button-Reihenfolge (L5) |
| L5_SOLVED | Level 5 Sequenz komplett |
| TEMP:XX.X | Temperaturwert in °C (L6) |
| TEMP_DISCONNECTED | Sensor nicht verbunden (L6) |
| ICE_MELTED | Eis geschmolzen nach 3 Sekunden (L6) |
| L6_SOLVED | Level 6 Code korrekt eingegeben |
| SOUND:XXX | Mikrofon-Wert 0-1023 (L7) |
| SOUND_SOLVED | Threshold überschritten (L7) |
| L7_SOLVED | Level 7 Erfolg |
| LEVEL:N | Level 8 startet mit N Farben (3/5/7) |
| RED/YELLOW/BLUE | LED-Sequenz Farbe (L8) |
| OK | Level 8 Eingabe korrekt |
| FAIL | Level 8 Eingabe falsch |

---

## 🔐 Benutzer & Authentifizierung

### Anmeldung
- Lokale Speicherung mit bcrypt-gehashten Passwörtern
- Sessions mit express-session
- Dauer: 24 Stunden (konfigurierbar)

### Datenbank
- `server/users.json` - Benutzerdaten
- `server/leaderboard.json` - Leaderboard-Einträge

### Leaderboard
- Top 10 wird angezeigt
- Nur beste Zeit pro Benutzer wird gespeichert
- Anonyme Einträge mit Timestamp
- Sortiert nach schnellster Zeit

---

## 🐛 Troubleshooting

### Arduino wird nicht erkannt
```bash
# Port-Liste anzeigen
arduino-cli board list

# Wenn leer → Arduino nicht angeschlossen oder Treiber fehlt
# Lösungen:
# - Anderes USB-Kabel testen
# - Arduino IDE kurz öffnen (installiert Treiber)
# - USB-Port des Computers prüfen
```

### "FQBN not found" Error
```bash
# Board installieren
arduino-cli core update-index
arduino-cli core install arduino:avr

# Verifizieren
arduino-cli board list
```

### Backend startet nicht
```bash
# Port 3000 ist belegt?
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows (PowerShell)

# Benutze anderen Port
PORT=4000 npm run server
```

### Vite Proxy Errors
Stelle sicher, dass:
- Backend läuft (`npm run server`)
- Port 3000 frei ist
- `vite.config.js` proxy Target korrekt ist:
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
  '/socket.io': {
    target: 'http://localhost:3000',
    ws: true,
  },
}
```

### Arduino verbindet im Browser nicht
- Web Serial API-Browser? (Chrome, Edge, Opera, nicht Firefox)
- Arduino IDE läuft? → Schließen (blockiert Port)
- Falscher Port? → Neu auswählen
- Browser-Console (Ctrl+Shift+J) → Fehler prüfen

### Socket.io Verbindungsfehler
```bash
# Stelle sicher, dass Backend auf Port 3000 läuft
npm run server

# In Browser-Console prüfen:
# - io ist definiert?
# - socket.connected === true?
# - Network Tab: /socket.io/ requests OK?
```

### Level lädt nicht
- Vite Backend startet nicht → `npm run dev:all`
- Falscher Port in `vite.config.js`? → Korrigieren & neu starten
- CSS nicht geladen? → Cache leeren (Ctrl+Shift+Del)
- JavaScript Fehler? → Console (Ctrl+Shift+J) prüfen

---

## 📊 API Endpoints

### Authentication
```text
POST   /api/register           → Benutzer erstellen
POST   /api/login              → Anmelden
POST   /api/logout             → Abmelden
GET    /api/check-auth         → Session prüfen
```

### Timer
```text
POST   /api/timer/start        → Zeitmessung beginnen
POST   /api/timer/stop         → Zeitmessung beenden
```

### Leaderboard
```text
GET    /api/leaderboard        → Top 10 anzeigen
POST   /api/leaderboard        → Score einreichen
```

### Arduino
```text
GET    /api/ports              → Verfügbare COM-Ports auflisten
```

---

## 🎯 Level-Details

### Level 1 - Systemstart
- **Challenge:** Einen Button 2x hintereinander drücken
- **Hardware:** 1x Taster (Pin 6)
- **Zeit:** ~5 Sekunden
- **Schwierigkeit:** ⭐

### Level 2 - Joystick Game
- **Challenge:** Joystick steuern, grüne Punkte sammeln, rote Hindernisse vermeiden
- **Hardware:** Joystick (A0, A1, Pin 3)
- **Ziel:** 5 von 5 Punkte sammeln
- **Zeit:** ~30-60 Sekunden
- **Schwierigkeit:** ⭐⭐

### Level 3 - Labyrinth
- **Challenge:** Joystick-kontrollierter Charakter durch Labyrinth navigieren
- **Hardware:** Joystick (A0, A1, Pin 3)
- **Besonderheit:** Wand-Berührung → Zurück zum Start
- **Zeit:** ~20-40 Sekunden
- **Schwierigkeit:** ⭐⭐

### Level 4 - Snake Game
- **Challenge:** Klassisches Snake-Spiel mit Joystick-Steuerung
- **Hardware:** Joystick (A0, A1, Pin 3)
- **Ziel:** 5 Äpfel sammeln ohne Kollision
- **Zeit:** ~60-120 Sekunden
- **Schwierigkeit:** ⭐⭐⭐

### Level 5 - Button-Sequenz
- **Challenge:** 4 Buttons in korrekter Reihenfolge drücken: 2 → 4 → 1 → 3
- **Hardware:** 4 Tasten (Pins 6, 7, 8, 9), 4 LEDs zeigen Fortschritt
- **Ablauf:** LED leuchtet auf bei korrektem Druck, Reset bei Fehler
- **Zeit:** ~10-20 Sekunden
- **Schwierigkeit:** ⭐⭐

### Level 6 - Eisblock schmelzen
- **Challenge:** Temperatursensor auf ≥30°C erhitzen für ≥3 Sekunden, dann Code eingeben
- **Hardware:** Temperatursensor KY-013 (A2)
- **Funktion:**
  - Sensor-Wert zeigt aktuelle Temperatur
  - Bei Schmelzen: Eisblock-Animation, Code wird sichtbar
  - 4-stelliger zufälliger Code muss eingegeben werden
- **Zeit:** ~30-60 Sekunden
- **Schwierigkeit:** ⭐⭐⭐

### Level 7 - Mikrofon-Trigger
- **Challenge:** Mikrofon-Lautstärke über Schwellenwert (600) bringen
- **Hardware:** Mikrofon KY-037 (A3)
- **Ablauf:**
  - Echtzeit Mikrofon-Wert anzeigen
  - Visuelle Progressbar
  - Automatische Erkennung bei Threshold
- **Zeit:** ~5-10 Sekunden
- **Schwierigkeit:** ⭐

### Level 8 - LED Memory Game
- **Challenge:** 3 Sublevels mit zunehmender Komplexität
- **Hardware:** 3 LEDs (Pins 10, 11, 12 für Red, Yellow, Blue)
- **Ablauf:**
  - Sublevel 1: 3 Farben merken & eingeben
  - Sublevel 2: 5 Farben merken & eingeben
  - Sublevel 3: 7 Farben merken & eingeben
- **Buttons:** Farbige Buttons im UI zur Eingabe
- **Zeit:** ~120-180 Sekunden (alle 3 Sublevels)
- **Schwierigkeit:** ⭐⭐⭐⭐

---

## ⚙️ Konfiguration

### Environment Variablen
```bash
# .env (bei Bedarf erstellen)
PORT=3000
SESSION_SECRET=change-this-in-production
ARDUINO_BAUDRATE=9600
```

### Vite Konfiguration (vite.config.js)
```javascript
// Proxy für API-Calls
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
    '/socket.io': {
      target: 'http://localhost:3000',
      ws: true,  // WebSocket Support
    },
  },
}
```

### Arduino Serial Baudrate
Die Baudrate ist auf 9600 gesetzt (in `arduino_sketch.ino` und `server.js`). Diese muss übereinstimmen!

---

## 📈 Performance
- **Frontend Build:** ~2s mit Vite
- **Arduino Upload:** ~5s
- **Startup Zeit:** ~3s
- **RAM Usage:** ~50MB (Server) + Browser
- **WebSocket Latenz:** <50ms

---

## 🔒 Sicherheit
⚠️ **WICHTIG FÜR PRODUCTION:**
- **Session-Secret ändern** in `server/server.js`:
```javascript
secret: process.env.SESSION_SECRET || 'CHANGE_THIS_IN_PRODUCTION'
```
- **HTTPS aktivieren** (nicht nur localhost)
- **CORS richtig konfigurieren**:
```javascript
cors: {
  origin: "https://yourdomain.com",  // Nicht "*"
  credentials: true,
}
```
- **Umgebungsvariablen nutzen**:
```bash
SESSION_SECRET=your-secret npm start
```
- **Datenbankdateien sichern:**
  - `server/users.json` - Enthält gehashte Passwörter
  - `server/leaderboard.json` - Öffentliche Leaderboard-Daten
- **Passwort-Anforderungen:**
  - Minimum 6 Zeichen
  - Benutzername minimum 3 Zeichen
  - bcrypt Hashing mit Salt

---

## 🚀 Deployment

### Heroku / Cloud
```bash
# Dockerfile nutzen
docker build -t escape-room-arduino .
docker push your-registry/escape-room-arduino

# oder direkt deployen
heroku container:push web
heroku container:release web
```

### Lokales Netzwerk
```bash
# Server auf alle Interfaces binden
HOST=0.0.0.0 PORT=3000 npm start

# Dann von anderer Maschine: http://your-ip:3000
```

---

## 📝 Lizenz
MIT - Frei nutzbar für private & kommerzielle Projekte

---

## 🤝 Support
Probleme? Prüfe:
- ✅ Alle Kabel richtig angeschlossen
- ✅ Arduino CLI Version aktuell (`arduino-cli version`)
- ✅ Node.js Version ≥ 18 (`node -v`)
- ✅ Browser-Console auf Fehler (Ctrl+Shift+J)
- ✅ `npm run dev:all` Output ansehen
- ✅ Port 3000 und 5173 frei
- ✅ Socket.io verbunden (Network Tab)

**Fragen?**
- Code-Kommentare in `server.js` und `level.js` lesen
- Arduino Serial-Protokoll oben nachschlagen
- Troubleshooting-Sektion durchsuchen

---

## 📚 Weitere Ressourcen
- [Arduino CLI Documentation](https://arduino.github.io/arduino-cli/)
- [Node.js Documentation](https://nodejs.org/en/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Vite Documentation](https://vitejs.dev/guide/)

Viel Spaß beim Spielen! 🎮✨
*Letzte Aktualisierung: 2026-02-27*
