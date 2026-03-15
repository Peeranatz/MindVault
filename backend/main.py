from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import auth, connect, doctor, journal, mbti
from .database.db_setup import init_db

app = FastAPI(title="MindVault API", version="0.1.0")

origins = ["*"]  # Adjust in production

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(journal.router)
app.include_router(doctor.router)
app.include_router(connect.router)
app.include_router(mbti.router)
