#define BUTTON 2
#define LDR A1
#define PIR 3
#define BUZZER 4
#define RELAY 5

// KY-023 Joystick
#define JOY_X A0
#define JOY_Y A1
#define JOY_BUTTON 3

// Level 5: Button Sequenz (4 Buttons)
#define BTN1 6
#define BTN2 7
#define BTN3 8
#define BTN4 9

// Level 6: Temperatursensor KY-013
#define TEMP_PIN A2

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

// Level 5: Button Sequenz
const int buttonPins[4] = {BTN1, BTN2, BTN3, BTN4};
int correctOrder[4] = {1, 3, 0, 2}; // Button 2, 4, 1, 3
int currentStep = 0;
bool lastBtnState[4] = {HIGH, HIGH, HIGH, HIGH};

// Level 6: Temperatur
const float TEMP_THRESHOLD = 22.0;
bool iceMelted = false;

void setup() {
  pinMode(BUTTON, INPUT_PULLUP);
  pinMode(PIR, INPUT);
  pinMode(BUZZER, OUTPUT);
  pinMode(RELAY, OUTPUT);

  // Level 5: Button Pins
  for (int i = 0; i < 4; i++) {
    pinMode(buttonPins[i], INPUT_PULLUP);
  }

  digitalWrite(RELAY, LOW);
  Serial.begin(9600);

  level = 0;
  darkStart = 0;
  currentStep = 0;
  iceMelted = false;

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

    // Level Jumping (für Testing)
    if (input == "SET_LEVEL_1") {
      level = 1;
      Serial.println("LEVEL_SET_1");
      return;
    }
    if (input == "SET_LEVEL_2") {
      level = 2;
      Serial.println("LEVEL_SET_2");
      return;
    }
    if (input == "SET_LEVEL_3") {
      level = 3;
      Serial.println("LEVEL_SET_3");
      return;
    }
    if (input == "SET_LEVEL_4") {
      level = 4;
      Serial.println("LEVEL_SET_4");
      return;
    }
    if (input == "SET_LEVEL_5") {
      level = 5;
      currentStep = 0;
      Serial.println("LEVEL_SET_5");
      return;
    }
    if (input == "SET_LEVEL_6") {
      level = 6;
      iceMelted = false;
      Serial.println("LEVEL_SET_6");
      return;
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

  // LEVEL 3 - Joystick Maze Game
  if (level == 3) {
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
    if (input == "L3_SOLVED") {
      Serial.println("L3_GELOEST");
      tone(BUZZER, 2500, 500);
      level = 4;
      input = "";
    }

    delay(50);
  }

  // LEVEL 4 - Snake Game
  if (level == 4) {
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
    if (input == "L4_SOLVED") {
      Serial.println("L4_GELOEST");
      digitalWrite(RELAY, HIGH);
      tone(BUZZER, 3000, 1500);
      level = 5;
      input = "";
    }

    delay(50);
  }

  // LEVEL 5 - Button Sequenz
  if (level == 5) {
    for (int i = 0; i < 4; i++) {
      bool btnState = digitalRead(buttonPins[i]);

      if (lastBtnState[i] == HIGH && btnState == LOW) {
        if (i == correctOrder[currentStep]) {
          currentStep++;
          Serial.print("LED_ON:");
          Serial.println(currentStep);
          tone(BUZZER, 1000 + (currentStep * 200), 100);

          if (currentStep == 4) {
            Serial.println("L5_SOLVED");
            tone(BUZZER, 2500, 500);
            level = 6;
            currentStep = 0;
            input = "";
          }
        } else {
          // Falsche Reihenfolge - Reset
          currentStep = 0;
          Serial.println("RESET_SEQUENCE");
          tone(BUZZER, 200, 300);
        }
        delay(200);
      }
      lastBtnState[i] = btnState;
    }
  }

  // LEVEL 6 - Temperatur Eisblock
  if (level == 6) {
    float temp = readTemperature();

    // Sende Temperatur alle 500ms
    static unsigned long lastTempSend = 0;
    if (millis() - lastTempSend >= 500) {
      Serial.print("TEMP:");
      Serial.println(temp);
      lastTempSend = millis();
    }

    // Prüfe ob Eis geschmolzen
    if (!iceMelted && temp >= TEMP_THRESHOLD) {
      iceMelted = true;
      Serial.println("ICE_MELTED");
      tone(BUZZER, 1500, 500);
    }

    // Prüfe Code vom Frontend
    if (input == "CODE_CORRECT") {
      Serial.println("L6_SOLVED");
      tone(BUZZER, 3000, 1000);
      level = 7;
      input = "";
    }
  }
}

float readTemperature() {
  int analogValue = analogRead(TEMP_PIN);
  float voltage = analogValue * 5.0 / 1023.0;
  float temperature = voltage * 10.0; // KY-013 Näherung
  return temperature;
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
