import os
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import models
from ..database.db_setup import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    role: str = Field("user", pattern="^(user|doctor)$")
    mbti_type: Optional[str] = None
    doctor_code: Optional[str] = None
    # ฟีเจอร์ที่ 3: รับ invite_token จาก QR Code
    invite_token: Optional[str] = None


class UserOut(BaseModel):
    id: int
    username: str
    role: str
    mbti_type: Optional[str]
    doctor_code: Optional[str]

    class Config:
        from_attributes = True


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        import bcrypt

        return bcrypt.checkpw(
            plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )
    except Exception:
        # Fallback if bcrypt isn't working as expected
        from passlib.context import CryptContext

        pwd_context_fallback = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context_fallback.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    try:
        import bcrypt

        # Using raw bcrypt to avoid passlib bugs with python 3.13 and newer bcrypt versions
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
        return hashed.decode("utf-8")
    except Exception:
        # Fallback
        from passlib.context import CryptContext

        pwd_context_fallback = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context_fallback.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.username == username).first()


def authenticate_user(
    db: Session, username: str, password: str
) -> Optional[models.User]:
    user = get_user_by_username(db, username)
    if not user or not verify_password(password, user.password_hash):
        return None
    return user


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = get_user_by_username(db, username=username)
    if user is None:
        raise credentials_exception
    return user


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = get_user_by_username(db, user_in.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")

    doctor_code = user_in.doctor_code
    if user_in.role == "doctor" and not doctor_code:
        doctor_code = secrets.token_hex(4)

    new_user = models.User(
        username=user_in.username,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role,
        mbti_type=user_in.mbti_type,
        doctor_code=doctor_code,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # ฟีเจอร์ที่ 3: ถ้ามี invite_token ให้เชื่อมกับแพทย์โดยอัตโนมัติและเงียบๆ
    if user_in.invite_token:
        invite = (
            db.query(models.InviteToken)
            .filter(
                models.InviteToken.token == user_in.invite_token,
                models.InviteToken.used == False,  # noqa: E712
                models.InviteToken.expires_at > datetime.utcnow(),
            )
            .first()
        )
        if invite:
            conn = models.Connection(
                doctor_id=invite.doctor_id,
                patient_id=new_user.id,
                status="active",
            )
            db.add(conn)
            invite.used = True
            db.commit()

    return new_user


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user
