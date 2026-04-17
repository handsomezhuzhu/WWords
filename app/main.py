from __future__ import annotations

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .bootstrap.lifespan import app_lifespan
from .core.exceptions import register_exception_handlers
from .core.settings import get_settings, load_environment

load_environment()

from .api.router import register_routers


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
        lifespan=app_lifespan,
    )

    app.state.settings = settings
    app.state.templates = Jinja2Templates(directory=str(settings.templates_dir))

    app.mount(
        settings.static_url_path,
        StaticFiles(directory=str(settings.static_dir)),
        name="static",
    )

    register_exception_handlers(app)
    register_routers(app)

    return app


app = create_app()
