from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import models
from ..database.db_setup import get_db
from .auth import get_current_user

router = APIRouter(prefix="/connect", tags=["connect"])


class ConnectRequestIn(BaseModel):
    doctor_code: str


class ConnectRequestOut(BaseModel):
    id: int
    doctor_id: int
    patient_id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.post(
    "/request", response_model=ConnectRequestOut, status_code=status.HTTP_201_CREATED
)
def request_connect(
    payload: ConnectRequestIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "user":
        raise HTTPException(
            status_code=403, detail="Only patients can request connection"
        )

    doctor = (
        db.query(models.User)
        .filter(models.User.doctor_code == payload.doctor_code)
        .first()
    )
    if not doctor or doctor.role != "doctor":
        raise HTTPException(status_code=404, detail="Doctor code not found")

    # Prevent duplicate pending
    existing = (
        db.query(models.ConnectionRequest)
        .filter(
            models.ConnectionRequest.doctor_id == doctor.id,
            models.ConnectionRequest.patient_id == current_user.id,
            models.ConnectionRequest.status == "pending",
        )
        .first()
    )
    if existing:
        return existing

    req = models.ConnectionRequest(
        doctor_id=doctor.id, patient_id=current_user.id, status="pending"
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


class ApproveIn(BaseModel):
    request_id: int
    action: str  # "approve" or "reject"


@router.post("/handle", response_model=ConnectRequestOut)
def handle_request(
    payload: ApproveIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Doctor role required")

    req = (
        db.query(models.ConnectionRequest)
        .filter(
            models.ConnectionRequest.id == payload.request_id,
            models.ConnectionRequest.doctor_id == current_user.id,
        )
        .first()
    )
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status != "pending":
        return req

    if payload.action == "approve":
        # create connection if not exists
        existing = (
            db.query(models.Connection)
            .filter(
                models.Connection.doctor_id == current_user.id,
                models.Connection.patient_id == req.patient_id,
                models.Connection.status == "active",
            )
            .first()
        )
        if not existing:
            conn = models.Connection(
                doctor_id=current_user.id, patient_id=req.patient_id, status="active"
            )
            db.add(conn)
        req.status = "approved"
    elif payload.action == "reject":
        req.status = "rejected"
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    db.commit()
    db.refresh(req)
    return req


@router.get("/requests", response_model=List[ConnectRequestOut])
def list_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role == "doctor":
        return (
            db.query(models.ConnectionRequest)
            .filter(models.ConnectionRequest.doctor_id == current_user.id)
            .order_by(models.ConnectionRequest.created_at.desc())
            .all()
        )
    elif current_user.role == "user":
        return (
            db.query(models.ConnectionRequest)
            .filter(models.ConnectionRequest.patient_id == current_user.id)
            .order_by(models.ConnectionRequest.created_at.desc())
            .all()
        )
    else:
        return []
