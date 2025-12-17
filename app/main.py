from fastapi import FastAPI, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

from .database import Base, engine, get_db
from . import models
from .routers import auth, users, words, review, config, admin
from .security import get_current_user, get_password_hash

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Word Notebook", version="1.0")

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

# Create default admin user if not exists
@app.on_event("startup")
def create_admin_user():
    db = next(get_db())
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")

    if not admin_email or not admin_password:
        print(
            "ADMIN_EMAIL and ADMIN_PASSWORD must be set to bootstrap an admin user; "
            "skipping automatic creation"
        )
        return

    existing_admin = db.query(models.User).filter(models.User.email == admin_email).first()
    if not existing_admin:
        hashed_password = get_password_hash(admin_password)
        admin_user = models.User(
            email=admin_email,
            hashed_password=hashed_password,
            is_admin=True,
            preferred_language="en",
            preferred_theme="light"
        )
        db.add(admin_user)
        db.commit()
        print(f"Admin user created: {admin_email}")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(words.router)
app.include_router(review.router)
app.include_router(config.router)
app.include_router(admin.router)


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@app.get("/register", response_class=HTMLResponse)
def register_page(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})


@app.get("/dashboard", response_class=HTMLResponse)
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
    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "user": current_user,
            "words": words,
        },
    )


@app.get("/admin/dashboard", response_class=HTMLResponse)
def admin_dashboard_page(
    request: Request,
    current_admin: models.User = Depends(get_current_user),
):
    if not current_admin.is_admin:
        return templates.TemplateResponse("index.html", {"request": request})
    return templates.TemplateResponse("admin/dashboard.html", {"request": request})
