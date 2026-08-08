import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.asyncio import AsyncIOScheduler


from .state import state_manager
from .ws.manager import ws_manager
from .routes import auth, tables, csv_routes, admin, reservations, availability
from .init_db import init_db
from .database import engine
from .config import STATE_FILE
# Unified backup: DB + CSV + JSON via backup_database.py
import subprocess, sys

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    state_manager.load()
    state_manager.set_broadcast(ws_manager.broadcast)
    
    # Unified hourly backup: DB + CSV + JSON → Google Drive sub-folders
    def run_unified_backup():
        script = Path(__file__).resolve().parent.parent / "scripts" / "backup_database.py"
        try:
            result = subprocess.run(
                [sys.executable, str(script)],
                capture_output=True, text=True, timeout=120,
            )
            if result.returncode == 0:
                logger.info("Unified backup OK: %s", result.stdout.strip().split('\n')[-1])
            else:
                logger.error("Unified backup FAILED (exit %d): %s", result.returncode, result.stderr.strip())
        except Exception as e:
            logger.error("Unified backup exception: %s", e)

    scheduler.add_job(run_unified_backup, "interval", hours=1)
    
    scheduler.start()
    logger.info("Backend started")
    yield
    scheduler.shutdown()
    logger.info("Backend stopped")


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tables.router)
app.include_router(csv_routes.router)
app.include_router(admin.router)
app.include_router(reservations.router)
app.include_router(availability.router)


@app.get("/api/health")
async def health():
    errors = {}

    # Check SQLite connectivity
    try:
        async with AsyncSession(engine) as session:
            await session.execute(text("SELECT 1"))
    except Exception as e:
        errors["sqlite"] = str(e)

    # Check state.json readable and valid JSON
    try:
        if not STATE_FILE.exists():
            raise FileNotFoundError("state.json not found")
        if STATE_FILE.stat().st_size == 0:
            raise ValueError("state.json is empty")
        json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except Exception as e:
        errors["state_json"] = str(e)

    if errors:
        raise HTTPException(status_code=503, detail=errors)

    return {"status": "ok", "sqlite": "ok", "state_json": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws_manager.connect(ws)
    try:
        await ws.send_text(json.dumps(
            {"type": "state_update", "payload": state_manager.state},
            ensure_ascii=False,
        ))
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        # Normal disconnect path. Suppress exception so uvicorn does not
        # log it as an unhandled application error. Cleanup runs in finally.
        pass
    finally:
        # Guaranteed cleanup regardless of exception type:
        # WebSocketDisconnect (clean close / TCP RST / keepalive timeout),
        # RuntimeError (protocol state violation), or
        # asyncio.CancelledError (server shutdown).
        ws_manager.disconnect(ws)


static_dir = Path(__file__).parent.parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
