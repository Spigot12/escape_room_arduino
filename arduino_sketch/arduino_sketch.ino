#define BUTTON 2
#define LDR A0
#define PIR 3
#define BUZZER 4
#define RELAY 5

int level = 0;
unsigned long darkStart = 0;
String input = "";

void setup() {
  pinMode(BUTTON, INPUT_PULLUP);
  pinMode(PIR, INPUT);
  pinMode(BUZZER, OUTPUT);
  pinMode(RELAY, OUTPUT);

  digitalWrite(RELAY, LOW);
  Serial.begin(9600);
  Serial.println("System bereit");
}

void loop() {

  // Eingabe von Website
  if (Serial.available()) {
    input = Serial.readStringUntil('\n');
    input.trim();
  }

  // LEVEL 0 – Start
  if (level == 0 && digitalRead(BUTTON) == LOW) {
    delay(50); // Kleines Delay zum Entprellen
    if (digitalRead(BUTTON) == LOW) {
      tone(BUZZER, 1000, 200);
      Serial.println("System gestartet");
      level = 1;
      while(digitalRead(BUTTON) == LOW); // Warten bis Button losgelassen
      delay(500);
    }
  }

  // LEVEL 1 – Button Druck für Lösung
  if (level == 1 && digitalRead(BUTTON) == LOW) {
    delay(50); // Kleines Delay zum Entprellen
    if (digitalRead(BUTTON) == LOW) {
      tone(BUZZER, 2000, 500);
      Serial.println("Zugang gewährt");
      level = 2; // Bereit für Level 2
      while(digitalRead(BUTTON) == LOW); // Warten bis Button losgelassen
      delay(500);
    }
  }

  // Die restlichen Level-Logiken können hier bleiben, falls sie später manuell getriggert werden oder für Level 2/3 relevant sind
  // LEVEL 2 - LDR (Beispielhaft, wenn level auf 2 gesetzt wird)
  if (level == 2) {
    int light = analogRead(LDR);
    if (light < 200) {
      if (darkStart == 0) darkStart = millis();
      if (millis() - darkStart > 5000) {
        Serial.println("CODE:427");
        tone(BUZZER, 1500, 300);
        level = 21; // Status für LDR gelöst
        darkStart = 0;
      }
    } else {
      darkStart = 0;
    }
  }

  // LEVEL 2 – Code prüfen
  if (level == 21 && input.length() > 0) {
    if (input == "427") {
      Serial.println("Code korrekt – Bewegung erforderlich");
      tone(BUZZER, 2000, 300);
      level = 3;
    } else {
      Serial.println("Falscher Code");
      tone(BUZZER, 300, 500);
    }
    input = "";
  }

  // LEVEL 3 – PIR
  if (level == 3 && digitalRead(PIR) == HIGH) {
    Serial.println("Zugang gewährt");
    digitalWrite(RELAY, HIGH);
    tone(BUZZER, 2500, 1000);
    level = 4;
  }
}
