"""
Shared pytest fixtures for PSL booking system tests.
"""
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.fixture
def staff_headers():
    return {"X-PIN": os.getenv("STAFF_PIN", "1234")}


@pytest.fixture
def admin_headers():
    return {"X-PIN": os.getenv("ADMIN_PIN", "0000")}


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
