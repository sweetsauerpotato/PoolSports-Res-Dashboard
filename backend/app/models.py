from pydantic import BaseModel
from typing import Optional

class PinRequest(BaseModel):
    pin: str

class AssignRequest(BaseModel):
    reservation_id: str
    table_id: Optional[str] = None          # Legacy single-table (kept for backwards compat)
    table_ids: Optional[list[str]] = None   # Multi-table: full list of table IDs
    standort: Optional[str] = None          # Optional floor (e.g. EG, UG, VRA)

class UnassignRequest(BaseModel):
    reservation_id: str

class TableStatusRequest(BaseModel):
    status: str
    guest: Optional[str] = None
    reservation_id: Optional[str] = None  # the specific reservation being seated (for belegt)

class NoShowRequest(BaseModel):
    reservation_id: str

class DefektRequest(BaseModel):
    table_id: str
    defekt: bool

class DeleteCsvRequest(BaseModel):
    filename: str
