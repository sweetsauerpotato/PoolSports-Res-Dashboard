import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
STATE_FILE = DATA_DIR / "state.json"
STATE_TMP = DATA_DIR / "state.tmp.json"
BACKUP_DIR_ENV = os.getenv("GOOGLE_DRIVE_BACKUP_PATH")
if BACKUP_DIR_ENV:
    BACKUP_DIR = Path(BACKUP_DIR_ENV)
else:
    BACKUP_DIR = DATA_DIR / "backups"

MAX_BACKUPS = 168

DATA_DIR.mkdir(exist_ok=True)
BACKUP_DIR.mkdir(parents=True, exist_ok=True)
