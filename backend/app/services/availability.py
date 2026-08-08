"""
availability.py — Phase 1 (Sprint 1.1) + Phase 2 (Sprints 2.1, 2.2, 2.3)

Capacity constants, location helpers, Pydantic models, and the core
check_availability() service function for the Quick Check endpoint.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..state import state_manager

# ── Sprint 1.1 — CAPACITY + get_total_tables ─────────────────────────────────

# Physical table counts per (spielart, floor).
# Keys use canonical DB art values (matching reservations.art / VALID_SPIELARTEN
# in routes/reservations.py):
#   "Darts"       — stored in DB as "Darts"  (table ID prefix: "Dart-")
#   "Tischtennis" — stored in DB as "Tischtennis" (table ID prefix: "TT-")
# Lounge is not included — Lounge tables do not accept reservations by type.
# Source: PRD §3 Table Inventory (canonical capacity values for availability logic).
CAPACITY: dict[tuple[str, str], int] = {
    ("Pool",        "EG"): 17,
    ("Pool",        "UG"): 21,
    ("Snooker",     "EG"):  5,
    ("Darts",       "EG"):  5,
    ("Darts",       "UG"):  4,
    ("Darts",       "VRA"): 6,
    ("Tischtennis", "EG"):  8,
    ("Tischtennis", "UG"):  5,
    ("Kicker",      "EG"):  1,
    ("Kicker",      "UG"):  1,
    ("Kicker",      "VRA"): 2,
    ("Gastro",      "EG"): 13,
    ("Gastro",      "UG"): 10,
    ("Gastro",      "VRA"):12,
}


def get_total_tables(spielart: str, floors: list[str]) -> int:
    """
    Sum the physical table count for *spielart* across all requested *floors*.

    Returns 0 — never raises — for any (spielart, floor) pair not in CAPACITY.
    This handles combinations like Pool + VRA (no pool tables in VRA) gracefully.

    Args:
        spielart: Canonical DB art value, e.g. "Pool", "Darts", "Tischtennis".
        floors:   Subset of ["EG", "UG", "VRA"].

    Returns:
        Total number of physical tables available for the combination.
    """
    return sum(CAPACITY.get((spielart, floor), 0) for floor in floors)


# ── Sprint 2.1 — SPIELART_PREFIX_MAP, TABLE_LOCATION_RANGES, get_table_location ──

# Maps canonical DB art value (reservations.art) to the table ID prefix used in
# frontend/src/config/tables.ts.
# Required because DB stores "Darts" but table IDs use "Dart-NNN",
# and DB stores "Tischtennis" but table IDs use "TT-NNN".
SPIELART_PREFIX_MAP: dict[str, str] = {
    "Pool":        "Pool",
    "Snooker":     "Snooker",
    "Darts":       "Dart",        # DB: "Darts"  →  table ID prefix: "Dart-"
    "Tischtennis": "TT",          # DB: "Tischtennis"  →  table ID prefix: "TT-"
    "Kicker":      "Kicker",
    "Gastro":      "Gastro",
}

# Maps canonical spielart → floor → list of numeric ID ranges (Python range, stop-exclusive).
# Source of truth: frontend/src/config/tables.ts (EG_TABLES, UG_TABLES, VRA_TABLES).
TABLE_LOCATION_RANGES: dict[str, dict[str, list[range]]] = {
    "Pool": {
        "EG": [range(10, 19), range(20, 27)],                          # Pool-10..18, Pool-20..26
        "UG": [range(110, 116), range(120, 127), range(130, 139)],     # Pool-110..115, Pool-120..126, Pool-130..138
    },
    "Snooker": {
        "EG": [range(30, 35)],                                         # Snooker-30..34
    },
    "Darts": {
        "EG":  [range(1, 6)],                                          # Dart-1..5
        "UG":  [range(100, 104)],                                      # Dart-100..103
        "VRA": [range(7, 10), range(37, 40)],                          # Dart-7..9, Dart-37..39
    },
    "Tischtennis": {
        "EG": [range(40, 48)],                                         # TT-40..47
        "UG": [range(140, 145)],                                       # TT-140..144
    },
    "Kicker": {
        "EG":  [range(200, 201)],                                      # Kicker-200
        "UG":  [range(203, 204)],                                      # Kicker-203
        "VRA": [range(201, 203)],                                      # Kicker-201..202
    },
    "Gastro": {
        "EG":  [range(60, 73)],                                        # Gastro-60..72
        "UG":  [range(160, 180)],                                      # Gastro-160..179
        "VRA": [range(90, 108)],                                       # Gastro-90..107
    },
}


def get_table_location(spielart: str, table_id: str) -> str | None:
    """
    Resolve which floor a given table_id belongs to for the given spielart.

    Args:
        spielart: Canonical DB art value, e.g. "Pool", "Darts".
        table_id: Full table ID string, e.g. "Pool-14", "Dart-103", "TT-44".

    Returns:
        Floor string ("EG", "UG", or "VRA"), or None if not found / wrong spielart.
    """
    prefix = SPIELART_PREFIX_MAP.get(spielart)
    if prefix is None:
        return None

    expected_prefix = f"{prefix}-"
    numeric_str = table_id.removeprefix(expected_prefix)
    if numeric_str == table_id:
        # removeprefix returned the original — prefix didn't match
        return None

    try:
        numeric = int(numeric_str)
    except ValueError:
        return None

    for location, ranges in TABLE_LOCATION_RANGES.get(spielart, {}).items():
        if any(numeric in r for r in ranges):
            return location

    return None


# ── Sprint 2.1 — Pydantic models ─────────────────────────────────────────────

_VALID_SPIELARTEN = {"Pool", "Snooker", "Tischtennis", "Darts", "Kicker", "Gastro"}
_VALID_FLOORS = {"EG", "UG", "VRA"}
_TIME_FMT = "%H:%M"


class NaechsterSlot(BaseModel):
    startzeit: str   # HH:MM
    endzeit: str     # HH:MM
    freitische: int


class VerfuegbarkeitAnfrage(BaseModel):
    datum: str          # YYYY-MM-DD
    startzeit: str      # HH:MM, 14:00–23:00
    endzeit: str        # HH:MM, 14:15–23:00, always > startzeit
    spielart: str       # canonical art value stored in DB
    floors: list[str]   # subset of ["EG", "UG", "VRA"], minimum 1
    tischanzahl: int    # >= 1, no upper bound

    @field_validator("datum")
    @classmethod
    def valid_datum(cls, v: str) -> str:
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("datum muss im Format YYYY-MM-DD sein")
        return v

    @field_validator("startzeit", "endzeit")
    @classmethod
    def valid_time(cls, v: str) -> str:
        try:
            datetime.strptime(v, _TIME_FMT)
        except ValueError:
            raise ValueError("Zeit muss im Format HH:MM sein")
        return v

    @field_validator("spielart")
    @classmethod
    def valid_spielart(cls, v: str) -> str:
        if v not in _VALID_SPIELARTEN:
            raise ValueError(f"spielart muss eine von {sorted(_VALID_SPIELARTEN)} sein")
        return v

    @field_validator("floors")
    @classmethod
    def valid_floors(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("floors darf nicht leer sein")
        invalid = [f for f in v if f not in _VALID_FLOORS]
        if invalid:
            raise ValueError(f"Ungültige floors: {invalid}")
        return v

    @field_validator("tischanzahl")
    @classmethod
    def valid_tischanzahl(cls, v: int) -> int:
        if v < 1:
            raise ValueError("tischanzahl muss mindestens 1 sein")
        return v


class VerfuegbarkeitAntwort(BaseModel):
    verfuegbar: bool
    freitische: int
    gesamttische: int
    defekttische: int
    ueberlappende_reservierungen: int   # SUM of tischanzahl columns, not row count
    naechste_slots: Optional[list[NaechsterSlot]] = None


# ── Sprint 2.2 + 2.3 — check_availability + _find_next_slots ─────────────────

def _hhmm_to_minutes(hhmm: str) -> int:
    """Convert "HH:MM" to total minutes since midnight."""
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def _minutes_to_hhmm(minutes: int) -> str:
    """Convert total minutes since midnight back to "HH:MM"."""
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


async def _count_overlapping(
    db: AsyncSession,
    datum: str,
    spielart: str,
    startzeit_hhmm: str,
    endzeit_hhmm: str,
    floors: list[str],
) -> int:
    """
    Return SUM(tischanzahl) for reservations whose time window overlaps the
    requested slot on *datum* for *spielart*, restricted to *floors*.

    Floor matching mirrors overbooking.ts: empty/blank standort is treated as
    "EG" — so when EG is requested, unassigned-standort rows are included.
    *floors* is already validated as a subset of {"EG", "UG", "VRA"} by
    Pydantic, so f-string interpolation is safe here.

    # NO CACHE — query must reflect live reservations state
    """
    db_start = f"{datum} {startzeit_hhmm}:00"
    db_end   = f"{datum} {endzeit_hhmm}:00"

    # Build a whitelist IN clause from the validated floor list.
    floor_in  = ", ".join(f"'{f}'" for f in floors)
    # Empty standort → EG (same convention as frontend overbooking.ts).
    eg_clause = "OR standort = ''" if "EG" in floors else ""

    result = await db.execute(
        text(
            "SELECT COALESCE(SUM(tischanzahl), 0) "
            "FROM reservations "
            "WHERE LOWER(art) = LOWER(:spielart) "
            "  AND NULLIF(startzeit, '') < :endzeit "
            "  AND COALESCE(NULLIF(endzeit, ''), datetime(NULLIF(startzeit, ''), '+3 hours')) > :startzeit "
            "  AND status IN ('unassigned', 'assigned', 'seated') "
            f"  AND (standort IN ({floor_in}) {eg_clause})"
        ),
        {"spielart": spielart, "startzeit": db_start, "endzeit": db_end},
    )
    row = result.fetchone()
    return int(row[0]) if row and row[0] is not None else 0


def _count_defekt(spielart: str, floors: list[str]) -> int:
    """
    Count defekt tables for *spielart* that are on one of the requested *floors*.
    Reads from state_manager.state["tables_defekt"] — the canonical defekt list
    maintained by the /api/defekt route. Does NOT open state.json directly.
    """
    tables_defekt: list[str] = state_manager.state.get("tables_defekt", [])
    count = 0
    for table_id in tables_defekt:
        location = get_table_location(spielart, table_id)
        if location is not None and location in floors:
            count += 1
    return count


async def check_availability(
    anfrage: VerfuegbarkeitAnfrage,
    db: AsyncSession,
) -> VerfuegbarkeitAntwort:
    """
    Sprint 2.2: Main availability calculation.

    Steps:
      1. Validate time range → derive dauerminuten
      2. Get gesamttische from CAPACITY constant
      3. Count overlapping reservations (SUM tischanzahl) from SQLite
      4. Count defekt tables for this spielart+floors from state.json
      5. Compute freitische and verfuegbar; run next-slot search if not available
    """

    # Step 1 — Derive duration
    start_min = _hhmm_to_minutes(anfrage.startzeit)
    end_min   = _hhmm_to_minutes(anfrage.endzeit)
    dauerminuten = end_min - start_min
    if dauerminuten <= 0:
        raise HTTPException(
            status_code=400,
            detail={
                "detail": "Endzeit muss nach Startzeit liegen",
                "field": "endzeit",
                "error_code": "INVALID_TIME_RANGE",
            },
        )

    # Step 2 — Total tables
    gesamttische = get_total_tables(anfrage.spielart, anfrage.floors)
    if gesamttische == 0:
        raise HTTPException(
            status_code=400,
            detail={
                "detail": "Keine Tische für diese Spielart/Bereich-Kombination",
                "field": "floors",
                "error_code": "NO_CAPACITY_FOR_COMBINATION",
            },
        )

    # Step 3 — Overlapping reservations
    overlapping = await _count_overlapping(
        db, anfrage.datum, anfrage.spielart, anfrage.startzeit, anfrage.endzeit,
        anfrage.floors,
    )

    # Step 4 — Defekt tables
    defekt = _count_defekt(anfrage.spielart, anfrage.floors)

    # Step 5 — Compute result
    available  = gesamttische - overlapping - defekt
    freitische = max(0, available)
    verfuegbar = freitische >= anfrage.tischanzahl

    if verfuegbar:
        return VerfuegbarkeitAntwort(
            verfuegbar=True,
            freitische=freitische,
            gesamttische=gesamttische,
            defekttische=defekt,
            ueberlappende_reservierungen=overlapping,
            naechste_slots=None,
        )

    # Not available — find next slots (Sprint 2.3)
    naechste_slots = await _find_next_slots(
        anfrage=anfrage,
        db=db,
        dauerminuten=dauerminuten,
        gesamttische=gesamttische,
        defekt=defekt,
    )

    return VerfuegbarkeitAntwort(
        verfuegbar=False,
        freitische=freitische,
        gesamttische=gesamttische,
        defekttische=defekt,
        ueberlappende_reservierungen=overlapping,
        naechste_slots=naechste_slots,
    )


async def _find_next_slots(
    anfrage: VerfuegbarkeitAnfrage,
    db: AsyncSession,
    dauerminuten: int,
    gesamttische: int,
    defekt: int,
) -> list[NaechsterSlot]:
    """
    Sprint 2.3: Search forward from anfrage.startzeit + 15 min in 15-minute
    increments for up to 4 slots where freitische >= anfrage.tischanzahl.

    Stops when candidate_startzeit >= 23:00 or 4 slots collected.
    gesamttische and defekt are constant — only the overlap query is re-run.
    """
    _MAX_SLOTS  = 4
    _CUTOFF_MIN = 23 * 60          # 23:00 in minutes
    _INCREMENT  = 15

    slots: list[NaechsterSlot] = []
    candidate_start_min = _hhmm_to_minutes(anfrage.startzeit) + _INCREMENT

    while candidate_start_min < _CUTOFF_MIN and len(slots) < _MAX_SLOTS:
        candidate_end_min = candidate_start_min + dauerminuten

        # If the candidate window would run past 23:00, skip it rather than
        # wrapping into the next day.
        if candidate_end_min > _CUTOFF_MIN:
            break

        cand_start_hhmm = _minutes_to_hhmm(candidate_start_min)
        cand_end_hhmm   = _minutes_to_hhmm(candidate_end_min)

        overlapping = await _count_overlapping(
            db, anfrage.datum, anfrage.spielart, cand_start_hhmm, cand_end_hhmm,
            anfrage.floors,
        )
        cand_freitische = max(0, gesamttische - overlapping - defekt)

        if cand_freitische >= anfrage.tischanzahl:
            slots.append(NaechsterSlot(
                startzeit=cand_start_hhmm,
                endzeit=cand_end_hhmm,
                freitische=cand_freitische,
            ))

        candidate_start_min += _INCREMENT

    return slots
