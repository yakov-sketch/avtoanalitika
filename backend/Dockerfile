FROM python:3.12-slim

WORKDIR /app

# system deps for psycopg2-binary (it's prebuilt but libpq still helps)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY seed ./seed

ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Railway / Heroku-style: respect $PORT
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
