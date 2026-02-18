import '../../styles/style.css'
import '../../styles/components.css'
import '../../styles/animations.css'

// DOM Elements
const backBtn = document.getElementById('back-btn');
const leaderboardContent = document.getElementById('leaderboard-content');

// Load and display leaderboard
async function loadLeaderboard() {
    try {
        const response = await fetch('/api/leaderboard');
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

        // Build leaderboard table
        let html = `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th class="text-center" style="width: 60px;">Platz</th>
              <th>Spieler</th>
              <th class="text-end">Zeit</th>
            </tr>
          </thead>
          <tbody>
    `;

        data.forEach((entry, index) => {
            const rank = index + 1;
            const icon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
            const timeFormatted = formatTime(entry.time);
            const rowClass = rank <= 3 ? 'table-warning' : '';

            html += `
        <tr class="${rowClass}">
          <td class="text-center fw-bold">${icon}</td>
          <td class="fw-bold">${escapeHtml(entry.username)}</td>
          <td class="text-end font-monospace">${timeFormatted}</td>
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
        console.error('Failed to load leaderboard:', error);
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
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event listeners
if (backBtn) {
    backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Gehe zur vorherigen Seite zurück, oder zur Startseite falls keine History
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = '/';
        }
    });
}

// Initialize
loadLeaderboard();
