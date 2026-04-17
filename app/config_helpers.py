from . import models, schemas


def mask_api_key(api_key: str | None) -> str | None:
    if not api_key:
        return None
    visible = min(4, len(api_key))
    return "*" * max(len(api_key) - visible, 0) + api_key[-visible:]


def serialize_system_config(config: models.SystemConfig) -> schemas.SystemConfig:
    return schemas.SystemConfig(
        id=config.id,
        owner_id=config.owner_id,
        provider=config.provider,
        api_key=None,
        api_key_masked=mask_api_key(config.api_key),
        api_key_configured=bool(config.api_key),
        api_url=config.api_url,
        model=config.model,
        temperature=config.temperature,
        created_at=config.created_at,
    )
