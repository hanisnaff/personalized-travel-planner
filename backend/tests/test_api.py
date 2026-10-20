from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def sample_request():
    return {"destination": "Jaipur", "departure_date": "2026-11-10", "duration": 2,
            "budget": 12000, "currency": "INR", "travelers": 1,
            "interests": ["Food", "Culture"], "travel_style": "Balanced", "accommodation": "Hotel"}


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_generate_demo_itinerary(monkeypatch, tmp_path):
    from app import config
    monkeypatch.setattr(config, "AI_API_KEY", "")
    response = client.post("/api/itineraries/generate", json=sample_request())
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "demo"
    assert len(data["days"]) == 2
    assert all(day["activities"] for day in data["days"])


def test_save_list_delete_trip(monkeypatch, tmp_path):
    from app import config, database
    monkeypatch.setattr(config, "SUPABASE_URL", "")
    monkeypatch.setattr(config, "SUPABASE_SERVICE_ROLE_KEY", "")
    monkeypatch.setattr(config, "DATABASE_PATH", str(tmp_path / "test.sqlite3"))
    database.init_db()
    trip = sample_request()
    itinerary = client.post("/api/itineraries/generate", json=trip).json()
    saved = client.post("/api/trips", json={"request": trip, "itinerary": itinerary})
    assert saved.status_code == 201
    trip_id = saved.json()["id"]
    listed = client.get("/api/trips")
    assert listed.status_code == 200
    assert any(item["id"] == trip_id for item in listed.json())
    itinerary["title"] = "Updated Jaipur plan"
    updated = client.put(f"/api/trips/{trip_id}", json={"request": trip, "itinerary": itinerary})
    assert updated.status_code == 200
    assert updated.json()["itinerary"]["title"] == "Updated Jaipur plan"
    deleted = client.delete(f"/api/trips/{trip_id}")
    assert deleted.status_code == 204
