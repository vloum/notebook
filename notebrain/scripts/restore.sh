#!/bin/bash
# ============================================================
# NoteBrain Database Restore Script (Production)
#
# Usage:
#   ./restore.sh daily <backup_file>     # Restore from daily logical backup
#   ./restore.sh weekly <backup_dir>     # Restore from weekly physical backup
#   ./restore.sh list                    # List available backups
#
# Examples:
#   ./restore.sh list
#   ./restore.sh daily /backups/daily/notebrain_20260208_0200.sql.gz
#
# WARNING: Restore operations will OVERWRITE the current database.
#          Always verify you have a current backup before restoring.
# ============================================================

set -euo pipefail

# --- Configuration ---
BACKUP_ROOT="${BACKUP_ROOT:-/backups}"
DAILY_DIR="${BACKUP_ROOT}/daily"
WEEKLY_DIR="${BACKUP_ROOT}/weekly"

DB_HOST="${PGHOST:-postgres}"
DB_PORT="${PGPORT:-5432}"
DB_NAME="${PGDATABASE:-notebrain}"
DB_USER="${PGUSER:-notebrain}"
PG_CONTAINER="${PG_CONTAINER:-notebrain-postgres}"

# --- Helpers ---
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

confirm() {
  local msg="$1"
  echo ""
  echo "⚠️  WARNING: $msg"
  echo ""
  read -p "Type 'yes' to confirm: " response
  if [ "$response" != "yes" ]; then
    echo "Aborted."
    exit 0
  fi
}

# --- List backups ---
list_backups() {
  echo ""
  echo "=== Available Backups ==="
  echo ""

  echo "📦 Daily Logical Backups (${DAILY_DIR}):"
  if ls "$DAILY_DIR"/*.dump 2>/dev/null | head -20; then
    echo ""
  else
    echo "  (none)"
  fi

  echo ""
  echo "📦 Weekly Physical Backups (${WEEKLY_DIR}):"
  if ls -d "$WEEKLY_DIR"/base_* 2>/dev/null | head -10; then
    echo ""
  else
    echo "  (none)"
  fi

  echo ""
  echo "Usage:"
  echo "  ./restore.sh daily <backup_file>"
  echo "  ./restore.sh weekly <backup_dir>"
}

# --- Restore from daily logical backup (pg_restore) ---
restore_daily() {
  local backup_file="$1"

  if [ ! -f "$backup_file" ]; then
    log "ERROR: Backup file not found: $backup_file"
    exit 1
  fi

  local file_size
  file_size=$(du -h "$backup_file" | cut -f1)
  log "Backup file: $backup_file ($file_size)"

  confirm "This will DROP and RECREATE the database '${DB_NAME}'. All current data will be lost."

  log "=== Starting restore from daily backup ==="

  # Copy backup into container
  local tmp_file="/tmp/restore_$(date +%s).dump"
  docker cp "$backup_file" "${PG_CONTAINER}:${tmp_file}"

  # Drop and recreate database
  log "Dropping database ${DB_NAME}..."
  docker exec "$PG_CONTAINER" psql -h localhost -U "$DB_USER" -d postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB_NAME}' AND pid <> pg_backend_pid();" \
    2>/dev/null || true
  docker exec "$PG_CONTAINER" dropdb -h localhost -U "$DB_USER" --if-exists "$DB_NAME"
  docker exec "$PG_CONTAINER" createdb -h localhost -U "$DB_USER" "$DB_NAME"

  # Restore extensions first
  log "Restoring extensions..."
  docker exec "$PG_CONTAINER" psql -h localhost -U "$DB_USER" -d "$DB_NAME" \
    -c "CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

  # Restore data
  log "Restoring data from backup..."
  docker exec "$PG_CONTAINER" pg_restore \
    -h localhost \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-privileges \
    --verbose \
    "$tmp_file" 2>&1 | tail -5

  # Cleanup
  docker exec "$PG_CONTAINER" rm -f "$tmp_file"

  log "=== Restore completed successfully ==="
  log "Run 'ANALYZE' to update query planner statistics:"
  log "  docker exec ${PG_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -c 'ANALYZE;'"
}

# --- Restore from weekly physical backup ---
restore_weekly() {
  local backup_dir="$1"

  if [ ! -d "$backup_dir" ]; then
    log "ERROR: Backup directory not found: $backup_dir"
    exit 1
  fi

  confirm "Physical restore requires stopping PostgreSQL and replacing all data files. This is a DESTRUCTIVE operation."

  log "=== Starting restore from weekly physical backup ==="
  log ""
  log "Manual steps required:"
  log "  1. Stop the PostgreSQL container:"
  log "     docker compose stop postgres"
  log ""
  log "  2. Remove current data volume:"
  log "     docker volume rm notebrain_pg_data"
  log ""
  log "  3. Create a new volume and copy backup data:"
  log "     docker volume create notebrain_pg_data"
  log "     docker run --rm -v notebrain_pg_data:/var/lib/postgresql/data -v ${backup_dir}:/backup alpine sh -c 'cd /var/lib/postgresql/data && tar xzf /backup/base.tar.gz'"
  log ""
  log "  4. If doing PITR (Point-In-Time Recovery), copy WAL files:"
  log "     docker run --rm -v notebrain_pg_data:/data -v ${BACKUP_ROOT}/wal:/wal alpine sh -c 'cp /wal/* /data/pg_wal/'"
  log ""
  log "  5. Create recovery.signal for PITR (optional):"
  log "     docker run --rm -v notebrain_pg_data:/data alpine touch /data/recovery.signal"
  log "     # Add to postgresql.conf: recovery_target_time = '2026-02-08 10:30:00'"
  log ""
  log "  6. Start PostgreSQL:"
  log "     docker compose up -d postgres"
  log ""
  log "  7. Verify data and run ANALYZE"
}

# --- Main ---
main() {
  case "${1:-}" in
    daily)
      if [ -z "${2:-}" ]; then
        echo "Usage: $0 daily <backup_file>"
        exit 1
      fi
      restore_daily "$2"
      ;;
    weekly)
      if [ -z "${2:-}" ]; then
        echo "Usage: $0 weekly <backup_dir>"
        exit 1
      fi
      restore_weekly "$2"
      ;;
    list)
      list_backups
      ;;
    *)
      echo "NoteBrain Database Restore"
      echo ""
      echo "Usage:"
      echo "  $0 list                       # List available backups"
      echo "  $0 daily <backup_file>        # Restore from logical backup"
      echo "  $0 weekly <backup_dir>        # Restore from physical backup"
      exit 1
      ;;
  esac
}

main "$@"
