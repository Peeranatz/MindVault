from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..core.llm_engine import generate_response
from ..core.rag_service import retrieve_sources
from ..database import models
from ..database.db_setup import get_db
from .auth import get_current_user

router = APIRouter(prefix="/journal", tags=["journal"])


class JournalCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)


class JournalOut(BaseModel):
    id: int
    content: str
    ai_response: Optional[str]
    detected_mood: Optional[int]
    cognitive_distortion: Optional[str]
    is_crisis: bool
    sources: List[str] = []

    class Config:
        from_attributes = True


@router.post("/", response_model=JournalOut, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=JournalOut, status_code=status.HTTP_201_CREATED)
def create_journal(
    payload: JournalCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        try:
            sources = retrieve_sources(payload.content)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"rag_error: {type(exc).__name__}: {exc}",
            ) from exc

        try:
            llm_result = generate_response(
                payload.content, current_user.mbti_type, sources
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"llm_error: {type(exc).__name__}: {exc}",
            ) from exc

        journal = models.Journal(
            user_id=current_user.id,
            content=payload.content,
            ai_response=llm_result["response"],
            detected_mood=llm_result["detected_mood"],
            cognitive_distortion=llm_result["cognitive_distortion"],
            is_crisis=llm_result["is_crisis"],
        )
        db.add(journal)
        db.commit()
        db.refresh(journal)
        base = JournalOut.from_orm(journal).model_dump()
        base["sources"] = sources
        return base
    except Exception as exc:  # debug helper
        db.rollback()
        # surface error for debugging instead of silent 500
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"journal_create_error: {type(exc).__name__}: {exc}",
        ) from exc


@router.get("/", response_model=List[JournalOut])
@router.get("", response_model=List[JournalOut])
def list_journals(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    rows = (
        db.query(models.Journal)
        .filter(models.Journal.user_id == current_user.id)
        .order_by(models.Journal.timestamp.desc())
        .all()
    )
    result = []
    for j in rows:
        s = retrieve_sources(j.content)
        result.append({**JournalOut.from_orm(j).model_dump(), "sources": s})
    return result


@router.get("/{journal_id}", response_model=JournalOut)
def get_journal(
    journal_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    journal = (
        db.query(models.Journal)
        .filter(
            models.Journal.id == journal_id, models.Journal.user_id == current_user.id
        )
        .first()
    )
    if not journal:
        raise HTTPException(status_code=404, detail="Journal not found")
    sources = retrieve_sources(journal.content)
    base = JournalOut.from_orm(journal).model_dump()
    base["sources"] = sources
    return base
