import json
import asyncio
import os
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import STATE_FILE, STATE_TMP, BACKUP_DIR, MAX_BACKUPS

logger = logging.getLogger(__name__)


def utc_ms_now() -> str:
    """Return UTC now as ISO 8601 with 3-decimal millisecond precision and Z suffix.

    Matches JavaScript's new Date().toISOString() format exactly:
      '2026-06-27T19:00:00.150Z'

    Critical for string comparison correctness: Python's datetime.isoformat() produces
    6 decimal digits (microseconds). JS produces 3. At the precision boundary the
    4th digit ('0'-'9', ASCII 48-57) is always less than 'Z' (ASCII 90), making
    Python timestamps sort below JS timestamps for the same millisecond — breaking
    the Sprint 2.4 guard and the no-op guard in delta handlers.
    Using a single datetime object avoids a two-call race across a millisecond boundary.
    """
    dt = datetime.now(timezone.utc)
    return dt.strftime('%Y-%m-%dT%H:%M:%S.') + f'{dt.microsecond // 1000:03d}Z'

DEFAULT_STATE = {
    "version": "1.1.0",
    "date": datetime.now().strftime("%Y-%m-%d"),
    "reservations": {},
    "csv_files": [],
    "table_sessions": {},
    "tables_defekt": [],
    "last_updated": utc_ms_now(),
}


class StateManager:
    def __init__(self):
        self._lock = asyncio.Lock()
        self._state: dict[str, Any] = {}
        self._ws_broadcast = None

    def set_broadcast(self, fn):
        self._ws_broadcast = fn

    def load(self):
        if STATE_FILE.exists():
            try:
                with open(STATE_FILE, "r", encoding="utf-8") as f:
                    self._state = json.load(f)
                logger.info("State loaded from %s", STATE_FILE)
                return
            except (json.JSONDecodeError, OSError) as e:
                logger.error("Corrupt state file: %s", e)
                self._try_restore_backup()
                return

        if STATE_TMP.exists():
            try:
                with open(STATE_TMP, "r", encoding="utf-8") as f:
                    self._state = json.load(f)
                self._atomic_write()
                logger.info("Recovered from tmp file")
                return
            except Exception:
                pass

        self._state = dict(DEFAULT_STATE)
        self._atomic_write()
        logger.info("Created fresh state")

    def _try_restore_backup(self):
        backups = sorted(BACKUP_DIR.glob("state-*.json"), reverse=True)
        for bp in backups:
            try:
                with open(bp, "r", encoding="utf-8") as f:
                    self._state = json.load(f)
                self._atomic_write()
                logger.info("Restored from backup %s", bp.name)
                return
            except Exception:
                continue
        self._state = dict(DEFAULT_STATE)
        self._atomic_write()
        logger.warning("No valid backup found, using defaults")

    def _atomic_write(self):
        data = json.dumps(self._state, ensure_ascii=False, indent=2)
        with open(STATE_TMP, "w", encoding="utf-8") as f:
            f.write(data)
        os.replace(str(STATE_TMP), str(STATE_FILE))

    @property
    def state(self) -> dict[str, Any]:
        return self._state

    async def update(self, mutator):
        async with self._lock:
            mutator(self._state)
            self._state["last_updated"] = utc_ms_now()
            self._atomic_write()
            if self._ws_broadcast:
                await self._ws_broadcast(self._state)

    def create_backup(self):
        now = datetime.now().strftime("%Y-%m-%d-%H-00")
        path = BACKUP_DIR / f"state-{now}.json"
        data = json.dumps(self._state, ensure_ascii=False, indent=2)
        with open(path, "w", encoding="utf-8") as f:
            f.write(data)
        self._cleanup_backups()
        logger.info("Backup created: %s", path.name)

    def _cleanup_backups(self):
        backups = sorted(BACKUP_DIR.glob("state-*.json"), reverse=True)
        for old in backups[MAX_BACKUPS:]:
            old.unlink(missing_ok=True)


state_manager = StateManager()
