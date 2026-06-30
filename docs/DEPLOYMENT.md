# Déploiement production AFRICHESS

## Prérequis

- PostgreSQL 16+
- Redis 7+ (Channels + Celery)
- Stockfish installé sur le serveur backend
- HTTPS + **WSS** (`wss://api.votredomaine.com`)

## Checklist production

Avant mise en ligne, vérifier :

- `DEBUG=False` (forcé dans `config.settings.production`)
- `SECRET_KEY` unique, aléatoire, **≥ 50 caractères** (refus au démarrage sinon)
- HTTPS actif (`SECURE_SSL_REDIRECT=True` par défaut)
- WebSockets en **WSS** (`NEXT_PUBLIC_WS_URL=wss://...`)

## Variables d'environnement

```env
DJANGO_SETTINGS_MODULE=config.settings.production
SECRET_KEY=<long-random-50-chars-minimum>
DEBUG=False
ALLOWED_HOSTS=api.africhess.com
CORS_ALLOWED_ORIGINS=https://africhess.com
REDIS_URL=redis://:YOUR_REDIS_PASSWORD@redis:6379/0
REDIS_PASSWORD=YOUR_REDIS_PASSWORD
POSTGRES_HOST=db
POSTGRES_SSLMODE=prefer
DB_CONN_MAX_AGE=600
POSTGRES_CONNECT_TIMEOUT=10
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
STOCKFISH_PATH=/usr/games/stockfish
FAIRPLAY_BIN=/usr/local/bin/africhess-fairplay
FAIRPLAY_DEPTH=14
FAIRPLAY_TIMEOUT=120
NEXT_PUBLIC_API_URL=https://api.africhess.com/api
NEXT_PUBLIC_WS_URL=wss://api.africhess.com
NEXT_PUBLIC_API_ORIGIN=https://api.africhess.com
NEXT_PUBLIC_OAUTH_ENABLED=true
FRONTEND_URL=https://africhess.com
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GITHUB_OAUTH_CLIENT_ID=...
GITHUB_OAUTH_CLIENT_SECRET=...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_GOLD=price_...
STRIPE_PRICE_DIAMOND=price_...
PREMIUM_DEMO_ALLOWED=false
WS_ALLOW_QUERY_TOKEN=false
```

Stripe webhooks à configurer : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.

Voir aussi [docs/PREMIUM_OAUTH_SETUP.md](PREMIUM_OAUTH_SETUP.md).

Redirect OAuth (Google Cloud / GitHub) : `https://api.africhess.com/accounts/google/login/callback/` (idem GitHub).

Après login social, redirection vers `https://africhess.com/auth/callback?code=<one-time>`.

Le frontend échange le code via `POST /api/users/auth/oauth/exchange/` `{ "code": "…" }` → `{ "access", "refresh" }`.

## Services Docker

- `backend` — Daphne ASGI (HTTP + WebSocket)
- `celery` — worker (matchmaking, forfeits)
- `celery-beat` — tâches périodiques (matchmaking, forfeits, **pairing daily**, **expiration premium**)
- `frontend` — Next.js
- `db`, `redis`

## Commandes initiales

```bash
python manage.py migrate
# entrypoint auto: seed_puzzles, seed_bots, seed_league
python manage.py seed_learning
python manage.py seed_full_curriculum --regenerate
python manage.py seed_tournaments
python manage.py collectstatic --noinput
```

## Rate limiting

DRF throttling : base `anon` 300/h, `user` 5000/h — production `anon` **120/h** (`config.settings.production`).

## Anti-triche (deux couches)

**Temps réel (Python)** — `backend/apps/games/anticheat.py` :

- Max 50 coups/minute en partie humaine
- Intervalle minimum entre coups identiques
- Télémétrie client (focus, copier-coller, etc.)

**Post-partie (C++)** — `anticheat-cpp/` + `fairplay_service.py` :

- Analyse Stockfish corrélée aux coups joués
- File de revue staff — pas de sanction automatique
- Build : voir [anticheat-cpp/README.md](../anticheat-cpp/README.md)

## Base de données (production)

- `CONN_MAX_AGE=600` et `CONN_HEALTH_CHECKS=True` (Daphne + Celery)
- `POSTGRES_SSLMODE=require` recommandé hors docker-compose local
- Index composites sur notifications, parties, puzzles (migrations automatiques)

### Sauvegarde PostgreSQL

```bash
chmod +x scripts/backup_db.sh
./scripts/backup_db.sh
# → backups/africhess_YYYYMMDD_HHMMSS.dump (rétention 14 fichiers)
```

Restauration :

```bash
docker exec -i africhess-db-1 pg_restore -U africhess -d africhess --clean < backups/votre.dump
```

Cron suggéré (quotidien 3h) : `0 3 * * * /chemin/AFRICHESS/scripts/backup_db.sh`

## Monitoring recommandé

- Sentry (erreurs Django + Next)
- Healthcheck public `GET /api/health/` → `{"status":"ok","database":true}` (503 si DB down)
- `pg_isready` sur le conteneur `db`
