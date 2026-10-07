#!/usr/bin/env bash
# Daily PostgreSQL backup. Usage: DIRECT_URL=postgresql://... ./scripts/backup.sh [output_dir] [keep_days]
# Cron example (every day 03:30):  30 3 * * * cd /path/to/project && set -a && . ./.env && set +a && ./scripts/backup.sh /var/backups/storebot 14
set -euo pipefail
OUT="${1:-./backups}"; KEEP="${2:-14}"; URL="${DIRECT_URL:-}"
[ -n "$URL" ] || { echo "DIRECT_URL is not set (use the direct :5432 connection, not the pgbouncer one)"; exit 1; }
command -v pg_dump >/dev/null || { echo "pg_dump not found (install postgresql-client)"; exit 1; }
mkdir -p "$OUT"; F="$OUT/storebot-$(date +%Y%m%d-%H%M%S).sql.gz"
pg_dump --no-owner --no-privileges "$URL" | gzip -9 > "$F"
[ -s "$F" ] || { echo "backup is empty, removing"; rm -f "$F"; exit 1; }
find "$OUT" -name 'storebot-*.sql.gz' -mtime +"$KEEP" -delete
echo "OK: $F ($(du -h "$F" | cut -f1))"
# Restore (into an EMPTY database):  gunzip -c backup.sql.gz | psql "$DIRECT_URL"
