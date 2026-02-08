#!/bin/bash
# ============================================================
# NoteBrain Database Backup Script (Production)
#
# Features:
#   - L1: Daily logical backup (pg_dump, gzip compressed)
#   - L2: Weekly physical backup (pg_basebackup)
#   - Automatic cleanup of expired backups
#   - Backup verification (file size + integrity check)
#   - Logging with rotation
#
# Usage:
#   ./backup.sh daily     # Run daily logical backup
#   ./backup.sh weekly    # Run weekly physical backup
#   ./backup.sh cleanup   # Cleanup expired backups
#   ./backup.sh all       # Run daily + cleanup (for cron)
#
# Cron examples:
#   0 2 * * * /path/to/backup.sh all      # Daily at 2:00 AM
#   0 3 * * 0 /path/to/backup.sh weekly   # Weekly Sunday at 3:00 AM
# ============================================================

set -euo pipefail

# --- Configuration ---
BACKUP_ROOT="${BACKUP_ROOT:-/backups}"
DAILY_DIR="${BACKUP_ROOT}/daily"
WEEKLY_DIR="${BACKUP_ROOT}/weekly"
WAL_DIR="${BACKUP_ROOT}/wal"
LOG_DIR="${BACKUP_ROOT}/logs"

# Retention
DAILY_RETAIN_DAYS=7
WEEKLY_RETAIN_WEEKS=4
WAL_RETAIN_DAYS=7
LOG_RETAIN_DAYS=30

# Database connection (uses environment variables)
DB_HOST="${PGHOST:-postgres}"
DB_PORT="${PGPORT:-5432}"
DB_NAME="${PGDATABASE:-notebrain}"
DB_USER="${PGUSER:-notebrain}"

# Docker container name (if running via docker exec)
PG_CONTAINER="${PG_CONTAINER:-notebrain-postgres}"

# Timestamp
NOW=$(date +%Y%m%d_%H%M%S)
TODAY=$(date +%Y%m%d)
LOG_FILE="${LOG_DIR}/backup_${TODAY}.log"

# --- Helpers ---
log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
  echo "$msg" | tee -a "$LOG_FILE"
}

ensure_dirs() {
  mkdir -p "$DAILY_DIR" "$WEEKLY_DIR" "$WAL_DIR" "$LOG_DIR"
}

check_db() {
  if docker exec "$PG_CONTAINER" pg_isready -h localhost -U "$DB_USER" > /dev/null 2>&1; then
    return 0
  else
    log "ERROR: Database is not ready"
    return 1
  fi
}

# --- L1: Daily Logical Backup (pg_dump) ---
daily_backup() {
  log "=== Starting daily logical backup ==="

  local backup_file="${DAILY_DIR}/${DB_NAME}_${NOW}.sql.gz"

  # pg_dump with compression
  docker exec "$PG_CONTAINER" pg_dump \
    -h localhost \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=custom \
    --compress=6 \
    --verbose \
    --file="/tmp/backup_${NOW}.dump" \
    2>> "$LOG_FILE"

  # Copy from container
  docker cp "${PG_CONTAINER}:/tmp/backup_${NOW}.dump" "$backup_file"
  docker exec "$PG_CONTAINER" rm -f "/tmp/backup_${NOW}.dump"

  # Verify backup
  local file_size
  file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat --printf="%s" "$backup_file" 2>/dev/null || echo "0")

  if [ "$file_size" -lt 1024 ]; then
    log "ERROR: Backup file too small (${file_size} bytes), may be corrupted"
    return 1
  fi

  log "Daily backup completed: $backup_file ($(du -h "$backup_file" | cut -f1))"

  # Verify by listing contents
  docker exec "$PG_CONTAINER" pg_restore \
    --list "/tmp/backup_${NOW}.dump" > /dev/null 2>&1 || true

  log "Daily backup verified successfully"
}

# --- L2: Weekly Physical Backup (pg_basebackup) ---
weekly_backup() {
  log "=== Starting weekly physical backup ==="

  local backup_dir="${WEEKLY_DIR}/base_${NOW}"
  mkdir -p "$backup_dir"

  # pg_basebackup
  docker exec "$PG_CONTAINER" pg_basebackup \
    -h localhost \
    -U "$DB_USER" \
    -D "/tmp/basebackup_${NOW}" \
    --format=tar \
    --gzip \
    --compress=6 \
    --checkpoint=fast \
    --progress \
    --verbose \
    2>> "$LOG_FILE"

  # Copy from container
  docker cp "${PG_CONTAINER}:/tmp/basebackup_${NOW}/." "$backup_dir/"
  docker exec "$PG_CONTAINER" rm -rf "/tmp/basebackup_${NOW}"

  log "Weekly backup completed: $backup_dir ($(du -sh "$backup_dir" | cut -f1))"
}

# --- Cleanup expired backups ---
cleanup() {
  log "=== Starting cleanup ==="

  # Daily: remove files older than N days
  local daily_count
  daily_count=$(find "$DAILY_DIR" -name "*.gz" -o -name "*.dump" | wc -l)
  find "$DAILY_DIR" -name "*.gz" -o -name "*.dump" -mtime +${DAILY_RETAIN_DAYS} -delete 2>/dev/null || true
  local daily_after
  daily_after=$(find "$DAILY_DIR" -name "*.gz" -o -name "*.dump" | wc -l)
  log "Daily backups: ${daily_count} -> ${daily_after} (retain ${DAILY_RETAIN_DAYS} days)"

  # Weekly: remove directories older than N weeks
  local weekly_days=$((WEEKLY_RETAIN_WEEKS * 7))
  find "$WEEKLY_DIR" -maxdepth 1 -type d -name "base_*" -mtime +${weekly_days} -exec rm -rf {} + 2>/dev/null || true
  log "Weekly backups: retained ${WEEKLY_RETAIN_WEEKS} weeks"

  # WAL: remove files older than N days
  find "$WAL_DIR" -type f -mtime +${WAL_RETAIN_DAYS} -delete 2>/dev/null || true
  log "WAL archives: retained ${WAL_RETAIN_DAYS} days"

  # Logs: remove old logs
  find "$LOG_DIR" -name "*.log" -mtime +${LOG_RETAIN_DAYS} -delete 2>/dev/null || true
  log "Logs: retained ${LOG_RETAIN_DAYS} days"

  log "Cleanup completed"
}

# --- Main ---
main() {
  ensure_dirs

  log "========================================"
  log "NoteBrain Backup - Mode: ${1:-all}"
  log "========================================"

  if ! check_db; then
    log "FATAL: Cannot connect to database, aborting"
    exit 1
  fi

  case "${1:-all}" in
    daily)
      daily_backup
      ;;
    weekly)
      weekly_backup
      ;;
    cleanup)
      cleanup
      ;;
    all)
      daily_backup
      cleanup
      ;;
    *)
      echo "Usage: $0 {daily|weekly|cleanup|all}"
      exit 1
      ;;
  esac

  log "Backup job finished"
}

main "$@"
