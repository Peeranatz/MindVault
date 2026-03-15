"""
Backward-compatibility shim. Prefer importing from backend.database.db_setup.
"""

from .database.db_setup import Base, SessionLocal, engine, get_db, init_db  # noqa: F401
