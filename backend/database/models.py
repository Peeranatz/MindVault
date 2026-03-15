from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .db_setup import Base


# Phase 2: InviteToken สำหรับระบบ QR Code เชิญผู้ป่วย
class InviteToken(Base):
    __tablename__ = "invite_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(64), unique=True, index=True, nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    doctor = relationship("User", foreign_keys=[doctor_id])


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="user")  # 'doctor' or 'user'
    mbti_type = Column(String(8), nullable=True)
    doctor_code = Column(String(32), nullable=True, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    journals = relationship(
        "Journal", back_populates="user", cascade="all, delete-orphan"
    )
    doctor_connections = relationship(
        "Connection",
        back_populates="doctor",
        foreign_keys="Connection.doctor_id",
        cascade="all, delete-orphan",
    )
    patient_connections = relationship(
        "Connection",
        back_populates="patient",
        foreign_keys="Connection.patient_id",
        cascade="all, delete-orphan",
    )


class ConnectionRequest(Base):
    __tablename__ = "connection_requests"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default="pending")  # pending/approved/rejected
    created_at = Column(DateTime, default=datetime.utcnow)

    doctor = relationship("User", foreign_keys=[doctor_id])
    patient = relationship("User", foreign_keys=[patient_id])


class Connection(Base):
    __tablename__ = "connections"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id"))
    patient_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

    doctor = relationship(
        "User", foreign_keys=[doctor_id], back_populates="doctor_connections"
    )
    patient = relationship(
        "User", foreign_keys=[patient_id], back_populates="patient_connections"
    )


class Journal(Base):
    __tablename__ = "journals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    ai_response = Column(Text, nullable=True)
    detected_mood = Column(Integer, nullable=True)
    cognitive_distortion = Column(String(64), nullable=True)
    is_crisis = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="journals")
