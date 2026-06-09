#!/bin/bash
# Réinitialise le rate-limit inscription (throttle en mémoire) en redémarrant le backend.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== Redémarrage backend (réinitialise le throttle inscription) ==="
sudo docker compose restart backend

echo "=== Attente API ==="
for i in {1..20}; do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/puzzles/daily/ 2>/dev/null || echo "000")
  if [[ "$code" == "200" ]]; then
    echo "✓ API prête"
    break
  fi
  sleep 2
done

echo ""
echo "Réessayez l'inscription sur http://localhost:3000/register"
echo "Mot de passe conseillé : MonPass2026! (pas 12345678)"
