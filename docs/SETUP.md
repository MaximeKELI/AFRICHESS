# AFRICHESS — Setup Guide

**Developer:** Maxime Dzidula KELI · WhatsApp: +33 754830039

## Prerequisites

- Docker & Docker Compose (recommended)
- OR: Python 3.12+, Node 20+, PostgreSQL 16, Redis 7, Stockfish

## Quick Start (Docker)

```bash
cd AFRICHESS
cp .env.example .env
docker compose up --build
```

| Service   | URL                          |
|-----------|------------------------------|
| Frontend  | http://localhost:3000        |
| API       | http://localhost:8000/api/   |
| API Docs  | http://localhost:8000/api/docs/ |
| Admin     | http://localhost:8000/admin/ |

Create superuser:

```bash
docker compose exec backend python manage.py createsuperuser
```

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Start PostgreSQL & Redis, then:
export DJANGO_SETTINGS_MODULE=config.settings.development
python manage.py migrate
python manage.py seed_puzzles
python manage.py createsuperuser
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL=http://localhost:8000/api` in `.env.local`.

## Stockfish

Install Stockfish and set `STOCKFISH_PATH`:

- Ubuntu/Debian: `sudo apt install stockfish` → `/usr/games/stockfish`
- macOS: `brew install stockfish`

## API Authentication

1. Register: `POST /api/users/register/`
2. Login: `POST /api/auth/login/` → JWT `access` + `refresh`
3. Use header: `Authorization: Bearer <access>`

## WebSockets

- Game: `ws://localhost:8000/ws/game/<uuid>/`
- Chat: `ws://localhost:8000/ws/chat/<room_type>/<room_id>/`

Pass JWT via query string or session auth (Channels session).
