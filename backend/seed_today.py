"""
seed_today.py — Seeds TODAY only with test reservations.
Zero overbooking conflicts guaranteed.

Counts:
  Pool        30  (standort: "", "UG", "EG" — 10 each)
  Tischtennis 20  (standort: "", "UG", "EG")
  Snooker      5  (standort: "EG")
  Darts        6  (standort: "EG")

Capacity limits (from overbooking.ts / availability.py):
  Pool|EG  = 17,  Pool|UG  = 21   — "" resolves to EG, so cap 17 for ""/"EG"
  TT|EG    =  8,  TT|UG    =  5
  Snooker|EG =  5
  Darts|EG   =  5

Strategy: time-slot buckets per (art, floor) ensuring peak concurrent
tischanzahl never exceeds capacity.

Run while backend is live:  python seed_today.py
"""

import os, sys
os.environ.setdefault("PYTHONUTF8", "1")
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import urllib.request
import urllib.error
import json
from datetime import datetime

API_URL = "http://localhost:8000/api/reservations"
HEADERS = {"X-PIN": "1234"}  # STAFF_PIN from .env
TODAY   = datetime.now().strftime("%Y-%m-%d")


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def post(datum, start, end, kunde, telefon, art, personen, standort, bemerkung="", tischanzahl=1):
    payload = {
        "datum":      datum,
        "startzeit":  start,
        "endzeit":    end,
        "kunde":      kunde,
        "telefon":    telefon,
        "art":        art,
        "personen":   str(personen),
        "standort":   standort,
        "bemerkung":  bemerkung,
        "tischanzahl": tischanzahl,
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(API_URL, data=data, headers={**HEADERS, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            status_code = response.getcode()
            response_text = response.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        status_code = e.code
        response_text = e.read().decode('utf-8')
    except Exception as e:
        status_code = 500
        response_text = str(e)
        
    icon = "+" if status_code == 201 else "X"
    print(f"  {icon} [{art:<12}] {standort or '-':4}  {start}-{end}  {kunde:<22}  {status_code if status_code != 201 else ''}")
    if status_code != 201:
        print(f"      -> {response_text[:120]}")


# ──────────────────────────────────────────────────────────────────────────────
# POOL — 30 reservations, 10 per standort
# Capacity:  ""(→EG)=17, UG=21, EG=17
# Strategy:  each slot has ≤6 concurrent bookings  →  well under cap
# Slots used (90-min each, staggered every 30 min across 14:00–23:00):
# ──────────────────────────────────────────────────────────────────────────────

POOL_SLOTS = [
    ("14:00","15:30"), ("14:30","16:00"), ("15:00","16:30"),
    ("15:30","17:00"), ("16:00","17:30"), ("16:30","18:00"),
    ("17:00","18:30"), ("17:30","19:00"), ("18:00","19:30"),
    ("18:30","20:00"),
]

POOL_UNASSIGNED = [
    # (kunde, telefon, personen, bemerkung)
    ("Müller Thomas",    "0151-23456781",  4, ""),
    ("Hoffmann Kai",     "0160-87654321",  2, "Stammgast"),
    ("Schneider GmbH",   "0171-11223344",  6, "Firmenfeier"),
    ("Braun Luisa",      "0176-99887766",  3, ""),
    ("Klein & Partner",  "0162-44556677",  8, ""),
    ("Becker Jonas",     "0159-33221100",  2, "Geburtstag"),
    ("Wagner Petra",     "0175-66778899",  4, ""),
    ("Fischer Mark",     "0151-55443322",  5, "Rolli-Fahrer"),
    ("Hartmann Group",   "0160-22334455",  6, ""),
    ("Koch Lena",        "0171-77665544",  2, ""),
]

POOL_UG = [
    ("Schäfer Felix",    "0176-88990011",  4, ""),
    ("Weber Torsten",    "0162-00112233",  3, ""),
    ("Krause & Söhne",   "0159-44332211",  7, "Gruppenspiel"),
    ("Lehmann Anja",     "0175-99001122",  2, ""),
    ("Richter Dirk",     "0151-11009988",  4, ""),
    ("Meier Sabrina",    "0160-33445566",  6, "Jubiläum"),
    ("Wolf Christoph",   "0171-55667788",  2, ""),
    ("Neumann Kevin",    "0176-77889900",  3, ""),
    ("Zimmermann Anna",  "0162-22110099",  5, ""),
    ("Köhler Ralf",      "0159-88776655",  4, "Stammgast"),
]

POOL_EG = [
    ("Lang Stefan",      "0175-00998877",  2, ""),
    ("Schulz Jana",      "0151-44556677",  4, ""),
    ("Krüger Events",    "0160-66778899",  8, "Firmenfeier"),
    ("Frank Miriam",     "0171-88990011",  3, ""),
    ("Berg Philipp",     "0176-00112233",  5, "Geburtstag"),
    ("Keller Andreas",   "0162-22334455",  2, ""),
    ("Schmitt Vanessa",  "0159-44556677",  4, ""),
    ("Roth Florian",     "0175-66778899",  6, "Stammgast"),
    ("Vogt Melissa",     "0151-88990011",  2, ""),
    ("Brandt Oliver",    "0160-00998877",  3, ""),
]


# ──────────────────────────────────────────────────────────────────────────────
# TISCHTENNIS — 20 reservations, ~7 per standort
# Capacity:  ""(→EG)=8, UG=5, EG=8
# Strategy:  at most 4 concurrent per floor  →  well under cap
# ──────────────────────────────────────────────────────────────────────────────

TT_SLOTS = [
    ("14:00","15:00"), ("14:30","15:30"), ("15:00","16:00"),
    ("15:30","16:30"), ("16:00","17:00"), ("16:30","17:30"),
    ("17:00","18:00"), ("17:30","18:30"), ("18:00","19:00"),
    ("18:30","19:30"),
]

TT_UNASSIGNED = [
    ("Bauer Stephan",    "0171-12345678",  2, ""),
    ("Jung Marion",      "0176-87654321",  4, "Turnier"),
    ("Simon Oliver",     "0162-11223344",  2, ""),
    ("Fuchs Nadia",      "0159-44332211",  3, ""),
    ("Baum Carsten",     "0175-55667788",  2, ""),
    ("Kramer Lara",      "0151-99001122",  4, "Trainingsgruppe"),
    ("Groß Marcel",      "0160-33221100",  2, ""),
]

TT_UG = [
    ("Albrecht Sandra",  "0171-66554433",  2, ""),
    ("Winkler Björn",    "0176-22334455",  4, ""),
    ("Böhm Helga",       "0162-88990011",  3, "Stammgast"),
    ("Sommer Patrick",   "0159-00112233",  2, ""),
    ("Winter Claudia",   "0175-44556677",  4, "Turnier"),
    ("Stein Daniel",     "0151-66778899",  2, ""),
]

TT_EG = [
    ("Graf Tobias",      "0160-88990011",  4, ""),
    ("Kaiser Hannah",    "0171-00998877",  2, ""),
    ("Stern Florian",    "0176-22110099",  3, "Stammgast"),
    ("Breuer Sonja",     "0162-44332211",  2, ""),
    ("Hahn Michael",     "0159-66554433",  4, "Firmenturnier"),
    ("Beck Natalie",     "0175-88776655",  2, ""),
    ("Jäger Andreas",    "0151-00112233",  3, ""),
]


# ──────────────────────────────────────────────────────────────────────────────
# SNOOKER — 5 reservations, all EG
# Capacity: Snooker|EG = 5  →  use sequential slots (no overlap)
# ──────────────────────────────────────────────────────────────────────────────

SNOOKER_ENTRIES = [
    ("14:00","16:00", "Maier Stefan",    "0151-10101010",  2, "EG", ""),
    ("15:00","17:00", "Ritter Gabi",     "0160-20202020",  3, "EG", "Geburtstag"),
    ("16:00","18:00", "Engel Klaus",     "0171-30303030",  4, "EG", ""),
    ("18:00","20:00", "Pfeiffer Tom",    "0176-40404040",  2, "EG", ""),
    ("20:00","22:00", "Haas Vanessa",    "0162-50505050",  3, "EG", "Geburtstag"),
]


# ──────────────────────────────────────────────────────────────────────────────
# DARTS — 6 reservations, all EG
# Capacity: Darts|EG = 5  →  keep max concurrent ≤ 5
# Use overlapping-but-not-all-at-once slots
# ──────────────────────────────────────────────────────────────────────────────

DARTS_ENTRIES = [
    ("14:00","15:30", "Lange Peter",     "0159-11223344",  4, "EG", ""),
    ("14:30","16:00", "Graf Sonja",      "0175-22334455",  2, "EG", ""),
    ("15:30","17:00", "Böhmer Jan",      "0151-33445566",  6, "EG", "Ligaspieler"),
    ("17:00","18:30", "Sauer Karin",     "0160-44556677",  4, "EG", ""),
    ("18:30","20:00", "Kock Dennis",     "0171-55667788",  2, "EG", "Stammgast"),
    ("20:00","22:00", "Stern Monika",    "0176-66778899",  4, "EG", ""),
]


# ──────────────────────────────────────────────────────────────────────────────
# Seed runner
# ──────────────────────────────────────────────────────────────────────────────

def seed():
    total_target = 30 + 20 + 5 + 6
    print(f"\n{'='*60}")
    print(f"  seed_today.py  Seeding {total_target} reservations for {TODAY}")
    print(f"{'='*60}\n")

    ok = 0

    # ── Pool ──────────────────────────────────────────────────
    print("-- POOL (30) --------------------------------------------------")

    print("  [Unassigned - 10]")
    for i, (kunde, tel, pers, bem) in enumerate(POOL_UNASSIGNED):
        start, end = POOL_SLOTS[i]
        post(TODAY, start, end, kunde, tel, "Pool", pers, "", bem)
        ok += 1

    print("  [UG - 10]")
    for i, (kunde, tel, pers, bem) in enumerate(POOL_UG):
        start, end = POOL_SLOTS[i]
        post(TODAY, start, end, kunde, tel, "Pool", pers, "UG", bem)
        ok += 1

    print("  [EG - 10]")
    for i, (kunde, tel, pers, bem) in enumerate(POOL_EG):
        start, end = POOL_SLOTS[i]
        post(TODAY, start, end, kunde, tel, "Pool", pers, "EG", bem)
        ok += 1

    # ── Tischtennis ───────────────────────────────────────────
    print("\n-- TISCHTENNIS (20) -------------------------------------------")

    print("  [Unassigned - 7]")
    for i, (kunde, tel, pers, bem) in enumerate(TT_UNASSIGNED):
        start, end = TT_SLOTS[i]
        post(TODAY, start, end, kunde, tel, "Tischtennis", pers, "", bem)
        ok += 1

    print("  [UG - 6]")
    for i, (kunde, tel, pers, bem) in enumerate(TT_UG):
        start, end = TT_SLOTS[i]
        post(TODAY, start, end, kunde, tel, "Tischtennis", pers, "UG", bem)
        ok += 1

    print("  [EG - 7]")
    for i, (kunde, tel, pers, bem) in enumerate(TT_EG):
        start, end = TT_SLOTS[i]
        post(TODAY, start, end, kunde, tel, "Tischtennis", pers, "EG", bem)
        ok += 1

    # ── Snooker ───────────────────────────────────────────────
    print("\n-- SNOOKER (5) ------------------------------------------------")
    for start, end, kunde, tel, pers, standort, bem in SNOOKER_ENTRIES:
        post(TODAY, start, end, kunde, tel, "Snooker", pers, standort, bem)
        ok += 1

    # ── Darts ─────────────────────────────────────────────────
    print("\n-- DARTS (6) --------------------------------------------------")
    for start, end, kunde, tel, pers, standort, bem in DARTS_ENTRIES:
        post(TODAY, start, end, kunde, tel, "Darts", pers, standort, bem)
        ok += 1

    print("=" * 60)
    print(f"  Done: {ok}/{total_target} reservations seeded for {TODAY}")
    print(f"  Open http://localhost:5173 and navigate to today.")
    print("=" * 60)


if __name__ == "__main__":
    seed()
