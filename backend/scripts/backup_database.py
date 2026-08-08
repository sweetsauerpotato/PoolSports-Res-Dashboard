#!/usr/bin/env python3
"""
PSL Database Backup Script — DB + CSV + JSON
Destination: Google Drive (local synced folder, 3 sub-folders)
Method: SQLite Online Backup API (WAL-safe) + CSV export + state.json snapshot
Google Drive for Desktop syncs output files to the cloud automatically.

Usage:
  python backup_database.py                  # Full hourly backup (DB + CSV + JSON)
  python backup_database.py --csv-only OUT   # One-off full CSV export to OUT path
"""

import csv
import json
import sqlite3
import os
import sys
import argparse
from datetime import datetime
from pathlib import Path

# ─── CONFIGURATION ────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent

# Source database search order
SOURCE_DB_PATHS = [
    SCRIPT_DIR.parent / "bookings.db",          # backend/bookings.db
    PROJECT_ROOT / "backend" / "bookings.db",
    PROJECT_ROOT / "bookings.db",
    PROJECT_ROOT / "data" / "bookings.db",
]

# state.json search order
STATE_JSON_PATHS = [
    PROJECT_ROOT / "data" / "state.json",
    PROJECT_ROOT / "state.json",
    PROJECT_ROOT / "frontend" / "public" / "state.json",
]

# Google Drive sub-folders
BACKUP_ROOT = Path(os.environ.get(
    "PSL_BACKUP_DIR",
    os.environ.get(
        "GOOGLE_DRIVE_BACKUP_PATH",
        "G:/My Drive/PoolSports-Backups"
    )
))
DIR_DB   = BACKUP_ROOT / "01_Datenbank-DB"
DIR_CSV  = BACKUP_ROOT / "02_Reservierungen-CSV"
DIR_JSON = BACKUP_ROOT / "03_Status-JSON"
MAX_KEEP = 168  # 7 days × 24 hourly backups

# CSV export column order (German names as in PRD)
CSV_COLUMNS = [
    "startzeit", "endzeit", "kunde", "art", "personen",
    "standort", "status", "tisch_ids", "tischanzahl", "bemerkung",
]

# ──────────────────────────────────────────────────────────────


def find_source_db() -> Path:
    for path in SOURCE_DB_PATHS:
        if path.exists() and path.stat().st_size > 0:
            return path
    raise FileNotFoundError(
        "bookings.db not found. Checked: "
        + str([str(p) for p in SOURCE_DB_PATHS])
    )


def find_state_json() -> Path | None:
    for path in STATE_JSON_PATHS:
        if path.exists() and path.stat().st_size > 0:
            return path
    # Also search two levels up from bookings.db
    try:
        db = find_source_db()
        for candidate in db.parent.parent.rglob("state.json"):
            if candidate.stat().st_size > 0:
                return candidate
    except FileNotFoundError:
        pass
    return None


def ensure_dirs() -> None:
    """Create all backup sub-folders if they don't exist."""
    for d in [DIR_DB, DIR_CSV, DIR_JSON]:
        d.mkdir(parents=True, exist_ok=True)

    # Quick write test on root
    test_file = BACKUP_ROOT / ".psl_write_test"
    try:
        test_file.write_text("test")
        test_file.unlink()
    except Exception as e:
        raise RuntimeError(
            f"Cannot write to backup folder {BACKUP_ROOT}: {e}"
        )


# ─── 1. DB BACKUP ────────────────────────────────────────────

def backup_database(source: Path, dest: Path) -> tuple[int, tuple]:
    """
    SQLite Online Backup API — the ONLY correct method for WAL databases.
    Uses LOCAL TEMP → ATOMIC MOVE to prevent Google Drive lock conflicts.
    Returns (record_count, date_range) for verification.
    """
    import tempfile
    import shutil

    dest.parent.mkdir(parents=True, exist_ok=True)

    # Write to local temp — keeps Drive sync out of the write process
    with tempfile.NamedTemporaryFile(
        suffix=".db", delete=False, dir=tempfile.gettempdir()
    ) as tmp:
        tmp_path = Path(tmp.name)

    source_conn = sqlite3.connect(str(source))
    dest_conn = sqlite3.connect(str(tmp_path))
    try:
        source_conn.backup(dest_conn, pages=100, progress=None)
    finally:
        dest_conn.close()
        source_conn.close()

    # Atomic move to Drive folder — only after file is fully closed
    if dest.exists():
        dest.unlink()
    shutil.move(str(tmp_path), str(dest))

    # Verify from the final destination
    verify_conn = sqlite3.connect(str(dest))
    try:
        cur = verify_conn.cursor()
        cur.execute("SELECT COUNT(*) FROM reservations")
        count = cur.fetchone()[0]
        cur.execute("SELECT MIN(startzeit), MAX(startzeit) FROM reservations")
        date_range = cur.fetchone()
    finally:
        verify_conn.close()

    return count, date_range


# ─── 2. CSV EXPORT ────────────────────────────────────────────

def _get_existing_columns(db_path: Path) -> list[str]:
    """Discover which CSV_COLUMNS actually exist in the reservations table."""
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(reservations)")
        db_cols = {row[1] for row in cur.fetchall()}
    finally:
        conn.close()
    return [c for c in CSV_COLUMNS if c in db_cols]


def export_csv(source: Path, dest: Path) -> int:
    """
    Export reservations to semicolon-delimited CSV (utf-8-sig BOM for German Excel).
    Returns number of data rows written.
    """
    existing_cols = _get_existing_columns(source)

    conn = sqlite3.connect(str(source))
    try:
        cur = conn.cursor()
        col_list = ", ".join(f"[{c}]" for c in existing_cols)
        cur.execute(f"SELECT {col_list} FROM reservations ORDER BY startzeit ASC, id ASC")
        rows = cur.fetchall()
    finally:
        conn.close()

    with open(dest, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f, delimiter=";")
        # Header row: always all CSV_COLUMNS (empty string for missing ones)
        writer.writerow(CSV_COLUMNS)
        for row in rows:
            # Map existing columns into the full CSV_COLUMNS order
            row_dict = dict(zip(existing_cols, row))
            # Sanitise: None → "" to prevent csv.writer outputting literal "None"
            # (critical for open-end bookings where endzeit is empty string in DB)
            writer.writerow([row_dict.get(c, "") or "" for c in CSV_COLUMNS])

    # Verify by re-reading
    with open(dest, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f, delimiter=";")
        next(reader)  # skip header
        csv_count = sum(1 for _ in reader)

    return csv_count


# ─── 3. JSON EXPORT ──────────────────────────────────────────

def export_state_json(dest: Path) -> bool:
    """
    Copy state.json as a timestamped snapshot. Validates JSON before writing.
    Returns True on success, False on skip (with warning logged).
    """
    source = find_state_json()
    if source is None:
        print("  WARNING: state.json not found — skipping JSON export")
        return False

    try:
        raw = source.read_text(encoding="utf-8")
        data = json.loads(raw)  # validate
    except (json.JSONDecodeError, OSError) as e:
        print(f"  WARNING: state.json invalid or unreadable ({e}) — skipping JSON export")
        return False

    dest.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    return True


# ─── ROTATION ─────────────────────────────────────────────────

def rotate_folder(folder: Path, glob_pattern: str) -> None:
    """Keep only MAX_KEEP newest files matching the pattern."""
    files = sorted(
        folder.glob(glob_pattern),
        key=lambda p: p.stat().st_mtime,
        reverse=True
    )
    rotated = 0
    for old in files[MAX_KEEP:]:
        old.unlink(missing_ok=True)
        # Also remove companion manifest if it exists
        manifest = old.with_suffix(".manifest.txt")
        if manifest.exists():
            manifest.unlink(missing_ok=True)
        rotated += 1
    if rotated:
        print(f"  Rotated {rotated} old files in {folder.name}")


# ─── MANIFEST ─────────────────────────────────────────────────

def write_manifest(db_file: Path, csv_file: Path | None, json_file: Path | None,
                   record_count: int, csv_rows: int, date_range: tuple,
                   source: Path) -> None:
    manifest = db_file.with_suffix(".manifest.txt")
    lines = [
        "PSL Backup Manifest",
        "===================",
        f"Timestamp:     {datetime.now().isoformat()}",
        f"Source DB:     {source.resolve()}",
        f"",
        f"[DB Backup]",
        f"  File:        {db_file.name}",
        f"  Size:        {db_file.stat().st_size:,} bytes",
        f"  Records:     {record_count:,}",
        f"  Earliest:    {date_range[0]}",
        f"  Latest:      {date_range[1]}",
        f"  Method:      SQLite Online Backup API (WAL-safe)",
        f"",
    ]
    if csv_file and csv_file.exists():
        lines += [
            f"[CSV Export]",
            f"  File:        {csv_file.name}",
            f"  Size:        {csv_file.stat().st_size:,} bytes",
            f"  Rows:        {csv_rows:,}",
            f"  Delimiter:   semicolon (;)",
            f"  Encoding:    utf-8-sig (BOM)",
            f"",
        ]
    if json_file and json_file.exists():
        lines += [
            f"[JSON Export]",
            f"  File:        {json_file.name}",
            f"  Size:        {json_file.stat().st_size:,} bytes",
            f"",
        ]
    lines.append(f"Status:        {'OK' if record_count > 0 else 'CRITICAL: 0 records'}")
    manifest.write_text("\n".join(lines) + "\n", encoding="utf-8")


# ─── MAIN ─────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(description="PSL Backup Script")
    parser.add_argument(
        "--csv-only", metavar="OUTPATH",
        help="Export full-history CSV to a specific path and exit"
    )
    args = parser.parse_args()

    # ── --csv-only mode: one-off full export ──────────────────
    if args.csv_only:
        try:
            source = find_source_db()
            dest = Path(args.csv_only)
            dest.parent.mkdir(parents=True, exist_ok=True)
            count = export_csv(source, dest)
            print(f"[PSL CSV Export] {count} rows -> {dest}")
            return 0
        except Exception as e:
            print(f"ERROR: {e}", file=sys.stderr)
            return 1

    # ── Normal hourly backup: DB + CSV + JSON ─────────────────
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    db_filename   = f"bookings_backup_{timestamp}.db"
    csv_filename  = f"reservierungen_{timestamp}.csv"
    json_filename = f"status_{timestamp}.json"

    db_count = 0
    csv_rows = 0
    json_ok = False
    db_file = None
    csv_file = None
    json_file = None

    try:
        source = find_source_db()
        ensure_dirs()
        print(f"Source DB:   {source} ({source.stat().st_size:,} bytes)")

        # 1. DB backup
        db_file = DIR_DB / db_filename
        db_count, date_range = backup_database(source, db_file)
        if db_count == 0:
            print("CRITICAL: Backup contains 0 records.", file=sys.stderr)
            return 1
        print(f"  DB:   {db_count:,} records -> {db_file.name} ({db_file.stat().st_size:,} bytes)")

        # 2. CSV export (from the DB backup, not the live DB — consistent snapshot)
        csv_file = DIR_CSV / csv_filename
        csv_rows = export_csv(db_file, csv_file)
        print(f"  CSV:  {csv_rows:,} rows -> {csv_file.name} ({csv_file.stat().st_size:,} bytes)")
        if csv_rows != db_count:
            print(f"  WARNING: CSV rows ({csv_rows}) != DB records ({db_count})")

        # 3. JSON state snapshot
        json_file = DIR_JSON / json_filename
        json_ok = export_state_json(json_file)
        if json_ok:
            print(f"  JSON: OK -> {json_file.name} ({json_file.stat().st_size:,} bytes)")

        # 4. Manifest
        write_manifest(db_file, csv_file, json_file if json_ok else None,
                       db_count, csv_rows, date_range, source)

        # 5. Rotation for all three folders
        rotate_folder(DIR_DB,   "bookings_backup_*.db")
        rotate_folder(DIR_CSV,  "reservierungen_*.csv")
        rotate_folder(DIR_JSON, "status_*.json")

        # Summary line
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        json_status = "OK" if json_ok else "SKIP"
        print(f"[PSL Backup] DB: {db_count} records | CSV: {csv_rows} rows | JSON: {json_status} | {now}")
        return 0

    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
