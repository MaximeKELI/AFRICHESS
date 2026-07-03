#!/usr/bin/env bash
# Dev hybride : db/redis Docker + backend daphne local + frontend Next.js
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ Arrêt des anciennes instances (ports 8000 / 3000)…"
pkill -f "daphne.*127.0.0.1.*8000" 2>/dev/null || true
pkill -f "daphne.*0.0.0.0.*8000" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 1

if ss -tlnp 2>/dev/null | grep -q ':8000 '; then
  echo "⚠ Port 8000 encore occupé. Essayez : pkill -f daphne"
  exit 1
fi

echo "→ Démarrage db + redis…"
docker compose up -d db redis

export POSTGRES_HOST=127.0.0.1
export POSTGRES_PORT=5433
export POSTGRES_PASSWORD=africhess
export REDIS_URL=redis://:africhess_redis_dev@127.0.0.1:6379/0
export REDIS_CACHE_URL=redis://:africhess_redis_dev@127.0.0.1:6379/4
export DJANGO_SETTINGS_MODULE=config.settings.development
export SECRET_KEY=dev-local-docker-compose-secret-key-minimum-fifty-characters-long

trap 'kill 0' EXIT
echo "→ Backend http://127.0.0.1:8000"
(cd backend && daphne -b 127.0.0.1 -p 8000 config.asgi:application) &
echo "→ Frontend http://localhost:3000"
cd frontend && npm run dev
