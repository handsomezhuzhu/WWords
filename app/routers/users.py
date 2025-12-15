from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas, models
from ..database import get_db
from ..security import get_current_admin, get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.get("/", response_model=list[schemas.User])
def list_users(
    db: Session = Depends(get_db), current_admin: models.User = Depends(get_current_admin)
):
    return db.query(models.User).all()
