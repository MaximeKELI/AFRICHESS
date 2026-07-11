#!/usr/bin/env bash
# AFRICHESS — bootstrap + démarrage tout-en-un
# Usage: ./scripts/dev-all.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PG_PASS="${POSTGRES_PASSWORD:-africhess_dev_pg}"
REDIS_PASS="${REDIS_PASSWORD:-africhess_redis_dev}"

echo "════════════════════════════════════════"
echo "  AFRICHESS — install + démarrage"
echo "════════════════════════════════════════"

# ── 1. Node (nvm) ──────────────────────────────────────────
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "→ Installation nvm + Node 22…"
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm install 22 >/dev/null
nvm use 22 >/dev/null
echo "✓ Node $(node -v) / npm $(npm -v)"

# ── 2. Frontend + mobile npm ───────────────────────────────
if [ ! -d frontend/node_modules ]; then
  echo "→ npm install frontend…"
  (cd frontend && npm install)
else
  echo "✓ frontend/node_modules déjà présent"
fi

if [ ! -d mobile/node_modules ]; then
  echo "→ npm install mobile…"
  (cd mobile && npm install)
else
  echo "✓ mobile/node_modules déjà présent"
fi

# ── 3. Backend Python (uv + 3.12) ───────────────────────────
export PATH="${HOME}/.local/bin:${PATH}"
if ! command -v uv >/dev/null 2>&1; then
  echo "→ Installation uv…"
  curl -fsSL https://astral.sh/uv/install.sh | sh
  export PATH="${HOME}/.local/bin:${PATH}"
fi

if [ ! -x backend/.venv/bin/python ]; then
  echo "→ Création venv Python 3.12 + deps backend…"
  uv python install 3.12
  (cd backend && uv venv --python 3.12 .venv && . .venv/bin/activate && uv pip install -r requirements.txt)
else
  echo "✓ backend/.venv déjà présent"
fi
echo "✓ $($ROOT/backend/.venv/bin/python -c 'import django; print("Django", django.get_version())')"

# ── 4. .env ────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  # Aligner le mot de passe Postgres avec docker-compose
  if grep -q '^POSTGRES_PASSWORD=africhess$' .env 2>/dev/null || grep -q '^POSTGRES_PASSWORD=your-' .env 2>/dev/null; then
    sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${PG_PASS}|" .env
  fi
  echo "✓ .env créé depuis .env.example"
else
  echo "✓ .env déjà présent"
fi

# ── 5. Docker ──────────────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  echo "✗ Docker introuvable. Installez Docker Desktop / docker.io puis relancez."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "✗ Le daemon Docker n'est pas démarré."
  echo "  Sur Ubuntu :  sudo service docker start"
  echo "  Ou lancez Docker Desktop, puis relancez :  ./scripts/dev-all.sh"
  exit 1
fi
echo "✓ Docker OK"

echo "→ Démarrage db + redis…"
docker compose up -d db redis

echo "→ Attente santé Postgres…"
for i in $(seq 1 40); do
  if docker compose exec -T db pg_isready -U africhess -d africhess >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "→ Démarrage backend (migrations)…"
docker compose up -d --build backend

echo "→ Attente API…"
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/health/ 2>/dev/null || echo "000")
  if [ "$code" = "200" ]; then
    echo "✓ Backend répond ($code)"
    break
  fi
  sleep 2
done

echo "→ Démarrage celery…"
docker compose up -d celery celery-beat

# ── 6. Frontend ────────────────────────────────────────────
echo "→ Arrêt éventuel de Next.js sur :3000…"
pkill -f "next dev" 2>/dev/null || true
sleep 1

echo ""
echo "════════════════════════════════════════"
echo "  Stack prête"
echo "  API / Swagger : http://localhost:8000/api/docs/"
echo "  Frontend      : http://localhost:3000  (démarrage…)"
echo "  Compte démo   : make demo  → demo / demo1234"
echo "════════════════════════════════════════"
echo ""

cd frontend
exec npm run dev
