from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..config_helpers import serialize_system_config
from ..database import get_db
from ..security import get_current_admin, get_password_hash, validate_password

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/", summary="Admin dashboard")
async def admin_dashboard(
    current_admin: models.User = Depends(get_current_admin),
):
    """
    Admin dashboard endpoint.
    Requires admin privileges.
    """
    return {"message": "Welcome to the admin dashboard"}


@router.get("/users", response_model=schemas.UserListResponse, summary="List users")
def list_users(
    q: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    """
    List users with basic search and pagination.
    Requires admin privileges.
    """
    query = db.query(models.User)
    normalized_query = q.strip() if q else None
    if normalized_query:
        query = query.filter(models.User.email.ilike(f"%{normalized_query}%"))

    total = query.count()
    items = (
        query.order_by(models.User.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return schemas.UserListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        query=normalized_query,
    )


@router.post("/users", response_model=schemas.User, summary="Create user")
def create_user(
    user_create: schemas.AdminUserCreate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    existing = db.query(models.User).filter(models.User.email == user_create.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    validate_password(user_create.password)
    user = models.User(
        email=user_create.email,
        hashed_password=get_password_hash(user_create.password),
        is_admin=user_create.is_admin,
        preferred_language=user_create.preferred_language,
        preferred_theme=user_create.preferred_theme,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/users/{user_id}", response_model=schemas.User, summary="Get user by ID")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    """
    Get a specific user by their ID.
    Requires admin privileges.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/users/{user_id}", response_model=schemas.User, summary="Update user")
def update_user(
    user_id: int,
    user_update: schemas.AdminUserUpdate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    """
    Update a user's attributes.
    Requires admin privileges.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if user_update.email and user_update.email != user.email:
        existing = db.query(models.User).filter(models.User.email == user_update.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        user.email = user_update.email

    if user_update.is_admin is not None:
        if user.id == current_admin.id and not user_update.is_admin:
            raise HTTPException(status_code=400, detail="You cannot remove your own admin access")
        if user.is_admin and not user_update.is_admin:
            admin_count = db.query(models.User).filter(models.User.is_admin.is_(True)).count()
            if admin_count <= 1:
                raise HTTPException(status_code=400, detail="At least one admin user must remain")
        user.is_admin = user_update.is_admin

    if user_update.preferred_language is not None:
        user.preferred_language = user_update.preferred_language

    if user_update.preferred_theme is not None:
        user.preferred_theme = user_update.preferred_theme

    if user_update.password:
        validate_password(user_update.password)
        user.hashed_password = get_password_hash(user_update.password)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", response_model=schemas.User, summary="Delete user")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    """
    Delete a user.
    Requires admin privileges.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete the current admin user")
    if user.is_admin:
        admin_count = db.query(models.User).filter(models.User.is_admin.is_(True)).count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="At least one admin user must remain")

    db.delete(user)
    db.commit()
    return user


@router.get("/ai-config", response_model=schemas.SystemConfig, summary="Get AI configuration")
def get_ai_config(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    """
    Get the current AI configuration.
    Requires admin privileges.
    """
    config = db.query(models.SystemConfig).filter(models.SystemConfig.owner_id == current_admin.id).first()
    if not config:
        raise HTTPException(status_code=404, detail="AI configuration not found")
    return serialize_system_config(config)


@router.put("/ai-config", response_model=schemas.SystemConfig, summary="Update AI configuration")
def update_ai_config(
    config_update: schemas.SystemConfigCreate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    """
    Update the AI configuration.
    Requires admin privileges.
    """
    config = db.query(models.SystemConfig).filter(models.SystemConfig.owner_id == current_admin.id).first()
    update_data = config_update.model_dump()
    if not config:
        config = models.SystemConfig(**update_data, owner_id=current_admin.id)
        db.add(config)
    else:
        if not update_data.get("api_key"):
            update_data.pop("api_key", None)
        for key, value in update_data.items():
            setattr(config, key, value)
    
    db.commit()
    db.refresh(config)
    return serialize_system_config(config)
