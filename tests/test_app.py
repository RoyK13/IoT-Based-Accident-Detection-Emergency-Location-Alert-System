"""
tests/test_app.py
Basic tests for the Accident Detection Flask API.

Run with:
    pytest tests/test_app.py -v

These tests use an in-memory SQLite database so they don't touch your
real database.db file.
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import app, db  # noqa: E402

API_KEY = "college-demo-key-123"


@pytest.fixture
def client():
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"

    with app.test_client() as client:
        with app.app_context():
            db.create_all()
        yield client
        with app.app_context():
            db.drop_all()


def valid_payload(**overrides):
    payload = {
        "device_id": "my-phone",
        "latitude": 12.345,
        "longitude": 77.123,
        "impact_magnitude": 28.5,
        "battery": 72,
        "timestamp": "2026-09-07T13:00:00",
        "api_key": API_KEY,
    }
    payload.update(overrides)
    return payload


def test_dashboard_page_loads(client):
    res = client.get("/")
    assert res.status_code == 200


def test_mobile_page_loads(client):
    res = client.get("/mobile")
    assert res.status_code == 200


def test_status_endpoint(client):
    res = client.get("/api/status")
    assert res.status_code == 200
    data = res.get_json()
    assert data["system_status"] == "ACTIVE"


def test_post_valid_accident(client):
    res = client.post("/api/accident", json=valid_payload())
    assert res.status_code == 201
    data = res.get_json()
    assert data["accident"]["device_id"] == "my-phone"
    assert data["accident"]["status"] == "ALERT_SENT"


def test_post_without_api_key_rejected(client):
    payload = valid_payload()
    del payload["api_key"]
    res = client.post("/api/accident", json=payload)
    assert res.status_code == 401


def test_post_invalid_latitude_rejected(client):
    res = client.post("/api/accident", json=valid_payload(latitude=999))
    assert res.status_code == 400


def test_post_invalid_longitude_rejected(client):
    res = client.post("/api/accident", json=valid_payload(longitude=-999))
    assert res.status_code == 400


def test_post_invalid_battery_rejected(client):
    res = client.post("/api/accident", json=valid_payload(battery=150))
    assert res.status_code == 400


def test_post_missing_field_rejected(client):
    payload = valid_payload()
    del payload["impact_magnitude"]
    res = client.post("/api/accident", json=payload)
    assert res.status_code == 400


def test_latest_accident_after_post(client):
    client.post("/api/accident", json=valid_payload())
    res = client.get("/api/latest-accident")
    assert res.status_code == 200
    data = res.get_json()
    assert data["accident"] is not None
    assert data["accident"]["device_id"] == "my-phone"


def test_accidents_list(client):
    client.post("/api/accident", json=valid_payload())
    client.post("/api/accident", json=valid_payload(impact_magnitude=40.0))
    res = client.get("/api/accidents")
    assert res.status_code == 200
    data = res.get_json()
    assert data["count"] == 2
    assert len(data["accidents"]) == 2
