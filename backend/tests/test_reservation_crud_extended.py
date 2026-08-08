"""Extended reservation CRUD tests — boundary values, optional fields, error paths."""
import re
import pytest

VALID = {
    "datum": "2026-06-15",
    "startzeit": "10:00",
    "endzeit": "12:00",
    "kunde": "CRUD Tester",
    "art": "Pool",
    "personen": "2",
    "standort": "EG",
}


async def test_create_with_admin_pin_201(client, admin_headers):
    resp = await client.post("/api/reservations", json=VALID, headers=admin_headers)
    assert resp.status_code == 201


async def test_create_with_bemerkung(client, staff_headers):
    resp = await client.post(
        "/api/reservations", json={**VALID, "bemerkung": "Geburtstag"}, headers=staff_headers
    )
    assert resp.status_code == 201
    res_id = resp.json()["id"]
    get_resp = await client.get(f"/api/reservations/{res_id}")
    assert get_resp.json()["bemerkung"] == "Geburtstag"


async def test_create_with_telefon(client, staff_headers):
    resp = await client.post(
        "/api/reservations", json={**VALID, "telefon": "0341-1234567"}, headers=staff_headers
    )
    assert resp.status_code == 201
    res_id = resp.json()["id"]
    get_resp = await client.get(f"/api/reservations/{res_id}")
    assert get_resp.json()["telefon"] == "0341-1234567"


async def test_create_returns_uuid_format(client, staff_headers):
    resp = await client.post("/api/reservations", json=VALID, headers=staff_headers)
    assert resp.status_code == 201
    assert re.match(
        r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
        resp.json()["id"],
    )


async def test_create_and_get_by_id(client, staff_headers):
    resp = await client.post("/api/reservations", json=VALID, headers=staff_headers)
    assert resp.status_code == 201
    res_id = resp.json()["id"]
    get_resp = await client.get(f"/api/reservations/{res_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["kunde"] == "CRUD Tester"


async def test_put_update_kunde(client, staff_headers):
    create = await client.post("/api/reservations", json=VALID, headers=staff_headers)
    res_id = create.json()["id"]
    resp = await client.put(
        f"/api/reservations/{res_id}", json={"kunde": "Neuer Name"}, headers=staff_headers
    )
    assert resp.status_code == 200
    assert resp.json()["kunde"] == "Neuer Name"


async def test_put_not_found_404(client, staff_headers):
    resp = await client.put(
        "/api/reservations/nonexistent-id", json={"kunde": "X"}, headers=staff_headers
    )
    assert resp.status_code == 404


async def test_put_no_pin_422(client):
    resp = await client.put("/api/reservations/any-id", json={"kunde": "X"})
    assert resp.status_code in (401, 422)


async def test_delete_not_found_404(client, admin_headers):
    resp = await client.delete("/api/reservations/nonexistent-id", headers=admin_headers)
    assert resp.status_code == 404


async def test_get_by_month_returns_list(client):
    resp = await client.get("/api/reservations?month=2026-06")
    assert resp.status_code == 200
    assert isinstance(resp.json()["reservations"], list)


async def test_create_personen_boundary_1(client, staff_headers):
    resp = await client.post("/api/reservations", json={**VALID, "personen": "1"}, headers=staff_headers)
    assert resp.status_code == 201


async def test_create_personen_boundary_30(client, staff_headers):
    resp = await client.post("/api/reservations", json={**VALID, "personen": "30"}, headers=staff_headers)
    assert resp.status_code == 201
