# Escape Room Arduino Web-Projekt

Dieses Projekt verbindet einen Arduino Uno mit einer Webseite über die Web Serial API. Wenn ein Knopf am Arduino gedrückt wird, reagiert die Webseite darauf.

## Voraussetzungen

- **Hardware:**
  - Arduino Uno R3 (oder kompatibel)
  - Ein Taster (Button)
  - Jumper-Kabel
  - USB-Kabel zur Verbindung mit dem Computer

- **Software:**
  - Ein moderner Browser, der die **Web Serial API** unterstützt (Google Chrome, Microsoft Edge oder Opera).
  - Arduino CLI (zum Hochladen des Codes auf den Arduino).
  - Node.js (zum Ausführen des Web-Projekts).

## Hardware-Aufbau

1. Verbinde ein Ende des Tasters mit **Pin 2** des Arduinos.
2. Verbinde das andere Ende des Tasters mit einem **GND** (Ground) Pin des Arduinos.
   *Hinweis: Da wir im Code den internen Pull-up-Widerstand nutzen (`INPUT_PULLUP`), ist kein externer Widerstand nötig.*

## Einrichtung

### 1. Arduino CLI installieren
**macOS:**
```bash
brew install arduino-cli
```

**Windows (PowerShell, optional via winget):**
```powershell
winget install ArduinoSA.CLI
```

**Board-Konfiguration (nur beim ersten Mal):**
```bash
arduino-cli core update-index
arduino-cli core install arduino:avr
```

### 2. Arduino Code hochladen
**Methode 1: Mit npm (empfohlen)**
1. Schließe deinen Arduino an den Computer an.
2. Führe aus:
   ```bash
   npm run arduino:upload
   ```

**Methode 2: Manuell mit Arduino CLI**
```bash
arduino-cli compile --fqbn arduino:avr:uno arduino_sketch
arduino-cli upload -p /dev/cu.usbmodem* --fqbn arduino:avr:uno arduino_sketch
```

**Troubleshooting:**
- **"Port not found"** → Arduino nicht angeschlossen oder falscher Port
- **"FQBN not found"** → Board-Konfiguration fehlt (siehe oben)
- **"Permission denied"** → Arduino IDE schließen (blockiert den Port)

## Benutzung

### 1. Projekt-Abhängigkeiten installieren
**macOS / Windows:**
```bash
npm install
```

### 2. Web-Projekt starten
1. Starte das Projekt:
   - **Entwicklung:** `npm run dev:all` (Startet Backend und Frontend mit Hot-Reload)
   - **Produktion:** `npm run build` gefolgt von `npm start` (Alles läuft über Port 3000)
   - **Ohne Arduino-Upload:** `npm run dev:all:no-arduino` (praktisch auf Rechnern ohne Arduino CLI)

### Arduino-Start mit `npm run dev:all`
Wenn `npm run dev:all` bei dir nicht startet, liegt es meist am Arduino-Upload (der laeuft vor dem Serverstart).

1. Arduino CLI ist installiert?
   ```bash
   arduino-cli version
   ```
2. Board und Port werden erkannt?
   ```bash
   arduino-cli board list
   ```
   Erwartet wird ein Eintrag fuer Arduino Uno mit einem Port wie `/dev/cu.usbmodem...` (macOS) bzw. `COM...` (Windows).
3. Falls kein Port erscheint: Kabel/USB-Adapter pruefen oder anderes Kabel testen.
4. Falls das Board fehlt oder FQBN-Fehler kommen:
   ```bash
   arduino-cli core update-index
   arduino-cli core install arduino:avr
   ```
5. Upload manuell testen:
   ```bash
   arduino-cli compile --fqbn arduino:avr:uno arduino_sketch
   arduino-cli upload -p /dev/cu.usbmodemXXXX --fqbn arduino:avr:uno arduino_sketch
   ```
   Unter Windows statt `/dev/cu.usbmodemXXXX` den COM-Port einsetzen, z. B. `COM3`.

#### Beispiel: macOS
```bash
arduino-cli board list
arduino-cli compile --fqbn arduino:avr:uno arduino_sketch
arduino-cli upload -p /dev/cu.usbmodem12301 --fqbn arduino:avr:uno arduino_sketch
```

#### Beispiel: Windows (PowerShell)
```powershell
arduino-cli board list
arduino-cli compile --fqbn arduino:avr:uno arduino_sketch
arduino-cli upload -p COM3 --fqbn arduino:avr:uno arduino_sketch
```

### Vite Proxy richtig einrichten (bei Proxy-Fehlern)
Wenn im Terminal Meldungen wie `http proxy error` oder `ECONNREFUSED` auftauchen, laeuft das Backend nicht oder auf einem anderen Port. Der Vite-Dev-Server leitet `/api` und `/socket.io` standardmaessig an `http://localhost:3000` weiter.

1. Stelle sicher, dass das Backend laeuft:
   - Entweder `npm run dev:all` nutzen (startet beides).
   - Oder in zwei Terminals starten: `npm run server` und `npm run dev`.
2. Pruefe, ob Port 3000 frei ist (oder ob ein anderes Programm ihn belegt).
3. Falls das Backend auf einem anderen Port laufen soll, passe **beides** an:
   - `server/server.js`: `PORT` setzen (z. B. per `PORT=4000`).
   - `vite.config.js`: `server.proxy` Targets auf den gleichen Port aendern.

### 3. Zugriff auf die Website
- Im **Entwicklungsmodus**: Öffne `http://localhost:5173`.
- Im **Produktionsmodus**: Öffne `http://localhost:3000`.

**Hinweis:** Das Backend *muss* laufen, damit die Verbindung zum Arduino funktioniert. Wenn du `npm run dev:all` nutzt, wird automatisch beides gestartet.

### 4. Arduino verbinden
1. Stelle sicher, dass der Arduino per USB verbunden ist.
2. Wähle auf der Startseite den richtigen **Port** aus der Liste aus.
3. Klicke auf **"🔌 Arduino verbinden"**.
4. Wenn die Verbindung steht, wird der **"🚀 Spiel starten"** Button aktiv.

## Projektstruktur

- `arduino_sketch/` - C++ Code für den Arduino.
- `src/pages/` - HTML-Seiten für die verschiedenen Level.
- `src/scripts/` - JavaScript-Logik (Modularisiert).
- `src/styles/` - CSS-Designs.
- `server/` - Node.js Backend für die SerialPort-Kommunikation.
