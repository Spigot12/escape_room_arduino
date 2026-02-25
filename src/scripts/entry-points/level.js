/* level.js */
import "../../styles/style.css";
import "../../styles/components.css";
import "../../styles/animations.css";
import * as ArduinoManager from "../arduino/arduino-manager.js";

// ===== DOM ELEMENTE =====
const backBtn = document.querySelector("#back-btn");
const resultDisplay = document.querySelector("#result-display");
const nextLevelBtn = document.querySelector("#next-level-btn");
const restartBtn = document.querySelector("#restart-btn");
const indicator = document.querySelector("#arduino-indicator");
const statusText = document.querySelector("#status-text");
const codeSection = document.querySelector("#code-section");
const codeInput = document.querySelector("#code-input");
const sendCodeBtn = document.querySelector("#send-code-btn");
const taskListItems = document.querySelectorAll("#task-list li");
const toggleLogBtn = document.querySelector("#toggle-log-btn");
const logPanel = document.querySelector("#log-panel");
const logContent = document.querySelector("#log-content");
const clearLogBtn = document.querySelector("#clear-log-btn");
const toggleWiringBtn = document.querySelector("#toggle-wiring-btn");
const wiringPanel = document.querySelector("#wiring-panel");
const prevLevelBtn = document.querySelector("#prev-level-btn");
const nextLevelBtnNav = document.querySelector("#next-level-btn-nav");
const gameOverOverlay = document.querySelector("#game-over-overlay");
const restartSnakeBtn = document.querySelector("#restart-snake-btn");

// ===== STATE =====
let level1Step = 0; // 0: Bereit, 1: System gestartet, 2: Zugang gewährt

// ===== LOG STATE =====
let debugLogs = [];
const MAX_DEBUG_LOGS = 50;

// ===== JOYSTICK GAME STATE (Level 2 & 3) =====
let canvas, ctx;
let player = {x: 50, y: 200, radius: 15, speed: 6};
let collectibles = [];
let obstacles = [];
let collectedCount = 0;
let totalCollectibles = 5;
let totalObstacles = 4;
let joystickX = 0,
    joystickY = 0;

// ===== MAZE GAME STATE (Level 3) =====
let walls = [];
let goal = {x: 550, y: 350, radius: 20};

// ===== SNAKE GAME STATE (Level 4) =====
let snake = [];
let snakeDirection = {x: 1, y: 0};
let apple = {x: 0, y: 0};
let gridSize = 20;
let applesCollected = 0;
let targetApples = 5;
let lastMoveTime = 0;
let moveInterval = 150; // ms zwischen moves
let snakeGameRunning = false;
let snakeGameCompleted = false;

// ===== LEVEL 5 STATE (Button Sequenz) =====
let level5Progress = 0;

// ===== LEVEL 6 STATE (Temperatur) =====
let currentTemp = 0;
let iceMeltedFlag = false;
let generatedCode = "";
let level6SensorConnected = false;

// ===== LEVEL 7 STATE (Mikrofon) =====
let soundValue = 0;
const SOUND_THRESHOLD = 600;

// ===== LEVEL 8 STATE (LED Memory) =====
let level8Sequence = [];
let level8UserInput = [];
let level8GameActive = false;
let level8ExpectedLength = 3;
let level8CurrentLevel = 1;
const startLevel8Btn = document.querySelector("#start-level8");
const resetLevel8Btn = document.querySelector("#reset-level8");
const level8Result = document.querySelector("#result");
const level8LevelText = document.querySelector("#level-text");
const level8Progress = document.querySelector("#progress");
const level8ColorBtns = document.querySelectorAll("#colors .color-btn");

// ===== LOG FUNKTIONEN =====
function addLog(message, type = "info") {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    debugLogs.push({message: logEntry, type});

    if (debugLogs.length > MAX_DEBUG_LOGS) {
        debugLogs.shift();
    }

    updateLogDisplay();
    console.log(`[${type.toUpperCase()}]`, message);
}

function updateLogDisplay() {
    if (!logContent) return;

    logContent.innerHTML = debugLogs
        .map(
            (log) =>
                `<div style="color: ${getLogColor(log.type)}">${log.message}</div>`,
        )
        .join("");

    // Automatisch nach unten scrollen - sowohl im logContent als auch im Parent (card-body)
    requestAnimationFrame(() => {
        logContent.scrollTop = logContent.scrollHeight;
        if (logContent.parentElement) {
            logContent.parentElement.scrollTop =
                logContent.parentElement.scrollHeight;
        }
    });
}

function getLogColor(type) {
    switch (type) {
        case "success":
            return "#28a745";
        case "error":
            return "#dc3545";
        case "warn":
            return "#ffc107";
        default:
            return "#6c757d";
    }
}

// ===== INITIALISIERUNG =====
function init() {
    console.log("--- LEVEL INIT START ---");
    level1Step = 0; // Reset state
    addLog("Level gestartet", "info");
    setupEventListeners();
    setupArduinoListeners();

    // Sicherstellen, dass alles auf "Anfang" steht beim Laden
    if (statusText) {
        statusText.innerText = "Warte auf Eingabe...";
        statusText.style.color = "";
    }
    if (resultDisplay) {
        console.log("Verstecke result-display initial");
        resultDisplay.classList.add("hidden");
    }

    updateTaskUI(0);

    // Level 2: Joystick Game initialisieren
    const isLevel2 = window.location.pathname.includes("level2");
    if (isLevel2) {
        initJoystickGame();
    }

    // Level 3: Maze Game initialisieren
    const isLevel3 = window.location.pathname.includes("level3");
    if (isLevel3) {
        initMazeGame();
    }

    // Level 4: Snake Game initialisieren
    const isLevel4 = window.location.pathname.includes("level4");
    if (isLevel4) {
        initSnakeGame();
    }

    // Level 5: Button Sequenz initialisieren
    const isLevel5 = window.location.pathname.includes("level5");
    if (isLevel5) {
        initLevel5();
    }

    // Level 6: Temperatur initialisieren
    const isLevel6 = window.location.pathname.includes("level6");
    if (isLevel6) {
        initLevel6();
    }

    // Level 7: Mikrofon initialisieren
    const isLevel7 = window.location.pathname.includes("level7");
    if (isLevel7) {
        initLevel7();
    }

    // Level 8: LED Memory initialisieren
    const isLevel8 = window.location.pathname.includes("level8");
    if (isLevel8) {
        initLevel8();
    }

    if (ArduinoManager.isConnected()) {
        console.log("Level Init: Arduino ist bereits verbunden");
        updateIndicator(true);
    } else {
        console.log("Level Init: Arduino ist noch nicht verbunden");
    }
    console.log("--- LEVEL INIT ENDE ---");
}

function updateIndicator(connected) {
    if (indicator) {
        if (connected) {
            indicator.classList.remove("disconnected");
            indicator.classList.add("connected");
        } else {
            indicator.classList.remove("connected");
            indicator.classList.add("disconnected");
        }
    }
}

// ===== ARDUINO EVENTS =====
function setupArduinoListeners() {
    console.log("Setup Arduino Listeners gestartet");

    ArduinoManager.addEventListener("arduinoConnected", () => {
        console.log("Level: Arduino verbunden Event empfangen");
        addLog("Arduino verbunden", "success");
        updateIndicator(true);
    });

    ArduinoManager.addEventListener("arduinoDisconnected", () => {
        console.log("Level: Arduino getrennt Event empfangen");
        addLog("Arduino getrennt", "warn");
        updateIndicator(false);
    });

    ArduinoManager.addEventListener("arduinoMessage", (data) => {
        const msg = data.message.trim();
        if (!msg) return;

        console.log("Arduino:", msg);

        // Log nur bestimmte Nachrichten (nicht JOYSTICK Spam)
        if (!msg.startsWith("JOYSTICK:")) {
            addLog(`Arduino: ${msg}`, "info");
        }

        // LEVEL 1 LOGIK
        if (msg === "L1_SYSTEM_START") {
            const isLevel1 = window.location.pathname.includes("level1");
            if (!isLevel1) return;

            console.log("Level 1: System gestartet (Nachricht empfangen)");
            level1Step = 1; // Lokaler Status-Update

            if (statusText) {
                statusText.innerText = "System aktiv. Drücke den Button erneut.";
                statusText.style.color = "var(--success)";
            }
            updateTaskUI(1);
        } else if (msg === "L1_ZUGANG_OK") {
            const isLevel1 = window.location.pathname.includes("level1");
            if (!isLevel1) return;

            console.log(
                "Level 1: Zugang OK (Nachricht empfangen), Aktueller Status:",
                level1Step,
            );

            // Strikte Prüfung über lokale Variable
            if (level1Step === 1) {
                console.log("Level 1: BEDINGUNG ERFÜLLT. Zeige Erfolg an.");
                level1Step = 2;
                if (statusText) {
                    statusText.innerText = "Erfolg!";
                    statusText.style.color = "var(--success)";
                }
                updateTaskUI(2);
                handleSolve();
            } else {
                console.log(
                    "Level 1: Ignoriere L1_ZUGANG_OK, da level1Step nicht 1 ist (Step war:",
                    level1Step,
                    ")",
                );
            }
        }
        // LEVEL 2, 3 & 4 LOGIK - Joystick Daten
        else if (msg.startsWith("JOYSTICK:")) {
            const isLevel2 = window.location.pathname.includes("level2");
            const isLevel3 = window.location.pathname.includes("level3");
            const isLevel4 = window.location.pathname.includes("level4");
            if (isLevel2 || isLevel3 || isLevel4) {
                const parts = msg.replace("JOYSTICK:", "").split(",");
                joystickX = parseInt(parts[0]) || 0;
                joystickY = parseInt(parts[1]) || 0;
            }
        } else if (msg === "L2_GELOEST") {
            const isLevel2 = window.location.pathname.includes("level2");
            if (isLevel2) {
                if (statusText) {
                    statusText.innerText = "Ziel erreicht!";
                    statusText.style.color = "var(--success)";
                }
                handleSolve();
                updateTaskUI(3);
            }
        }
        // LEVEL 3 LOGIK
        else if (msg === "L3_GELOEST") {
            const isLevel3 = window.location.pathname.includes("level3");
            if (isLevel3) {
                if (statusText) {
                    statusText.innerText = "Labyrinth geschafft!";
                    statusText.style.color = "var(--success)";
                }
                handleSolve();
                updateTaskUI(3);
            }
        }
        // LEVEL 4 LOGIK
        else if (msg === "L4_GELOEST") {
            const isLevel4 = window.location.pathname.includes("level4");
            if (isLevel4) {
                if (statusText) {
                    statusText.innerText = "Snake Champion!";
                    statusText.style.color = "var(--success)";
                }
                handleSolve();
                updateTaskUI(4);
            }
        }
        // LEVEL 5 LOGIK - LED Updates
        else if (msg.startsWith("LED_ON:")) {
            const isLevel5 = window.location.pathname.includes("level5");
            if (isLevel5) {
                const ledNumber = parseInt(msg.split(":")[1]);
                turnOnLED(ledNumber);
                level5Progress = ledNumber;

                const progressText = document.getElementById("progress-text");
                if (progressText) {
                    progressText.textContent = `Fortschritt: ${ledNumber}/4`;
                }

                if (statusText) {
                    statusText.innerText = `${ledNumber}/4 Buttons korrekt gedrückt`;
                }

                addLog(`LED ${ledNumber} aktiviert`, "success");
            }
        } else if (msg === "RESET_SEQUENCE") {
            const isLevel5 = window.location.pathname.includes("level5");
            if (isLevel5) {
                resetLEDs();
                level5Progress = 0;

                const progressText = document.getElementById("progress-text");
                if (progressText) {
                    progressText.textContent = "Fortschritt: 0/4";
                }

                if (statusText) {
                    statusText.innerText = "Falsche Reihenfolge! Versuch es nochmal.";
                    statusText.style.color = "#dc3545";
                }

                addLog("Sequenz zurückgesetzt - falsche Reihenfolge", "error");

                setTimeout(() => {
                    if (statusText) {
                        statusText.innerText =
                            "Drücke die 4 Buttons in der richtigen Reihenfolge!";
                        statusText.style.color = "";
                    }
                }, 2000);
            }
        } else if (msg === "L5_SOLVED") {
            const isLevel5 = window.location.pathname.includes("level5");
            if (isLevel5) {
                if (statusText) {
                    statusText.innerText = "Sequenz komplett!";
                    statusText.style.color = "var(--success)";
                }
                handleSolve();
                updateTaskUI(4);
            }
        }
        // LEVEL 6 LOGIK - Temperatur
        else if (msg === "TEMP_DISCONNECTED") {
            const isLevel6 = window.location.pathname.includes("level6");
            if (isLevel6) {
                level6SensorConnected = false;
                const tempDisplay = document.getElementById("temp-display");
                if (tempDisplay) {
                    tempDisplay.textContent = "--";
                    tempDisplay.style.color = "#6c757d";
                }
                if (statusText) {
                    statusText.innerText = "Temperatursensor nicht verbunden.";
                    statusText.style.color = "#dc3545";
                }
            }
        } else if (msg.startsWith("TEMP:")) {
            const isLevel6 = window.location.pathname.includes("level6");
            if (isLevel6) {
                const rawTemp = parseFloat(msg.split(":")[1]);
                // Temperatur umkehren: 50 - rawTemp (damit höhere Sensorwerte = niedrigere Temp)
                const temp = 50 - rawTemp;
                currentTemp = temp;
                level6SensorConnected = true;

                const tempDisplay = document.getElementById("temp-display");
                if (tempDisplay) {
                    tempDisplay.textContent = `${temp.toFixed(1)}°C`;

                    // Farbe ändern je nach Temperatur
                    if (temp >= 30) {
                        tempDisplay.style.color = "#dc3545"; // Rot (warm = schmelzen)
                    } else if (temp >= 25) {
                        tempDisplay.style.color = "#ffc107"; // Gelb
                    } else {
                        tempDisplay.style.color = "#007aff"; // Blau (kalt)
                    }
                }

                if (!iceMeltedFlag && statusText) {
                    statusText.innerText =
                        "Erwärme den Temperatursensor um den Eisblock zu schmelzen!";
                    statusText.style.color = "";
                }
            }
        } else if (msg === "ICE_MELTED") {
            const isLevel6 = window.location.pathname.includes("level6");
            if (isLevel6) {
                if (!iceMeltedFlag) {
                    meltIceBlock();
                }
            }
        } else if (msg === "L6_SOLVED") {
            const isLevel6 = window.location.pathname.includes("level6");
            if (isLevel6) {
                if (statusText) {
                    statusText.innerText = "Code korrekt!";
                    statusText.style.color = "var(--success)";
                }
                handleLevel6Complete();
                updateTaskUI(4);
            }
        }
        // LEVEL 7 LOGIK - Mikrofon
        else if (msg.startsWith("SOUND:")) {
            const isLevel7 = window.location.pathname.includes("level7");
            if (isLevel7) {
                const value = parseInt(msg.split(":")[1]);
                soundValue = value;

                const soundDisplay = document.getElementById("sound-display");
                if (soundDisplay) {
                    soundDisplay.textContent = `🔊 ${value}`;
                }

                const soundBar = document.getElementById("sound-bar");
                if (soundBar) {
                    let percent = Math.min((value / SOUND_THRESHOLD) * 100, 100);
                    soundBar.style.width = percent + "%";
                }
            }
        } else if (msg === "SOUND_SOLVED") {
            const isLevel7 = window.location.pathname.includes("level7");
            if (isLevel7) {
                const soundSuccess = document.getElementById("sound-success");
                if (soundSuccess) {
                    soundSuccess.classList.remove("d-none");
                }
                addLog("Aufgabe (Schall) gelöst!", "success");
                if (statusText) {
                    statusText.innerText = "Schall-Schlüssel gefunden!";
                    statusText.style.color = "var(--success)";
                }
                updateTaskUI(2);
                handleSolve();
            }
        } else if (msg === "L7_SOLVED") {
            const isLevel7 = window.location.pathname.includes("level7");
            if (isLevel7) {
                if (statusText) {
                    statusText.innerText = "Schall-Schlüssel gefunden!";
                    statusText.style.color = "var(--success)";
                }
                handleSolve();
                updateTaskUI(2);
            }
        }
        // LEVEL 8 LOGIK - LED Memory
        else if (msg.startsWith("LEVEL:")) {
            const isLevel8 = window.location.pathname.includes("level8");
            if (isLevel8) {
                level8ExpectedLength = parseInt(msg.split(":")[1]);
                level8CurrentLevel = level8ExpectedLength === 3 ? 1 :
                    level8ExpectedLength === 5 ? 2 : 3;
                if (level8LevelText) {
                    level8LevelText.textContent = `Level: ${level8CurrentLevel} (${level8ExpectedLength} Farben)`;
                }
                updateLevel8Progress();
                updateLevel8Dots();

                // Status Text aktualisieren
                if (statusText) {
                    statusText.innerText = `Level ${level8CurrentLevel} startet gleich... Merke dir die Sequenz!`;
                    statusText.style.color = "#007aff";
                }

                // Start Button deaktivieren während Level läuft
                if (startLevel8Btn) {
                    startLevel8Btn.disabled = true;
                }

                addLog(`Level ${level8CurrentLevel} wird geladen...`, "info");
            }
        } else if (msg === "RED" || msg === "YELLOW" || msg === "BLUE") {
            const isLevel8 = window.location.pathname.includes("level8");
            if (isLevel8 && level8GameActive) {
                level8Sequence.push(msg);

                // Zeige Fortschritt beim Abspielen der Sequenz
                if (statusText && level8Sequence.length === level8ExpectedLength) {
                    statusText.innerText = "Sequenz komplett! Jetzt bist du dran!";
                    statusText.style.color = "#28a745";
                } else if (statusText) {
                    statusText.innerText = `Sequenz läuft... (${level8Sequence.length}/${level8ExpectedLength})`;
                    statusText.style.color = "#ffc107";
                }
            }
        } else if (msg === "OK") {
            const isLevel8 = window.location.pathname.includes("level8");
            if (isLevel8) {
                if (level8Result) {
                    level8Result.innerHTML = '<span class="text-success">✔ RICHTIG!</span>';
                }
                level8GameActive = false;
                setLevel8ButtonsDisabled(true);

                // Markiere aktuelles Level als geschafft
                markLevel8Done(level8CurrentLevel);

                if (level8CurrentLevel < 3) {
                    // Zeige Start Button als "Weiter" Button für nächstes Level
                    if (startLevel8Btn) {
                        startLevel8Btn.innerHTML = '<i class="bi bi-arrow-right me-2"></i>Weiter zum nächsten Level';
                        startLevel8Btn.classList.remove('btn-success');
                        startLevel8Btn.classList.add('btn-primary');
                        startLevel8Btn.disabled = false;
                    }
                    addLog(`Level ${level8CurrentLevel} geschafft! Weiter zu Level ${level8CurrentLevel + 1}`, "success");
                } else {
                    // Level 3 geschafft - Zeige Erfolgsscreen
                    if (level8Result) {
                        level8Result.innerHTML = '<span class="text-success">🏆 Alle Level geschafft! Glückwunsch!</span>';
                    }
                    if (startLevel8Btn) {
                        startLevel8Btn.style.display = "none";
                    }
                    handleLevel8Complete();
                    addLog("Alle Level geschafft! 🎉", "success");
                }
            }
        } else if (msg === "FAIL") {
            const isLevel8 = window.location.pathname.includes("level8");
            if (isLevel8) {
                if (level8Result) {
                    level8Result.innerHTML = '<span class="text-danger">❌ FALSCH! Versuche es nochmal.</span>';
                }
                level8GameActive = false;
                setLevel8ButtonsDisabled(true);

                // Start Button verstecken, Reset Button anzeigen
                if (startLevel8Btn) {
                    startLevel8Btn.style.display = "none";
                }
                if (resetLevel8Btn) {
                    resetLevel8Btn.style.display = "inline-block";
                }
            }
        }
    });

    ArduinoManager.addEventListener("arduinoSolved", () => {
        // In Level 1 ignorieren wir das generische Solved-Signal,
        // da wir hier zwei spezifische Button-Drücke brauchen.
        const isLevel1 = window.location.pathname.includes("level1");
        if (!isLevel1) {
            handleSolve();
        }
    });
}

function updateTaskUI(activeIndex) {
    if (!taskListItems.length) return;

    taskListItems.forEach((li, index) => {
        li.classList.remove("active-task", "completed", "pending");
        if (index < activeIndex) {
            li.classList.add("completed");
        } else if (index === activeIndex) {
            li.classList.add("active-task");
        } else {
            li.classList.add("pending");
        }
    });
}

// ===== EVENT LISTENER =====
function setupEventListeners() {
    if (toggleLogBtn) {
        toggleLogBtn.addEventListener("click", () => {
            if (logPanel) {
                if (logPanel.style.display === "none") {
                    logPanel.style.display = "block";
                    toggleLogBtn.classList.add("active");
                } else {
                    logPanel.style.display = "none";
                    toggleLogBtn.classList.remove("active");
                }
            }
        });
    }

    if (clearLogBtn) {
        clearLogBtn.addEventListener("click", () => {
            debugLogs = [];
            updateLogDisplay();
            addLog("Log geleert", "info");
        });
    }

    if (toggleWiringBtn) {
        toggleWiringBtn.addEventListener("click", () => {
            if (wiringPanel) {
                if (wiringPanel.style.display === "none") {
                    wiringPanel.style.display = "block";
                    toggleWiringBtn.classList.add("active");
                } else {
                    wiringPanel.style.display = "none";
                    toggleWiringBtn.classList.remove("active");
                }
            }
        });
    }

    if (backBtn) {
        backBtn.addEventListener("click", async (e) => {
            e.preventDefault();

            // Arduino zurücksetzen
            await ArduinoManager.sendToArduino("RESET");
            addLog("Arduino zurückgesetzt", "info");

            // Zur Startseite
            setTimeout(() => {
                window.location.href = "/pages/index.html";
            }, 300);
        });
    }

    if (sendCodeBtn) {
        sendCodeBtn.addEventListener("click", async () => {
            const code = codeInput.value.trim();
            if (code) {
                const result = await ArduinoManager.sendToArduino(code);
                if (!result.success) {
                    alert("Fehler beim Senden: " + result.message);
                }
                codeInput.value = "";
            }
        });
    }

    if (codeInput) {
        codeInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && sendCodeBtn) sendCodeBtn.click();
        });
    }

    if (nextLevelBtn) {
        nextLevelBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const match = window.location.pathname.match(/level(\d+)/);
            if (match) {
                const currentLevel = match[1];
                const nextLevel = parseInt(currentLevel) + 1;
                window.location.href = `/pages/level${nextLevel}.html`;
            } else {
                window.location.href = "/pages/index.html";
            }
        });
    }

    if (restartBtn) {
        restartBtn.addEventListener("click", (e) => {
            e.preventDefault();
            // Timer zurücksetzen
            sessionStorage.removeItem("gameStartTime");
            sessionStorage.removeItem("gameEndTime");
            sessionStorage.removeItem("gameFinalSeconds");
            sessionStorage.removeItem("gameFinalMillis");
            sessionStorage.removeItem("gameTimeSaved");
            window.location.href = "/pages/index.html";
        });
    }

    // Navigation zwischen Levels (Testing only)
    if (prevLevelBtn) {
        prevLevelBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const match = window.location.pathname.match(/level(\d+)/);
            if (match) {
                const currentLevel = parseInt(match[1]);
                const prevLevel = currentLevel - 1;

                // Arduino auf vorheriges Level setzen
                if (prevLevel >= 1) {
                    await ArduinoManager.sendToArduino(`SET_LEVEL_${prevLevel}`);
                    addLog(`Arduino auf Level ${prevLevel} gesetzt`, "info");
                    await new Promise((resolve) => setTimeout(resolve, 300));
                    window.location.href = `/pages/level${prevLevel}.html`;
                } else {
                    await ArduinoManager.sendToArduino("RESET");
                    addLog("Arduino zurückgesetzt", "info");
                    // Timer zurücksetzen
                    sessionStorage.removeItem("gameStartTime");
                    sessionStorage.removeItem("gameEndTime");
                    sessionStorage.removeItem("gameFinalSeconds");
                    sessionStorage.removeItem("gameFinalMillis");
                    sessionStorage.removeItem("gameTimeSaved");
                    window.location.href = "/pages/index.html";
                }
            }
        });
    }

    if (nextLevelBtnNav) {
        nextLevelBtnNav.addEventListener("click", async (e) => {
            e.preventDefault();
            const match = window.location.pathname.match(/level(\d+)/);
            if (match) {
                const currentLevel = parseInt(match[1]);
                const nextLevel = currentLevel + 1;

                // Arduino auf nächstes Level setzen
                await ArduinoManager.sendToArduino(`SET_LEVEL_${nextLevel}`);
                addLog(`Arduino auf Level ${nextLevel} gesetzt`, "info");
                await new Promise((resolve) => setTimeout(resolve, 300));
                window.location.href = `/pages/level${nextLevel}.html`;
            }
        });
    }

    // Restart Snake Button
    if (restartSnakeBtn) {
        restartSnakeBtn.addEventListener("click", () => {
            if (gameOverOverlay) {
                gameOverOverlay.style.display = "none";
            }
            snakeGameRunning = true;
            requestAnimationFrame(snakeGameLoop);
        });
    }
}

// ===== RÄTSEL GELÖST =====
function handleSolve() {
    if (resultDisplay) {
        console.log("🎉 handleSolve aufgerufen - Zeige DIV an");
        resultDisplay.style.display = "block";
        resultDisplay.classList.remove("hidden");

        // Konfetti Effekt
        if (typeof confetti === "function") {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: {y: 0.6},
                colors: ["#007aff", "#34c759", "#ffcc00"],
            });
        }

        // Automatisch zum Erfolgs-Div scrollen
        setTimeout(() => {
            resultDisplay.scrollIntoView({behavior: "smooth", block: "center"});
        }, 100);
    }
    console.log("🎉 Level gelöst!");
}

// ===== LEVEL 6 COMPLETE (Final Level) =====
async function handleLevel6Complete() {
    console.log("🎉 Level 6 Complete - Alle Level geschafft!");

    // Timer stoppen und Zeit speichern
    try {
        const response = await fetch("/api/timer/stop", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Timer gestoppt:", data);

            // Zeit anzeigen
            const finalTimeEl = document.getElementById("final-time");
            if (finalTimeEl && data.formattedTime) {
                finalTimeEl.textContent = data.formattedTime;
            }

            // Status updaten
            const leaderboardStatus = document.getElementById("leaderboard-status");
            if (leaderboardStatus) {
                if (data.saved) {
                    if (data.anonymous) {
                        leaderboardStatus.className = "alert alert-info small";
                        leaderboardStatus.innerHTML = `
              <i class="bi bi-check-circle-fill me-2"></i>Zeit gespeichert als Anonym! Platz ${data.rank || "?"} im Leaderboard
            `;
                    } else {
                        leaderboardStatus.className = "alert alert-success small";
                        leaderboardStatus.innerHTML = `
              <i class="bi bi-check-circle-fill me-2"></i>Zeit gespeichert! Platz ${data.rank || "?"} im Leaderboard
            `;
                    }
                } else {
                    leaderboardStatus.className = "alert alert-warning small";
                    leaderboardStatus.innerHTML = `
            <i class="bi bi-exclamation-triangle-fill me-2"></i>Keine Verbesserung - deine beste Zeit bleibt
          `;
                }
            }
        }
    } catch (error) {
        console.error("Fehler beim Timer stoppen:", error);
    }

    // Erfolgs-Screen anzeigen
    handleSolve();
}

// ===== LEVEL 5 FUNCTIONS =====
function initLevel5() {
    console.log("Level 5: Button Sequenz initialisiert");
    level5Progress = 0;
    addLog("Level 5 gestartet", "info");
}

function turnOnLED(number) {
    if (number >= 1 && number <= 4) {
        const led = document.getElementById("led" + number);
        if (led) {
            led.classList.add("on");
        }
    }
}

function resetLEDs() {
    for (let i = 1; i <= 4; i++) {
        const led = document.getElementById("led" + i);
        if (led) {
            led.classList.remove("on");
        }
    }
}

// ===== LEVEL 6 FUNCTIONS =====
function initLevel6() {
    console.log("Level 6: Temperatur initialisiert");
    level6SensorConnected = false;
    generatedCode = generateRandomCode();

    // Code sofort anzeigen (wird aber vom Eisblock überdeckt)
    const codeValue = document.getElementById("code-value");
    if (codeValue) {
        codeValue.textContent = generatedCode;
    }

    const tempDisplay = document.getElementById("temp-display");
    if (tempDisplay) {
        tempDisplay.textContent = "--";
        tempDisplay.style.color = "#6c757d";
    }

    if (statusText) {
        statusText.innerText = "Temperatursensor nicht verbunden.";
        statusText.style.color = "#dc3545";
    }

    addLog("Level 6 gestartet", "info");
    addLog(`Generierter Code: ${generatedCode}`, "info");

    // Submit Button Event
    const submitCodeBtn = document.getElementById("submit-code-btn");
    if (submitCodeBtn) {
        submitCodeBtn.addEventListener("click", checkLevel6Code);
    }

    // Enter Key Support
    const codeInput = document.getElementById("code-input");
    if (codeInput) {
        codeInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                checkLevel6Code();
            }
        });
    }
}

function generateRandomCode() {
    let code = "";
    for (let i = 0; i < 4; i++) {
        code += Math.floor(Math.random() * 10);
    }
    return code;
}

function meltIceBlock() {
    const iceBlock = document.getElementById("ice-block");
    const hiddenCode = document.getElementById("hidden-code");
    const codeInputSection = document.getElementById("code-input-section");

    // Eisblock schmelzen
    if (iceBlock) {
        iceBlock.classList.add("melted");
    }

    // Code sichtbar machen
    if (hiddenCode) {
        hiddenCode.classList.add("show");
    }

    if (codeInputSection) {
        codeInputSection.style.display = "block";
    }

    if (statusText) {
        statusText.innerText = "Eisblock geschmolzen! Gib den Code ein.";
        statusText.style.color = "var(--success)";
    }

    addLog("Eisblock geschmolzen!", "success");
    iceMeltedFlag = true;
}

async function checkLevel6Code() {
    const codeInput = document.getElementById("code-input");
    const codeMessage = document.getElementById("code-message");

    if (!codeInput || !codeMessage) return;

    const userCode = codeInput.value.trim();

    if (userCode === generatedCode) {
        codeMessage.innerHTML =
            '<span class="text-success fw-bold">✓ Code korrekt!</span>';
        addLog("Code korrekt eingegeben", "success");

        // Sende Signal an Arduino
        await ArduinoManager.sendToArduino("CODE_CORRECT");
    } else {
        codeMessage.innerHTML =
            '<span class="text-danger fw-bold">✗ Falscher Code. Versuch es nochmal.</span>';
        addLog(`Falscher Code eingegeben: ${userCode}`, "error");
    }
}

// ===== LEVEL 7 FUNCTIONS =====
function initLevel7() {
    console.log("Level 7: Mikrofon initialisiert");
    addLog("Level 7 gestartet", "info");
}

// ===== LEVEL 8 FUNCTIONS =====
function initLevel8() {
    console.log("Level 8: LED Memory initialisiert");
    addLog("Level 8 gestartet", "info");

    resetLevel8GameState();

    // Event Listeners für Level 8 Buttons
    if (startLevel8Btn) {
        startLevel8Btn.addEventListener("click", async () => {
            // Prüfe ZUERST ob Button als "Weiter" fungiert (vor dem Reset!)
            const isNextButton = startLevel8Btn.textContent.includes("Weiter");

            // Dann erst State zurücksetzen
            resetLevel8GameState();
            level8GameActive = true;

            if (isNextButton) {
                // Nächstes Level
                await ArduinoManager.sendToArduino("NEXT");
                addLog("Nächstes Level gestartet", "success");
            } else {
                // Start vom aktuellen Level (nicht immer Level 1!)
                // Wenn level8CurrentLevel noch 1 ist (initial), dann START
                // Sonst RELOADLEVEL um aktuelles Level neu zu starten
                if (level8CurrentLevel === 1) {
                    await ArduinoManager.sendToArduino("START");
                    addLog("Level 8 gestartet", "success");
                } else {
                    await ArduinoManager.sendToArduino("RELOADLEVEL");
                    addLog(`Level ${level8CurrentLevel} neu gestartet`, "info");
                }
            }

            setLevel8ButtonsDisabled(false);
        });
    }

    if (resetLevel8Btn) {
        resetLevel8Btn.addEventListener("click", async () => {
            resetLevel8GameState();
            level8GameActive = true;
            await ArduinoManager.sendToArduino("RELOADLEVEL");
            setLevel8ButtonsDisabled(false);
            addLog("Level neu gestartet", "info");
        });
    }

    // Color Button Clicks
    if (level8ColorBtns) {
        level8ColorBtns.forEach(btn => {
            btn.addEventListener("click", async () => {
                if (!level8GameActive) return;
                if (level8UserInput.length >= level8ExpectedLength) return;

                const color = btn.dataset.color;
                level8UserInput.push(color);
                updateLevel8Progress();

                await ArduinoManager.sendToArduino("BTN:" + color);
                addLog(`Farbe gewählt: ${color}`, "info");
            });
        });
    }
}

function resetLevel8GameState() {
    level8Sequence = [];
    level8UserInput = [];
    level8GameActive = false;

    if (level8Progress) {
        level8Progress.textContent = "Fortschritt: 0/0";
    }
    if (level8Result) {
        level8Result.innerHTML = "";
    }
    if (resetLevel8Btn) {
        resetLevel8Btn.style.display = "none";
    }
    if (startLevel8Btn) {
        startLevel8Btn.innerHTML = '<i class="bi bi-play-fill me-2"></i>Start';
        startLevel8Btn.classList.remove('btn-primary');
        startLevel8Btn.classList.add('btn-success');
        startLevel8Btn.style.display = "inline-block";
        startLevel8Btn.disabled = false; // Start Button muss klickbar sein
    }
    setLevel8ButtonsDisabled(true);
}

function updateLevel8Progress() {
    if (level8Progress) {
        level8Progress.textContent = `Fortschritt: ${level8UserInput.length}/${level8ExpectedLength}`;
    }
}

function setLevel8ButtonsDisabled(disabled) {
    if (level8ColorBtns) {
        level8ColorBtns.forEach(btn => {
            btn.disabled = disabled;
        });
    }
}

function updateLevel8Dots() {
    for (let i = 1; i <= 3; i++) {
        const dot = document.getElementById("dot" + i);
        if (dot) {
            dot.classList.remove("active", "done");
            // Markiere bereits abgeschlossene Levels als "done"
            if (i < level8CurrentLevel) {
                dot.classList.add("done");
            }
            // Markiere aktuelles Level als "active"
            else if (i === level8CurrentLevel) {
                dot.classList.add("active");
            }
        }
    }
}

function markLevel8Done(lvl) {
    const dot = document.getElementById("dot" + lvl);
    if (dot) {
        dot.classList.remove("active");
        dot.classList.add("done");
    }
}

async function handleLevel8Complete() {
    console.log("🎉 Level 8 Complete!");
    addLog("Level 8 geschafft! 🎉", "success");

    // Erfolgs-Screen anzeigen
    handleSolve();
}

// ===== JOYSTICK GAME (Level 2) =====
function initJoystickGame() {
    canvas = document.getElementById("game-canvas");
    if (!canvas) return;

    ctx = canvas.getContext("2d");

    collectedCount = 0;
    collectibles = [];
    obstacles = [];

    // Startposition des Spielers zurücksetzen
    player.x = 50;
    player.y = 200;

    spawnLevel2Obstacles();
    spawnLevel2Collectibles();

    requestAnimationFrame(gameLoop);
}

function spawnLevel2Obstacles() {
    obstacles = [];
    const minObstacleGap = 10;
    for (let i = 0; i < totalObstacles; i++) {
        let placed = false;
        let tries = 0;

        while (!placed && tries < 50) {
            const candidate = {
                x: Math.random() * (canvas.width - 150) + 100,
                y: Math.random() * (canvas.height - 100) + 50,
                radius: 15,
            };

            const tooCloseToOther = obstacles.some((obstacle) => {
                const distance = Math.hypot(
                    candidate.x - obstacle.x,
                    candidate.y - obstacle.y,
                );
                return distance < candidate.radius + obstacle.radius + minObstacleGap;
            });

            if (!tooCloseToOther) {
                obstacles.push(candidate);
                placed = true;
            }

            tries += 1;
        }

        if (!placed) {
            obstacles.push({
                x: Math.random() * (canvas.width - 150) + 100,
                y: Math.random() * (canvas.height - 100) + 50,
                radius: 15,
            });
        }
    }
}

function spawnLevel2Collectibles() {
    collectibles = [];
    const safePadding = 20;
    const minCollectibleGap = 10;
    const safeFromPlayerStart = 40;

    for (let i = 0; i < totalCollectibles; i++) {
        let placed = false;
        let tries = 0;

        while (!placed && tries < 50) {
            const candidate = {
                x: Math.random() * (canvas.width - 100) + 50,
                y: Math.random() * (canvas.height - 100) + 50,
                radius: 12,
                collected: false,
            };

            const tooCloseToObstacle = obstacles.some((obstacle) => {
                const distance = Math.hypot(
                    candidate.x - obstacle.x,
                    candidate.y - obstacle.y,
                );
                return distance < candidate.radius + obstacle.radius + safePadding;
            });

            const tooCloseToOtherCollectible = collectibles.some((c) => {
                const distance = Math.hypot(candidate.x - c.x, candidate.y - c.y);
                return distance < candidate.radius + c.radius + minCollectibleGap;
            });

            const tooCloseToPlayerStart = Math.hypot(
                candidate.x - player.x,
                candidate.y - player.y,
            ) < candidate.radius + player.radius + safeFromPlayerStart;

            if (!tooCloseToObstacle && !tooCloseToOtherCollectible && !tooCloseToPlayerStart) {
                collectibles.push(candidate);
                placed = true;
            }

            tries += 1;
        }

        if (!placed) {
            collectibles.push({
                x: Math.random() * (canvas.width - 100) + 50,
                y: Math.random() * (canvas.height - 100) + 50,
                radius: 12,
                collected: false,
            });
        }
    }
}

function resetLevel2() {
    addLog("Hindernis getroffen! Level wird zurückgesetzt.", "error");
    if (statusText) {
        statusText.innerText = "Autsch! Hindernis getroffen. Neustart...";
        statusText.style.color = "#dc3545";
    }

    collectedCount = 0;
    player.x = 50;
    player.y = 200;

    // Hindernisse und Collectibles neu platzieren
    spawnLevel2Obstacles();
    spawnLevel2Collectibles();

    // Status Text nach kurzer Zeit wiederherstellen
    setTimeout(() => {
        if (statusText && collectedCount === 0) {
            statusText.innerText = "Steuere den blauen Punkt zum grünen Ziel!";
            statusText.style.color = "";
        }
    }, 2000);
}

function gameLoop() {
    if (!canvas || !ctx) return;

    // Canvas leeren
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Spieler bewegen basierend auf Joystick
    player.x += (joystickX / 100) * player.speed;
    player.y += (joystickY / 100) * player.speed;

    // Grenzen prüfen
    player.x = Math.max(
        player.radius,
        Math.min(canvas.width - player.radius, player.x),
    );
    player.y = Math.max(
        player.radius,
        Math.min(canvas.height - player.radius, player.y),
    );

    // Sammelbare Punkte zeichnen und Kollision prüfen
    collectibles.forEach((item, index) => {
        if (item.collected) return;

        const distance = Math.sqrt(
            Math.pow(player.x - item.x, 2) + Math.pow(player.y - item.y, 2),
        );

        if (distance < player.radius + item.radius) {
            // Punkt eingesammelt!
            item.collected = true;
            collectedCount++;

            if (statusText) {
                statusText.innerText = `${collectedCount}/${totalCollectibles} Punkte gesammelt`;
            }

            // Alle Punkte gesammelt?
            if (collectedCount >= totalCollectibles) {
                ArduinoManager.sendToArduino("L2_SOLVED");
                return;
            }
        }

        // Nicht eingesammelte Punkte zeichnen (grün)
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#34c759";
        ctx.fill();
        ctx.strokeStyle = "#28a745";
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    // Hindernisse zeichnen und Kollision prüfen
    obstacles.forEach((obstacle) => {
        const distance = Math.sqrt(
            Math.pow(player.x - obstacle.x, 2) + Math.pow(player.y - obstacle.y, 2),
        );

        if (distance < player.radius + obstacle.radius) {
            resetLevel2();
            return;
        }

        // Hindernis zeichnen (rot)
        ctx.beginPath();
        ctx.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#dc3545";
        ctx.fill();
        ctx.strokeStyle = "#a71d2a";
        ctx.lineWidth = 2;
        ctx.stroke();

        // X in der Mitte zeichnen
        ctx.beginPath();
        ctx.moveTo(obstacle.x - 7, obstacle.y - 7);
        ctx.lineTo(obstacle.x + 7, obstacle.y + 7);
        ctx.moveTo(obstacle.x + 7, obstacle.y - 7);
        ctx.lineTo(obstacle.x - 7, obstacle.y + 7);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 3;
        ctx.stroke();
    });

    // Spieler zeichnen (blau)
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#007aff";
    ctx.fill();
    ctx.strokeStyle = "#0056b3";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Info anzeigen
    ctx.fillStyle = "#333";
    ctx.font = "14px monospace";
    ctx.fillText(`Punkte: ${collectedCount}/${totalCollectibles}`, 10, 20);
    ctx.fillText(`Joystick: X=${joystickX} Y=${joystickY}`, 10, 40);

    requestAnimationFrame(gameLoop);
}

// ===== MAZE GAME (Level 3) =====
function initMazeGame() {
    canvas = document.getElementById("game-canvas");
    if (!canvas) return;

    ctx = canvas.getContext("2d");

    // Startposition des Spielers
    player.x = 30;
    player.y = 30;
    player.radius = 12;
    player.speed = 2.5;

    // Zielposition
    goal = {x: 550, y: 350, radius: 20};

    // Labyrinth-Wände definieren (x, y, width, height)
    walls = [
        // Äußere Wände
        {x: 0, y: 0, w: 600, h: 10}, // Oben
        {x: 0, y: 390, w: 600, h: 10}, // Unten
        {x: 0, y: 0, w: 10, h: 400}, // Links
        {x: 590, y: 0, w: 10, h: 400}, // Rechts

        // Innere Labyrinth-Wände
        {x: 100, y: 0, w: 10, h: 150},
        {x: 100, y: 150, w: 150, h: 10},
        {x: 240, y: 50, w: 10, h: 110},
        {x: 350, y: 0, w: 10, h: 200},
        {x: 200, y: 250, w: 160, h: 10},
        {x: 200, y: 250, w: 10, h: 100},
        {x: 450, y: 100, w: 10, h: 200},
        {x: 450, y: 290, w: 100, h: 10},
        {x: 100, y: 300, w: 10, h: 90},
        {x: 350, y: 350, w: 10, h: 50},
    ];

    requestAnimationFrame(mazeGameLoop);
}

function resetMaze() {
    addLog("Wand berührt! Zurück zum Start.", "error");
    if (statusText) {
        statusText.innerText = "Wand berührt! Zurück zum Start...";
        statusText.style.color = "#dc3545";
    }

    player.x = 30;
    player.y = 30;

    // Status Text nach kurzer Zeit wiederherstellen
    setTimeout(() => {
        if (statusText) {
            statusText.innerText = "Navigiere durch das Labyrinth zum Ziel!";
            statusText.style.color = "";
        }
    }, 2000);
}

function checkWallCollision(newX, newY) {
    for (let wall of walls) {
        // Prüfe Kollision mit rechteckiger Wand
        if (
            newX + player.radius > wall.x &&
            newX - player.radius < wall.x + wall.w &&
            newY + player.radius > wall.y &&
            newY - player.radius < wall.y + wall.h
        ) {
            return true;
        }
    }
    return false;
}

function mazeGameLoop() {
    if (!canvas || !ctx) return;

    // Canvas leeren
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Neue Position berechnen
    let newX = player.x + (joystickX / 100) * player.speed;
    let newY = player.y + (joystickY / 100) * player.speed;

    // Kollision mit Wänden prüfen
    if (checkWallCollision(newX, newY)) {
        resetMaze();
    } else {
        player.x = newX;
        player.y = newY;
    }

    // Wände zeichnen
    ctx.fillStyle = "#4a4a4a";
    walls.forEach((wall) => {
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    });

    // Ziel zeichnen (gelb)
    ctx.beginPath();
    ctx.arc(goal.x, goal.y, goal.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffc107";
    ctx.fill();
    ctx.strokeStyle = "#ff9800";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Stern-Symbol im Ziel
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("★", goal.x, goal.y);

    // Spieler zeichnen (blau)
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#007aff";
    ctx.fill();
    ctx.strokeStyle = "#0056b3";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Prüfe ob Ziel erreicht
    const distanceToGoal = Math.sqrt(
        Math.pow(player.x - goal.x, 2) + Math.pow(player.y - goal.y, 2),
    );

    if (distanceToGoal < player.radius + goal.radius) {
        ArduinoManager.sendToArduino("L3_SOLVED");
        return; // Stoppe Game Loop
    }

    // Info anzeigen
    ctx.fillStyle = "#fff";
    ctx.font = "14px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`Joystick: X=${joystickX} Y=${joystickY}`, 10, 20);

    requestAnimationFrame(mazeGameLoop);
}

// ===== SNAKE GAME (Level 4) =====
function initSnakeGame() {
    canvas = document.getElementById("game-canvas");
    if (!canvas) return;

    ctx = canvas.getContext("2d");

    // Snake initialisieren (Mitte des Canvas)
    const startX = Math.floor(canvas.width / gridSize / 2);
    const startY = Math.floor(canvas.height / gridSize / 2);

    snake = [
        {x: startX, y: startY},
        {x: startX - 1, y: startY},
        {x: startX - 2, y: startY},
    ];

    snakeDirection = {x: 1, y: 0};
    applesCollected = 0;
    lastMoveTime = Date.now();
    snakeGameRunning = true;
    snakeGameCompleted = false;

    spawnApple();
    requestAnimationFrame(snakeGameLoop);
}

function spawnApple() {
    const cols = Math.floor(canvas.width / gridSize);
    const rows = Math.floor(canvas.height / gridSize);

    let validPosition = false;
    while (!validPosition) {
        apple.x = Math.floor(Math.random() * cols);
        apple.y = Math.floor(Math.random() * rows);

        // Prüfe ob Apple nicht auf Snake ist
        validPosition = !snake.some(
            (segment) => segment.x === apple.x && segment.y === apple.y,
        );
    }
}

function updateSnakeDirection() {
    // Joystick Input -> Richtung
    // Nur ändern wenn Joystick deutlich bewegt wird
    if (Math.abs(joystickX) > Math.abs(joystickY)) {
        if (joystickX > 30 && snakeDirection.x === 0) {
            snakeDirection = {x: 1, y: 0}; // Rechts
        } else if (joystickX < -30 && snakeDirection.x === 0) {
            snakeDirection = {x: -1, y: 0}; // Links
        }
    } else {
        if (joystickY > 30 && snakeDirection.y === 0) {
            snakeDirection = {x: 0, y: 1}; // Unten
        } else if (joystickY < -30 && snakeDirection.y === 0) {
            snakeDirection = {x: 0, y: -1}; // Oben
        }
    }
}

function moveSnake() {
    const head = snake[0];
    const newHead = {
        x: head.x + snakeDirection.x,
        y: head.y + snakeDirection.y,
    };

    // Prüfe Kollision mit Wänden
    const cols = Math.floor(canvas.width / gridSize);
    const rows = Math.floor(canvas.height / gridSize);

    if (
        newHead.x < 0 ||
        newHead.x >= cols ||
        newHead.y < 0 ||
        newHead.y >= rows
    ) {
        resetSnake();
        return false;
    }

    // Prüfe Kollision mit sich selbst
    if (
        snake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)
    ) {
        resetSnake();
        return false;
    }

    // Snake bewegen
    snake.unshift(newHead);

    // Prüfe ob Apfel gegessen
    if (newHead.x === apple.x && newHead.y === apple.y) {
        applesCollected++;
        addLog(`Apfel gesammelt! ${applesCollected}/${targetApples}`, "success");

        if (statusText) {
            statusText.innerText = `${applesCollected}/${targetApples} Äpfel gesammelt`;
        }

        if (applesCollected >= targetApples) {
            // Level abgeschlossen!
            snakeGameCompleted = true;
            snakeGameRunning = false;
            ArduinoManager.sendToArduino("L4_SOLVED");
            return false;
        }

        spawnApple();
    } else {
        // Entferne letztes Segment (Snake bewegt sich)
        snake.pop();
    }

    return true;
}

function resetSnake() {
    addLog("Game Over! Snake kollidiert.", "error");
    snakeGameRunning = false;

    if (statusText) {
        statusText.innerText = "Game Over!";
        statusText.style.color = "#dc3545";
    }

    // Game Over Overlay anzeigen
    if (gameOverOverlay) {
        gameOverOverlay.style.display = "block";
    }

    // Snake zurücksetzen für Neustart
    const startX = Math.floor(canvas.width / gridSize / 2);
    const startY = Math.floor(canvas.height / gridSize / 2);

    snake = [
        {x: startX, y: startY},
        {x: startX - 1, y: startY},
        {x: startX - 2, y: startY},
    ];

    snakeDirection = {x: 1, y: 0};
    applesCollected = 0;
    spawnApple();

    // Status Text zurücksetzen
    setTimeout(() => {
        if (statusText) {
            statusText.innerText = `Sammle 5 Äpfel ohne gegen Wände oder dich selbst zu fahren!`;
            statusText.style.color = "";
        }
    }, 500);
}

function snakeGameLoop() {
    if (!canvas || !ctx) return;
    if (!snakeGameRunning) return; // Stop wenn Game nicht läuft
    if (snakeGameCompleted) return; // Stop wenn Level abgeschlossen

    // Canvas leeren
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Richtung aktualisieren basierend auf Joystick
    updateSnakeDirection();

    // Snake bewegen (mit Timing)
    const now = Date.now();
    if (now - lastMoveTime >= moveInterval) {
        const success = moveSnake();
        if (!success) {
            // Game Over - stoppe Loop
            return;
        }
        lastMoveTime = now;
    }

    // Grid zeichnen (optional, für bessere Visualisierung)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Apfel zeichnen (rot)
    ctx.beginPath();
    ctx.arc(
        apple.x * gridSize + gridSize / 2,
        apple.y * gridSize + gridSize / 2,
        gridSize / 2 - 2,
        0,
        Math.PI * 2,
    );
    ctx.fillStyle = "#dc3545";
    ctx.fill();

    // Snake zeichnen (grün, Kopf heller)
    snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? "#5cb85c" : "#4a9d4a";
        ctx.fillRect(
            segment.x * gridSize + 1,
            segment.y * gridSize + 1,
            gridSize - 2,
            gridSize - 2,
        );

        // Rand
        ctx.strokeStyle = "#3d8b3d";
        ctx.lineWidth = 2;
        ctx.strokeRect(
            segment.x * gridSize + 1,
            segment.y * gridSize + 1,
            gridSize - 2,
            gridSize - 2,
        );
    });

    // Info anzeigen
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`Äpfel: ${applesCollected}/${targetApples}`, 10, 25);
    ctx.fillText(`Länge: ${snake.length}`, 10, 50);

    requestAnimationFrame(snakeGameLoop);
}

// Sicherstellen, dass die DIV beim Laden wirklich weg ist
window.addEventListener("load", () => {
    if (resultDisplay) {
        resultDisplay.style.display = "none";
    }
});

// ===== START =====
init();
