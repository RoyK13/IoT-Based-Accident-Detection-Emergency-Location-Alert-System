"""
config.py
Central configuration for the Accident Detection IoT prototype.

Everything a student is likely to want to tweak (API key, DB location,
validation ranges) lives here so app.py stays readable.
"""

import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    # --- Database ---
    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(BASE_DIR, "database.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # --- Simple classroom API key ---
    # This is NOT real security. It only stops a random device on the same
    # Wi-Fi from accidentally posting garbage to /api/accident during a
    # demo. Change this string if you want a different "password".
    API_KEY = "college-demo-key-123"

    # --- Validation ranges ---
    LAT_MIN, LAT_MAX = -90.0, 90.0
    LON_MIN, LON_MAX = -180.0, 180.0
    BATTERY_MIN, BATTERY_MAX = 0, 100

    # --- Server ---
    HOST = "0.0.0.0"   # listen on all network interfaces so the phone can reach it
    PORT = 5000
    DEBUG = True

    # --- Misc ---
    DEFAULT_DEVICE_ID = "my-phone"
