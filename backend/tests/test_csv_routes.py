"""CSV upload/delete route tests — auth guards and basic validation."""
import io
import pytest


VALID_CSV = "Kunde,Personen,Art,Standort,Startzeit,Endzeit,Bemerkung\nMax Muster,2,Pool,EG,14:00,16:00,Test\n"


async def test_upload_csv_no_pin_422(client):
    files = {"file": ("test.csv", io.BytesIO(VALID_CSV.encode()), "text/csv")}
    resp = await client.post("/api/upload-csv", files=files)
    assert resp.status_code == 422


async def test_upload_csv_wrong_pin_401(client):
    files = {"file": ("test.csv", io.BytesIO(VALID_CSV.encode()), "text/csv")}
    resp = await client.post("/api/upload-csv", files=files, headers={"X-PIN": "wrongpin"})
    assert resp.status_code == 401


async def test_upload_csv_staff_pin_ok(client, staff_headers):
    files = {"file": ("test.csv", io.BytesIO(VALID_CSV.encode()), "text/csv")}
    resp = await client.post("/api/upload-csv", files=files, headers=staff_headers)
    assert resp.status_code == 200
    assert resp.json()["ok"] is True


async def test_upload_csv_empty_400(client, staff_headers):
    files = {"file": ("empty.csv", io.BytesIO(b""), "text/csv")}
    resp = await client.post("/api/upload-csv", files=files, headers=staff_headers)
    assert resp.status_code == 400


async def test_upload_csv_missing_columns_400(client, staff_headers):
    bad_csv = "Name,Count\nJohn,2\n"
    files = {"file": ("bad.csv", io.BytesIO(bad_csv.encode()), "text/csv")}
    resp = await client.post("/api/upload-csv", files=files, headers=staff_headers)
    assert resp.status_code == 400


async def test_delete_csv_no_pin_422(client):
    resp = await client.post("/api/delete-csv", json={"filename": "test.csv"})
    assert resp.status_code == 422


async def test_delete_csv_wrong_pin_401(client):
    resp = await client.post("/api/delete-csv", json={"filename": "test.csv"}, headers={"X-PIN": "wrongpin"})
    assert resp.status_code == 401


async def test_delete_csv_staff_pin_ok(client, staff_headers):
    resp = await client.post("/api/delete-csv", json={"filename": "nonexistent.csv"}, headers=staff_headers)
    assert resp.status_code == 200
