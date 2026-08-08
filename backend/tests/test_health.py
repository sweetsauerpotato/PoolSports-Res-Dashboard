"""Health endpoint tests."""
import pytest


async def test_health_returns_200(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200


async def test_health_has_sqlite_ok(client):
    resp = await client.get("/api/health")
    assert resp.json()["sqlite"] == "ok"


async def test_health_has_state_json_ok(client):
    resp = await client.get("/api/health")
    assert resp.json()["state_json"] == "ok"
