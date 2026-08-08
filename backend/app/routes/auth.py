from fastapi import APIRouter, HTTPException
from ..models import PinRequest
from ..deps import STAFF_PIN, ADMIN_PIN

router = APIRouter(prefix="/api")


@router.post("/verify-pin")
async def verify_pin(req: PinRequest):
    if req.pin == ADMIN_PIN:
        return {"role": "admin"}
    if req.pin == STAFF_PIN:
        return {"role": "staff"}
    raise HTTPException(status_code=401, detail="Falsche PIN")
