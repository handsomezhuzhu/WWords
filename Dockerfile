FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

ENV HOST=0.0.0.0
ENV PORT=7997
ENV DATABASE_URL=sqlite:///./data.db

EXPOSE 7997
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7997"]
