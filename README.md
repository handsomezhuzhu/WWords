# AI Word Notebook

Bilingual, AI-assisted vocabulary notebook with Ebbinghaus review, SQLite storage, and single-container Docker deployment.

## Features
- User registration/login with JWT, admin user listing, and AI provider configuration storage.
- Add words with partial info; offline AI stub returns bilingual JSON with examples and translations.
- Ebbinghaus-style spaced repetition with EN→ZH or ZH→EN review modes and one-click outcomes.
- Light/dark theme toggle and Chinese/English UI copy on the landing and dashboard pages.
- SQLite persistence by default; Dockerfile for single-container deployment; GitHub Action builds the latest image.

## Getting started
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Visit http://127.0.0.1:8000 to register, login, and manage your words.

## Docker
```bash
docker build -t ai-word-notebook .
docker run -p 8000:8000 ai-word-notebook
```

## Tests
Run a small scheduler test:
```bash
python -m pytest
```

## CI/CD
The workflow `.github/workflows/docker-image.yml` builds and pushes `ghcr.io/<owner>/<repo>/ai-word-notebook:latest` on pushes to `main`.
