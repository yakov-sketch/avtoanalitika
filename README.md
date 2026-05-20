# Rovena Analytics

Аналитический дашборд для поиска редких и недопредставленных автомобилей на auto.ru / avito / drom.

- **Frontend**: Next.js 14 + TypeScript + Tailwind (App Router, server components)
- **Backend**: FastAPI + Pydantic 2 + SQLite (локально) / Postgres (прод)
- **Данные**: ежедневная выгрузка от провайдера auto-parser.ru

## Запуск локально (без Docker)

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate   # Windows; на mac/linux source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

При первом запуске пустая БД автоматически заполнится из `backend/seed/listings.csv.gz` (~5500 объявлений-snapshot).

### Frontend

```bash
cp .env.example .env.local      # или напиши руками
npm install
npm run dev
```

Открой http://localhost:3000.

## Запуск локально через Docker

Один shot, поднимет Postgres + backend + frontend:

```bash
docker compose up --build
```

Backend на http://localhost:8000, frontend на http://localhost:3000. БД — Postgres внутри контейнера.

## Деплой на Railway

В Railway-проекте создаётся **три service**:

### 1. Postgres
Add-on → Add → Postgres. Railway автоматически выставит `DATABASE_URL` в проектный scope.

### 2. Backend (FastAPI)
- New Service → Deploy from GitHub repo → выбери `yakov-sketch/avtoanalitika`
- Settings → **Root Directory**: `backend`
- Variables:
  - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (reference)
  - `CORS_ORIGINS` = URL фронтенд-сервиса (см. ниже после деплоя фронта)
  - `SENTRY_DSN` — опционально, для трекинга ошибок

### 3. Frontend (Next.js)
- New Service → Deploy from GitHub repo → тот же репо
- Settings → **Root Directory**: оставь пустым (корень)
- Variables:
  - `NEXT_PUBLIC_API_BASE_URL` = публичный URL backend-сервиса (например `https://rovena-backend.up.railway.app`)
  - `BASIC_AUTH_USER`, `BASIC_AUTH_PASS` — опционально, если хочешь закрыть демо логином

После того как оба сервиса получат публичные URL — допиши `CORS_ORIGINS` в бэкенде на адрес фронта и редеплой backend (одна кнопка).

### Что произойдёт при первом запуске на Railway

1. Backend поднимется, создаст схему таблиц в Postgres (пусто)
2. Запустится `seed_if_empty()` — БД наполнится 5500+ строками из `backend/seed/listings.csv.gz`
3. Pipeline (избранное) пустой — пользователи могут добавлять
4. Snapshot замороженный (2026-05-19) до тех пор, пока не подключим cron на auto-parser.ru

## Pipeline of features

- ✅ Single source of truth — все данные через FastAPI + Pydantic schemas
- ✅ Универсальный поиск в шапке (бренды / модели / регионы / площадки)
- ✅ Карточки моделей с фильтром по году и комплектации
- ✅ 4 независимых scoring-метрики (Дефицит / Ликвидность / Спрос / Перспективность) с breakdown «как посчитано»
- ✅ Личное избранное со статусами (наблюдение / в работе / куплено / отказ)
- ✅ Mobile responsive (`<sm`, `<lg`, `<xl` breakpoints)
- ✅ Тесты (pytest, 18 шт.) на scoring/normalize/districts
- ✅ Опциональный Sentry, опциональный Basic Auth
- ⏳ Cron на auto-parser.ru — ждём кредов провайдера
- ⏳ История snapshot'ов / логика «продано-снято» — после накопления 2+ снимков
- ⏳ Каталог справочников (marks/models/configurations/specifications)

## Ежедневный импорт (когда auto-parser.ru подключим)

```bash
cd backend
python -m app.ingest /path/to/inbox/  --snapshot YYYY-MM-DD
```

Скрипт распознаёт legkovoy car_active/car_removed по именам файлов, поддерживает все три платформы, нормализует марки и регионы.

## Тесты

```bash
cd backend
pytest tests/ -q
```
