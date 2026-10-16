#!/usr/bin/env bash
# Weekly task (user cron on the VPS): database backup, then digest sending.
# Article generation is no longer run here: the app schedules it (frequency set in the admin page). Log: /opt/docker/ai-news/logs/weekly.log
set -uo pipefail

APP_DIR="${APP_DIR:-/opt/docker/ai-news}"
BACKUP_DIR="${BACKUP_DIR:-/opt/docker/ai-news-backups/db}"
KEEP_DAYS="${KEEP_DAYS:-60}"
DC="sudo docker compose -f $APP_DIR/docker-compose.prod.yml"

cd "$APP_DIR" || exit 1
echo "=== $(date -u '+%F %T') UTC: start of the weekly task"

# 1) Backup (before any write). Failure = stop: we do not modify a database that is not backed up.
mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/ai-news-$(date -u +%F).sql.gz"
if $DC exec -T db pg_dump -U ainews ainews | gzip > "$OUT.tmp" && [ -s "$OUT.tmp" ]; then
  mv "$OUT.tmp" "$OUT"
  echo "backup: $OUT ($(du -h "$OUT" | cut -f1))"
else
  rm -f "$OUT.tmp"
  echo "ERROR: backup failed, task aborted" >&2
  exit 1
fi
# Retention: only this application's backups, older than KEEP_DAYS days.
find "$BACKUP_DIR" -maxdepth 1 -name 'ai-news-*.sql.gz' -mtime +"$KEEP_DAYS" -delete

# (--build: the "tools" image is rebuilt if the code changed since the last run)
# 2) Digest
$DC run --build --rm tools src/pipeline/digest.ts || echo "ERROR: digest failed (code $?)" >&2

echo "=== $(date -u '+%F %T') UTC: end"
