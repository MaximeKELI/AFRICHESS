#!/bin/sh
set -e
mkdir -p staticfiles

TIER="${AFRICHESS_TIER:-all}"
PORT="${PORT:-8000}"
WORKERS="${GUNICORN_WORKERS:-4}"

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  python manage.py migrate --noinput
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  python manage.py seed_puzzles --download 2>/dev/null || true
  python manage.py seed_bots 2>/dev/null || true
  python manage.py seed_league 2>/dev/null || true
fi

# Si docker-compose passe une commande (celery, etc.), l'exécuter telle quelle
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

case "$TIER" in
  api)
    exec gunicorn config.asgi_http:application \
      -k uvicorn.workers.UvicornWorker \
      -b "0.0.0.0:${PORT}" \
      -w "$WORKERS" \
      --timeout 120 \
      --graceful-timeout 30 \
      --access-logfile - \
      --error-logfile -
    ;;
  ws)
    exec daphne -b 0.0.0.0 -p "$PORT" config.asgi_ws:application
    ;;
  *)
    exec daphne -b 0.0.0.0 -p "$PORT" config.asgi:application
    ;;
esac
