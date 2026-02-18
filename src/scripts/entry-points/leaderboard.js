import "../../styles/style.css";
import "../../styles/components.css";
import "../../styles/animations.css";
import { getCurrentUser, checkAuth } from "../auth.js";

// DOM Elements
const backBtn = document.getElementById("back-btn");
const leaderboardContent = document.getElementById("leaderboard-content");

// ===== ZEIT SPEICHERN =====
async function saveTimeToLeaderboard() {
  // Finale Zeit aus sessionStorage holen
  const finalSeconds = sessionStorage.getItem("gameFinalSeconds");
  const alreadySaved = sessionStorage.getItem("gameTimeSaved");

  // Nur speichern wenn eine Zeit vorhanden ist und noch nicht gespeichert wurde
  if (!finalSeconds || alreadySaved === "true") return;

  // Warten bis Auth gecheckt ist
  await checkAuth();

  // Username bestimmen: eingeloggt oder anonym
  const user = getCurrentUser();
  const username = user
    ? user
    : `Anonym_${Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, "0")}`;

  try {
    const response = await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username,
        time: parseInt(finalSeconds),
        date: new Date().toISOString(),
      }),
    });

    if (response.ok) {
      console.log("Zeit gespeichert:", username, finalSeconds, "s");
      // Markieren dass bereits gespeichert, damit kein Doppeleintrag entsteht
      sessionStorage.setItem("gameTimeSaved", "true");
    } else {
      console.error("Fehler beim Speichern der Zeit:", response.status);
    }
  } catch (error) {
    console.error("Fehler beim Speichern der Zeit:", error);
  }
}

// ===== LEADERBOARD LADEN =====
async function loadLeaderboard() {
  try {
    const response = await fetch("/api/leaderboard");
    const data = await response.json();

    if (data.length === 0) {
      leaderboardContent.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="bi bi-trophy fs-1 mb-3 d-block"></i>
                    <p class="lead">Noch keine Einträge im Leaderboard</p>
                    <p class="small">Sei der Erste, der alle Level abschließt!</p>
                </div>
            `;
      return;
    }

    // Nach Zeit sortieren (schnellste zuerst)
    const sorted = [...data].sort((a, b) => a.time - b.time);

    let html = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th class="text-center" style="width: 60px;">Platz</th>
                            <th>Spieler</th>
                            <th class="text-end">Zeit</th>
                            <th class="text-end">Datum</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

    sorted.forEach((entry, index) => {
      const rank = index + 1;
      const icon =
        rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
      const timeFormatted = formatTime(entry.time);
      const rowClass = rank <= 3 ? "table-warning" : "";
      const dateFormatted = entry.date
        ? new Date(entry.date).toLocaleDateString("de-AT", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : "-";

      html += `
                <tr class="${rowClass}">
                    <td class="text-center fw-bold">${icon}</td>
                    <td class="fw-bold">${escapeHtml(entry.username)}</td>
                    <td class="text-end font-monospace">${timeFormatted}</td>
                    <td class="text-end text-muted small">${dateFormatted}</td>
                </tr>
            `;
    });

    html += `
                    </tbody>
                </table>
            </div>
        `;

    leaderboardContent.innerHTML = html;
  } catch (error) {
    console.error("Failed to load leaderboard:", error);
    leaderboardContent.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Fehler beim Laden des Leaderboards
            </div>
        `;
  }
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Event listeners
if (backBtn) {
  backBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  });
}

// ===== INITIALISIERUNG =====
async function init() {
  await saveTimeToLeaderboard(); // Erst Zeit speichern
  await loadLeaderboard(); // Dann Leaderboard laden (inkl. neuen Eintrag)
}

init();
