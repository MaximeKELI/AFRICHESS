#!/bin/bash
# Vérification rapide des contrôles sécurité (sans pentest complet).
set -euo pipefail

BASE="${1:-http://localhost:8000}"
API="${BASE%/}/api"

check() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    printf "  ✓ %-28s %s\n" "$label" "$actual"
  else
    printf "  ✗ %-28s %s (attendu %s)\n" "$label" "$actual" "$expected"
  fi
}

echo "Vérification sécurité → $BASE"
echo ""

REG=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/auth/registration/")
SCHEMA=$(curl -s -o /dev/null -w "%{http_code}" "$API/schema/")
DAILY=$(curl -s -o /dev/null -w "%{http_code}" "$API/puzzles/daily/")

check "registration désactivé" "410" "$REG"
check "schema protégé" "401" "$SCHEMA"
check "API reachable" "200" "$DAILY"

echo ""
if [[ "$REG" == "410" && "$SCHEMA" == "401" ]]; then
  echo "Backend sécurisé détecté."
else
  echo "Backend vulnérable ou ancien — essayez :"
  echo "  $0 http://localhost:8001"
  echo "  ./scripts/fix-docker-stuck.sh"
fi
