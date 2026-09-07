# IoT-Based-Accident-Detection-Emergency-Location-Alert-System
A smartphone-based IoT prototype that detects a possible accident using motion sensors and sends the user's GPS location to an emergency monitoring dashboard.
📌 Overview

The IoT-Based Accident Detection & Emergency Location Alert System is a low-cost IoT project that uses the built-in sensors of a smartphone to detect a possible accident and communicate the event to a monitoring system.

The smartphone acts as the IoT device, while the laptop runs the Flask server, database, and emergency dashboard.

When abnormal motion is detected, the system:

Detects a possible accident.

Starts a 10-second cancellation countdown.

Allows the user to cancel the alert.

Obtains the smartphone's GPS location.

Sends the accident information to the Flask server.

Stores the event in an SQLite database.

Displays an emergency alert and accident location on the laptop dashboard.

This project is designed as an educational prototype demonstrating smartphone sensors, GPS, networking, REST APIs, databases, and web-based IoT monitoring.

🎯 Problem Statement

During a road accident, a victim may be unable to manually communicate their situation or provide their exact location.

This project explores how existing smartphone hardware can be used to detect a possible accident and communicate the user's location to a monitoring system, potentially reducing the time required to identify the incident location.

💡 Proposed Solution

The smartphone monitors motion using its built-in accelerometer.

When unusually high acceleration is detected, the system considers it a possible accident and starts a 10-second countdown.

If the user cancels:

Possible Accident
       ↓
User confirms they are OK
       ↓
Alert Cancelled

If the user does not respond:

Possible Accident
       ↓
10-Second Countdown
       ↓
No Response
       ↓
Get GPS Location
       ↓
Send Accident Data
       ↓
Flask Server
       ↓
SQLite Database
       ↓
Emergency Dashboard

🏗️ System Architecture

                    📱 SMARTPHONE
                 ┌─────────────────┐
                 │ Accelerometer   │
                 │ GPS             │
                 │ Battery*        │
                 │ Internet        │
                 └────────┬────────┘
                          │
                       HTTP/HTTPS
                          │
                          ▼
                 ┌─────────────────┐
                 │   FLASK SERVER  │
                 │   REST API      │
                 │   Data Handling │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ SQLite Database │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │    DASHBOARD    │
                 │ 🚨 Alert        │
                 │ 📍 GPS Location │
                 │ 🗺️ Map          │
                 │ 📊 History      │
                 └─────────────────┘

*Battery information depends on browser support and is not required for accident detection.

✨ Features

📱 Smartphone

Accelerometer-based accident detection

GPS location detection

Motion sensor monitoring

10-second emergency cancellation countdown

Device status display

Manual accident simulation for safe demonstrations

Battery information where supported

🚨 Accident Detection

Configurable acceleration threshold

Possible-accident detection

User cancellation period

Automatic GPS retrieval after no response

Accident event transmission to the server

💻 Emergency Dashboard

Real-time accident alerts

Interactive map

Accident location marker

Latitude and longitude

Impact magnitude

Timestamp

Battery level where available

Accident history

Automatic dashboard updates

🗄️ Database

Accident events can contain:

Device ID

Latitude

Longitude

GPS accuracy

Impact magnitude

Battery level

Timestamp

Alert status

🛠️ Technology Stack

Category

Technology

Programming Language

Python

Backend

Flask

Database

SQLite

Frontend

HTML, CSS, JavaScript

Motion Detection

DeviceMotion API

Location

Geolocation API

Map

Leaflet.js

Map Data

OpenStreetMap

Communication

REST API / HTTP

Development

Localhost / Local Network

📂 Project Structure

accident-detection-iot/
│
├── app.py
├── config.py
├── requirements.txt
├── README.md
│
├── templates/
│   ├── dashboard.html
│   └── mobile.html
│
├── static/
│   ├── css/
│   │   └── style.css
│   │
│   └── js/
│       ├── dashboard.js
│       └── mobile.js
│
├── instance/
│   └── database.db
│
└── tests/
    └── test_app.py

The exact structure may vary depending on the implementation.

⚙️ How It Works

1. Motion Monitoring

The smartphone uses its accelerometer to measure movement along three axes:

X-axis

Y-axis

Z-axis

The acceleration magnitude is calculated approximately as:

Magnitude = √(X² + Y² + Z²)

If the magnitude exceeds a configurable threshold, the system considers the event a possible accident.

The threshold-based approach is intended for demonstration and is not a scientifically validated accident-detection method.

2. Accident Confirmation

A sensor spike does not immediately send an emergency alert.

The phone displays a warning and starts a countdown:

⚠️ POSSIBLE ACCIDENT DETECTED

Are you okay?

Emergency alert will be sent in:

10
9
8
7
...

The user can select:

I'M OK - CANCEL ALERT

3. GPS Location

If the user does not cancel the alert, the application obtains the smartphone's location using the browser Geolocation API.

The system can collect:

Latitude

Longitude

GPS accuracy

Timestamp

4. Data Transmission

The smartphone sends the accident information to the Flask server using a REST API.

Example:

{
    "device_id": "my-phone",
    "latitude": 12.345678,
    "longitude": 77.123456,
    "impact_magnitude": 28.5,
    "battery": 72,
    "timestamp": "2026-09-07T13:42:00"
}

5. Data Storage

The Flask server validates the data and stores the accident event in an SQLite database.

6. Emergency Dashboard

The laptop dashboard checks for new accident events and displays an alert.

Example:

🚨 ACCIDENT ALERT

Device: my-phone
Time: 1:42 PM
Impact: 28.5 m/s²
Battery: 72%

Location:
12.345678, 77.123456

The accident location is displayed on an interactive map.

🚀 Installation

Prerequisites

You need:

Python 3.x

Laptop

Smartphone

Wi-Fi

Modern web browser

Check Python:

python --version

On Windows, if that does not work:

py --version

📥 Clone the Repository

git clone https://github.com/YOUR-USERNAME/accident-detection-iot.git
cd accident-detection-iot

🐍 Create a Virtual Environment

Windows

python -m venv venv

Activate it:

.\venv\Scripts\Activate.ps1

If you are using Command Prompt:

venv\Scripts\activate

macOS / Linux

python3 -m venv venv
source venv/bin/activate

📦 Install Dependencies

python -m pip install -r requirements.txt

▶️ Run the Application

Start the Flask server:

python app.py

The dashboard should be available at:

http://localhost:5000

Open this address on the laptop.

📱 Connect the Smartphone

For local-network testing:

Connect the laptop and smartphone to the same Wi-Fi network.

Find the laptop's local IP address.

Windows

Run:

ipconfig

Find the IPv4 Address.

Example:

Make sure Flask listens on all network interfaces:

app.run(host="0.0.0.0", port=5000)

Then open on the smartphone:

http://<laptop ip address>:5000/mobile

Replace the IP address with the actual laptop IP address.

🔐 HTTPS and Browser Permissions

Modern mobile browsers can restrict access to GPS and motion sensors when a website is not running in a secure context.

For development/testing, an HTTPS tunnel such as Cloudflare Quick Tunnel can be used:

cloudflared tunnel --url http://localhost:5000

This provides a temporary HTTPS address such as:

https://example.trycloudflare.com

Open:

https://example.trycloudflare.com/mobile

on the smartphone.

Quick Tunnels are intended for development and testing, not production deployment.

🧪 Safe Demonstration

The recommended way to demonstrate the project is the:

🚨 Simulate Accident

button.

This avoids intentionally dropping or shaking the phone.

Demonstration Flow

Open Mobile Page
       ↓
Enable Sensors & Location
       ↓
Allow GPS Permission
       ↓
Press "Simulate Accident"
       ↓
10-Second Countdown
       ↓
Do Not Cancel
       ↓
GPS Location Obtained
       ↓
Accident Data Sent
       ↓
Laptop Dashboard Updated
       ↓
🚨 Accident Alert
       ↓
📍 Location Displayed on Map

🧪 Testing

Test

Expected Result

Open mobile page

Mobile interface loads

Enable sensors

Sensor permission is requested

Enable location

GPS permission is requested

GPS enabled

Coordinates are displayed

Simulate accident

Countdown starts

Cancel alert

No emergency event is sent

Don't cancel

Accident event is sent

Dashboard open

Alert appears

Accident received

Location appears on map

Database checked

Event is stored

Invalid GPS data

Request is rejected

🔒 Privacy & Security

This project is designed as an educational prototype.

It does not intentionally collect unnecessary personal information such as:

Contacts

Messages

Photos

Passwords

Personal files

Location information is collected only as required for the accident-monitoring functionality and with browser permission.

The Flask server should not be exposed directly to the public internet without appropriate authentication and security controls.

⚠️ Limitations

1. False Positives

Sudden movements such as dropping or hitting the phone may be incorrectly interpreted as an accident.

2. False Negatives

A real accident may not always produce a motion pattern that crosses the configured threshold.

3. GPS Accuracy

GPS accuracy depends on the smartphone, environment, network, and satellite visibility.

4. Internet Dependency

The phone needs network connectivity to transmit the accident event to the server.

5. Smartphone Permissions

Browser and operating-system permissions can restrict access to motion sensors and GPS.

6. Battery Information

Battery information may not be available in some browsers, particularly on iOS.

7. Prototype Only

This is a college-level proof of concept and is not a certified vehicle safety, medical, or emergency-response system.

The application does not automatically contact emergency services.

🔮 Future Scope

The system can be extended with:

🤖 Machine Learning

Use a trained ML model to distinguish actual accidents from normal movement.

📲 SMS and Phone Calls

Notify predefined emergency contacts.

☁️ Cloud Deployment

Move the server and database to a cloud platform.

👨‍👩‍👦 Multiple Emergency Contacts

Send alerts to multiple registered contacts.

⌚ Wearable Integration

Integrate smartwatches and other wearable devices.

🚗 Vehicle Integration

Combine smartphone data with vehicle sensors such as speed, braking, and collision information.

🧠 Sensor Fusion

Combine accelerometer, gyroscope, GPS, speed, and orientation data to improve accident classification.

🎓 IoT Concepts Demonstrated

IoT Concept

Implementation

IoT Device

Smartphone

Sensors

Accelerometer / Motion Sensors

Data Acquisition

DeviceMotion API

Location

GPS / Geolocation API

Communication

HTTP / REST API

Processing

Flask + JavaScript

Storage

SQLite

Visualization

Web Dashboard

Monitoring

Accident Monitoring Dashboard

📚 Learning Outcomes

This project demonstrates:

Internet of Things architecture

Smartphone sensor APIs

Accelerometer data

GPS and geolocation

REST APIs

Client-server communication

Flask web development

SQLite databases

Real-time dashboard updates

Interactive maps

IoT data processing

Event-based detection

🔄 Complete Workflow

                    START
                      │
                      ▼
            Enable Sensors & GPS
                      │
                      ▼
              Monitor Motion Data
                      │
                      ▼
             Calculate Acceleration
                      │
                      ▼
          ┌──── Accident Threshold? ────┐
          │                             │
         NO                            YES
          │                             │
          ▼                             ▼
 Continue Monitoring          Possible Accident
                                        │
                                        ▼
                               10 Second Countdown
                                        │
                               ┌────────┴────────┐
                               │                 │
                            Cancel            No Response
                               │                 │
                               ▼                 ▼
                         Stop Alert          Get GPS
                                                 │
                                                 ▼
                                         Send Accident Data
                                                 │
                                                 ▼
                                           Flask Server
                                                 │
                                                 ▼
                                           SQLite Database
                                                 │
                                                 ▼
                                         Emergency Dashboard
                                                 │
                                                 ▼
                                          📍 Show Location

📝 Conclusion

The IoT-Based Accident Detection & Emergency Location Alert System demonstrates how a smartphone can function as an IoT device by combining its motion sensors, GPS, internet connectivity, and browser APIs.

The system detects unusual motion, provides a cancellation period to reduce false alerts, retrieves the device's location, and communicates the accident information to a Flask-based monitoring dashboard.

Although the current implementation is a prototype with several limitations, it demonstrates the fundamental IoT pipeline:

Sense → Process → Communicate → Store → Visualize

The project can be further enhanced using machine learning, cloud services, emergency communication systems, wearable devices, and vehicle sensors.

⚠️ Disclaimer

This project is developed for educational and demonstration purposes only.

It is not intended to replace certified vehicle safety systems, emergency response systems, medical devices, or professional accident-detection solutions.

The motion-based detection algorithm may produce false positives or fail to detect some real accidents.

The system does not automatically contact emergency services.

👤 Author

Kaustav Roy

Computer Science Engineering Student

Project

IoT-Based Accident Detection & Emergency Location Alert System

⭐ Support

If you find this project useful for learning about IoT, smartphone sensors, Flask, or GPS-based applications, consider giving the repository a ⭐.
