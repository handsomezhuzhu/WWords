FROM node:20-bookworm-slim AS frontend-deps

WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci


FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /frontend
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=frontend-deps /frontend/node_modules ./node_modules
COPY frontend ./
RUN npm run build


FROM python:3.11-slim-bookworm AS runtime

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=sqlite:///./data/data.db \
    BACKEND_HOST=127.0.0.1 \
    BACKEND_PORT=8000 \
    HOST=0.0.0.0 \
    PORT=7997

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY --from=frontend-builder /usr/local/bin/node /usr/local/bin/node
COPY app ./app
COPY docker/start_container.py ./docker/start_container.py
COPY --from=frontend-builder /frontend/.next/standalone ./frontend
COPY --from=frontend-builder /frontend/.next/static ./frontend/.next/static

RUN mkdir -p /app/data

EXPOSE 7997
CMD ["python", "docker/start_container.py"]
