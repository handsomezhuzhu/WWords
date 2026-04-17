# Repository Guidelines

## Project Structure & Module Organization
`app/` contains the FastAPI application. Put HTTP endpoints in `app/routers/`, database models in `app/models.py`, Pydantic schemas in `app/schemas.py`, and shared services such as AI, security, and scheduling in module files under `app/`. Server-rendered HTML lives in `app/templates/`, and browser assets live in `app/static/`. Tests currently live in `tests/`, while deployment and product notes are in `docs/`. Runtime SQLite data is stored under `data/`.

## Build, Test, and Development Commands
Create an environment and install dependencies:
```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
Copy-Item .env.example .env
```
Run locally with auto-reload:
```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 7997
```
Run tests with:
```powershell
python -m pytest -q
```
Start the containerized app for local checks with `docker compose up --build`, or use `docker compose -f docker-compose.prod.yml up -d` for the production-style stack.

## Coding Style & Naming Conventions
Follow the existing Python style: 4-space indentation, `snake_case` for files, functions, and variables, and `PascalCase` for SQLAlchemy and Pydantic models. Keep router modules focused by feature (`auth.py`, `words.py`, `review.py`). Group imports as standard library, third-party, then local modules. No formatter or linter is configured in-repo, so keep changes consistent with nearby code and avoid unrelated reformatting.

## Testing Guidelines
Use `pytest` and place tests in `tests/test_*.py`. Match test names to behavior, for example `test_create_word_rejects_duplicate()`. Add tests for scheduler rules, auth/security flows, and router behavior when changing those areas. Keep fixtures lightweight and prefer deterministic assertions over time-sensitive or network-dependent checks.

## Commit & Pull Request Guidelines
Recent history uses short, imperative subjects in either English or Chinese. Keep commit titles concise and specific, such as `Fix review scheduling regression` or `更新 README 部署说明`. Pull requests should summarize behavior changes, note any env/config updates, link related issues, and include screenshots for template or static UI changes.

## Security & Configuration Tips
Do not commit `.env`, API keys, or populated `data/` files. Replace the example `SECRET_KEY` before deployment, and use strong `ADMIN_PASSWORD` values. When changing auth, cookies, or AI provider settings, update both `README.md` and `.env.example` if setup requirements change.
