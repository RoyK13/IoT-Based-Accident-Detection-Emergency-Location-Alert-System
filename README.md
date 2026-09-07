# IoT-Based Accident Detection and Emergency Location Alert System Using Smartphone Sensors

An educational college prototype that turns a normal smartphone into an "IoT device" using
its browser sensors (accelerometer, GPS, battery), and uses a laptop running Flask as the
server and emergency monitoring dashboard. No Arduino, ESP32, Raspberry Pi, or external
hardware is required.

> **This is a student prototype, not a certified vehicle-safety or medical system.**
> It uses simple motion thresholds that can produce false positives and can miss real
> accidents. It never contacts emergency services automatically — it only shows an alert
> on the laptop dashboard.

---

## 1. Project Overview

The phone continuously watches its motion sensors in the browser. If it sees a sudden,
large spike in acceleration followed by a short period of continued unusual motion, it
assumes a **possible accident** and starts a 10-second on-screen countdown ("Are you
okay?"). If the user doesn't cancel in time, the phone grabs its current GPS location and
sends an accident report (location, time, impact magnitude, battery %, device ID) to a
Flask server running on a laptop. The laptop shows an emergency dashboard with a live map
(Leaflet + OpenStreetMap) and an accident history table.

## 2. Problem Statement

When a vehicle accident occurs, the people involved are often unable to call for help
themselves due to shock, injury, or being unconscious. Delayed notification of location
and time-critical details can worsen outcomes. Dedicated hardware black-box systems exist
but are expensive and impractical for individual use. This project explores whether a
smartphone alone — already carrying motion sensors, GPS, and internet connectivity — can
approximate this kind of alerting, entirely with free software.

## 3. Aim

To design and build a low-cost, software-only prototype that uses a smartphone's built-in
sensors to detect a possible accident, allow the user to cancel a false alarm, and
otherwise automatically relay the accident's location and details to a monitoring
dashboard in near real time.

## 4. Objectives

1. Use only a smartphone and a laptop — no external IoT hardware.
2. Continuously read accelerometer data in the browser and compute acceleration magnitude.
3. Implement a simple two-stage threshold-based detection algorithm to reduce obvious
   false triggers.
4. Give the user a clear cancellation window before any alert is sent.
5. Transmit accident data (location, time, impact, battery, device ID) over a REST API.
6. Store accident events in a database and expose them via API endpoints.
7. Display incoming accidents on a live, auto-refreshing map-based dashboard.

## 5. Features

- Browser-based motion detection (no app installation required).
- Two-stage spike + sustained-motion detection heuristic.
- 10-second cancellable countdown ("I'm OK - Cancel Alert").
- GPS location capture with accuracy reporting.
- Battery percentage and charging status (where supported).
- REST API with input validation (`POST /api/accident`).
- SQLite storage of all accident events.
- Live-updating laptop dashboard (polling, no WebSockets needed).
- Leaflet/OpenStreetMap accident map with popups.
- Accident history table.
- Safe **Simulate Accident** button for demos — no real crash needed.
- Simple classroom API key so random devices can't spam the endpoint.

## 6. Technologies Used

**Backend:** Python 3, Flask, Flask-SQLAlchemy, SQLite
**Frontend:** HTML, CSS, vanilla JavaScript
**Phone sensors (via browser):** DeviceMotion API, Geolocation API, Battery Status API
**Map:** Leaflet.js + OpenStreetMap (free, no API key required)

No React, Node.js, Firebase, AWS, paid APIs, or external hardware are used.

## 7. Architecture

```
Smartphone (browser)
   │
   ▼
Accelerometer / motion sensors (DeviceMotion API)
   │
   ▼
JavaScript accident detection algorithm (spike + sustained-motion check)
   │
   ▼
Possible accident detected
   │
   ▼
10-second on-screen cancellation countdown
   │  (if not cancelled)
   ▼
GPS location fetched (Geolocation API)
   │
   ▼
HTTP REST API call → POST /api/accident (JSON, over Wi-Fi/local network)
   │
   ▼
Python Flask server (validates data)
   │
   ▼
SQLite database (accidents table)
   │
   ▼
Emergency dashboard (polls API every few seconds)
   │
   ▼
Leaflet + OpenStreetMap shows the accident location
```

## 8. How Accident Detection Works

1. The phone reads `devicemotion` events roughly continuously.
2. Acceleration magnitude is computed as `sqrt(x² + y² + z²)`.
3. **Stage 1 (spike):** if any single reading's magnitude ≥ `IMPACT_THRESHOLD`
   (default `25 m/s²`), that moment is flagged as a possible spike.
4. **Stage 2 (sustained check):** for a short window (default 800 ms) after the spike,
   the script keeps checking whether motion is still elevated (≥ half the threshold).
   If enough such readings occur, the spike is treated as a real "possible accident"
   rather than a one-off jolt (e.g., dropping the phone on a table).
5. If Stage 2 confirms, a 10-second countdown appears with an **"I'm OK - Cancel Alert"**
   button.
6. If the user doesn't cancel, the current GPS location is fetched and the event is
   POSTed to the Flask server.

**This is a simple educational heuristic, not a scientifically validated accident
detection algorithm.** The threshold value is arbitrary and easy to change in
`static/js/mobile.js` (`CONFIG.IMPACT_THRESHOLD`).

## 9. Folder Structure

```
accident-detection-iot/
│
├── app.py
├── config.py
├── requirements.txt
├── README.md
├── database.db                 (created automatically on first run)
│
├── templates/
│   ├── dashboard.html
│   └── mobile.html
│
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── dashboard.js
│       └── mobile.js
│
└── tests/
    └── test_app.py
```

## 10. Installation (Windows)

```
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

(macOS/Linux: use `source venv/bin/activate` instead of `venv\Scripts\activate`.)

## 11. Running the Flask Server

```
python app.py
```

You should see Flask start on `http://0.0.0.0:5000/`. Leave this terminal window open —
it's your server.

Open the dashboard on the **laptop**:

```
http://localhost:5000
```

## 12. Finding Your Laptop's IP Address (to connect the phone)

On Windows, open Command Prompt and run:

```
ipconfig
```

Look for **IPv4 Address** under your active Wi-Fi adapter, e.g. `192.168.1.10`.

(macOS: System Settings → Wi-Fi → Details. Linux: `hostname -I` or `ip addr`.)

## 13. Connecting the Phone

Make sure the **phone and laptop are on the same Wi-Fi network**, then on the phone's
browser go to:

```
http://<LAPTOP-IP>:5000/mobile
```

Example: `http://192.168.1.10:5000/mobile`

Tap **"ENABLE SENSORS & LOCATION"** and accept both permission prompts.

### Important note on HTTPS / secure contexts

Some browsers (notably iOS Safari for the Motion permission prompt, and some Android
Chrome versions for Geolocation) restrict sensor APIs to "secure contexts" — normally
`https://` or `localhost`. Plain `http://<LAN-IP>` sometimes still works for local testing
on the same network (many browsers allow local/private IPs), but if you find the phone
browser silently refuses to ask for permission:

- **Simplest fix for a classroom demo:** try Chrome/Firefox on Android first — these
  are generally more permissive with `http://` on a local network.
- **If you need HTTPS locally:** install a tool like `mkcert` to generate a locally
  trusted certificate, then run Flask with `ssl_context=('cert.pem', 'key.pem')` in
  `app.run()`. This adds a few extra setup steps but guarantees sensor access. Full
  `mkcert` instructions are at its GitHub page; a quick summary:
  1. Install mkcert (`choco install mkcert` on Windows, or download the binary).
  2. Run `mkcert -install` once.
  3. Run `mkcert <your-laptop-IP> localhost` to generate `cert.pem`/`key.pem`.
  4. Update the last line of `app.py` to pass `ssl_context=("cert.pem", "key.pem")`.
  5. Visit `https://<LAPTOP-IP>:5000/mobile` on the phone (accept the certificate warning
     once, since it's a local/self-signed cert).

For most classroom Wi-Fi setups, plain HTTP is enough to get through a demo — try that
first.

## 14. Testing Sensor Detection

1. Open `/mobile` on the phone and enable sensors.
2. Watch the "Last Sensor Reading" values update as you move the phone.
3. Shake the phone firmly — if the magnitude crosses the threshold (default 25) and stays
   elevated briefly, the countdown should appear.
4. This is sensitive to phone model and browser, which is expected and one of the
   documented limitations below.

## 15. Using Test/Simulate Accident Mode

For a reliable demo, use the big red **"🚨 Simulate Accident"** button on the mobile
page. It skips real sensor detection, starts the same 10-second countdown, and — if not
cancelled — sends your **real current GPS location** to the server. This is the
recommended way to demonstrate the project in a presentation.

## 16. Viewing the Dashboard

On the laptop, open `http://localhost:5000`. It shows:

- System status
- A live alert banner when a new accident arrives
- A Leaflet map centered on the latest accident
- Full accident details
- A history table of all past accidents

The dashboard polls the server every 3 seconds — no manual refresh needed.

## 17. Troubleshooting

| Problem | Fix |
|---|---|
| Phone cannot connect to laptop | Confirm both devices are on the **same Wi-Fi network** (not phone mobile data). |
| Flask server cannot be reached | Make sure `python app.py` is still running and listening on `0.0.0.0:5000`. |
| Windows Firewall blocks connection | When prompted, allow Python/Flask through the firewall for Private networks. You can also manually add an inbound rule for port 5000. |
| Phone and laptop are on different networks | Move both onto the same router/Wi-Fi, or use a mobile hotspot from the laptop and connect the phone to it. |
| Location permission denied | Re-enable location for the browser in phone Settings → Apps → [Browser] → Permissions, then reload `/mobile`. |
| Motion sensor permission denied | On iOS, reload the page and tap "Enable Sensors" again — the permission prompt only appears on a real user tap. |
| DeviceMotion API unavailable | Some desktop browsers/emulators don't support it; test on an actual phone. |
| Battery API unavailable | Expected on iOS Safari (not supported); the page will show "Battery information unavailable" and everything else still works. |
| GPS unavailable indoors | GPS accuracy is poor indoors; move near a window or test outdoors for a real fix. |
| Map doesn't load | Check the laptop has internet access (OpenStreetMap tiles are fetched online). |
| Accident detection triggers too frequently | Raise `CONFIG.IMPACT_THRESHOLD` in `static/js/mobile.js`. |
| Accident detection doesn't trigger | Lower the threshold, or just use the "Simulate Accident" button for demos. |
| Browser blocks sensor access entirely | Try a different browser (Chrome/Firefox on Android tend to be most permissive) or set up HTTPS as described above. |
| HTTPS/security restrictions | See the mkcert steps in Section 13. |

## 18. Limitations

- This is an **educational prototype**, not a certified real-world emergency or medical
  system.
- Smartphone motion sensors are **not guaranteed to detect every accident**.
- Threshold-based detection **can generate false positives** (e.g., dropping the phone,
  slamming a car door).
- It **can miss real accidents** if the impact doesn't cross the threshold or the phone
  isn't oriented/held in a way that registers the motion.
- Location accuracy depends entirely on GPS/network conditions and can be off by tens of
  meters, especially indoors.
- The alert depends on the phone having **battery power and network connectivity** —
  if either fails, no alert can be sent.
- Browser permission dialogs and mobile OS restrictions (especially on iOS) can prevent
  sensors from working as expected.
- The system **never contacts emergency services automatically** — it only alerts the
  laptop dashboard, by design.

## 19. Future Scope

- Machine learning-based accident classification instead of a fixed threshold.
- SMS/call integration (e.g., via Twilio) for real notification to emergency contacts.
- Cloud deployment so the dashboard is reachable beyond the local network.
- Support for multiple emergency contacts per user.
- Integration with wearables (smartwatch heart-rate/fall detection) for corroboration.
- Direct vehicle sensor integration (OBD-II) for more accurate impact data.
- Better sensor fusion (gyroscope + accelerometer + orientation) to reduce false positives.

## 20. Conclusion

This project demonstrates that a smartphone's existing sensors, combined with simple
browser APIs and a lightweight Flask backend, can approximate the core idea behind
IoT-based accident alerting — detection, confirmation, and location relay — entirely
without dedicated hardware. While the threshold-based detection is intentionally simple
and not suitable for real-world deployment, it serves as a clear, explainable foundation
for understanding how such systems could be extended with better sensors, machine
learning, and real emergency-service integration in the future.

---

## Running the Tests

```
pip install pytest
pytest tests/test_app.py -v
```
