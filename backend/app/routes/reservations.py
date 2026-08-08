"""
Reservation API routes — MVP Week 1.
All 6 endpoints: GET list, GET single, POST create, PUT edit, DELETE, and Neuer Tag extension.
Auth: plain X-PIN header via deps.require_staff_pin / require_admin_pin.
"""
import uuid
from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator, model_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..deps import require_staff_pin, require_admin_pin
from ..models_db import Reservation

router = APIRouter(prefix="/api")


# ── Pydantic schemas ──────────────────────────────────────────────────────────

# Canonical names — these are the only values ever stored in the DB
VALID_SPIELARTEN = {"Pool", "Snooker", "Darts", "Tischtennis", "Kicker", "Gastro"}

# Aliases that get normalized to the canonical name on input
SPIELART_ALIAS: dict[str, str] = {
    "billard": "Pool",
    "billiard": "Pool",
    "dart": "Darts",
    "tt": "Tischtennis",
    "tischtennis": "Tischtennis",
}


class ReservationCreate(BaseModel):
    datum: str          # YYYY-MM-DD This still needs to be written correctly.
    startzeit: str     # HH:MM we can add it here as well
    endzeit: str       # HH:MM same goes for this as well
    kunde: str
    telefon: str | None = None
    art: str
    personen: str = "2"
    standort: str = ""
    bemerkung: str | None = None
    tischanzahl: int = 1   # How many tables this group needs (1–5)

    @field_validator("kunde")
    @classmethod
    def kunde_not_empty(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("Kunde muss mindestens 2 Zeichen haben")
        return v.strip()

    @field_validator("art")
    @classmethod
    def valid_art(cls, v: str) -> str:
        # Check alias map first (handles Billard→Pool, Dart→Darts, TT→Tischtennis, etc.)
        normalized = SPIELART_ALIAS.get(v.strip().lower())
        if normalized:
            return normalized
        # Then check canonical set (case-insensitive)
        for valid in VALID_SPIELARTEN:
            if v.strip().lower() == valid.lower():
                return valid
        raise ValueError(f"Art muss eine von {sorted(VALID_SPIELARTEN)} sein")

    @field_validator("personen")
    @classmethod
    def personen_range(cls, v: str) -> str:
        try:
            val = int(v)
            if not (1 <= val <= 30):
                raise ValueError()
        except Exception:
            raise ValueError("Personen muss zwischen 1 und 30 liegen")
        return v

    @field_validator("tischanzahl")
    @classmethod
    def tischanzahl_range(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Tischanzahl muss mindestens 1 sein")
        return v

    @model_validator(mode="after")
    def end_after_start(self) -> "ReservationCreate":
        if self.endzeit == "":
            return self
        if self.startzeit >= self.endzeit:
            raise ValueError("Endzeit muss nach Startzeit liegen")
        return self


class ReservationUpdate(BaseModel):
    datum: str | None = None
    startzeit: str | None = None
    endzeit: str | None = None
    kunde: str | None = None
    telefon: str | None = None
    art: str | None = None
    personen: str | None = None
    standort: str | None = None
    bemerkung: str | None = None
    tisch_id: str | None = None
    status: str | None = None
    tischanzahl: int | None = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _combine(datum: str, zeit: str) -> str:
    """Combine 'YYYY-MM-DD' + 'HH:MM' → 'YYYY-MM-DD HH:MM:SS'. Returns empty string if zeit is empty."""
    if zeit == "":
        return ""
    return f"{datum} {zeit}:00"


def _error(detail: str, field: str | None = None, code: str = "VALIDATION_ERROR"):
    return {"detail": detail, "field": field, "error_code": code}


# ── 6.1 GET /api/reservations?month=YYYY-MM ───────────────────────────────────

@router.get("/reservations")
async def list_reservations(month: str, db: AsyncSession = Depends(get_db)):
    # Validate month format
    try:
        datetime.strptime(month, "%Y-%m")
    except ValueError:
        raise HTTPException(status_code=400, detail=_error(
            "Ungültiges Datumsformat — erwartet YYYY-MM", "month"
        ))

    result = await db.execute(
        select(Reservation).where(Reservation.datum.startswith(month)).order_by(Reservation.startzeit)
    )
    rows = result.scalars().all()

    count_per_day: dict[str, int] = defaultdict(int)
    for r in rows:
        count_per_day[r.datum] += 1

    return {
        "month": month,
        "reservations": [r.to_dict() for r in rows],
        "count_per_day": dict(count_per_day),
    }


# ── 6.2 GET /api/reservations/{id} ────────────────────────────────────────────

@router.get("/reservations/{res_id}")
async def get_reservation(res_id: str, db: AsyncSession = Depends(get_db)):
    row = await db.get(Reservation, res_id)
    if not row:
        raise HTTPException(status_code=404, detail=_error(
            "Reservierung nicht gefunden", code="NOT_FOUND"
        ))
    return row.to_dict()


# ── 6.3 POST /api/reservations ────────────────────────────────────────────────

@router.post("/reservations", status_code=201)
async def create_reservation(
    payload: ReservationCreate,
    _: None = Depends(require_staff_pin),
    db: AsyncSession = Depends(get_db),
):
    row = Reservation(
        id=str(uuid.uuid4()),
        datum=payload.datum,
        startzeit=_combine(payload.datum, payload.startzeit),
        endzeit=_combine(payload.datum, payload.endzeit),
        kunde=payload.kunde,
        telefon=payload.telefon,
        art=payload.art,
        personen=payload.personen,
        standort=payload.standort,
        bemerkung=payload.bemerkung,
        tischanzahl=payload.tischanzahl,
    )
    db.add(row)
    await db.commit()
    return {"id": row.id, "status": "unassigned", "meldung": "Reservierung erfolgreich erstellt"}


# ── 6.4 PUT /api/reservations/{id} ────────────────────────────────────────────

@router.put("/reservations/{res_id}")
async def update_reservation(
    res_id: str,
    payload: ReservationUpdate,
    _: None = Depends(require_staff_pin),
    db: AsyncSession = Depends(get_db),
):
    row = await db.get(Reservation, res_id)
    if not row:
        raise HTTPException(status_code=404, detail=_error(
            "Reservierung nicht gefunden", code="NOT_FOUND"
        ))

    # Partial update — only fields explicitly set in payload
    update_data = payload.model_dump(exclude_unset=True)

    # If time fields given, recombine with datum
    datum = update_data.get("datum", row.datum)
    if "startzeit" in update_data:
        update_data["startzeit"] = _combine(datum, update_data["startzeit"])
    if "endzeit" in update_data:
        update_data["endzeit"] = _combine(datum, update_data["endzeit"])
    if "art" in update_data:
        s = update_data["art"]
        match = None
        for valid in VALID_SPIELARTEN:
            if s.lower() == valid.lower():
                match = valid
                break
        if not match:
            raise HTTPException(status_code=400, detail=_error(
                f"Art muss eine von {sorted(VALID_SPIELARTEN)} sein", "art"
            ))
        update_data["art"] = match

    for field, value in update_data.items():
        setattr(row, field, value)

    await db.commit()
    await db.refresh(row)
    return row.to_dict()


# ── 6.5 DELETE /api/reservations/{id} ────────────────────────────────────────

@router.delete("/reservations/{res_id}")
async def delete_reservation(
    res_id: str,
    _: None = Depends(require_admin_pin),
    db: AsyncSession = Depends(get_db),
):
    row = await db.get(Reservation, res_id)
    if not row:
        raise HTTPException(status_code=404, detail=_error(
            "Reservierung nicht gefunden", code="NOT_FOUND"
        ))
    await db.delete(row)
    await db.commit()
    return {"geloescht": True, "id": res_id}
