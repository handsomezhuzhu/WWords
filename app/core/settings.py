from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
APP_ROOT = PROJECT_ROOT / "app"
DEFAULT_ENV_FILE = PROJECT_ROOT / ".env"


def _as_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def load_environment(env_file: str | os.PathLike[str] | None = None) -> Path:
    target = Path(env_file) if env_file else DEFAULT_ENV_FILE
    load_dotenv(target, override=False)
    return target


@dataclass(frozen=True)
class AppSettings:
    app_name: str
    app_version: str
    environment: str
    debug: bool
    database_url: str
    secret_key: str | None
    admin_email: str | None
    admin_password: str | None
    default_ai_provider: str | None
    default_ai_api_url: str | None
    default_ai_api_key: str | None
    default_ai_model: str | None
    default_ai_temperature: int
    secure_cookies: bool
    cookie_samesite: str
    static_url_path: str
    static_dir: Path
    templates_dir: Path

    @classmethod
    def from_env(cls) -> "AppSettings":
        load_environment()
        return cls(
            app_name=os.getenv("APP_NAME", "AI Word Notebook"),
            app_version=os.getenv("APP_VERSION", "1.0"),
            environment=os.getenv("APP_ENV", "development"),
            debug=_as_bool(os.getenv("DEBUG"), default=False),
            database_url=os.getenv("DATABASE_URL", "sqlite:///./data/data.db"),
            secret_key=os.getenv("SECRET_KEY"),
            admin_email=os.getenv("ADMIN_EMAIL"),
            admin_password=os.getenv("ADMIN_PASSWORD"),
            default_ai_provider=os.getenv("DEFAULT_AI_PROVIDER"),
            default_ai_api_url=os.getenv("DEFAULT_AI_API_URL"),
            default_ai_api_key=os.getenv("DEFAULT_AI_API_KEY"),
            default_ai_model=os.getenv("DEFAULT_AI_MODEL"),
            default_ai_temperature=int(os.getenv("DEFAULT_AI_TEMPERATURE", "0")),
            secure_cookies=_as_bool(os.getenv("SECURE_COOKIES"), default=True),
            cookie_samesite=os.getenv("COOKIE_SAMESITE", "lax"),
            static_url_path=os.getenv("STATIC_URL_PATH", "/static"),
            static_dir=Path(os.getenv("STATIC_DIR", APP_ROOT / "static")).resolve(),
            templates_dir=Path(os.getenv("TEMPLATES_DIR", APP_ROOT / "templates")).resolve(),
        )


@lru_cache
def get_settings() -> AppSettings:
    return AppSettings.from_env()
