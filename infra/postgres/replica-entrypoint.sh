#!/bin/sh
set -e
export PGDATA=/var/lib/postgresql/data

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  until pg_isready -h postgres-primary -U "${POSTGRES_USER:-africhess}"; do sleep 2; done
  PGPASSWORD="${REPLICATION_PASSWORD:-replicator}" pg_basebackup \
    -h postgres-primary -D "$PGDATA" -U replicator -Fp -Xs -P -R
  touch "$PGDATA/standby.signal"
fi
exec docker-entrypoint.sh postgres
