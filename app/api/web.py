from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from ..core.settings import load_environment
from .. import models

load_environment()

from ..database import get_db
from ..security import get_current_admin, get_current_user

router = APIRouter(tags=["pages"])


@router.get("/", response_class=HTMLResponse)
def index(request: Request):
    return request.app.state.templates.TemplateResponse("index.html", {"request": request})


@router.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    return request.app.state.templates.TemplateResponse("login.html", {"request": request})


@router.get("/register", response_class=HTMLResponse)
def register_page(request: Request):
    return request.app.state.templates.TemplateResponse("register.html", {"request": request})


@router.get("/dashboard", response_class=HTMLResponse)
def dashboard(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    words = (
        db.query(models.Word)
        .filter(models.Word.owner_id == current_user.id)
        .order_by(models.Word.created_at.desc())
        .all()
    )
    return request.app.state.templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "user": current_user,
            "words": words,
        },
    )


@router.get("/admin/dashboard", response_class=HTMLResponse)
def admin_dashboard_page(
    request: Request,
    current_admin: models.User = Depends(get_current_admin),
):
    return request.app.state.templates.TemplateResponse(
        "admin/dashboard.html",
        {"request": request},
    )
