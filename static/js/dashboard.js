/* dashboard.js
   Runs on the laptop dashboard (/).
   - Polls /api/latest-accident every few seconds to detect new alerts.
   - Polls /api/accidents to refresh the history table.
   - Shows accident location on a Leaflet + OpenStreetMap map.
*/

const POLL_INTERVAL_MS = 3000; // poll every 3 seconds

let map;
let marker;
let lastSeenAccidentId = null;

function initMap() {
    // Default view: roughly centered on India; will re-center on first accident.
    map = L.map("map").setView([20.5937, 78.9629], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
}

function formatTime(isoString) {
    if (!isoString) return "-";
    try {
        const d = new Date(isoString);
        return d.toLocaleString();
    } catch (e) {
        return isoString;
    }
}

function statusBadge(status) {
    if (status === "ALERT_SENT") return `<span class="badge-sent">ALERT_SENT</span>`;
    if (status === "PENDING") return `<span class="badge-pending">PENDING</span>`;
    if (status === "CANCELLED") return `<span class="badge-cancelled">CANCELLED</span>`;
    return status;
}

function updateAlertBanner(accident) {
    const banner = document.getElementById("alert-banner");
    if (!accident) {
        banner.classList.remove("show");
        return;
    }
    banner.classList.add("show");
    document.getElementById("alert-device").textContent = accident.device_id;
    document.getElementById("alert-time").textContent = formatTime(accident.timestamp);
    document.getElementById("alert-impact").textContent = accident.impact_magnitude.toFixed(2);
    document.getElementById("alert-battery").textContent =
        accident.battery !== null && accident.battery !== undefined ? accident.battery : "N/A";
    document.getElementById("alert-location").textContent =
        `${accident.latitude.toFixed(5)}, ${accident.longitude.toFixed(5)}`;
    document.getElementById("alert-accuracy").textContent =
        accident.accuracy !== null && accident.accuracy !== undefined
            ? `${accident.accuracy.toFixed(1)} m`
            : "N/A";
}

function updateDetailsPanel(accident) {
    if (!accident) return;
    document.getElementById("d-device").textContent = accident.device_id;
    document.getElementById("d-time").textContent = formatTime(accident.timestamp);
    document.getElementById("d-lat").textContent = accident.latitude.toFixed(6);
    document.getElementById("d-lon").textContent = accident.longitude.toFixed(6);
    document.getElementById("d-acc").textContent =
        accident.accuracy !== null && accident.accuracy !== undefined
            ? `${accident.accuracy.toFixed(1)} m`
            : "N/A";
    document.getElementById("d-impact").textContent = `${accident.impact_magnitude.toFixed(2)} m/s²`;
    document.getElementById("d-batt").textContent =
        accident.battery !== null && accident.battery !== undefined ? `${accident.battery}%` : "N/A";
    document.getElementById("d-status").innerHTML = statusBadge(accident.status);
}

function updateMap(accident) {
    if (!accident) return;
    const lat = accident.latitude;
    const lon = accident.longitude;

    map.setView([lat, lon], 16);

    const popupText = `
        <strong>Possible Accident</strong><br>
        Device: ${accident.device_id}<br>
        Impact: ${accident.impact_magnitude.toFixed(2)} m/s²<br>
        Time: ${formatTime(accident.timestamp)}<br>
        Battery: ${accident.battery !== null && accident.battery !== undefined ? accident.battery + "%" : "N/A"}
    `;

    if (marker) {
        marker.setLatLng([lat, lon]).setPopupContent(popupText);
    } else {
        marker = L.marker([lat, lon]).addTo(map).bindPopup(popupText);
    }
    marker.openPopup();
}

function playAlertSound() {
    const audio = document.getElementById("alert-sound");
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {
            /* Autoplay may be blocked until the user interacts with the page; ignore. */
        });
    }
}

async function pollLatestAccident() {
    try {
        const res = await fetch("/api/latest-accident");
        const data = await res.json();
        const accident = data.accident;

        if (!accident) return;

        updateDetailsPanel(accident);
        updateMap(accident);

        if (accident.id !== lastSeenAccidentId) {
            // A genuinely new accident arrived.
            const isFirstLoad = lastSeenAccidentId === null;
            lastSeenAccidentId = accident.id;
            updateAlertBanner(accident);
            if (!isFirstLoad) {
                playAlertSound();
            }
        }
    } catch (err) {
        console.error("Failed to poll latest accident:", err);
        document.getElementById("system-status").textContent = "SERVER UNREACHABLE";
        document.getElementById("system-status").className = "status-inactive";
    }
}

async function pollHistory() {
    try {
        const res = await fetch("/api/accidents?limit=25");
        const data = await res.json();
        const tbody = document.getElementById("history-body");

        if (!data.accidents || data.accidents.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="muted">No accident events yet.</td></tr>`;
            document.getElementById("d-total").textContent = "0";
            return;
        }

        document.getElementById("d-total").textContent = data.count;

        tbody.innerHTML = data.accidents
            .map(
                (a) => `
            <tr>
                <td>${a.id}</td>
                <td>${a.device_id}</td>
                <td>${formatTime(a.timestamp)}</td>
                <td>${a.latitude.toFixed(5)}</td>
                <td>${a.longitude.toFixed(5)}</td>
                <td>${a.impact_magnitude.toFixed(2)}</td>
                <td>${a.battery !== null && a.battery !== undefined ? a.battery + "%" : "N/A"}</td>
                <td>${statusBadge(a.status)}</td>
            </tr>`
            )
            .join("");
    } catch (err) {
        console.error("Failed to poll history:", err);
    }
}

async function pollStatus() {
    try {
        const res = await fetch("/api/status");
        const data = await res.json();
        document.getElementById("system-status").textContent = data.system_status;
        document.getElementById("system-status").className = "status-active";
        document.getElementById("server-time").textContent = "Server time: " + formatTime(data.server_time);
    } catch (err) {
        document.getElementById("system-status").textContent = "SERVER UNREACHABLE";
        document.getElementById("system-status").className = "status-inactive";
    }
}

function startPolling() {
    pollStatus();
    pollLatestAccident();
    pollHistory();
    setInterval(pollStatus, POLL_INTERVAL_MS);
    setInterval(pollLatestAccident, POLL_INTERVAL_MS);
    setInterval(pollHistory, POLL_INTERVAL_MS);
}

document.addEventListener("DOMContentLoaded", () => {
    initMap();
    startPolling();
});
