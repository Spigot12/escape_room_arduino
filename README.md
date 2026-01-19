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
  - Arduino IDE (zum Hochladen des Codes auf den Arduino).
  - Node.js (zum Ausführen des Web-Projekts).

## Hardware-Aufbau

1. Verbinde ein Ende des Tasters mit **Pin 2** des Arduinos.
2. Verbinde das andere Ende des Tasters mit einem **GND** (Ground) Pin des Arduinos.
   *Hinweis: Da wir im Code den internen Pull-up-Widerstand nutzen (`INPUT_PULLUP`), ist kein externer Widerstand nötig.*

## Einrichtung

### 1. Arduino Code hochladen
1. Öffne die Datei `arduino_sketch/arduino_sketch.ino` in der Arduino IDE.
2. Schließe deinen Arduino an den Computer an.
3. **Board auswählen (Lösung für FQBN-Fehler):**
   - Gehe auf **Werkzeuge (Tools)** -> **Board** -> **Arduino AVR Boards** und wähle **Arduino Uno** aus.
   - In der Arduino IDE 2.x kannst du das Board auch direkt oben in der Dropdown-Liste auswählen.
4. **Port auswählen:**
   - Gehe auf **Werkzeuge (Tools)** -> **Port** und wähle den Port deines Arduinos aus.
5. Klicke auf den **Hochladen**-Button (Pfeil nach rechts).

## Benutzung

### 1. Web-Projekt starten
1. Öffne ein Terminal im Projektverzeichnis.
2. Installiere die Abhängigkeiten:
   ```bash
   npm install
   ```
3. Starte das Projekt:
   - **Entwicklung:** `npm run dev:all` (Startet Backend und Frontend mit Hot-Reload)
   - **Produktion:** `npm run build` gefolgt von `npm start` (Alles läuft über Port 3000)

### 2. Zugriff auf die Website
- Im **Entwicklungsmodus**: Öffne `http://localhost:5173`.
- Im **Produktionsmodus**: Öffne `http://localhost:3000`.

**Hinweis:** Das Backend *muss* laufen, damit die Verbindung zum Arduino funktioniert. Wenn du `npm run dev:all` nutzt, wird automatisch beides gestartet.

### 3. Arduino verbinden
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
