import json
import logging
from fastapi import WebSocket

logger = logging.getLogger(__name__)

# Sprint 2.1 — In-memory sequence counter for delta events.
# Resets to 0 on server restart; clients reset _lastDeltaSeq on every connect.
_delta_seq: int = 0


def _next_seq() -> int:
    global _delta_seq
    _delta_seq += 1
    return _delta_seq


class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)
        logger.info("WS connected, total: %d", len(self.active))

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)
        logger.info("WS disconnected, total: %d", len(self.active))

    async def broadcast(self, state: dict):
        data = json.dumps({"type": "state_update", "payload": state}, ensure_ascii=False)
        disconnected = []
        for ws in list(self.active):  # snapshot — prevents mid-iteration mutation if
                                        # a concurrent finally-clause calls disconnect()
            try:
                await ws.send_text(data)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.disconnect(ws)

    async def broadcast_event(self, event_type: str, payload: dict):
        """Emit a typed event (e.g. 'neuer-tag') to all connected clients per PRD §4.3."""
        data = json.dumps({"type": event_type, "payload": payload}, ensure_ascii=False)
        disconnected = []
        for ws in list(self.active):  # snapshot — same race as broadcast() above
            try:
                await ws.send_text(data)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.disconnect(ws)


ws_manager = ConnectionManager()
