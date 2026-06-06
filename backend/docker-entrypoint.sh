#!/bin/sh
set -e
mkdir -p staticfiles
python manage.py migrate --noinput
python manage.py seed_puzzles 2>/dev/null || true
python manage.py seed_bots 2>/dev/null || true
python manage.py seed_league 2>/dev/null || true
exec daphne -b 0.0.0.0 -p 8000 config.asgi:application
