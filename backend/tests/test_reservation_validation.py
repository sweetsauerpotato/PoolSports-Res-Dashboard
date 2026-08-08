"""Reservation input validation tests — art aliases, boundary checks, error codes."""
import pytest

VALID = {
    "datum": "2026-05-01",
    "startzeit": "14:00",
    "endzeit": "16:00",
    "kunde": "Test Kunde",
    "art": "Pool",
    "personen": "2",
    "standort": "EG",
}


async def test_create_missing_kunde_422(client, staff_headers):
    payload = {**VALID}
    del payload["kunde"]
    resp = await client.post("/api/reservations", json=payload, headers=staff_headers)
    assert resp.status_code == 422


async def test_create_empty_kunde_422(client, staff_headers):
    resp = await client.post("/api/reservations", json={**VALID, "kunde": " "}, headers=staff_headers)
    assert resp.status_code == 422


async def test_create_short_kunde_422(client, staff_headers):
    resp = await client.post("/api/reservations", json={**VALID, "kunde": "A"}, headers=staff_headers)
    assert resp.status_code == 422


async def test_create_invalid_art_422(client, staff_headers):
    resp = await client.post("/api/reservations", json={**VALID, "art": "Basketball"}, headers=staff_headers)
    assert resp.status_code == 422


async def test_create_english_field_gameType_422(client, staff_headers):
    """P1-11: English field name in POST body must be rejected."""
    payload = {**VALID}
    del payload["art"]
    payload["gameType"] = "Pool"
    resp = await client.post("/api/reservations", json=payload, headers=staff_headers)
    assert resp.status_code == 422


async def test_create_end_before_start_422(client, staff_headers):
    resp = await client.post(
        "/api/reservations",
        json={**VALID, "startzeit": "16:00", "endzeit": "14:00"},
        headers=staff_headers,
    )
    assert resp.status_code == 422


async def test_create_personen_zero_422(client, staff_headers):
    resp = await client.post("/api/reservations", json={**VALID, "personen": "0"}, headers=staff_headers)
    assert resp.status_code == 422


async def test_create_personen_31_422(client, staff_headers):
    resp = await client.post("/api/reservations", json={**VALID, "personen": "31"}, headers=staff_headers)
    assert resp.status_code == 422


async def test_create_tischanzahl_zero_422(client, staff_headers):
    resp = await client.post("/api/reservations", json={**VALID, "tischanzahl": 0}, headers=staff_headers)
    assert resp.status_code == 422


async def test_create_tischanzahl_six_422(client, staff_headers):
    resp = await client.post("/api/reservations", json={**VALID, "tischanzahl": 6}, headers=staff_headers)
    assert resp.status_code == 422


async def test_create_art_alias_billard_normalizes_pool(client, staff_headers):
    resp = await client.post("/api/reservations", json={**VALID, "art": "Billard"}, headers=staff_headers)
    assert resp.status_code == 201
    res_id = resp.json()["id"]
    get_resp = await client.get(f"/api/reservations/{res_id}")
    assert get_resp.json()["art"] == "Pool"


async def test_create_art_alias_dart_normalizes_darts(client, staff_headers):
    resp = await client.post("/api/reservations", json={**VALID, "art": "dart"}, headers=staff_headers)
    assert resp.status_code == 201
    res_id = resp.json()["id"]
    get_resp = await client.get(f"/api/reservations/{res_id}")
    assert get_resp.json()["art"] == "Darts"


async def test_create_art_alias_tt_normalizes_tischtennis(client, staff_headers):
    resp = await client.post("/api/reservations", json={**VALID, "art": "tt"}, headers=staff_headers)
    assert resp.status_code == 201
    res_id = resp.json()["id"]
    get_resp = await client.get(f"/api/reservations/{res_id}")
    assert get_resp.json()["art"] == "Tischtennis"


async def test_create_snooker_accepted(client, staff_headers):
    resp = await client.post("/api/reservations", json={**VALID, "art": "Snooker"}, headers=staff_headers)
    assert resp.status_code == 201


async def test_create_kicker_accepted(client, staff_headers):
    resp = await client.post("/api/reservations", json={**VALID, "art": "Kicker"}, headers=staff_headers)
    assert resp.status_code == 201
