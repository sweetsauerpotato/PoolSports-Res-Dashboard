"""
Phase 1 — DIV Verification Tests
Verifies field naming conventions: `art` (not `spielart`), tisch_ids structure.
"""
import pytest
import pytest_asyncio


PAYLOAD = {
    "datum": "2026-04-20",
    "startzeit": "10:00",
    "endzeit": "12:00",
    "kunde": "DIV Tester",
    "art": "Pool",
    "personen": "2",
    "standort": "EG",
}


@pytest.mark.asyncio
async def test_art_field_not_spielart(client, staff_headers):
    """POST a reservation, GET it back — response must have `art`, must NOT have `spielart`."""
    create_resp = await client.post(
        "/api/reservations", json=PAYLOAD, headers=staff_headers
    )
    assert create_resp.status_code == 201, create_resp.text
    res_id = create_resp.json()["id"]

    get_resp = await client.get(f"/api/reservations/{res_id}")
    assert get_resp.status_code == 200, get_resp.text
    body = get_resp.json()

    assert "art" in body, "'art' key missing from reservation response"
    assert "spielart" not in body, "'spielart' key must NOT exist in reservation response"


@pytest.mark.asyncio
async def test_tisch_ids_structure(client, staff_headers):
    """POST a reservation, GET it back — response must have tisch_ids (list), tischanzahl (int), tisch_id."""
    create_resp = await client.post(
        "/api/reservations", json=PAYLOAD, headers=staff_headers
    )
    assert create_resp.status_code == 201, create_resp.text
    res_id = create_resp.json()["id"]

    get_resp = await client.get(f"/api/reservations/{res_id}")
    assert get_resp.status_code == 200, get_resp.text
    body = get_resp.json()

    assert "tisch_ids" in body, "'tisch_ids' key missing from reservation response"
    assert isinstance(body["tisch_ids"], list), "'tisch_ids' must be a list"

    assert "tischanzahl" in body, "'tischanzahl' key missing from reservation response"
    assert isinstance(body["tischanzahl"], int), "'tischanzahl' must be an int"

    assert "tisch_id" in body, "'tisch_id' key missing from reservation response"
