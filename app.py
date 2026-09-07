"""
app.py
Flask backend for the IoT-Based Accident Detection and Emergency Location
Alert System (college prototype).

Routes
------
GET  /                    -> laptop emergency dashboard
GET  /mobile               -> phone page (sensors + test mode)
POST /api/accident          -> phone sends an accident event here
GET  /api/accidents          -> recent accident events (for history table)
GET  /api/latest-accident    -> most recent accident (for live alert polling)
GET  /api/status              -> basic system/device status

This is a CLASSROOM PROTOTYPE. It is not a certified safety or medical
system and should not be exposed to the open internet as-is.
"""

from datetime import datetime, timezone

from flask import Flask, jsonify, render_template, request
from flask_sqlalchemy import SQLAlchemy

from config import Config

app = Flask(__name__)
app.config.from_object(Config)

db = SQLAlchemy(app)


# ---------------------------------------------------------------------------
# Database model
# ---------------------------------------------------------------------------
class Accident(db.Model):
    __tablename__ = "accidents"

    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.String(80), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    accuracy = db.Column(db.Float, nullable=True)          # GPS accuracy in meters
    impact_magnitude = db.Column(db.Float, nullable=False)
    battery = db.Column(db.Float, nullable=True)
    timestamp = db.Column(db.String(64), nullable=False)    # timestamp reported by phone
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    status = db.Column(db.String(20), default="ALERT_SENT")  # PENDING / ALERT_SENT / CANCELLED

    def to_dict(self):
        return {
            "id": self.id,
            "device_id": self.device_id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "accuracy": self.accuracy,
            "impact_magnitude": self.impact_magnitude,
            "battery": self.battery,
            "timestamp": self.timestamp,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "status": self.status,
        }


with app.app_context():
    db.create_all()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def check_api_key():
    """Return True if the request carries the correct classroom API key.

    The key can come either as a header (X-API-Key) or inside the JSON
    body (api_key), whichever is easier for the student to wire up.
    """
    header_key = request.headers.get("X-API-Key")
    if header_key == app.config["API_KEY"]:
        return True

    data = request.get_json(silent=True) or {}
    if data.get("api_key") == app.config["API_KEY"]:
        return True

    return False


def validate_accident_payload(data):
    """Validate incoming accident JSON. Returns (is_valid, error_message)."""
    required_fields = ["device_id", "latitude", "longitude", "impact_magnitude"]
    for field in required_fields:
        if field not in data:
            return False, f"Missing required field: {field}"

    # device_id
    if not isinstance(data["device_id"], str) or not data["device_id"].strip():
        return False, "device_id must be a non-empty string"

    # latitude / longitude must be numbers within range
    try:
        lat = float(data["latitude"])
        lon = float(data["longitude"])
    except (TypeError, ValueError):
        return False, "latitude/longitude must be numbers"

    cfg = app.config
    if not (cfg["LAT_MIN"] <= lat <= cfg["LAT_MAX"]):
        return False, f"latitude must be between {cfg['LAT_MIN']} and {cfg['LAT_MAX']}"
    if not (cfg["LON_MIN"] <= lon <= cfg["LON_MAX"]):
        return False, f"longitude must be between {cfg['LON_MIN']} and {cfg['LON_MAX']}"

    # impact_magnitude must be a valid number
    try:
        float(data["impact_magnitude"])
    except (TypeError, ValueError):
        return False, "impact_magnitude must be a valid number"

    # battery is optional but if present must be in range
    if "battery" in data and data["battery"] is not None:
        try:
            batt = float(data["battery"])
        except (TypeError, ValueError):
            return False, "battery must be a number"
        if not (cfg["BATTERY_MIN"] <= batt <= cfg["BATTERY_MAX"]):
            return False, f"battery must be between {cfg['BATTERY_MIN']} and {cfg['BATTERY_MAX']}"

    # accuracy is optional, just must be a number if present
    if "accuracy" in data and data["accuracy"] is not None:
        try:
            float(data["accuracy"])
        except (TypeError, ValueError):
            return False, "accuracy must be a number"

    return True, None


# ---------------------------------------------------------------------------
# Page routes
# ---------------------------------------------------------------------------
@app.route("/")
def dashboard():
    return render_template("dashboard.html")


@app.route("/mobile")
def mobile():
    return render_template("mobile.html")


# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------
@app.route("/api/accident", methods=["POST"])
def api_accident():
    if not check_api_key():
        return jsonify({"error": "Invalid or missing API key"}), 401

    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    is_valid, error_message = validate_accident_payload(data)
    if not is_valid:
        return jsonify({"error": error_message}), 400

    timestamp = data.get("timestamp") or datetime.now(timezone.utc).isoformat()

    accident = Accident(
        device_id=data["device_id"].strip(),
        latitude=float(data["latitude"]),
        longitude=float(data["longitude"]),
        accuracy=float(data["accuracy"]) if data.get("accuracy") is not None else None,
        impact_magnitude=float(data["impact_magnitude"]),
        battery=float(data["battery"]) if data.get("battery") is not None else None,
        timestamp=timestamp,
        status="ALERT_SENT",
    )
    db.session.add(accident)
    db.session.commit()

    return jsonify({"message": "Accident event recorded", "accident": accident.to_dict()}), 201


@app.route("/api/accidents", methods=["GET"])
def api_accidents():
    limit = request.args.get("limit", default=50, type=int)
    limit = max(1, min(limit, 200))  # keep it sane

    accidents = (
        Accident.query.order_by(Accident.created_at.desc()).limit(limit).all()
    )
    return jsonify({"count": len(accidents), "accidents": [a.to_dict() for a in accidents]}), 200


@app.route("/api/latest-accident", methods=["GET"])
def api_latest_accident():
    accident = Accident.query.order_by(Accident.created_at.desc()).first()
    if accident is None:
        return jsonify({"accident": None}), 200
    return jsonify({"accident": accident.to_dict()}), 200


@app.route("/api/status", methods=["GET"])
def api_status():
    total = Accident.query.count()
    latest = Accident.query.order_by(Accident.created_at.desc()).first()
    return jsonify(
        {
            "system_status": "ACTIVE",
            "server_time": datetime.now(timezone.utc).isoformat(),
            "total_accidents_recorded": total,
            "latest_accident_id": latest.id if latest else None,
        }
    ), 200


# ---------------------------------------------------------------------------
# Error handlers (keeps API responses JSON instead of Flask's default HTML)
# ---------------------------------------------------------------------------
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    app.run(host=app.config["HOST"], port=app.config["PORT"], debug=app.config["DEBUG"])
