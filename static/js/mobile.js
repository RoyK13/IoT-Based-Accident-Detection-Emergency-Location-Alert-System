/* mobile.js
   Runs on the phone page (/mobile).

   Responsibilities:
   1. Ask for Motion + Location permission.
   2. Read accelerometer data via DeviceMotion API, compute magnitude.
   3. Simple two-stage detection: spike -> short sustained-unusual-motion check -> trigger.
   4. Show a 10-second cancellable countdown before sending an alert.
   5. Provide a "Simulate Accident" button for safe demoing (skips real sensor logic).
   6. Send accident JSON to POST /api/accident with the classroom API key.
*/

// ---------------------------------------------------------------------------
// CONFIGURATION - easy to tweak for your demo
// ---------------------------------------------------------------------------
const CONFIG = {
    DEVICE_ID: "my-phone",
    API_KEY: "college-demo-key-123", // must match config.py Config.API_KEY
    IMPACT_THRESHOLD: 25, // m/s^2 - NOT scientifically validated, just a demo threshold
    SUSTAINED_CHECK_WINDOW_MS: 800, // after a spike, watch motion for this long
    SUSTAINED_MIN_SAMPLES_ABOVE_HALF_THRESHOLD: 2, // how many "still shaky" samples confirm it
    COUNTDOWN_SECONDS: 10,
    SERVER_ENDPOINT: "/api/accident",
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let latestMagnitude = 0;
let latestReading = { x: 0, y: 0, z: 0 };
let usingAccelerationIncludingGravity = false;

let latestPosition = null; // { latitude, longitude, accuracy }
let geoWatchId = null;

let batteryManager = null;

let spikeDetectedAt = null;
let sustainedSampleCount = 0;
let countdownTimer = null;
let countdownRemaining = CONFIG.COUNTDOWN_SECONDS;
let alertInFlight = false; // true while countdown is running or a send is happening

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------
const el = (id) => document.getElementById(id);

function setSensorStatus(text) {
    el("sensor-status").textContent = text;
}
function setGpsStatus(text) {
    el("gps-status").textContent = text;
}
function setServerStatus(text) {
    el("server-status").textContent = text;
}

// ---------------------------------------------------------------------------
// Device Motion handling
// ---------------------------------------------------------------------------
function handleMotionEvent(event) {
    let accel = event.acceleration;

    // Many phones/browsers only populate accelerationIncludingGravity reliably.
    // We prefer the gravity-free 'acceleration' when available, and fall back
    // otherwise. This is explained in the README as a known limitation:
    // accelerationIncludingGravity includes ~9.8 m/s^2 of constant gravity,
    // which raises the baseline magnitude and makes the threshold less exact.
    if (!accel || (accel.x === null && accel.y === null && accel.z === null)) {
        accel = event.accelerationIncludingGravity;
        usingAccelerationIncludingGravity = true;
    } else {
        usingAccelerationIncludingGravity = false;
    }

    if (!accel) return;

    const x = accel.x || 0;
    const y = accel.y || 0;
    const z = accel.z || 0;

    latestReading = { x, y, z };
    latestMagnitude = Math.sqrt(x * x + y * y + z * z);

    el("acc-x").textContent = x.toFixed(2);
    el("acc-y").textContent = y.toFixed(2);
    el("acc-z").textContent = z.toFixed(2);
    el("acc-mag").textContent = latestMagnitude.toFixed(2);

    runDetectionAlgorithm(latestMagnitude);
}

/**
 * Simple, deliberately unsophisticated two-stage detection:
 *   Stage 1: a single reading crosses IMPACT_THRESHOLD -> "spike".
 *   Stage 2: within a short window after the spike, check whether motion
 *            is still elevated (a crude proxy for "something unusual is
 *            still happening", e.g. the phone tumbling after an impact).
 * If both stages pass, we trigger the countdown. This is an educational
 * heuristic only, not a validated accident-detection algorithm.
 */
function runDetectionAlgorithm(magnitude) {
    if (alertInFlight) return; // don't re-trigger while a countdown/alert is active

    const now = Date.now();

    if (spikeDetectedAt === null) {
        if (magnitude >= CONFIG.IMPACT_THRESHOLD) {
            spikeDetectedAt = now;
            sustainedSampleCount = 0;
        }
        return;
    }

    // We are inside the post-spike observation window.
    const elapsed = now - spikeDetectedAt;
    if (elapsed <= CONFIG.SUSTAINED_CHECK_WINDOW_MS) {
        if (magnitude >= CONFIG.IMPACT_THRESHOLD / 2) {
            sustainedSampleCount += 1;
        }
        if (sustainedSampleCount >= CONFIG.SUSTAINED_MIN_SAMPLES_ABOVE_HALF_THRESHOLD) {
            spikeDetectedAt = null;
            sustainedSampleCount = 0;
            triggerPossibleAccident(magnitude);
        }
    } else {
        // Window expired without enough sustained motion -> treat as noise, reset.
        spikeDetectedAt = null;
        sustainedSampleCount = 0;
    }
}

// ---------------------------------------------------------------------------
// Geolocation
// ---------------------------------------------------------------------------
function startWatchingLocation() {
    if (!("geolocation" in navigator)) {
        setGpsStatus("UNAVAILABLE");
        return;
    }

    geoWatchId = navigator.geolocation.watchPosition(
        (pos) => {
            latestPosition = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
            };
            setGpsStatus("ACTIVE");
            el("loc-lat").textContent = latestPosition.latitude.toFixed(6);
            el("loc-lon").textContent = latestPosition.longitude.toFixed(6);
            el("loc-acc").textContent = latestPosition.accuracy
                ? latestPosition.accuracy.toFixed(1)
                : "-";
        },
        (err) => {
            setGpsStatus("PERMISSION DENIED");
            console.error("Geolocation error:", err);
            alert("Location permission is required to send an accurate accident alert.");
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
}

function getFreshPosition() {
    // Grab the single most recent reading we have; if we somehow have none yet,
    // try a one-off request as a fallback.
    return new Promise((resolve) => {
        if (latestPosition) {
            resolve(latestPosition);
            return;
        }
        if (!("geolocation" in navigator)) {
            resolve(null);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                resolve({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                });
            },
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}

// ---------------------------------------------------------------------------
// Battery Status API
// ---------------------------------------------------------------------------
function initBatteryStatus() {
    if (!("getBattery" in navigator)) {
        el("battery-status").textContent = "Battery information unavailable";
        return;
    }
    navigator.getBattery().then((battery) => {
        batteryManager = battery;
        updateBatteryDisplay();
        battery.addEventListener("levelchange", updateBatteryDisplay);
        battery.addEventListener("chargingchange", updateBatteryDisplay);
    }).catch(() => {
        el("battery-status").textContent = "Battery information unavailable";
    });
}

function updateBatteryDisplay() {
    if (!batteryManager) {
        el("battery-status").textContent = "Battery information unavailable";
        return;
    }
    const pct = Math.round(batteryManager.level * 100);
    const charging = batteryManager.charging ? "Charging" : "Not charging";
    el("battery-status").textContent = `${pct}% (${charging})`;
}

function getCurrentBatteryPercent() {
    if (batteryManager) {
        return Math.round(batteryManager.level * 100);
    }
    return null;
}

// ---------------------------------------------------------------------------
// Countdown + sending the alert
// ---------------------------------------------------------------------------
function triggerPossibleAccident(magnitude) {
    startCountdown(magnitude);
}

function startCountdown(magnitude) {
    alertInFlight = true;
    countdownRemaining = CONFIG.COUNTDOWN_SECONDS;

    el("countdown-number").textContent = countdownRemaining;
    el("countdown-overlay").classList.add("show");

    countdownTimer = setInterval(async () => {
        countdownRemaining -= 1;
        el("countdown-number").textContent = countdownRemaining;

        if (countdownRemaining <= 0) {
            clearInterval(countdownTimer);
            el("countdown-overlay").classList.remove("show");
            await sendAccidentAlert(magnitude);
            alertInFlight = false;
        }
    }, 1000);
}

function cancelCountdown() {
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
    el("countdown-overlay").classList.remove("show");
    alertInFlight = false;
    console.log("Alert cancelled by user. Nothing sent.");
}

async function sendAccidentAlert(magnitude) {
    const position = await getFreshPosition();

    if (!position) {
        alert("Could not obtain GPS location. Alert not sent. Please enable location and try again.");
        return;
    }

    const payload = {
        device_id: CONFIG.DEVICE_ID,
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy || null,
        impact_magnitude: magnitude,
        battery: getCurrentBatteryPercent(),
        timestamp: new Date().toISOString(),
        api_key: CONFIG.API_KEY,
    };

    try {
        setServerStatus("SENDING...");
        const res = await fetch(CONFIG.SERVER_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": CONFIG.API_KEY,
            },
            body: JSON.stringify(payload),
        });

        if (res.ok) {
            setServerStatus("CONNECTED");
            console.log("Accident alert sent successfully.");
        } else {
            const errBody = await res.json().catch(() => ({}));
            setServerStatus("ERROR");
            console.error("Server rejected accident alert:", errBody);
            alert("Server rejected the alert: " + (errBody.error || res.status));
        }
    } catch (err) {
        setServerStatus("DISCONNECTED");
        console.error("Failed to reach server:", err);
        alert("Could not reach the server. Check that your phone and laptop are on the same Wi-Fi network.");
    }
}

// ---------------------------------------------------------------------------
// Permission handling (iOS 13+ requires an explicit user gesture + request)
// ---------------------------------------------------------------------------
async function enableSensorsAndLocation() {
    // Motion permission (iOS Safari requires this explicit request model)
    if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
        try {
            const motionPermission = await DeviceMotionEvent.requestPermission();
            if (motionPermission === "granted") {
                window.addEventListener("devicemotion", handleMotionEvent);
                setSensorStatus("ACTIVE");
            } else {
                setSensorStatus("PERMISSION DENIED");
            }
        } catch (err) {
            console.error("Motion permission error:", err);
            setSensorStatus("UNAVAILABLE");
        }
    } else if (typeof DeviceMotionEvent !== "undefined") {
        // Most Android browsers: no explicit permission prompt needed.
        window.addEventListener("devicemotion", handleMotionEvent);
        setSensorStatus("ACTIVE");
    } else {
        setSensorStatus("UNAVAILABLE (DeviceMotion not supported)");
    }

    // Location permission
    startWatchingLocation();

    // Battery (no permission prompt on supporting browsers)
    initBatteryStatus();

    // Quick server reachability check
    checkServerConnection();
}

async function checkServerConnection() {
    try {
        const res = await fetch("/api/status");
        setServerStatus(res.ok ? "CONNECTED" : "ERROR");
    } catch (err) {
        setServerStatus("DISCONNECTED");
    }
}

// ---------------------------------------------------------------------------
// Wire up buttons
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    el("device-id-display").textContent = CONFIG.DEVICE_ID;
    el("threshold-display").textContent = `${CONFIG.IMPACT_THRESHOLD} m/s²`;

    el("btn-enable").addEventListener("click", enableSensorsAndLocation);

    el("btn-cancel-alert").addEventListener("click", cancelCountdown);

    el("btn-test-accident").addEventListener("click", () => {
        if (alertInFlight) return;
        // Simulate a plausible impact magnitude for the demo, and skip the
        // real sensor detection stages entirely, as required for safe testing.
        const simulatedMagnitude = CONFIG.IMPACT_THRESHOLD + 5;
        triggerPossibleAccident(simulatedMagnitude);
    });

    // Periodically re-check server connection even if sensors aren't enabled yet
    setInterval(checkServerConnection, 5000);
});
