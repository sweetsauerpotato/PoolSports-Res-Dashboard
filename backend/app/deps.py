"""
FastAPI dependency functions for PIN-based auth.
Week 1: plain-text PIN comparison against env vars.
Post-MVP: swap to SHA-256 hashing without changing API contract.
"""
import os
import logging
from fastapi import Header, HTTPException

logger = logging.getLogger(__name__)

# Plain PIN env vars (set in shell or .env — NO silent insecure defaults)
STAFF_PIN = os.getenv("STAFF_PIN")
ADMIN_PIN = os.getenv("ADMIN_PIN")

if not STAFF_PIN:
    logger.warning("STAFF_PIN env var not set — see backend/.env or env.example")
    STAFF_PIN = "1234"  # dev-only fallback, warning makes it visible
if not ADMIN_PIN:
    logger.warning("ADMIN_PIN env var not set — see backend/.env or env.example")
    ADMIN_PIN = "0000"  # dev-only fallback, warning makes it visible


async def require_staff_pin(x_pin: str = Header(..., alias="X-PIN")):
    """Staff or Admin PIN accepted (both can create/edit reservations)."""
    if x_pin not in (STAFF_PIN, ADMIN_PIN):
        raise HTTPException(status_code=401, detail="Ungültige PIN", headers={"error_code": "UNAUTHORIZED"})


async def require_admin_pin(x_pin: str = Header(..., alias="X-PIN")):
    """Only Admin PIN accepted (delete, Neuer Tag)."""
    if x_pin != ADMIN_PIN:
        raise HTTPException(status_code=401, detail="Admin-PIN erforderlich", headers={"error_code": "UNAUTHORIZED"})
