"""
init_db — Creates all SQLAlchemy tables on startup and runs additive migrations.
Called once from main.py lifespan().
"""
from sqlalchemy import text
from .database import engine, Base
from .models_db import Reservation  # noqa: F401 — import ensures model is registered

# Additive migrations — runs after create_all.
# SQLite does not support IF NOT EXISTS on ALTER TABLE, so we catch duplicate-column errors.
_MIGRATIONS = [
    "ALTER TABLE reservations ADD COLUMN tischanzahl INTEGER DEFAULT 1",
    "ALTER TABLE reservations ADD COLUMN tisch_ids TEXT NULL",
    "ALTER TABLE reservations ADD COLUMN geschaetzte_dauer_minuten INTEGER NULL",
    "CREATE INDEX IF NOT EXISTS idx_res_tisch_id ON reservations (tisch_id)",
]

_SEEDS = [
    "INSERT OR IGNORE INTO system_settings (key, value) VALUES ('RUSH_MODE_MINUTEN', '120')",
]

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Apply additive column migrations idempotently
        for sql in _MIGRATIONS:
            try:
                await conn.execute(text(sql))
            except Exception:
                pass  # Column already exists — safe to ignore
        
        # Apply seeds
        for sql in _SEEDS:
            try:
                await conn.execute(text(sql))
            except Exception:
                pass
