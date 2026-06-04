# Déploiement production AFRICHESS

## Prérequis

- PostgreSQL 16+
- Redis 7+ (Channels + Celery)
- Stockfish installé sur le serveur backend
- HTTPS + **WSS** (`wss://api.votredomaine.com`)

## Variables d'environnement

```env
SECRET_KEY=<long-random>
DEBUG=False
ALLOWED_HOSTS=api.africhess.com
CORS_ALLOWED_ORIGINS=https://africhess.com
REDIS_URL=redis://redis:6379/0
POSTGRES_HOST=db
STOCKFISH_PATH=/usr/games/stockfish
NEXT_PUBLIC_API_URL=https://api.africhess.com/api
NEXT_PUBLIC_WS_URL=wss://api.africhess.com
```

## Services Docker

- `backend` — Daphne ASGI (HTTP + WebSocket)
- `celery` — worker (matchmaking, forfeits)
- `celery-beat` — tâches périodiques
- `frontend` — Next.js
- `db`, `redis`

## Commandes initiales

```bash
python manage.py migrate
python manage.py seed_learning
python manage.py seed_full_curriculum --regenerate
python manage.py seed_tournaments
python manage.py collectstatic --noinput
```

## Rate limiting

DRF throttling activé (`anon` 200/h, `user` 3000/h).

## Anti-triche (basique)

- Max 45 coups/minute en partie humaine
- Intervalle minimum entre coups identiques

## Monitoring recommandé

- Sentry (erreurs Django + Next)
- Healthcheck `GET /api/schema/`
