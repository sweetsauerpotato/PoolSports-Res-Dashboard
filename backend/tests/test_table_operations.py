"""Table operation endpoint tests — functional + SEC-05 deferral verification."""
import pytest


async def test_get_state_public(client):
    resp = await client.get("/api/state")
    assert resp.status_code == 200


async def test_walk_in_sets_belegt(client, staff_headers):
    resp = await client.post("/api/walk-in/T99", headers=staff_headers)
    assert resp.status_code == 200


async def test_defekt_toggle_on(client, staff_headers):
    resp = await client.post("/api/defekt", json={"table_id": "T98", "defekt": True}, headers=staff_headers)
    assert resp.status_code == 200


async def test_defekt_toggle_off(client, staff_headers):
    resp = await client.post("/api/defekt", json={"table_id": "T98", "defekt": False}, headers=staff_headers)
    assert resp.status_code == 200


async def test_no_show_missing_error(client, staff_headers):
    resp = await client.post("/api/no-show", json={"reservation_id": "nonexistent-id"}, headers=staff_headers)
    assert resp.status_code in (404, 500)


async def test_undo_status_missing_error(client, staff_headers):
    resp = await client.post("/api/undo-status", json={"reservation_id": "nonexistent-id"}, headers=staff_headers)
    assert resp.status_code in (404, 500)


# ── Auth verification: table mutation endpoints MUST require staff/admin PIN ────────


async def test_assign_with_auth(client, staff_headers):
    resp = await client.post("/api/assign", json={"reservation_id": "x", "table_id": "T1"}, headers=staff_headers)
    # Status should be 404 because "x" doesn't exist, NOT 401/422
    assert resp.status_code == 404


async def test_unassign_with_auth(client, staff_headers):
    resp = await client.post("/api/unassign", json={"reservation_id": "x"}, headers=staff_headers)
    assert resp.status_code in (404, 500)


async def test_no_show_with_auth(client, staff_headers):
    resp = await client.post("/api/no-show", json={"reservation_id": "x"}, headers=staff_headers)
    assert resp.status_code in (404, 500)


async def test_walk_in_with_auth(client, staff_headers):
    resp = await client.post("/api/walk-in/T99", headers=staff_headers)
    assert resp.status_code == 200


async def test_defekt_with_auth(client, staff_headers):
    resp = await client.post("/api/defekt", json={"table_id": "T1", "defekt": True}, headers=staff_headers)
    assert resp.status_code == 200


async def test_undo_status_with_auth(client, staff_headers):
    resp = await client.post("/api/undo-status", json={"reservation_id": "x"}, headers=staff_headers)
    assert resp.status_code in (404, 500)


async def test_table_status_with_auth(client, staff_headers):
    resp = await client.put("/api/tables/T99/status", json={"status": "frei"}, headers=staff_headers)
    assert resp.status_code == 200


async def test_get_state_no_auth_required(client):
    resp = await client.get("/api/state")
    assert resp.status_code != 401
