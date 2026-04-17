from __future__ import annotations

from fastapi import FastAPI

from ..core.settings import load_environment

load_environment()

from ..routers import admin, auth, config, review, users, words
from .web import router as web_router


def register_routers(app: FastAPI) -> None:
    app.include_router(auth.router)
    app.include_router(users.router)
    app.include_router(words.router)
    app.include_router(review.router)
    app.include_router(config.router)
    app.include_router(admin.router)
    app.include_router(web_router)
