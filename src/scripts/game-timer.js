// Game timer to track completion time
let startTime = null;
let timerInterval = null;
let elapsedSeconds = 0;

export function startTimer() {
  if (startTime) return; // Already started

  startTime = Date.now();
  elapsedSeconds = 0;

  // Store start time in sessionStorage for persistence across pages
  sessionStorage.setItem("gameStartTime", startTime.toString());

  console.log("Game timer started");
}

export function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  if (!startTime) {
    // Try to recover from sessionStorage
    const stored = sessionStorage.getItem("gameStartTime");
    if (stored) {
      startTime = parseInt(stored);
    }
  }

  if (startTime) {
    const endTime = Date.now();
    elapsedSeconds = Math.floor((endTime - startTime) / 1000);
    console.log("Game timer stopped. Total time:", elapsedSeconds, "seconds");
    return elapsedSeconds;
  }

  return 0;
}

export function getElapsedTime() {
  if (!startTime) {
    const stored = sessionStorage.getItem("gameStartTime");
    if (stored) {
      startTime = parseInt(stored);
    }
  }

  if (!startTime) return 0;

  const now = Date.now();
  return Math.floor((now - startTime) / 1000);
}

export function resetTimer() {
  startTime = null;
  elapsedSeconds = 0;
  sessionStorage.removeItem("gameStartTime");

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
