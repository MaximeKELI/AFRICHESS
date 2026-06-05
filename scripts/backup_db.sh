#!/usr/bin/env bash
# Sauvegarde PostgreSQL AFRICHESS (docker-compose local ou serveur).
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
CONTAINER="${POSTGRES_CONTAINER:-africhess-db-1}"
DB_NAME="${POSTGRES_DB:-africhess}"
DB_USER="${POSTGRES_USER:-africhess}"

mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/africhess_${TIMESTAMP}.dump"

echo "→ Dump $DB_NAME depuis $CONTAINER vers $OUT"
docker exec "$CONTAINER" pg_dump -U "$DB_USER" -Fc "$DB_NAME" > "$OUT"
echo "✓ Sauvegarde créée ($(du -h "$OUT" | cut -f1))"

# Conserver les 14 dernières sauvegardes
ls -1t "$BACKUP_DIR"/africhess_*.dump 2>/dev/null | tail -n +15 | xargs -r rm -f
