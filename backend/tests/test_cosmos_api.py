"""Cosmos API regression tests - covers auth, events, reminders, sightings, sky-spots."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://celestial-journal.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

UNIQUE = uuid.uuid4().hex[:8]
TEST_EMAIL = f"TEST_cosmos_{UNIQUE}@example.com"
TEST_PASSWORD = "Stargazer!2026"
TEST_NAME = "TEST Stargazer"

state = {}


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


def auth_headers():
    return {"Authorization": f"Bearer {state['token']}"}


# ===== AUTH =====
def test_root(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    assert "Cosmos" in r.json().get("message", "")


def test_register(s):
    r = s.post(f"{API}/auth/register", json={"email": TEST_EMAIL, "password": TEST_PASSWORD, "name": TEST_NAME})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and "user" in data
    assert data["user"]["email"] == TEST_EMAIL.lower()
    assert data["user"]["stats"]["sightings"] == 0
    state["token"] = data["token"]
    state["user_id"] = data["user"]["user_id"]


def test_register_duplicate(s):
    r = s.post(f"{API}/auth/register", json={"email": TEST_EMAIL, "password": TEST_PASSWORD, "name": TEST_NAME})
    assert r.status_code == 400


def test_login_success(s):
    r = s.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    assert r.status_code == 200
    assert "token" in r.json()


def test_login_invalid(s):
    r = s.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_me(s):
    r = s.get(f"{API}/auth/me", headers=auth_headers())
    assert r.status_code == 200
    assert r.json()["user_id"] == state["user_id"]


def test_me_no_token(s):
    r = s.get(f"{API}/auth/me")
    assert r.status_code == 401


# ===== EVENTS =====
def test_list_events(s):
    r = s.get(f"{API}/events")
    assert r.status_code == 200
    events = r.json()
    assert len(events) == 10, f"Expected 10 seeded events, got {len(events)}"
    state["event_id"] = events[0]["event_id"]
    # validate fields
    e = events[0]
    for k in ["event_id", "title", "date", "category", "description_beginner", "description_advanced", "visibility", "image_key"]:
        assert k in e


def test_get_event(s):
    r = s.get(f"{API}/events/{state['event_id']}")
    assert r.status_code == 200
    assert r.json()["event_id"] == state["event_id"]


def test_get_event_404(s):
    r = s.get(f"{API}/events/nonexistent_xyz")
    assert r.status_code == 404


def test_events_upcoming(s):
    r = s.get(f"{API}/events", params={"upcoming_only": "true"})
    assert r.status_code == 200
    # Today is Jan 2026, so most events should still be upcoming
    assert isinstance(r.json(), list)


# ===== REMINDERS =====
def test_create_reminder(s):
    r = s.post(f"{API}/reminders", json={"event_id": state["event_id"], "note": "TEST"}, headers=auth_headers())
    assert r.status_code == 200, r.text
    state["reminder_id"] = r.json()["reminder_id"]


def test_list_reminders(s):
    r = s.get(f"{API}/reminders", headers=auth_headers())
    assert r.status_code == 200
    rems = r.json()
    assert any(rm["reminder_id"] == state["reminder_id"] for rm in rems)


def test_duplicate_reminder(s):
    r = s.post(f"{API}/reminders", json={"event_id": state["event_id"]}, headers=auth_headers())
    assert r.status_code == 400


def test_delete_reminder(s):
    r = s.delete(f"{API}/reminders/{state['reminder_id']}", headers=auth_headers())
    assert r.status_code == 200
    # verify removed
    r2 = s.get(f"{API}/reminders", headers=auth_headers())
    assert not any(rm["reminder_id"] == state["reminder_id"] for rm in r2.json())


def test_reminders_requires_auth(s):
    r = s.get(f"{API}/reminders")
    assert r.status_code == 401


# ===== SIGHTINGS =====
def test_create_sighting_nebula(s):
    payload = {"title": "TEST Orion Nebula", "object_type": "nebula", "location_name": "Backyard",
               "sky_conditions": "clear", "equipment": "8\" Dobsonian", "notes": "Beautiful!"}
    r = s.post(f"{API}/sightings", json=payload, headers=auth_headers())
    assert r.status_code == 200, r.text
    data = r.json()
    state["sighting_id"] = data["sighting_id"]
    assert data["user_name"] == TEST_NAME
    assert data["likes"] == 0


def test_user_stats_incremented(s):
    r = s.get(f"{API}/auth/me", headers=auth_headers())
    assert r.status_code == 200
    stats = r.json()["stats"]
    assert stats["sightings"] == 1
    assert stats["nebulae"] == 1


def test_create_sighting_planet(s):
    payload = {"title": "TEST Saturn", "object_type": "planet", "location_name": "Hill", "sky_conditions": "clear",
               "equipment": "binoculars", "notes": "Rings!"}
    r = s.post(f"{API}/sightings", json=payload, headers=auth_headers())
    assert r.status_code == 200
    r2 = s.get(f"{API}/auth/me", headers=auth_headers())
    stats = r2.json()["stats"]
    assert stats["sightings"] == 2
    assert stats["planets"] == 1


def test_list_sightings(s):
    r = s.get(f"{API}/sightings")
    assert r.status_code == 200
    items = r.json()
    assert any(i["sighting_id"] == state["sighting_id"] for i in items)


def test_my_sightings(s):
    r = s.get(f"{API}/sightings/me", headers=auth_headers())
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 2
    assert all(i["user_id"] == state["user_id"] for i in items)


def test_like_sighting(s):
    r = s.post(f"{API}/sightings/{state['sighting_id']}/like", headers=auth_headers())
    assert r.status_code == 200
    # GET to verify
    items = s.get(f"{API}/sightings").json()
    sg = next(i for i in items if i["sighting_id"] == state["sighting_id"])
    assert sg["likes"] == 1


def test_like_nonexistent(s):
    r = s.post(f"{API}/sightings/nope_xyz/like", headers=auth_headers())
    assert r.status_code == 404


def test_create_sighting_requires_auth(s):
    r = s.post(f"{API}/sightings", json={"title": "x", "object_type": "nebula", "location_name": "x",
               "sky_conditions": "clear", "equipment": "x", "notes": "x"})
    assert r.status_code == 401


# ===== SKY SPOTS =====
def test_list_sky_spots(s):
    r = s.get(f"{API}/sky-spots")
    assert r.status_code == 200
    spots = r.json()
    assert len(spots) == 8
    sp = spots[0]
    for k in ["spot_id", "name", "latitude", "longitude", "bortle_scale", "description", "region"]:
        assert k in sp
    assert isinstance(sp["latitude"], (int, float))
    assert 1 <= sp["bortle_scale"] <= 9
