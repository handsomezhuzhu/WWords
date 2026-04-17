from __future__ import annotations

import logging

from ..core.settings import AppSettings, get_settings, load_environment

logger = logging.getLogger(__name__)


def ensure_default_admin(settings: AppSettings | None = None) -> None:
    settings = settings or get_settings()
    if not settings.admin_email or not settings.admin_password:
        logger.info(
            "ADMIN_EMAIL and ADMIN_PASSWORD are not fully configured; skipping admin bootstrap"
        )
        return

    load_environment()

    from .. import models
    from ..database import SessionLocal
    from ..security import get_password_hash

    db = SessionLocal()
    try:
        existing_admin = (
            db.query(models.User)
            .filter(models.User.email == settings.admin_email)
            .first()
        )
        if existing_admin:
            existing_admin.hashed_password = get_password_hash(settings.admin_password)
            existing_admin.is_admin = True
            db.add(existing_admin)
            db.commit()
            logger.info("Synced default admin user: %s", settings.admin_email)
            ensure_default_ai_config(db, existing_admin.id, settings)
            return

        admin_user = models.User(
            email=settings.admin_email,
            hashed_password=get_password_hash(settings.admin_password),
            is_admin=True,
            preferred_language="en",
            preferred_theme="light",
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        ensure_default_ai_config(db, admin_user.id, settings)
        logger.info("Bootstrapped default admin user: %s", settings.admin_email)
    finally:
        db.close()


def ensure_default_ai_config(db, owner_id: int, settings: AppSettings) -> None:
    if not settings.default_ai_api_url or not settings.default_ai_api_key:
        return

    from .. import models

    config = (
        db.query(models.SystemConfig)
        .filter(models.SystemConfig.owner_id == owner_id)
        .first()
    )

    payload = {
        "provider": settings.default_ai_provider or "openai",
        "api_url": settings.default_ai_api_url,
        "api_key": settings.default_ai_api_key,
        "model": settings.default_ai_model or "gpt-4o-mini",
        "temperature": settings.default_ai_temperature,
    }

    if config:
        for key, value in payload.items():
            setattr(config, key, value)
    else:
        config = models.SystemConfig(owner_id=owner_id, **payload)
        db.add(config)

    db.commit()
