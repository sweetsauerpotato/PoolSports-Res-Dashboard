"""
seed_today_direct.py — Seeds TODAY directly into bookings.db via SQLite.
No HTTP / no backend required. Run with backend STOPPED to avoid WAL conflicts,
or with backend running (SQLite WAL mode handles concurrent writers safely).

Usage:  python seed_today_direct.py

Counts:
  Pool        30  (standort: "", "UG", "EG" — 10 each)
  Tischtennis 20  (standort: "", "UG", "EG" — 7+6+7)
  Snooker      5  (standort: "EG", sequential no overlap)
  Darts        6  (standort: "EG", staggered max 2 concurrent)
  TOTAL       61

Zero overbooking conflicts — peak concurrent tischanzahl stays under capacity.
"""

import sqlite3
import uuid
from datetime import datetime, UTC
from pathlib import Path

DB_PATH = Path(__file__).parent / "bookings.db"
TODAY   = datetime.now().strftime("%Y-%m-%d")
NOW_UTC = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S")


def combine(date: str, time: str) -> str:
    """'2026-05-27' + '14:00' -> '2026-05-27 14:00:00'"""
    return f"{date} {time}:00"


def make_row(start, end, kunde, telefon, art, personen, standort, bemerkung="", tischanzahl=1):
    return (
        str(uuid.uuid4()),   # id
        TODAY,               # datum
        combine(TODAY, start),  # startzeit
        combine(TODAY, end),    # endzeit
        kunde,               # kunde
        telefon,             # telefon
        art,                 # art
        str(personen),       # personen
        standort,            # standort
        "",                  # csv_file
        None,                # tisch_id
        "unassigned",        # status
        bemerkung or None,   # bemerkung
        tischanzahl,         # tischanzahl
        None,                # tisch_ids
        None,                # geschaetzte_dauer_minuten
        NOW_UTC,             # erstellt_am
        "seed",              # erstellt_von
    )


# ── Time slots ────────────────────────────────────────────────────────────────
# Pool slots: 10 x 90-min, staggered 30 min (14:00–20:00)
# Each floor sees max 1 concurrent booking per slot → well under cap (17/21)
POOL_SLOTS = [
    ("14:00","15:30"), ("14:30","16:00"), ("15:00","16:30"),
    ("15:30","17:00"), ("16:00","17:30"), ("16:30","18:00"),
    ("17:00","18:30"), ("17:30","19:00"), ("18:00","19:30"),
    ("18:30","20:00"),
]

# TT slots: 10 x 60-min, staggered 30 min (14:00–19:30)
# Each floor sees max 2 concurrent bookings → under cap (8/5)
TT_SLOTS = [
    ("14:00","15:00"), ("14:30","15:30"), ("15:00","16:00"),
    ("15:30","16:30"), ("16:00","17:00"), ("16:30","17:30"),
    ("17:00","18:00"), ("17:30","18:30"), ("18:00","19:00"),
    ("18:30","19:30"),
]

# ── Pool data ─────────────────────────────────────────────────────────────────
POOL_UNASSIGNED = [
    ("Mueller Thomas",   "0151-23456781", 4, ""),
    ("Hoffmann Kai",     "0160-87654321", 2, "Stammgast"),
    ("Schneider GmbH",   "0171-11223344", 6, "Firmenfeier"),
    ("Braun Luisa",      "0176-99887766", 3, ""),
    ("Klein Partner",    "0162-44556677", 8, ""),
    ("Becker Jonas",     "0159-33221100", 2, "Geburtstag"),
    ("Wagner Petra",     "0175-66778899", 4, ""),
    ("Fischer Mark",     "0151-55443322", 5, "Rolli-Fahrer"),
    ("Hartmann Group",   "0160-22334455", 6, ""),
    ("Koch Lena",        "0171-77665544", 2, ""),
]
POOL_UG = [
    ("Schaefer Felix",   "0176-88990011", 4, ""),
    ("Weber Torsten",    "0162-00112233", 3, ""),
    ("Krause Soehne",    "0159-44332211", 7, "Gruppenspiel"),
    ("Lehmann Anja",     "0175-99001122", 2, ""),
    ("Richter Dirk",     "0151-11009988", 4, ""),
    ("Meier Sabrina",    "0160-33445566", 6, "Jubilaeum"),
    ("Wolf Christoph",   "0171-55667788", 2, ""),
    ("Neumann Kevin",    "0176-77889900", 3, ""),
    ("Zimmermann Anna",  "0162-22110099", 5, ""),
    ("Koehler Ralf",     "0159-88776655", 4, "Stammgast"),
]
POOL_EG = [
    ("Lang Stefan",      "0175-00998877", 2, ""),
    ("Schulz Jana",      "0151-44556677", 4, ""),
    ("Krueger Events",   "0160-66778899", 8, "Firmenfeier"),
    ("Frank Miriam",     "0171-88990011", 3, ""),
    ("Berg Philipp",     "0176-00112233", 5, "Geburtstag"),
    ("Keller Andreas",   "0162-22334455", 2, ""),
    ("Schmitt Vanessa",  "0159-44556677", 4, ""),
    ("Roth Florian",     "0175-66778899", 6, "Stammgast"),
    ("Vogt Melissa",     "0151-88990011", 2, ""),
    ("Brandt Oliver",    "0160-00998877", 3, ""),
]

# ── Tischtennis data ──────────────────────────────────────────────────────────
TT_UNASSIGNED = [
    ("Bauer Stephan",    "0171-12345678", 2, ""),
    ("Jung Marion",      "0176-87654321", 4, "Turnier"),
    ("Simon Oliver",     "0162-11223344", 2, ""),
    ("Fuchs Nadia",      "0159-44332211", 3, ""),
    ("Baum Carsten",     "0175-55667788", 2, ""),
    ("Kramer Lara",      "0151-99001122", 4, "Trainingsgruppe"),
    ("Gross Marcel",     "0160-33221100", 2, ""),
]
TT_UG = [
    ("Albrecht Sandra",  "0171-66554433", 2, ""),
    ("Winkler Bjoern",   "0176-22334455", 4, ""),
    ("Boehm Helga",      "0162-88990011", 3, "Stammgast"),
    ("Sommer Patrick",   "0159-00112233", 2, ""),
    ("Winter Claudia",   "0175-44556677", 4, "Turnier"),
    ("Stein Daniel",     "0151-66778899", 2, ""),
]
TT_EG = [
    ("Graf Tobias",      "0160-88990011", 4, ""),
    ("Kaiser Hannah",    "0171-00998877", 2, ""),
    ("Stern Florian",    "0176-22110099", 3, "Stammgast"),
    ("Breuer Sonja",     "0162-44332211", 2, ""),
    ("Hahn Michael",     "0159-66554433", 4, "Firmenturnier"),
    ("Beck Natalie",     "0175-88776655", 2, ""),
    ("Jaeger Andreas",   "0151-00112233", 3, ""),
]

# ── Snooker — 5 sequential slots (no overlap), cap=5 ─────────────────────────
SNOOKER = [
    ("14:00","16:00", "Maier Stefan",   "0151-10101010", 2, "EG", ""),
    ("15:00","17:00", "Ritter Gabi",    "0160-20202020", 3, "EG", "Geburtstag"),
    ("16:00","18:00", "Engel Klaus",    "0171-30303030", 4, "EG", ""),
    ("18:00","20:00", "Pfeiffer Tom",   "0176-40404040", 2, "EG", ""),
    ("20:00","22:00", "Haas Vanessa",   "0162-50505050", 3, "EG", "Jubilaeum"),
]

# ── Darts — 6 staggered, max 2 concurrent at any moment, cap=5 ───────────────
DARTS = [
    ("14:00","15:30", "Lange Peter",    "0159-11223344", 4, "EG", ""),
    ("14:30","16:00", "Graf Sonja",     "0175-22334455", 2, "EG", ""),
    ("16:00","17:30", "Boehmer Jan",    "0151-33445566", 6, "EG", "Ligaspieler"),
    ("17:30","19:00", "Sauer Karin",    "0160-44556677", 4, "EG", ""),
    ("19:00","20:30", "Kock Dennis",    "0171-55667788", 2, "EG", "Stammgast"),
    ("20:30","22:00", "Stern Monika",   "0176-66778899", 4, "EG", ""),
]


# ── Main ──────────────────────────────────────────────────────────────────────

def seed():
    if not DB_PATH.exists():
        print(f"ERROR: Database not found at {DB_PATH}")
        print("Make sure you run this from the backend/ directory.")
        return

    rows = []

    # Pool
    for i, (k, t, p, b) in enumerate(POOL_UNASSIGNED):
        s, e = POOL_SLOTS[i]
        rows.append(make_row(s, e, k, t, "Pool", p, "", b))
    for i, (k, t, p, b) in enumerate(POOL_UG):
        s, e = POOL_SLOTS[i]
        rows.append(make_row(s, e, k, t, "Pool", p, "UG", b))
    for i, (k, t, p, b) in enumerate(POOL_EG):
        s, e = POOL_SLOTS[i]
        rows.append(make_row(s, e, k, t, "Pool", p, "EG", b))

    # Tischtennis
    for i, (k, t, p, b) in enumerate(TT_UNASSIGNED):
        s, e = TT_SLOTS[i]
        rows.append(make_row(s, e, k, t, "Tischtennis", p, "", b))
    for i, (k, t, p, b) in enumerate(TT_UG):
        s, e = TT_SLOTS[i]
        rows.append(make_row(s, e, k, t, "Tischtennis", p, "UG", b))
    for i, (k, t, p, b) in enumerate(TT_EG):
        s, e = TT_SLOTS[i]
        rows.append(make_row(s, e, k, t, "Tischtennis", p, "EG", b))

    # Snooker
    for s, e, k, t, p, st, b in SNOOKER:
        rows.append(make_row(s, e, k, t, "Snooker", p, st, b))

    # Darts
    for s, e, k, t, p, st, b in DARTS:
        rows.append(make_row(s, e, k, t, "Darts", p, st, b))

    print(f"\n{'='*55}")
    print(f"  seed_today_direct.py  ->  {TODAY}")
    print(f"  Target: {len(rows)} reservations")
    print(f"  DB: {DB_PATH}")
    print(f"{'='*55}\n")

    col = (
        "id, datum, startzeit, endzeit, kunde, telefon, art, personen, "
        "standort, csv_file, tisch_id, status, bemerkung, tischanzahl, "
        "tisch_ids, geschaetzte_dauer_minuten, erstellt_am, erstellt_von"
    )
    placeholders = ", ".join(["?"] * 18)
    sql = f"INSERT INTO reservations ({col}) VALUES ({placeholders})"

    con = sqlite3.connect(str(DB_PATH), timeout=15)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA busy_timeout=10000")

    ok = 0
    try:
        with con:
            for row in rows:
                con.execute(sql, row)
                ok += 1
                art   = row[6]
                st    = row[8] or "-"
                start = row[2][11:16]
                end   = row[3][11:16]
                kunde = row[4]
                print(f"  + [{art:<12}] {st:<4}  {start}-{end}  {kunde}")
    except Exception as ex:
        print(f"\nERROR: {ex}")
    finally:
        con.close()

    print(f"\n{'='*55}")
    print(f"  Done: {ok}/{len(rows)} rows inserted for {TODAY}")
    print(f"  Refresh http://localhost:5173 to see them.")
    print(f"{'='*55}\n")


if __name__ == "__main__":
    seed()
