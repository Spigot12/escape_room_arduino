#define BUTTON 2
#define LDR A1
#define PIR 3
#define BUZZER 4
#define RELAY 5

// KY-023 Joystick
#define JOY_X A0
#define JOY_Y A1
#define JOY_BUTTON 3

int level = 0;
unsigned long darkStart = 0;
String input = "";

// Debouncing Variablen
int lastButtonState = HIGH;
int buttonState;
unsigned long lastDebounceTime = 0;
unsigned long debounceDelay = 50;

// Joystick Kalibrierung
const int CENTER_X = 512;
const int CENTER_Y = 512;
const int DEADZONE = 100;

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

  // LEVEL 2 - Joystick Game
  if (level == 2) {
    // Joystick Werte lesen
    int rawX = analogRead(JOY_X);
    int rawY = analogRead(JOY_Y);
    bool joyButtonPressed = !digitalRead(JOY_BUTTON);

    // Normalisieren (-100 bis 100)
    int x = normalizeAxis(rawX, CENTER_X);
    int y = normalizeAxis(rawY, CENTER_Y);

    // Joystick Daten senden
    Serial.print("JOYSTICK:");
    Serial.print(x);
    Serial.print(",");
    Serial.print(y);
    Serial.print(",");
    Serial.println(joyButtonPressed ? "1" : "0");

    // Prüfe ob Level gelöst (wird vom Frontend gesendet)
    if (input == "L2_SOLVED") {
      Serial.println("L2_GELOEST");
      tone(BUZZER, 2000, 300);
      level = 3;
      darkStart = 0;
      input = "";
    }

    delay(50);
  }

  // LEVEL 3 – PIR
  if (level == 3 && digitalRead(PIR) == HIGH) {
    Serial.println("L3_ZUGANG_OK");
    digitalWrite(RELAY, HIGH);
    tone(BUZZER, 2500, 1000);
    level = 4;
  }
}

int normalizeAxis(int rawValue, int center) {
  int diff = rawValue - center;

  // Deadzone anwenden
  if (abs(diff) < DEADZONE) {
    return 0;
  }

  // Auf -100 bis 100 mappen
  if (diff > 0) {
    return map(diff, DEADZONE, 512 - center, 0, 100);
  } else {
    return map(diff, -DEADZONE, center - 512, 0, -100);
  }
}
