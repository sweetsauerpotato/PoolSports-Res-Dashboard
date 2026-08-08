import json as _json
import logging
from fastapi import APIRouter, Depends, HTTPException
from ..models import AssignRequest, UnassignRequest, TableStatusRequest, NoShowRequest, DefektRequest
from ..state import state_manager
from ..deps import require_staff_pin
from ..ws.manager import ws_manager, _next_seq

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


@router.get("/state")
async def get_state():
    return state_manager.state


@router.post("/assign")
async def assign_table(req: AssignRequest, pin: str = Depends(require_staff_pin)):
    def mutate(s):
        res = s["reservations"].get(req.reservation_id)
        if not res:
            raise HTTPException(404, "Reservation not found")

        # Resolve the unified list of table IDs being assigned now.
        # Priority: table_ids (new multi-table callers) > table_id (legacy single-table drag)
        incoming_ids: list[str] = req.table_ids if req.table_ids else ([req.table_id] if req.table_id else [])
        if not incoming_ids:
            raise HTTPException(400, "At least one table_id or table_ids is required")

        # Merge with any already-placed tables (supports incremental linking)
        existing_raw = res.get("tisch_ids") or "[]"
        existing_ids: list[str] = _json.loads(existing_raw) if isinstance(existing_raw, str) else list(existing_raw)
        # Combine, preserving order and deduplicating
        merged: list[str] = list(dict.fromkeys(existing_ids + incoming_ids))

        needed: int = res.get("tischanzahl", 1)
        new_status = "assigned" if len(merged) >= needed else "partial"

        res["tisch_ids"] = merged
        res["tisch_id"] = merged[0]   # legacy compat key in state
        res["status"] = new_status
        if req.standort:
            res["standort"] = req.standort

    await state_manager.update(mutate)

    # Sprint 2.1 — reservationAssigned delta (parallel with stateupdate)
    seq = _next_seq()
    res_snap = state_manager.state["reservations"].get(req.reservation_id, {})
    await ws_manager.broadcast_event("reservationAssigned", {
        "reservation_id": req.reservation_id,
        "tisch_id": res_snap.get("tisch_id"),
        "kunde": res_snap.get("kunde"),
        "last_updated": state_manager.state["last_updated"],
        "seq": seq,
    })
    logger.info("[Delta] reservationAssigned seq=%d res=%s clients=%d", seq, req.reservation_id, len(ws_manager.active))

    return {"ok": True}


@router.post("/unassign")
async def unassign_table(req: UnassignRequest, pin: str = Depends(require_staff_pin)):
    def mutate(s):
        res = s["reservations"].get(req.reservation_id)
        if not res or not res.get("tisch_id"):
            raise HTTPException(404, "Reservation not found or not assigned")
        
        # Unassign ALL tables linked to this reservation
        tisch_ids: list[str] = res.get("tisch_ids", [])
        if not tisch_ids and res.get("tisch_id"):
            tisch_ids = [res["tisch_id"]]

        for tid in tisch_ids:
            session = s["table_sessions"].get(tid, {})
            if session.get("reservationId") == req.reservation_id:
                s["table_sessions"].pop(tid, None)

        res["tisch_ids"] = []
        res["tisch_id"] = None
        res["status"] = "unassigned"
    await state_manager.update(mutate)
    return {"ok": True}


@router.put("/tables/{table_id}/status")
async def update_table_status(table_id: str, req: TableStatusRequest, pin: str = Depends(require_staff_pin)):
    from datetime import datetime, timezone

    def mutate(s):
        if req.status == "belegt":
            res_id = req.reservation_id or s["table_sessions"].get(table_id, {}).get("reservationId")
            guest_name = req.guest or "Walk-in"
            
            # If it's a reservation, update all linked tables (create Ghost sessions for others)
            if res_id:
                res = s["reservations"].get(res_id)
                if res:
                    res["status"] = "seated"
                    guest_name = res.get("kunde", guest_name)
                    
                    tisch_ids: list[str] = res.get("tisch_ids", [])
                    if not tisch_ids and res.get("tisch_id"):
                        tisch_ids = [res["tisch_id"]]
                    
                    # REVERT LOGIC
                    for other_res in s["reservations"].values():
                        other_tisch_ids = other_res.get("tisch_ids", [])
                        if not other_tisch_ids and other_res.get("tisch_id"):
                            other_tisch_ids = [other_res["tisch_id"]]

                        if (
                            other_res["id"] != res_id and 
                            any(t in tisch_ids for t in other_tisch_ids) and
                            other_res.get("status") == "seated" and
                            other_res.get("startzeit", "") > res.get("startzeit", "")
                        ):
                            other_res["status"] = "assigned"

                    for tid in tisch_ids:
                        existing = s["table_sessions"].get(tid, {})
                        was_real = existing.get("reservationId") == res_id and not existing.get("isGhost", False)
                        is_ghost = (tid != table_id) and not was_real
                        s["table_sessions"][tid] = {
                            "status": "belegt",
                            "reservationId": res_id,
                            "guest": guest_name,
                            "occupiedSince": existing.get("occupiedSince") or datetime.now(timezone.utc).isoformat(),
                            "isGhost": is_ghost
                        }
            else:
                # Pure walk-in, only update the requested table
                s["table_sessions"][table_id] = {
                    "status": "belegt",
                    "reservationId": None,
                    "guest": guest_name,
                    "occupiedSince": datetime.now(timezone.utc).isoformat(),
                }
        elif req.status == "frei":
            # Just free the requested table
            s["table_sessions"].pop(table_id, None)
        else:
            raise HTTPException(400, f"Unknown status: {req.status}")

    await state_manager.update(mutate)

    # Sprint 2.1 — tableStatusChanged delta (parallel with stateupdate)
    # Determine reservation_id from the request or the session after mutation.
    _res_id = req.reservation_id or state_manager.state.get("table_sessions", {}).get(table_id, {}).get("reservationId")
    seq = _next_seq()
    await ws_manager.broadcast_event("tableStatusChanged", {
        "tisch_id": table_id,
        "status": req.status,
        "reservation_id": _res_id,
        "last_updated": state_manager.state["last_updated"],
        "seq": seq,
    })
    logger.info("[Delta] tableStatusChanged seq=%d tisch=%s clients=%d", seq, table_id, len(ws_manager.active))

    # Sprint 2.1 — timerStarted delta: only when belegt + a real reservation
    if req.status == "belegt" and _res_id:
        occupied = state_manager.state.get("table_sessions", {}).get(table_id, {}).get("occupiedSince")
        seq2 = _next_seq()
        await ws_manager.broadcast_event("timerStarted", {
            "tisch_id": table_id,
            "occupied_since": occupied,
            "last_updated": state_manager.state["last_updated"],
            "seq": seq2,
        })
        logger.info("[Delta] timerStarted seq=%d tisch=%s clients=%d", seq2, table_id, len(ws_manager.active))

    return {"ok": True}

@router.post("/no-show")
async def no_show(req: NoShowRequest, pin: str = Depends(require_staff_pin)):
    def mutate(s):
        res = s["reservations"].get(req.reservation_id)
        if not res:
            raise HTTPException(404, "Reservation not found")
        # Only change the status — keep tisch_ids intact so the table card
        # remains visible on the floor plan and staff can still undo.
        res["status"] = "no-show"
    await state_manager.update(mutate)
    return {"ok": True}


@router.post("/defekt")
async def toggle_defekt(req: DefektRequest, pin: str = Depends(require_staff_pin)):
    def mutate(s):
        defekt_list = s.setdefault("tables_defekt", [])
        if req.defekt:
            if req.table_id not in defekt_list:
                defekt_list.append(req.table_id)
            s["table_sessions"][req.table_id] = {
                "status": "defekt",
                "reservationId": None,
                "guest": None,
                "occupiedSince": None,
            }
        else:
            if req.table_id in defekt_list:
                defekt_list.remove(req.table_id)
            s["table_sessions"].pop(req.table_id, None)
    await state_manager.update(mutate)
    return {"ok": True}


@router.post("/walk-in/{table_id}")
async def walk_in(table_id: str, pin: str = Depends(require_staff_pin)):
    from datetime import datetime, timezone

    def mutate(s):
        s["table_sessions"][table_id] = {
            "status": "belegt",
            "reservationId": None,
            "guest": "Walk-in",
            "occupiedSince": datetime.now(timezone.utc).isoformat(),
        }
    await state_manager.update(mutate)
    return {"ok": True}

@router.post("/undo-status")
async def undo_status(req: NoShowRequest, pin: str = Depends(require_staff_pin)):
    def mutate(s):
        res = s["reservations"].get(req.reservation_id)
        if not res:
            raise HTTPException(404, "Reservation not found")
        
        # If it was seated on a table, we don't necessarily want to pull it OFF the table
        # We just want to revert it to 'assigned' so it appears as NÄCHSTE instead of AKTIV
        res["status"] = "assigned"
        
        # If this reservation was currently the active one in the session,
        # clear the session entirely (it's no longer 'seated')
        tisch_ids: list[str] = res.get("tisch_ids", [])
        if not tisch_ids and res.get("tisch_id"):
            tisch_ids = [res["tisch_id"]]

        for tid in tisch_ids:
            session = s["table_sessions"].get(tid)
            if session and session.get("reservationId") == req.reservation_id:
                s["table_sessions"].pop(tid, None)

    await state_manager.update(mutate)
    return {"ok": True}
