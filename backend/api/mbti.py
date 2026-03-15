from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..core.mbti_logic import classify_from_answers
from ..database import models
from ..database.db_setup import get_db
from .auth import get_current_user

router = APIRouter(prefix="/mbti", tags=["mbti"])


class MbtiRequest(BaseModel):
    answers: List[str] = Field(..., min_length=1, max_length=20)


class MbtiResponse(BaseModel):
    mbti_type: str


@router.post("/analyze", response_model=MbtiResponse, status_code=status.HTTP_200_OK)
def analyze_and_save_mbti(
    payload: MbtiRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not payload.answers or all(not a.strip() for a in payload.answers):
        raise HTTPException(status_code=400, detail="Answers required")

    mbti = classify_from_answers(payload.answers)
    current_user.mbti_type = mbti
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return MbtiResponse(mbti_type=mbti)


@router.get("/me", response_model=MbtiResponse)
def get_my_mbti(current_user: models.User = Depends(get_current_user)):
    mbti: Optional[str] = current_user.mbti_type
    if not mbti:
        raise HTTPException(status_code=404, detail="MBTI not set")
    return MbtiResponse(mbti_type=mbti)
