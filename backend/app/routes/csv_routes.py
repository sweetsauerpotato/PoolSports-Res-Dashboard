import csv
import io
import json
import logging
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from ..models import DeleteCsvRequest
from ..state import state_manager
from ..deps import require_staff_pin
from datetime import datetime
import pytz

router = APIRouter(prefix="/api")


# ─── CSV column mapping ──────────────────────────────────────
# The upload accepts TWO formats:
#   1. Legacy/manual CSV:  comma-delimited, Title-case headers
#      Kunde, Personen, Art, Standort, Startzeit, Endzeit, Bemerkung
#   2. Backup CSV:  semicolon-delimited, lowercase headers
#      startzeit, endzeit, kunde, art, personen, standort, status,
#      tisch_ids, tischanzahl, bemerkung
#
# We normalise all headers to lowercase for matching.

_FIELD_MAP = {
    # lowercase header → internal field name
    "kunde":       "kunde",
    "personen":    "personen",
    "art":         "art",
    "standort":    "standort",
    "startzeit":   "startzeit",
    "endzeit":     "endzeit",
    "bemerkung":   "bemerkung",
    "status":      "status",
    "tisch_ids":   "tisch_ids",
    "tischanzahl": "tischanzahl",
}

_REQUIRED_FIELDS = {"kunde", "personen", "art", "startzeit", "endzeit"}


def _detect_delimiter(first_line: str) -> str:
    """Auto-detect semicolon vs comma delimiter from the header line."""
    if ";" in first_line:
        return ";"
    return ","


def _normalise_headers(raw_headers: list[str]) -> dict[str, str]:
    """
    Build mapping: normalised_header → internal_field_name.
    Accepts Title-case (Kunde) and lowercase (kunde).
    """
    mapping = {}
    for h in raw_headers:
        key = h.strip().lower()
        if key in _FIELD_MAP:
            mapping[h.strip()] = _FIELD_MAP[key]
    return mapping


@router.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...), pin: str = Depends(require_staff_pin)):
    safe_filename = Path(file.filename).name
    content = await file.read()
    text = content.decode("utf-8-sig")

    lines = text.strip().split("\n")
    if not lines:
        raise HTTPException(400, "Empty CSV")

    delimiter = _detect_delimiter(lines[0])
    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)

    if not reader.fieldnames:
        raise HTTPException(400, "Empty CSV — no header row found")

    header_map = _normalise_headers(reader.fieldnames)
    found_fields = set(header_map.values())
    missing = _REQUIRED_FIELDS - found_fields

    if missing:
        raise HTTPException(400, {
            "detail": f"Fehlende Spalten: {', '.join(sorted(missing))}",
            "errorCode": "CSV_FORMAT_ERROR",
            "hint": (
                "Erwartetes Format (Komma ODER Semikolon als Trennzeichen):\n"
                "  Format A (manuell): Kunde, Personen, Art, Standort, Startzeit, Endzeit, Bemerkung\n"
                "  Format B (Backup):  startzeit;endzeit;kunde;art;personen;standort;status;tisch_ids;tischanzahl;bemerkung"
            ),
        })

    berlin = pytz.timezone("Europe/Berlin")
    heute = datetime.now(berlin).strftime("%Y-%m-%d")

    rows = []
    for i, row in enumerate(reader):
        # Extract fields using the header mapping
        def get(field_name, default=""):
            for csv_header, mapped_name in header_map.items():
                if mapped_name == field_name:
                    return (row.get(csv_header) or "").strip()
            return default

        kunde = get("kunde")
        if not kunde:
            continue

        start_raw = get("startzeit")
        if " " in start_raw:
            datum = start_raw.split(" ")[0]
            if datum != heute:
                continue
            start_time = start_raw.split(" ")[1][:5]
        else:
            datum = heute
            start_time = start_raw[:5] if len(start_raw) >= 5 else start_raw

        end_raw = get("endzeit").strip()
        # Open-end bookings: endzeit is empty string in DB and CSV — preserve it
        if not end_raw or end_raw.lower() == "none":
            end_time = ""
        elif " " in end_raw:
            end_time = end_raw.split(" ")[1][:5]
        else:
            end_time = end_raw[:5] if len(end_raw) >= 5 else end_raw

        entry = {
            "id": f"r-{safe_filename}-{uuid.uuid4().hex[:8]}-{i}",
            "datum": datum,
            "kunde": kunde,
            "personen": get("personen"),
            "art": get("art"),
            "standort": get("standort"),
            "startzeit": start_time,
            "endzeit": end_time,
            "bemerkung": get("bemerkung"),
            "tisch_id": None,
            "status": "unassigned",
            "csv_file": safe_filename,
        }

        # If backup CSV includes tisch_ids / tischanzahl, preserve them
        if "tisch_ids" in found_fields:
            raw_ids = get("tisch_ids")
            if raw_ids and raw_ids != "[]":
                try:
                    parsed_ids = json.loads(raw_ids.replace("'", '"'))
                    if isinstance(parsed_ids, list) and parsed_ids:
                        entry["tisch_ids"] = [str(x) for x in parsed_ids]
                        entry["tisch_id"] = entry["tisch_ids"][0]
                except Exception:
                    pass
        if "tischanzahl" in found_fields:
            ta = get("tischanzahl")
            if ta:
                entry["tischanzahl"] = int(ta) if ta.isdigit() else 1

        rows.append(entry)

    csv_entry = {
        "filename": safe_filename,
        "uploaded_at": datetime.now().isoformat(),
        "row_count": len(rows),
    }

    def mutate(s):
        s["csv_files"].append(csv_entry)
        for r in rows:
            s["reservations"][r["id"]] = r

    await state_manager.update(mutate)
    return {"ok": True, "count": len(rows)}


@router.post("/delete-csv")
async def delete_csv(req: DeleteCsvRequest, pin: str = Depends(require_staff_pin)):
    def mutate(s):
        s["csv_files"] = [f for f in s["csv_files"] if f["filename"] != req.filename]
        to_remove = [
            rid for rid, r in s["reservations"].items()
            if r.get("csv_file") == req.filename
        ]
        for rid in to_remove:
            r = s["reservations"][rid]
            if r.get("tisch_id"):
                s["table_sessions"].pop(r["tisch_id"], None)
            if r.get("tisch_ids"):
                for tid in r["tisch_ids"]:
                    s["table_sessions"].pop(tid, None)
            del s["reservations"][rid]

    await state_manager.update(mutate)
    return {"ok": True}
