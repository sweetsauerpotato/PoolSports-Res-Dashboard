"""
Phase 4 — Load Test Stubs
All tests are skipped until BACKEND-DONE signal.
"""
import pytest


@pytest.mark.skip(reason="Phase 4 load tests — hold until BACKEND-DONE signal")
async def test_500_records_under_500ms():
    # Seed 500+ records via backend/scripts/seed_full_calendar.py
    # GET /api/reservations?month=... and assert response time < 500ms (PRD P1-10)
    pass


@pytest.mark.skip(reason="Phase 4 load tests — hold until BACKEND-DONE signal")
async def test_4_tablets_neuer_tag_broadcast():
    # Connect 4 WebSocket clients simultaneously
    # Trigger POST /api/neuer-tag
    # Assert all 4 receive neuer-tag WS event within 5 seconds (PRD MD-05, P1-12)
    pass
