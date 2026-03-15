import secrets
from collections import defaultdict
from datetime import datetime, timedelta
from typing import List, Optional

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


# ฟีเจอร์ที่ 3: สร้าง Invite Token สำหรับ QR Code
class InviteTokenOut(BaseModel):
    token: str
    invite_url: str
    expires_at: datetime

    class Config:
        from_attributes = True


@router.post("/invite", response_model=InviteTokenOut)
def create_invite(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ensure_doctor(current_user)
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=24)
    invite = models.InviteToken(
        token=token,
        doctor_id=current_user.id,
        expires_at=expires_at,
        used=False,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return InviteTokenOut(
        token=token,
        invite_url=f"/register?invite={token}",
        expires_at=expires_at,
    )


@router.get("/invite/{token}")
def validate_invite(
    token: str,
    db: Session = Depends(get_db),
):
    """ตรวจว่า token ยังใช้งานได้อยู่ไหม (โดยไม่ต้อง login)"""
    invite = (
        db.query(models.InviteToken)
        .filter(models.InviteToken.token == token)
        .first()
    )
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite token")
    if invite.used:
        raise HTTPException(status_code=400, detail="Invite token already used")
    if invite.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invite token expired")
    return {"valid": True}


# Phase 4: Patient Profile Models
class MoodPoint(BaseModel):
    date: str
    avg_mood: float


class DistortionCount(BaseModel):
    type: str
    count: int


class ProfileOut(BaseModel):
    patient_id: int
    username: str
    mbti_type: Optional[str]
    connected_at: datetime
    entries_30d: int
    avg_mood_30d: Optional[float]
    crisis_flags_30d: int
    last_entry_at: Optional[datetime]
    mood_trend: List[MoodPoint]
    distortions: List[DistortionCount]
    ai_summary: Optional[str]


def _generate_clinical_summary(
    journals: list, username: str, mbti: Optional[str]
) -> Optional[str]:
    """Generate AI clinical summary using Gemini."""
    try:
        from ..core.llm_engine import GEMINI_KEY

        if not GEMINI_KEY or not journals:
            return None

        import google.generativeai as genai  # type: ignore

        genai.configure(api_key=GEMINI_KEY)
        model = genai.GenerativeModel("gemini-2.5-flash")

        entries_text = "\n\n".join(
            [
                f"[{j.timestamp.strftime('%d/%m/%Y')}] อารมณ์: {j.detected_mood}/5"
                f"{' ⚠️ Crisis' if j.is_crisis else ''}"
                f"{f' | {j.cognitive_distortion}' if j.cognitive_distortion else ''}\n"
                f"{j.content[:300]}"
                for j in journals[-20:]
            ]
        )
        mbti_info = f"MBTI: {mbti}" if mbti else "ไม่ระบุ MBTI"

        prompt = (
            f"คุณคือจิตแพทย์ผู้เชี่ยวชาญกำลังวิเคราะห์บันทึกไดอารี่ของผู้ป่วย\n"
            f"ชื่อผู้ป่วย: {username} | {mbti_info}\n\n"
            f"บันทึกไดอารี่ 30 วัน (สูงสุด 20 รายการล่าสุด):\n{entries_text}\n\n"
            "วิเคราะห์และสรุปเป็น Clinical Summary ภาษาไทย ครอบคลุม:\n"
            "1. **สภาพอารมณ์โดยรวม** — แนวโน้มอารมณ์ช่วง 30 วัน\n"
            "2. **ตัวกระตุ้นหลัก** — เหตุการณ์/สถานการณ์ที่ส่งผลต่ออารมณ์บ่อยที่สุด\n"
            "3. **รูปแบบความคิด** — Cognitive Distortion ที่พบ\n"
            "4. **ข้อสังเกตสำคัญ** — สิ่งที่แพทย์ควรให้ความสนใจเป็นพิเศษ\n"
            "5. **ข้อแนะนำเบื้องต้น** — แนวทางการติดตามหรือช่วยเหลือ\n\n"
            "ตอบเป็นภาษาไทย กระชับ เป็นมืออาชีพ ไม่เกิน 400 คำ"
        )

        resp = model.generate_content(prompt)
        return resp.text if resp and getattr(resp, "text", None) else None
    except Exception as e:
        print(f"Clinical summary error: {e}")
        return None


@router.get("/patients/{patient_id}/profile", response_model=ProfileOut)
def patient_profile(
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

    patient = db.query(models.User).filter(models.User.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    journals = (
        db.query(models.Journal)
        .filter(
            models.Journal.user_id == patient_id,
            models.Journal.timestamp >= thirty_days_ago,
        )
        .order_by(models.Journal.timestamp)
        .all()
    )

    # Mood trend by day
    day_moods: dict = defaultdict(list)
    for j in journals:
        if j.detected_mood is not None:
            day_moods[j.timestamp.strftime("%Y-%m-%d")].append(j.detected_mood)
    mood_trend = [
        MoodPoint(date=day, avg_mood=round(sum(moods) / len(moods), 2))
        for day, moods in sorted(day_moods.items())
    ]

    # Cognitive distortion counts
    distortion_counts: dict = defaultdict(int)
    for j in journals:
        if j.cognitive_distortion:
            distortion_counts[j.cognitive_distortion] += 1
    distortions = [
        DistortionCount(type=k, count=v)
        for k, v in sorted(distortion_counts.items(), key=lambda x: -x[1])
    ]

    moods = [j.detected_mood for j in journals if j.detected_mood is not None]
    avg_mood = round(sum(moods) / len(moods), 2) if moods else None
    crisis_flags = sum(1 for j in journals if j.is_crisis)
    last_entry_at = max((j.timestamp for j in journals), default=None)

    ai_summary = _generate_clinical_summary(journals, patient.username, patient.mbti_type)

    return ProfileOut(
        patient_id=patient.id,
        username=patient.username,
        mbti_type=patient.mbti_type,
        connected_at=connection.created_at,
        entries_30d=len(journals),
        avg_mood_30d=avg_mood,
        crisis_flags_30d=crisis_flags,
        last_entry_at=last_entry_at,
        mood_trend=mood_trend,
        distortions=distortions,
        ai_summary=ai_summary,
    )
