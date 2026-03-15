from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import models
from ..database.db_setup import get_db
from .auth import get_current_user

router = APIRouter(prefix="/doctor", tags=["doctor"])


class ConnectIn(BaseModel):
    patient_username: str


class PatientOut(BaseModel):
    id: int
    username: str
    connected_at: datetime

    class Config:
        from_attributes = True


class SummaryOut(BaseModel):
    patient_id: int
    entries: int
    avg_mood: float | None
    crisis_flags: int
    last_entry_at: datetime | None


def ensure_doctor(user: models.User):
    if user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Doctor role required"
        )


@router.post("/connect", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def connect_patient(
    payload: ConnectIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ensure_doctor(current_user)
    patient = (
        db.query(models.User)
        .filter(models.User.username == payload.patient_username)
        .first()
    )
    if not patient or patient.role != "user":
        raise HTTPException(status_code=404, detail="Patient not found")

    existing = (
        db.query(models.Connection)
        .filter(
            models.Connection.doctor_id == current_user.id,
            models.Connection.patient_id == patient.id,
            models.Connection.status == "active",
        )
        .first()
    )
    if existing:
        return PatientOut(
            id=patient.id, username=patient.username, connected_at=existing.created_at
        )

    conn = models.Connection(
        doctor_id=current_user.id, patient_id=patient.id, status="active"
    )
    db.add(conn)
    db.commit()
    db.refresh(conn)
    return PatientOut(
        id=patient.id, username=patient.username, connected_at=conn.created_at
    )


@router.get("/patients", response_model=List[PatientOut])
def list_patients(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ensure_doctor(current_user)
    connections = (
        db.query(models.Connection)
        .filter(
            models.Connection.doctor_id == current_user.id,
            models.Connection.status == "active",
        )
        .all()
    )
    patient_ids = [c.patient_id for c in connections]
    if not patient_ids:
        return []
    patients = (
        db.query(models.User, models.Connection)
        .join(models.Connection, models.Connection.patient_id == models.User.id)
        .filter(
            models.Connection.doctor_id == current_user.id,
            models.Connection.status == "active",
        )
        .all()
    )
    return [
        PatientOut(id=user.id, username=user.username, connected_at=conn.created_at)
        for (user, conn) in patients
    ]


@router.get("/patients/{patient_id}/summary", response_model=SummaryOut)
def patient_summary(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ensure_doctor(current_user)
    connection = (
        db.query(models.Connection)
        .filter(
            models.Connection.doctor_id == current_user.id,
            models.Connection.patient_id == patient_id,
            models.Connection.status == "active",
        )
        .first()
    )
    if not connection:
        raise HTTPException(status_code=404, detail="Patient not linked to this doctor")

    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    journals = (
        db.query(models.Journal)
        .filter(
            models.Journal.user_id == patient_id,
            models.Journal.timestamp >= thirty_days_ago,
        )
        .all()
    )
    if not journals:
        return SummaryOut(
            patient_id=patient_id,
            entries=0,
            avg_mood=None,
            crisis_flags=0,
            last_entry_at=None,
        )

    moods = [j.detected_mood for j in journals if j.detected_mood is not None]
    avg_mood = sum(moods) / len(moods) if moods else None
    crisis_flags = sum(1 for j in journals if j.is_crisis)
    last_entry_at = max(j.timestamp for j in journals)

    return SummaryOut(
        patient_id=patient_id,
        entries=len(journals),
        avg_mood=avg_mood,
        crisis_flags=crisis_flags,
        last_entry_at=last_entry_at,
    )
