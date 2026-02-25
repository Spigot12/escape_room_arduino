// Level 1: Button 2x drücken

#define BUTTON 6

// Level 2,3,4: Joystick
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

// Level 7: Mikrofon KY-037
#define MIC_PIN A3

// Level 8: LED Memory Game
#define LED_RED 10
#define LED_YELLOW 11
#define LED_BLUE 12

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

// Level 6: Temperatur (Website-Umrechnung: 50 - rawTemp)
const float TEMP_THRESHOLD = 30.0;
bool iceMelted = false;
unsigned long tempAboveStart = 0;
bool tempAboveActive = false;

// Level 7: Mikrofon
const int SOUND_THRESHOLD = 600;
bool soundSolved = false;

// Level 8: LED Memory Game
String sequence[7];
int l8Level = 1;
int seqLen = 3;
int inputIndex = 0;

void setup() {
  pinMode(BUTTON, INPUT_PULLUP);

  // Level 5: Button Pins
  for (int i = 0; i < 4; i++) {
    pinMode(buttonPins[i], INPUT_PULLUP);
  }

  // Level 8: LED Pins
  pinMode(LED_RED, OUTPUT);
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_BLUE, OUTPUT);
  digitalWrite(LED_RED, LOW);
  digitalWrite(LED_YELLOW, LOW);
  digitalWrite(LED_BLUE, LOW);

  Serial.begin(9600);

  level = 0;
  darkStart = 0;
  currentStep = 0;
  iceMelted = false;
  tempAboveStart = 0;
  tempAboveActive = false;
  soundSolved = false;
  l8Level = 1;
  seqLen = 3;
  inputIndex = 0;

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
      tempAboveStart = 0;
      tempAboveActive = false;
      Serial.println("LEVEL_SET_6");
      return;
    }
    if (input == "SET_LEVEL_7") {
      level = 7;
      soundSolved = false;
      Serial.println("LEVEL_SET_7");
      return;
    }
    if (input == "SET_LEVEL_8") {
      level = 8;
      l8Level = 1;
      seqLen = 3;
      inputIndex = 0;
      Serial.println("LEVEL_SET_8");
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
    }
    else if (level == 1) {
      level = 2;
      Serial.println("L1_ZUGANG_OK");
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

          if (currentStep == 4) {
            Serial.println("L5_SOLVED");
            level = 6;
            currentStep = 0;
            input = "";
          }
        } else {
          // Falsche Reihenfolge - Reset
          currentStep = 0;
          Serial.println("RESET_SEQUENCE");
        }
        delay(200);
      }
      lastBtnState[i] = btnState;
    }
  }

  // LEVEL 6 - Temperatur Eisblock
  if (level == 6) {
    int analogValue = analogRead(TEMP_PIN);
    bool tempConnected = analogValue > 5 && analogValue < 1018;
    float temp = readTemperature(analogValue);

    // Sende Temperatur alle 500ms
    static unsigned long lastTempSend = 0;
    if (millis() - lastTempSend >= 500) {
      if (tempConnected) {
        Serial.print("TEMP:");
        Serial.println(temp);
      } else {
        Serial.println("TEMP_DISCONNECTED");
      }
      lastTempSend = millis();
    }

    // Prüfe ob Eis geschmolzen (mind. 3s über Schwelle, Website-Wert)
    if (!tempConnected) {
      tempAboveActive = false;
      tempAboveStart = 0;
    } else if (!iceMelted) {
      float websiteTemp = 50.0 - temp;
      if (websiteTemp >= TEMP_THRESHOLD) {
        if (!tempAboveActive) {
          tempAboveActive = true;
          tempAboveStart = millis();
        } else if (millis() - tempAboveStart >= 3000) {
          iceMelted = true;
          Serial.println("ICE_MELTED");
        }
      } else {
        tempAboveActive = false;
        tempAboveStart = 0;
      }
    }

    // Prüfe Code vom Frontend
    if (input == "CODE_CORRECT") {
      Serial.println("L6_SOLVED");
      level = 7;
      input = "";
    }
  }

  // LEVEL 7 - Mikrofon
  if (level == 7) {
    // Mikrofon Wert lesen
    int micValue = analogRead(MIC_PIN);
    Serial.print("SOUND:");
    Serial.println(micValue);

    // Prüfe Sound Threshold
    if (!soundSolved && micValue >= SOUND_THRESHOLD) {
      soundSolved = true;
      Serial.println("SOUND_SOLVED");
    }

    // Aufgabe gelöst?
    if (soundSolved) {
      Serial.println("L7_SOLVED");
      level = 8; // Nächstes Level oder Ende
      input = "";
    }

    delay(500);
  }

  // LEVEL 8 - LED Memory Game
  if (level == 8) {
    // Befehle vom Frontend
    if (input == "START") {
      l8Level = 1;
      startLevel8();
      input = "";
    }

    if (input == "NEXT") {
      if (l8Level < 3) l8Level++;
      startLevel8();
      input = "";
    }

    if (input == "FULLRESET") {
      l8Level = 1;
      startLevel8();
      input = "";
    }

    if (input == "RELOADLEVEL") {
      startLevel8();
      input = "";
    }

    if (input.startsWith("BTN:")) {
      String color = input.substring(4);
      if (color == sequence[inputIndex]) {
        inputIndex++;
        if (inputIndex == seqLen) {
          Serial.println("OK");
          inputIndex = 0;
        }
      } else {
        Serial.println("FAIL");
        inputIndex = 0;
      }
      input = "";
    }
  }
}

void startLevel8() {
  inputIndex = 0;
  if (l8Level == 1) seqLen = 3;
  if (l8Level == 2) seqLen = 5;
  if (l8Level == 3) seqLen = 7;

  generateRandomSequence();

  Serial.print("LEVEL:");
  Serial.println(seqLen);

  delay(2000); // 2 Sekunden Pause vor dem Start der Sequenz

  playSequence();
  sendSequence();
}

void generateRandomSequence() {
  String pool[3] = {"RED", "YELLOW", "BLUE"};
  for (int i = 0; i < seqLen; i++) {
    sequence[i] = pool[random(0, 3)];
  }
}

void playSequence() {
  for (int i = 0; i < seqLen; i++) {
    flash(sequence[i]);
    delay(300);
  }
}

void sendSequence() {
  for (int i = 0; i < seqLen; i++) {
    Serial.println(sequence[i]);
  }
}

void flash(String color) {
  int pin = getLEDPin(color);
  digitalWrite(pin, HIGH);
  delay(250);
  digitalWrite(pin, LOW);
}

int getLEDPin(String color) {
  if (color == "RED") return LED_RED;
  if (color == "YELLOW") return LED_YELLOW;
  return LED_BLUE;
}

float readTemperature(int analogValue) {
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
