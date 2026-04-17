from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas, models
from ..config_helpers import serialize_system_config
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
    payload = config.model_dump()
    if existing:
        if not payload.get("api_key"):
            payload.pop("api_key", None)
        for key, value in payload.items():
            setattr(existing, key, value)
        new_cfg = existing
    else:
        new_cfg = models.SystemConfig(owner_id=admin.id, **payload)
        db.add(new_cfg)
    db.commit()
    db.refresh(new_cfg)
    return serialize_system_config(new_cfg)


@router.get("/", response_model=list[schemas.SystemConfig])
def list_configs(
    db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)
):
    configs = db.query(models.SystemConfig).all()
    return [serialize_system_config(config) for config in configs]
