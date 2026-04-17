from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from ..core.settings import load_environment
from .admin import ensure_default_admin


@asynccontextmanager
async def app_lifespan(app: FastAPI):
    load_environment()

    from ..database import Base, engine

    Base.metadata.create_all(bind=engine)
    ensure_default_admin(getattr(app.state, "settings", None))

    try:
        yield
    finally:
        # Reserved for future shutdown hooks.
        pass
