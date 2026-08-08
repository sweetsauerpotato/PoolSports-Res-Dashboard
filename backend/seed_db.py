import requests
import random
from datetime import datetime, timedelta

API_URL = "http://localhost:8000/api/reservations"
HEADERS = {"X-PIN": "0000"}  # Default admin PIN

# Configuration for fake data
KUNDEN = [
    "Max Mustermann", "Anna Müller", "Schmidt & Co", "Julia Weber", "Tom Meyer",
    "BTE Firma", "Sarah Klein", "Leo Bauer", "PartyTruppe 1", "Frank Hoff",
    "Claudia Jung", "Alex Wagner", "Elena Richter", "Leon Schulze"
]
ARTEN = ["Pool", "Snooker", "Darts", "Tischtennis", "Kicker", "Gastro"]
BEMERKUNGEN = ["", "", "Geburtstag", "Firmenfeier", "", "Rolli-Fahrer", "Stammgast", ""]

def generate_random_time_str(start_hour, end_hour):
    hour = random.randint(start_hour, end_hour)
    minute = random.choice([0, 15, 30, 45])
    return f"{hour:02d}:{minute:02d}"

def seed():
    print("Seeding database with ~35 reservations...")
    today = datetime.now()
    
    count = 0
    # Create reservations spanning from today to 7 days in the future
    for day_offset in range(0, 7):
        target_date = today + timedelta(days=day_offset)
        datum_str = target_date.strftime("%Y-%m-%d")
        
        # 80 to 110 reservations per day
        daily_res_count = random.randint(80, 110)
        for _ in range(daily_res_count):
            start_h = random.randint(14, 21) # Opening hours span
            duration_h = random.choice([1, 2, 3])
            
            start_time = generate_random_time_str(start_h, start_h)
            
            # Simple end time calc
            st_hour = int(start_time.split(':')[0])
            en_hour = st_hour + duration_h
            if en_hour >= 24: en_hour = 23 # clamp
            end_time = f"{en_hour:02d}:00"

            if start_time >= end_time:
                continue # skip invalid spans

            tischanzahl = 1 
            # 10% chance for multi-table booking
            if random.random() > 0.9:
                tischanzahl = random.randint(2, 4)

            payload = {
                "datum": datum_str,
                "startzeit": start_time,
                "endzeit": end_time,
                "kunde": random.choice(KUNDEN) + f" {random.randint(1,100)}",
                "telefon": f"0151-{random.randint(1000000, 9999999)}",
                "art": random.choice(ARTEN),
                "personen": str(random.randint(2, 12)),
                "standort": "",
                "bemerkung": random.choice(BEMERKUNGEN),
                "tischanzahl": tischanzahl
            }

            resp = requests.post(API_URL, json=payload, headers=HEADERS)
            if resp.status_code == 201:
                count += 1
                print(f"[{datum_str}] Added {payload['art']} for {payload['kunde']} ({start_time}-{end_time})")
            else:
                print(f"Failed to add: {resp.text}")

    print(f"\nDone! Successfully seeded {count} reservations.")

if __name__ == "__main__":
    seed()
