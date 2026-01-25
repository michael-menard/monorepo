#!/bin/bash
# =============================================================================
# Knowledge Base Restore Script (KNOW-015)
# =============================================================================
#
# Restores the Knowledge Base PostgreSQL database from a backup file with
# pre-flight validation, checksum verification, and concurrent restore
# prevention. Implements AC3, AC4, AC5, and AC9.
#
# Usage:
#   ./scripts/restore-kb.sh --backup-file=<path>
#   ./scripts/restore-kb.sh --backup-file=<path> --force
#   ./scripts/restore-kb.sh --backup-file=<path> --target-db=<name>
#
# Arguments:
#   --backup-file=<path>  Path to the backup file (required)
#   --force               Skip confirmation prompt
#   --target-db=<name>    Restore to alternate database (optional)
#
# Environment Variables Required:
#   KB_DB_HOST, KB_DB_PORT, KB_DB_NAME, KB_DB_USER, KB_DB_PASSWORD
#
# Optional Environment Variables:
#   KB_BACKUP_LOCAL_PATH - Backup storage path (default: ./backups)
#   KB_DB_SSLMODE - PostgreSQL SSL mode (default: disable)
#
# Output:
#   - restore-YYYYMMDD-HHMMSS.log (operation log)
#
# Exit Codes:
#   0 - Success
#   1 - Argument/configuration error
#   2 - Lock file exists (concurrent restore)
#   3 - Pre-flight validation failed
#   4 - Restore failed
#   5 - Post-restore validation failed
#   6 - User cancelled
#
# RTO/RPO Context:
#   - Restore target: < 10 minutes for 1000 entries
#   - RTO: 4 hours total recovery time
#
# SECURITY WARNING: This is a DESTRUCTIVE operation. The target database
# will be dropped and recreated from the backup.
#
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KB_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment variables from .env if exists
if [[ -f "${KB_ROOT}/.env" ]]; then
    set -a
    source "${KB_ROOT}/.env"
    set +a
fi

# Required environment variables
: "${KB_DB_HOST:?KB_DB_HOST is required}"
: "${KB_DB_PORT:?KB_DB_PORT is required}"
: "${KB_DB_NAME:?KB_DB_NAME is required}"
: "${KB_DB_USER:?KB_DB_USER is required}"
: "${KB_DB_PASSWORD:?KB_DB_PASSWORD is required}"

# Optional with defaults
KB_BACKUP_LOCAL_PATH="${KB_BACKUP_LOCAL_PATH:-${KB_ROOT}/backups}"
KB_DB_SSLMODE="${KB_DB_SSLMODE:-disable}"

# Script arguments
BACKUP_FILE=""
FORCE_RESTORE=false
TARGET_DB="${KB_DB_NAME}"

# Timestamp and filenames
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="restore-${TIMESTAMP}.log"
LOCK_FILE="${KB_BACKUP_LOCAL_PATH}/.restore.lock"

# Full paths
LOG_PATH="${KB_BACKUP_LOCAL_PATH}/${LOG_FILE}"

# Track start time
START_TIME=$(date +%s)

# Schema version expected (from KNOW-001)
EXPECTED_SCHEMA_VERSION="1.0.0"

# -----------------------------------------------------------------------------
# Logging Functions
# -----------------------------------------------------------------------------

log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
    echo "$msg"
    [[ -f "${LOG_PATH}" ]] && echo "$msg" >> "${LOG_PATH}"
}

log_error() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*"
    echo "$msg" >&2
    [[ -f "${LOG_PATH}" ]] && echo "$msg" >> "${LOG_PATH}"
}

elapsed_time() {
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    if [[ $minutes -gt 0 ]]; then
        echo "${minutes}m ${seconds}s"
    else
        echo "${seconds}s"
    fi
}

# -----------------------------------------------------------------------------
# Argument Parsing
# -----------------------------------------------------------------------------

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --backup-file=*)
                BACKUP_FILE="${1#*=}"
                shift
                ;;
            --force)
                FORCE_RESTORE=true
                shift
                ;;
            --target-db=*)
                TARGET_DB="${1#*=}"
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown argument: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    if [[ -z "${BACKUP_FILE}" ]]; then
        log_error "Missing required argument: --backup-file"
        show_usage
        exit 1
    fi
}

show_usage() {
    cat << EOF
Usage: $(basename "$0") --backup-file=<path> [OPTIONS]

Options:
  --backup-file=<path>  Path to the backup file (required)
  --force               Skip confirmation prompt
  --target-db=<name>    Restore to alternate database (default: KB_DB_NAME)
  -h, --help            Show this help message

Examples:
  $(basename "$0") --backup-file=./backups/kb-backup-20260125-143000.sql.gz
  $(basename "$0") --backup-file=./backups/kb-backup-20260125-143000.sql.gz --force
  $(basename "$0") --backup-file=./backups/kb-backup-20260125-143000.sql.gz --target-db=kb_restore_test

EOF
}

# -----------------------------------------------------------------------------
# Lock File Management
# -----------------------------------------------------------------------------

check_lock() {
    if [[ -f "${LOCK_FILE}" ]]; then
        log_error "Restore already in progress"
        log_error "Lock file: ${LOCK_FILE}"
        log ""
        log "Lock file contents:"
        cat "${LOCK_FILE}" >&2
        log ""
        log_error "If no restore is running, remove the lock file manually:"
        log_error "  rm ${LOCK_FILE}"
        exit 2
    fi
}

acquire_lock() {
    log "Acquiring lock..."

    cat > "${LOCK_FILE}" << EOF
PID=$$
TIMESTAMP=$(date -Iseconds)
BACKUP_FILE=${BACKUP_FILE}
TARGET_DB=${TARGET_DB}
EOF

    chmod 0600 "${LOCK_FILE}"
    log "Lock acquired: ${LOCK_FILE}"
}

release_lock() {
    if [[ -f "${LOCK_FILE}" ]]; then
        rm -f "${LOCK_FILE}"
        log "Lock released"
    fi
}

# Ensure lock is released on exit
trap release_lock EXIT

# -----------------------------------------------------------------------------
# Pre-flight Validation
# -----------------------------------------------------------------------------

ensure_log_dir() {
    if ! mkdir -p "${KB_BACKUP_LOCAL_PATH}"; then
        log_error "Failed to create backup directory"
        exit 1
    fi
    touch "${LOG_PATH}"
    chmod 0600 "${LOG_PATH}"
}

validate_backup_file() {
    log "Validating backup file..."

    # Check file exists
    if [[ ! -f "${BACKUP_FILE}" ]]; then
        log_error "Backup file not found: ${BACKUP_FILE}"
        exit 3
    fi
    log "  File exists: YES"

    # Check file is readable
    if [[ ! -r "${BACKUP_FILE}" ]]; then
        log_error "Backup file not readable: ${BACKUP_FILE}"
        exit 3
    fi
    log "  File readable: YES"

    # Check file is not empty
    local file_size=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}" 2>/dev/null || echo "0")
    if [[ "${file_size}" -eq 0 ]]; then
        log_error "Backup file is empty: ${BACKUP_FILE}"
        exit 3
    fi
    log "  File size: ${file_size} bytes"

    # Check it's a gzip file
    if ! file "${BACKUP_FILE}" | grep -q "gzip"; then
        log_error "Backup file is not gzip compressed: ${BACKUP_FILE}"
        exit 3
    fi
    log "  Format: gzip compressed"
}

validate_checksum() {
    local checksum_file="${BACKUP_FILE}.sha256"

    log "Validating checksum..."

    if [[ ! -f "${checksum_file}" ]]; then
        log "WARNING: Checksum file not found: ${checksum_file}"
        log "WARNING: Proceeding without checksum verification"
        return 0
    fi

    local expected_checksum=$(cat "${checksum_file}" | cut -d' ' -f1)
    local actual_checksum=$(sha256sum "${BACKUP_FILE}" | cut -d' ' -f1)

    if [[ "${expected_checksum}" != "${actual_checksum}" ]]; then
        log_error "Checksum mismatch!"
        log_error "  Expected: ${expected_checksum}"
        log_error "  Actual:   ${actual_checksum}"
        exit 3
    fi

    log "  Checksum verified: ${actual_checksum:0:16}..."
}

check_disk_space() {
    log "Checking disk space..."

    # Get backup file size
    local backup_size=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}" 2>/dev/null || echo "0")

    # Estimate uncompressed size (typically 3-5x compressed)
    local estimated_uncompressed=$((backup_size * 5))

    # Get available space in backup directory
    local available=$(df -k "${KB_BACKUP_LOCAL_PATH}" | tail -1 | awk '{print $4}')
    local available_bytes=$((available * 1024))

    log "  Backup size: ${backup_size} bytes"
    log "  Estimated uncompressed: ${estimated_uncompressed} bytes"
    log "  Available space: ${available_bytes} bytes"

    if [[ ${available_bytes} -lt ${estimated_uncompressed} ]]; then
        log_error "Insufficient disk space for restore"
        log_error "Need at least ${estimated_uncompressed} bytes, have ${available_bytes}"
        exit 3
    fi

    log "  Disk space: OK"
}

validate_target_db() {
    log "Validating target database connection..."

    export PGPASSWORD="${KB_DB_PASSWORD}"

    # Connect to postgres database (not target) to check connectivity
    if ! psql -h "${KB_DB_HOST}" \
              -p "${KB_DB_PORT}" \
              -U "${KB_DB_USER}" \
              -d "postgres" \
              -c "SELECT 1;" \
              --quiet \
              --no-align \
              --tuples-only \
              "sslmode=${KB_DB_SSLMODE}" > /dev/null 2>&1; then
        log_error "Cannot connect to database server"
        log_error "Host: ${KB_DB_HOST}:${KB_DB_PORT}"
        exit 3
    fi

    log "  Database server accessible: YES"
    log "  Target database: ${TARGET_DB}"
}

check_schema_version() {
    log "Checking schema version compatibility..."

    # Extract schema version from backup (if present)
    # Look for comment in backup like: -- Schema Version: 1.0.0
    local backup_version=$(gunzip -c "${BACKUP_FILE}" | head -100 | grep -o "Schema Version: [0-9.]*" | cut -d' ' -f3 || echo "")

    if [[ -z "${backup_version}" ]]; then
        log "  Backup schema version: not found (pre-versioning backup)"
        log "  WARNING: Cannot verify schema compatibility"
        log "  Proceeding with restore - manual verification recommended"
        return 0
    fi

    log "  Backup schema version: ${backup_version}"
    log "  Expected schema version: ${EXPECTED_SCHEMA_VERSION}"

    if [[ "${backup_version}" != "${EXPECTED_SCHEMA_VERSION}" ]]; then
        log "WARNING: Schema version mismatch"
        log "WARNING: Backup: ${backup_version}, Current: ${EXPECTED_SCHEMA_VERSION}"
        log "WARNING: Migration may be required after restore"
        log ""
        log "See documentation for version compatibility matrix:"
        log "  apps/api/knowledge-base/docs/DISASTER-RECOVERY-RUNBOOK.md"
    fi
}

# -----------------------------------------------------------------------------
# Confirmation
# -----------------------------------------------------------------------------

confirm_restore() {
    if [[ "${FORCE_RESTORE}" == "true" ]]; then
        log "Force mode enabled, skipping confirmation"
        return 0
    fi

    echo ""
    echo "========================================"
    echo "WARNING: DESTRUCTIVE OPERATION"
    echo "========================================"
    echo ""
    echo "This will DROP and RECREATE the database:"
    echo "  Target: ${TARGET_DB}"
    echo "  Host: ${KB_DB_HOST}:${KB_DB_PORT}"
    echo ""
    echo "All existing data in ${TARGET_DB} will be LOST!"
    echo ""
    echo "Backup to restore:"
    echo "  ${BACKUP_FILE}"
    echo ""
    read -p "Type 'RESTORE' to confirm: " confirmation

    if [[ "${confirmation}" != "RESTORE" ]]; then
        log "User cancelled restore"
        exit 6
    fi

    log "User confirmed restore"
}

# -----------------------------------------------------------------------------
# Restore Operations
# -----------------------------------------------------------------------------

perform_restore() {
    log "Starting restore..."
    log "  Backup: ${BACKUP_FILE}"
    log "  Target: ${TARGET_DB}"

    export PGPASSWORD="${KB_DB_PASSWORD}"

    # Terminate existing connections to target database
    log "Terminating existing connections..."
    psql -h "${KB_DB_HOST}" \
         -p "${KB_DB_PORT}" \
         -U "${KB_DB_USER}" \
         -d "postgres" \
         "sslmode=${KB_DB_SSLMODE}" \
         -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TARGET_DB}' AND pid <> pg_backend_pid();" \
         --quiet 2>/dev/null || true

    # Drop and recreate database
    log "Dropping database ${TARGET_DB}..."
    psql -h "${KB_DB_HOST}" \
         -p "${KB_DB_PORT}" \
         -U "${KB_DB_USER}" \
         -d "postgres" \
         "sslmode=${KB_DB_SSLMODE}" \
         -c "DROP DATABASE IF EXISTS ${TARGET_DB};" \
         --quiet 2>> "${LOG_PATH}" || true

    log "Creating database ${TARGET_DB}..."
    psql -h "${KB_DB_HOST}" \
         -p "${KB_DB_PORT}" \
         -U "${KB_DB_USER}" \
         -d "postgres" \
         "sslmode=${KB_DB_SSLMODE}" \
         -c "CREATE DATABASE ${TARGET_DB};" \
         --quiet 2>> "${LOG_PATH}"

    # Enable pgvector extension
    log "Enabling pgvector extension..."
    psql -h "${KB_DB_HOST}" \
         -p "${KB_DB_PORT}" \
         -U "${KB_DB_USER}" \
         -d "${TARGET_DB}" \
         "sslmode=${KB_DB_SSLMODE}" \
         -c "CREATE EXTENSION IF NOT EXISTS vector;" \
         --quiet 2>> "${LOG_PATH}"

    # Restore from backup
    log "Restoring from backup..."
    local restore_start=$(date +%s)

    if ! gunzip -c "${BACKUP_FILE}" | \
         psql -h "${KB_DB_HOST}" \
              -p "${KB_DB_PORT}" \
              -U "${KB_DB_USER}" \
              -d "${TARGET_DB}" \
              "sslmode=${KB_DB_SSLMODE}" \
              --quiet 2>> "${LOG_PATH}"; then
        log_error "Restore failed"
        exit 4
    fi

    local restore_end=$(date +%s)
    local restore_duration=$((restore_end - restore_start))

    log "Restore complete (${restore_duration}s)"
}

validate_restore() {
    log "Validating restore..."

    export PGPASSWORD="${KB_DB_PASSWORD}"

    # Check entry count
    local entry_count=$(psql -h "${KB_DB_HOST}" \
                             -p "${KB_DB_PORT}" \
                             -U "${KB_DB_USER}" \
                             -d "${TARGET_DB}" \
                             "sslmode=${KB_DB_SSLMODE}" \
                             --quiet \
                             --no-align \
                             --tuples-only \
                             -c "SELECT COUNT(*) FROM knowledge_entries;" 2>/dev/null || echo "0")

    log "  Entry count: ${entry_count}"

    # Check tables exist
    local table_count=$(psql -h "${KB_DB_HOST}" \
                             -p "${KB_DB_PORT}" \
                             -U "${KB_DB_USER}" \
                             -d "${TARGET_DB}" \
                             "sslmode=${KB_DB_SSLMODE}" \
                             --quiet \
                             --no-align \
                             --tuples-only \
                             -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")

    log "  Table count: ${table_count}"

    if [[ "${table_count}" -eq 0 ]]; then
        log_error "No tables found after restore"
        exit 5
    fi

    log "  Validation: PASSED"
}

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------

log_summary() {
    export PGPASSWORD="${KB_DB_PASSWORD}"

    local entry_count=$(psql -h "${KB_DB_HOST}" \
                             -p "${KB_DB_PORT}" \
                             -U "${KB_DB_USER}" \
                             -d "${TARGET_DB}" \
                             "sslmode=${KB_DB_SSLMODE}" \
                             --quiet \
                             --no-align \
                             --tuples-only \
                             -c "SELECT COUNT(*) FROM knowledge_entries;" 2>/dev/null || echo "0")

    echo ""
    log "========================================"
    log "RESTORE COMPLETE"
    log "========================================"
    log "Timestamp: ${TIMESTAMP}"
    log "Backup: ${BACKUP_FILE}"
    log "Target: ${TARGET_DB}"
    log "Entries restored: ${entry_count}"
    log "Log: ${LOG_PATH}"
    log "Duration: $(elapsed_time)"
    log "========================================"
    echo ""

    # Output for scripting
    echo "TARGET_DB=${TARGET_DB}"
    echo "ENTRY_COUNT=${entry_count}"
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

main() {
    parse_args "$@"

    echo ""
    log "========================================"
    log "Knowledge Base Restore Starting"
    log "========================================"

    ensure_log_dir
    check_lock
    acquire_lock

    # Pre-flight validation
    validate_backup_file
    validate_checksum
    check_disk_space
    validate_target_db
    check_schema_version

    # Confirmation
    confirm_restore

    # Restore
    perform_restore
    validate_restore
    log_summary

    exit 0
}

# Run main
main "$@"
