from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas, models
from ..database import get_db
from ..security import get_current_admin

router = APIRouter(prefix="/config", tags=["config"])


@router.post("/", response_model=schemas.SystemConfig)
def create_config(
    config: schemas.SystemConfigCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    existing = (
        db.query(models.SystemConfig)
        .filter(models.SystemConfig.owner_id == admin.id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
    new_cfg = models.SystemConfig(owner_id=admin.id, **config.dict())
    db.add(new_cfg)
    db.commit()
    db.refresh(new_cfg)
    return new_cfg


@router.get("/", response_model=list[schemas.SystemConfig])
def list_configs(
    db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)
):
    return db.query(models.SystemConfig).all()
