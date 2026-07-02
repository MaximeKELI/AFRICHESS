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
python manage.py seed_puzzles --download   # 10 000+ puzzles Lichess (premier démarrage ~5–15 min)
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

- Game: `ws://127.0.0.1:8000/ws/game/<uuid>/`
- Matchmaking: `ws://127.0.0.1:8000/ws/matchmaking/`
- Notifications: `ws://127.0.0.1:8000/ws/notifications/`

Authentification : **`Sec-WebSocket-Protocol: bearer,<access_token>`** (voir `frontend/src/lib/gameWs.ts`).

Le paramètre `?token=` n'est accepté que si `WS_ALLOW_QUERY_TOKEN=true` (déconseillé en production).

## Analyse post-partie automatique

Dès qu'une partie se termine, Stockfish analyse la position en arrière-plan (tâche Celery `auto_analyze_completed_game`). La revue de partie s'ouvre quasi instantanément si l'analyse est déjà en cache.

```bash
# .env (défauts)
AUTO_GAME_ANALYSIS_ENABLED=true
AUTO_GAME_ANALYSIS_MIN_MOVES=2
```

- Nécessite **Celery worker** (`docker compose up celery`) et Stockfish configuré.
- Les clients reçoivent `analysis_ready` sur le WebSocket de la partie.
- Désactiver : `AUTO_GAME_ANALYSIS_ENABLED=false`

## Matchmaking Redis (pairing instantané)

La file d'attente utilise **Redis** (sorted sets + script Lua atomique) pour apparier les joueurs en **< 500 ms** dès qu'un adversaire compatible rejoint.

```bash
MATCHMAKING_REDIS_ENABLED=true   # défaut
MATCHMAKING_ELO_RANGE=200
REDIS_URL=redis://:password@localhost:6379/0
```

- **API statut** : `GET /api/games/matchmaking/status/` → `{ searching_players, redis_enabled }`
- **Fallback** : si Redis est indisponible, PostgreSQL + réconciliation Celery (60 s)
- **Docker** : le service `redis` et `celery` doivent tourner (`docker compose up`)

Chat in-game : événement `{ "event": "chat", "message": "..." }` sur le canal partie (pas `ws/chat/`).
