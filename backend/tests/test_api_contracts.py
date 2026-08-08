"""
Phase 2 — API Contract Tests
Covers all public/staff/admin endpoints for status codes and response shape.
"""
import pytest
import pytest_asyncio


VALID_PAYLOAD = {
    "datum": "2026-04-15",
    "startzeit": "14:00",
    "endzeit": "16:00",
    "kunde": "Test Kunde",
    "art": "Pool",
    "personen": "2",
    "standort": "EG",
}


# ── 1. GET /api/reservations — public, requires month param ───────────────────

@pytest.mark.asyncio
async def test_get_reservations_public(client):
    """GET /api/reservations with month param (no PIN) → 200, response has `reservations` key."""
    resp = await client.get("/api/reservations?month=2026-04")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "reservations" in body, "'reservations' key missing from response"


# ── 2. GET /api/reservations?month=2026-03 ───────────────────────────────────

@pytest.mark.asyncio
async def test_get_reservations_by_month(client):
    """GET /api/reservations?month=2026-03 → 200, response has month, reservations, count_per_day."""
    resp = await client.get("/api/reservations?month=2026-03")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body.get("month") == "2026-03"
    assert "reservations" in body
    assert "count_per_day" in body


# ── 3. GET /api/reservations/{id} — not found ────────────────────────────────

@pytest.mark.asyncio
async def test_get_reservation_not_found(client):
    """GET /api/reservations/nonexistent-uuid → 404."""
    resp = await client.get("/api/reservations/nonexistent-uuid")
    assert resp.status_code == 404, resp.text


# ── 4. POST without PIN → 401 ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_post_no_pin_returns_401(client):
    """POST /api/reservations without X-PIN → 422 (missing header) or 401."""
    resp = await client.post("/api/reservations", json=VALID_PAYLOAD)
    assert resp.status_code in (401, 422), resp.text


# ── 5. POST with wrong PIN → 401 ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_post_wrong_pin_returns_401(client):
    """POST /api/reservations with X-PIN: wrongpin → 401."""
    resp = await client.post(
        "/api/reservations", json=VALID_PAYLOAD, headers={"X-PIN": "wrongpin"}
    )
    assert resp.status_code == 401, resp.text


# ── 6. POST with valid Staff PIN → 201 ───────────────────────────────────────

@pytest.mark.asyncio
async def test_post_staff_pin_returns_201(client, staff_headers):
    """POST /api/reservations with Staff PIN → 201, id is non-empty string, status == 'unassigned'."""
    resp = await client.post(
        "/api/reservations", json=VALID_PAYLOAD, headers=staff_headers
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert isinstance(body.get("id"), str) and len(body["id"]) > 0
    assert body.get("status") == "unassigned"


# ── 7. DELETE with Staff PIN → 401 ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_staff_pin_returns_401(client, staff_headers, admin_headers):
    """DELETE /api/reservations/{id} with Staff PIN → 401."""
    # Create a reservation to delete
    create = await client.post(
        "/api/reservations", json=VALID_PAYLOAD, headers=admin_headers
    )
    assert create.status_code == 201, create.text
    res_id = create.json()["id"]

    resp = await client.delete(f"/api/reservations/{res_id}", headers=staff_headers)
    assert resp.status_code == 401, resp.text


# ── 8. DELETE with Admin PIN → 200 ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_admin_pin_returns_200(client, admin_headers):
    """DELETE /api/reservations/{id} with Admin PIN → 200, geloescht == true."""
    # Create a reservation to delete
    create = await client.post(
        "/api/reservations", json=VALID_PAYLOAD, headers=admin_headers
    )
    assert create.status_code == 201, create.text
    res_id = create.json()["id"]

    resp = await client.delete(f"/api/reservations/{res_id}", headers=admin_headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body.get("geloescht") is True


# ── 9. POST /api/neuer-tag without PIN → 401 ─────────────────────────────────

@pytest.mark.asyncio
async def test_neuer_tag_no_pin_returns_401(client):
    """POST /api/neuer-tag without PIN → 422 (missing header) or 401."""
    resp = await client.post("/api/neuer-tag")
    assert resp.status_code in (401, 422), resp.text


# ── 10. POST /api/neuer-tag with Staff PIN → 401 ─────────────────────────────

@pytest.mark.asyncio
async def test_neuer_tag_staff_pin_returns_401(client, staff_headers):
    """POST /api/neuer-tag with Staff PIN → 401 (Admin-only endpoint)."""
    resp = await client.post("/api/neuer-tag", headers=staff_headers)
    assert resp.status_code == 401, resp.text


# ── 11. POST /api/neuer-tag with Admin PIN → 200 or 409 ──────────────────────

@pytest.mark.asyncio
async def test_neuer_tag_admin_pin_returns_200_or_409(client, admin_headers):
    """POST /api/neuer-tag with Admin PIN → 200 or 409 (both are valid)."""
    resp = await client.post("/api/neuer-tag", headers=admin_headers)
    assert resp.status_code in (200, 409), (
        f"Expected 200 or 409, got {resp.status_code}: {resp.text}"
    )
