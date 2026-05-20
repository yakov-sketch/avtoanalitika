# Rovena Analytics API

FastAPI backend для личного кабинета поиска редких и недопредставленных автомобилей.

## Запуск локально

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Swagger:
- http://localhost:8000/docs
- http://localhost:8000/redoc

## Основные endpoints

- `GET /health`
- `GET /api/v1/overview`
- `GET /api/v1/rare-models`
- `POST /api/v1/search`
- `GET /api/v1/models/{model_id}`
- `GET /api/v1/platforms`
- `GET /api/v1/platforms/{platform_id}`
- `GET /api/v1/regions/{region_id}`
- `GET /api/v1/opportunities`
- `GET /api/v1/search-metadata`
