#!/bin/bash
# Débloque les conteneurs AFRICHESS figés (permission denied) et relance la stack sécurisée.
set -euo pipefail
cd "$(dirname "$0")/.."

DOCKER="${DOCKER:-sudo docker}"

echo "=== Diagnostic avant nettoyage ==="
$DOCKER ps -a --filter name=africhess --format 'table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}' || true
echo ""
echo "Sécurité rapide (attendu sur stack saine : registration=410, schema=401) :"
echo "  :8000 registration=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:8000/api/auth/registration/ 2>/dev/null || echo down)"
echo "  :8000 schema=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/api/schema/ 2>/dev/null || echo down)"
echo "  :8001 registration=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:8001/api/auth/registration/ 2>/dev/null || echo down)"
echo "  :8001 schema=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8001/api/schema/ 2>/dev/null || echo down)"
echo ""

collect_ids() {
  $DOCKER ps -aq --filter name=africhess 2>/dev/null
  $DOCKER ps -aq --filter name=bd2b227e6f6f 2>/dev/null
  $DOCKER ps -aq --filter name=backend-secure 2>/dev/null
}

kill_one() {
  local id="$1"
  $DOCKER kill "$id" 2>/dev/null || return 1
}

remove_one() {
  local id="$1"
  $DOCKER rm -f "$id" 2>/dev/null || return 1
}

echo "=== Arrêt forcé conteneur par conteneur ==="
mapfile -t IDS < <(collect_ids | sort -u)
if ((${#IDS[@]} == 0)); then
  echo "Aucun conteneur AFRICHESS trouvé."
else
  FAILED=()
  for id in "${IDS[@]}"; do
    [[ -z "$id" ]] && continue
    name=$($DOCKER inspect -f '{{.Name}}' "$id" 2>/dev/null | sed 's#^/##' || echo "$id")
    if kill_one "$id"; then
      echo "  kill OK  $name ($id)"
    else
      echo "  kill FAIL $name ($id)"
      FAILED+=("$id")
    fi
  done

  for id in "${IDS[@]}"; do
    [[ -z "$id" ]] && continue
    remove_one "$id" || true
  done

  if ((${#FAILED[@]} > 0)); then
    echo ""
    echo "=== Échec kill sur ${#FAILED[@]} conteneur(s) — redémarrage du daemon Docker ==="
    echo "    (corrige souvent 'permission denied' sur conteneurs zombies)"
    sudo systemctl restart docker
    sleep 5
    for id in "${FAILED[@]}"; do
      remove_one "$id" || true
    done
  fi
fi

echo ""
echo "=== Redémarrage stack ==="
$DOCKER compose down --remove-orphans 2>/dev/null || true
$DOCKER compose up -d --build --force-recreate

echo ""
echo "=== Attente backend ==="
for i in {1..30}; do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/puzzles/daily/ 2>/dev/null || echo "000")
  if [[ "$code" == "200" ]]; then
    echo "✓ API :8000 OK"
    break
  fi
  sleep 2
done

echo ""
echo "=== Vérification sécurité ==="
REG=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/api/auth/registration/)
SCHEMA=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/schema/)
echo "registration → $REG (attendu 410)"
echo "schema       → $SCHEMA (attendu 401)"

if [[ "$REG" == "410" && "$SCHEMA" == "401" ]]; then
  echo ""
  echo "Stack sécurisée sur :8000. Pentest :"
  echo "  python3 scripts/aggressive_pentest.py"
else
  echo ""
  echo "⚠ :8000 sert encore l'ancienne image ou la stack n'est pas prête."
  echo "  Pentest sur le backend de secours :"
  echo "  python3 scripts/aggressive_pentest.py --base http://localhost:8001"
  echo ""
  echo "Si le problème persiste :"
  echo "  sudo systemctl restart docker"
  echo "  ./scripts/fix-docker-stuck.sh"
fi
