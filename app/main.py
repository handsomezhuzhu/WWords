from fastapi import FastAPI, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from . import models
from .routers import auth, users, words, review, config
from .security import get_current_user

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Word Notebook", version="1.0")

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(words.router)
app.include_router(review.router)
app.include_router(config.router)


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


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
