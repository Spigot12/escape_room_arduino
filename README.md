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
3. Wähle unter `Werkzeuge` -> `Board` den "Arduino Uno" aus.
4. Wähle unter `Werkzeuge` -> `Port` den entsprechenden Port aus.
5. Klicke auf den "Hochladen"-Button (Pfeil nach rechts).

### 2. Web-Projekt starten
1. Öffne ein Terminal im Projektverzeichnis.
2. Installiere die Abhängigkeiten (falls noch nicht geschehen):
   ```bash
   npm install
   ```
3. Starte den Entwicklungsserver:
   ```bash
   npm run dev
   ```
4. Klicke auf den Link im Terminal (meistens `http://localhost:5173`), um die Seite im Browser zu öffnen.

## Benutzung

1. Stelle sicher, dass der Arduino verbunden ist.
2. Klicke auf der Webseite auf den Button **"Arduino verbinden"**.
3. Wähle im Browser-Dialog deinen Arduino aus (oft als "Arduino Uno" oder "USB Serial" gelistet) und klicke auf "Verbinden".
4. Der Status auf der Webseite sollte nun auf **"Verbunden"** wechseln.
5. Drücke den physischen Knopf am Arduino.
6. Die Webseite zeigt nun **"🎉 Rätsel gelöst!"** an und öffnet ein Alarm-Fenster.

## Projektstruktur

- `arduino_sketch/` - Enthält den C++ Code für den Arduino.
- `index.html` - Das Grundgerüst der Webseite.
- `src/main.js` - Die JavaScript-Logik für die Web Serial API.
- `src/style.css` - Das Design der Webseite.
