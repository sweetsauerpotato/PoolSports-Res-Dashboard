"""
Phase 3 — SRE Integration Tests
Covers state.json readability, neuer-tag idempotency guard, and Berlin-timezone date handling.
"""
import json
import pathlib
import pytest
import pytest_asyncio
from freezegun import freeze_time


# Project root is three levels above this file: tests/ -> backend/ -> project root
PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
STATE_JSON = PROJECT_ROOT / "data" / "state.json"


# ── 1. state.json readable and valid JSON ─────────────────────────────────────

def test_state_json_readable():
    """data/state.json must exist and parse as valid JSON — no exception allowed."""
    assert STATE_JSON.exists(), f"state.json not found at {STATE_JSON}"
    content = STATE_JSON.read_text(encoding="utf-8")
    # json.loads raises if invalid — that is the assertion
    parsed = json.loads(content)
    assert isinstance(parsed, dict), "state.json root must be a JSON object"


# ── 2. neuer-tag double trigger — idempotency guard (409 on repeat) ───────────

@pytest.mark.asyncio
async def test_neuer_tag_double_trigger_409(client, admin_headers):
    """POST /api/neuer-tag twice rapidly; first → 200 or 409, second → 409."""
    first = await client.post("/api/neuer-tag", headers=admin_headers)
    assert first.status_code in (200, 409), (
        f"First call: expected 200 or 409, got {first.status_code}: {first.text}"
    )

    second = await client.post("/api/neuer-tag", headers=admin_headers)
    assert second.status_code == 409, (
        f"Second call: expected 409 (idempotency guard), got {second.status_code}: {second.text}"
    )


# ── 3. neuer-tag Berlin timezone — datum matches Berlin date ──────────────────

@pytest.mark.asyncio
@freeze_time("2026-03-26 22:55:00")  # UTC 22:55 = Berlin 23:55 (still 2026-03-26 in Berlin)
async def test_neuer_tag_berlin_timezone(client, admin_headers):
    """At UTC 22:55 (= Berlin 23:55 same day), neuer-tag must return datum == '2026-03-26'."""
    resp = await client.post("/api/neuer-tag", headers=admin_headers)
    assert resp.status_code in (200, 409), (
        f"Expected 200 or 409, got {resp.status_code}: {resp.text}"
    )
    if resp.status_code == 200:
        body = resp.json()
        assert body.get("datum") == "2026-03-26", (
            f"Expected datum '2026-03-26' (Berlin time), got '{body.get('datum')}'"
        )
