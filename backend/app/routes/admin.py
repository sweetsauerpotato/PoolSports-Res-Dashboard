"""
Admin routes — Neuer Tag daily reset.
Extended in MVP to also load today's reservations from SQLite into state.json.
"""
import asyncio
import pytz
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..state import state_manager, utc_ms_now
from ..database import get_db
from ..models_db import Reservation
from ..deps import require_admin_pin

router = APIRouter(prefix="/api")

LEIPZIG_TZ = pytz.timezone("Europe/Berlin")


_neuer_tag_lock = asyncio.Lock()


@router.post("/neuer-tag")
async def neuer_tag(
    _: None = Depends(require_admin_pin),
    db: AsyncSession = Depends(get_db),
):
    async with _neuer_tag_lock:
        berlin = pytz.timezone("Europe/Berlin")
        heute = datetime.now(berlin).strftime("%Y-%m-%d")
        result = await db.execute(
            select(Reservation).where(
                Reservation.datum == heute,
                Reservation.status.in_(["unassigned", "assigned"]),
            ).order_by(Reservation.startzeit)
        )
        todays_reservations = result.scalars().all()

        # Step 3: Build reservation objects for state.json
        res_dict = {}
        for r in todays_reservations:
            res = r.to_dict()
            res["startzeit"] = res["startzeit"].split(" ")[1][:5] if " " in res["startzeit"] else res["startzeit"]
            res["endzeit"] = res["endzeit"].split(" ")[1][:5] if " " in res["endzeit"] else res["endzeit"]
            res_dict[r.id] = res

        # Step 4: Mutate state atomically
        def mutate(s):
            defekt = s.get("tables_defekt", [])
            s.clear()
            s.update({
                "version": "1.1.0",
                "date": heute,
                "reservations": res_dict,
                "csv_files": [],
                "table_sessions": {},
                "tables_defekt": defekt,
                "last_updated": utc_ms_now(),
            })
            # Preserve defekt table sessions
            for tid in defekt:
                s["table_sessions"][tid] = {
                    "status": "defekt",
                    "reservationId": None,
                    "guest": None,
                    "occupiedSince": None,
                }

        state_manager.create_backup()
        await state_manager.update(mutate)

        # TASK-2.6: Emit dedicated neuer-tag WebSocket event per PRD §4.3
        from ..ws.manager import ws_manager
        await ws_manager.broadcast_event("neuer-tag", {
            "datum": heute,
            "reservierungen_geladen": len(todays_reservations),
            "defekt_tische_erhalten": len(state_manager.state.get("tables_defekt", [])),
            "timestamp": datetime.now(LEIPZIG_TZ).isoformat(),
        })

        return {
            "meldung": "Neuer Tag gestartet",
            "datum": heute,
            "reservierungen_geladen": len(todays_reservations),
            "defekt_tische_erhalten": len(state_manager.state.get("tables_defekt", [])),
        }
