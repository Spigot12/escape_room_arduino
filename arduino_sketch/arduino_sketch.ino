/**
 * Escape Room Arduino Sketch
 * 
 * Dieses Programm wartet auf einen Tastendruck an Pin 2.
 * Wenn der Taster gedrückt wird, sendet es "SOLVED" über die serielle Schnittstelle.
 * 
 * Hardware:
 * - Arduino Uno
 * - Taster an Pin 2 (mit internem Pull-up Widerstand)
 * - Taster verbindet Pin 2 mit GND beim Drücken
 */

const int buttonPin = 2;     // Pin, an dem der Taster angeschlossen ist
int lastButtonState = HIGH;  // Vorheriger Status des Tasters (HIGH wegen Pull-up)
unsigned long lastDebounceTime = 0;  // Letzte Zeit, zu der der Ausgang gewechselt hat
unsigned long debounceDelay = 50;    // Entprellzeit in Millisekunden

void setup() {
  // Pin 2 als Eingang mit internem Pull-up Widerstand konfigurieren
  // Das bedeutet: 
  // - Nicht gedrückt = HIGH (5V)
  // - Gedrückt = LOW (0V/GND)
  pinMode(buttonPin, INPUT_PULLUP);
  
  // Serielle Kommunikation mit 9600 Baud starten
  Serial.begin(9600);
}

void loop() {
  // Aktuellen Status des Tasters lesen
  int reading = digitalRead(buttonPin);

  // Prüfen, ob sich der Status geändert hat (durch Rauschen oder Drücken)
  if (reading != lastButtonState) {
    // Reset der Entprell-Zeit
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > debounceDelay) {
    // Wenn der Status länger als die Entprellzeit stabil ist:
    
    // Wir suchen nach dem Übergang von HIGH zu LOW (Taster wird gedrückt)
    if (reading == LOW && lastButtonState == HIGH) {
      // Nachricht an den Computer senden
      Serial.println("SOLVED");
    }
  }

  // Den aktuellen Status für den nächsten Durchlauf speichern
  lastButtonState = reading;
}
