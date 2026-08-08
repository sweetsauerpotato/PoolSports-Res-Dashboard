"""
routes/availability.py — Sprint 2.4

POST /api/availability/quick-check

Thin route layer: validates PIN, delegates entirely to check_availability()
in services/availability.py. No business logic here.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..deps import require_staff_pin
from ..services.availability import (
    VerfuegbarkeitAnfrage,
    VerfuegbarkeitAntwort,
    check_availability,
)

router = APIRouter(prefix="/api")


@router.post(
    "/availability/quick-check",
    response_model=VerfuegbarkeitAntwort,
    status_code=200,
    summary="Quick Check — Verfügbarkeit prüfen",
    description=(
        "Prüft die Tischverfügbarkeit für Spielart, Datum und Zeitfenster. "
        "Bei Nichtverfügbarkeit werden bis zu 4 alternative Zeitslots zurückgegeben."
    ),
)
async def quick_check(
    anfrage: VerfuegbarkeitAnfrage,
    _: None = Depends(require_staff_pin),
    db: AsyncSession = Depends(get_db),
) -> VerfuegbarkeitAntwort:
    """
    Delegates entirely to check_availability().
    Errors (400, 401, 500) propagate as HTTPExceptions with
    { "detail": str, "field": str | null, "error_code": str } shape.
    """
    return await check_availability(anfrage, db)
