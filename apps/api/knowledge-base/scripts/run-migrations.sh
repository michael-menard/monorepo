#!/usr/bin/env bash
# run-migrations.sh — Idempotent SQL migration runner for the KB database.
# Bash 3.2-compatible (macOS default).
#
# Usage:
#   ./scripts/run-migrations.sh [--dry-run]
#
# Environment variables (with defaults):
#   KB_DB_HOST      (localhost)
#   KB_DB_PORT      (5433)
#   KB_DB_USER      (kbuser)
#   KB_DB_NAME      (knowledgebase)
#   KB_DB_PASSWORD  (optional — uses .pgpass / PGPASSWORD if unset)

set -euo pipefail

# --- Configuration -----------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/../src/db/migrations"
DRY_RUN=false

DB_HOST="${KB_DB_HOST:-localhost}"
DB_PORT="${KB_DB_PORT:-5433}"
DB_USER="${KB_DB_USER:-kbuser}"
DB_NAME="${KB_DB_NAME:-knowledgebase}"

if [ -n "${KB_DB_PASSWORD:-}" ]; then
  export PGPASSWORD="$KB_DB_PASSWORD"
fi

# --- Parse flags --------------------------------------------------------------
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    *) echo "Unknown flag: $arg"; exit 1 ;;
  esac
done

# --- Helpers ------------------------------------------------------------------
psql_cmd() {
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -v ON_ERROR_STOP=1 --no-psqlrc -q "$@"
}

psql_query() {
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -v ON_ERROR_STOP=1 --no-psqlrc -tAq -c "$1"
}

sha256_file() {
  shasum -a 256 "$1" | cut -d' ' -f1
}

# --- Bootstrap: ensure schema_migrations exists (run 023 first) ---------------
BOOTSTRAP_FILE="$MIGRATIONS_DIR/023_schema_migrations_table.sql"
if [ ! -f "$BOOTSTRAP_FILE" ]; then
  echo "ERROR: Bootstrap migration not found: $BOOTSTRAP_FILE"
  exit 1
fi

TABLE_EXISTS=$(psql_query "SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'schema_migrations'
);" 2>/dev/null || echo "f")

if [ "$TABLE_EXISTS" = "f" ]; then
  echo "Bootstrapping schema_migrations table..."
  if [ "$DRY_RUN" = true ]; then
    echo "  [DRY RUN] Would apply: 023_schema_migrations_table.sql"
  else
    psql_cmd -f "$BOOTSTRAP_FILE"
    CHECKSUM=$(sha256_file "$BOOTSTRAP_FILE")
    psql_query "INSERT INTO schema_migrations (filename, checksum)
      VALUES ('023_schema_migrations_table.sql', '$CHECKSUM')
      ON CONFLICT (filename) DO NOTHING;" > /dev/null
    echo "  Applied: 023_schema_migrations_table.sql"
  fi
fi

# --- Run migrations -----------------------------------------------------------
APPLIED=0
SKIPPED=0

# Sort migration files alphabetically (natural order for NNN_ prefix)
for FILE in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
  BASENAME="$(basename "$FILE")"

  # Skip meta/ subdirectory files (shouldn't match *.sql glob, but guard anyway)
  case "$FILE" in
    */meta/*) continue ;;
  esac

  # Check if already applied
  IS_APPLIED=$(psql_query "SELECT EXISTS (
    SELECT 1 FROM schema_migrations WHERE filename = '$BASENAME'
  );" 2>/dev/null || echo "f")

  if [ "$IS_APPLIED" = "t" ]; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  CHECKSUM=$(sha256_file "$FILE")

  if [ "$DRY_RUN" = true ]; then
    echo "  [DRY RUN] Would apply: $BASENAME (sha256: ${CHECKSUM:0:12}...)"
    APPLIED=$((APPLIED + 1))
    continue
  fi

  echo "  Applying: $BASENAME ..."
  psql_cmd -f "$FILE"

  psql_query "INSERT INTO schema_migrations (filename, checksum)
    VALUES ('$BASENAME', '$CHECKSUM');" > /dev/null

  APPLIED=$((APPLIED + 1))
  echo "  Done: $BASENAME"
done

# --- Summary ------------------------------------------------------------------
echo ""
if [ "$DRY_RUN" = true ]; then
  echo "Dry run complete. $APPLIED migration(s) would be applied, $SKIPPED already applied."
else
  echo "Migration run complete. $APPLIED applied, $SKIPPED already applied."
fi
