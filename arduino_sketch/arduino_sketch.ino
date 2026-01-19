#define BUTTON 2
#define LDR A1
#define PIR 3
#define BUZZER 4
#define RELAY 5
int level = 0;
unsigned long darkStart = 0;
String input = "";

// Debouncing Variablen
int lastButtonState = HIGH;
int buttonState;
unsigned long lastDebounceTime = 0;
unsigned long debounceDelay = 50;

void setup() {
  pinMode(BUTTON, INPUT_PULLUP);
  pinMode(PIR, INPUT);
  pinMode(BUZZER, OUTPUT);
  pinMode(RELAY, OUTPUT);

  digitalWrite(RELAY, LOW);
  Serial.begin(9600);
  
  level = 0;
  darkStart = 0;
  
  while (!Serial) { ; }
  delay(1000); 
}

void loop() {
  // Eingabe von Website
  if (Serial.available()) {
    input = Serial.readStringUntil('\n');
    input.trim();
    
    if (input == "RESET") {
      level = 0;
      darkStart = 0;
      Serial.println("SYSTEM_RESET_OK");
      tone(BUZZER, 500, 500);
      delay(500); // Kleine Pause nach Reset
      return; // Loop neu starten
    }
  }

  // Taster Abfrage mit Entprellung
  int reading = digitalRead(BUTTON);
  bool buttonPressed = false;

  // Nur Taster prüfen, wenn wir in einem gültigen Level sind
  if (reading != lastButtonState) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > debounceDelay) {
    if (reading != buttonState) {
      buttonState = reading;
      if (buttonState == LOW) {
        buttonPressed = true;
      }
    }
  }
  lastButtonState = reading;

  // Logik basierend auf Button-Druck
  if (buttonPressed) {
    if (level == 0) {
      level = 1;
      Serial.println("L1_SYSTEM_START");
      tone(BUZZER, 1000, 200);
    }
    else if (level == 1) {
      level = 2; 
      Serial.println("L1_ZUGANG_OK");
      tone(BUZZER, 2000, 500);
    }
  }

  // LEVEL 2 - LDR (Lichtsensor)
  if (level == 2) {
    int light = analogRead(LDR);
    if (light < 200) {
      if (darkStart == 0) darkStart = millis();
      if (millis() - darkStart > 5000) {
        // Sofort lösen ohne Code-Eingabe
        Serial.println("L2_GELOEST");
        tone(BUZZER, 2000, 300);
        level = 3;
        darkStart = 0;
      }
    } else {
      darkStart = 0;
    }
  }

  // LEVEL 3 – PIR
  if (level == 3 && digitalRead(PIR) == HIGH) {
    Serial.println("L3_ZUGANG_OK");
    digitalWrite(RELAY, HIGH);
    tone(BUZZER, 2500, 1000);
    level = 4;
  }
}
