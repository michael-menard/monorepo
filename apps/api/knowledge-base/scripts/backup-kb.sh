#!/bin/bash
# =============================================================================
# Knowledge Base Backup Script (KNOW-015)
# =============================================================================
#
# Creates a compressed backup of the Knowledge Base PostgreSQL database with
# SHA-256 checksum verification. Implements AC1, AC2, and AC9.
#
# Usage:
#   ./scripts/backup-kb.sh
#
# Environment Variables Required:
#   KB_DB_HOST, KB_DB_PORT, KB_DB_NAME, KB_DB_USER, KB_DB_PASSWORD
#
# Optional Environment Variables:
#   KB_BACKUP_LOCAL_PATH - Backup storage path (default: ./backups)
#   KB_BACKUP_COMPRESSION_LEVEL - Gzip level 1-9 (default: 6)
#   KB_DB_SSLMODE - PostgreSQL SSL mode (default: disable)
#
# Output:
#   - kb-backup-YYYYMMDD-HHMMSS.sql.gz (compressed backup)
#   - kb-backup-YYYYMMDD-HHMMSS.sql.gz.sha256 (checksum)
#   - backup-YYYYMMDD-HHMMSS.log (operation log)
#
# Exit Codes:
#   0 - Success
#   1 - Environment/configuration error
#   2 - Database connection failed
#   3 - Backup failed
#   4 - Checksum generation failed
#
# RTO/RPO Context:
#   - Backup target: < 5 minutes for 1000 entries
#   - RPO: 24 hours (daily backups)
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
KB_BACKUP_COMPRESSION_LEVEL="${KB_BACKUP_COMPRESSION_LEVEL:-6}"
KB_DB_SSLMODE="${KB_DB_SSLMODE:-disable}"

# Timestamp and filenames
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="kb-backup-${TIMESTAMP}.sql.gz"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
LOG_FILE="backup-${TIMESTAMP}.log"

# Full paths
BACKUP_PATH="${KB_BACKUP_LOCAL_PATH}/${BACKUP_FILE}"
CHECKSUM_PATH="${KB_BACKUP_LOCAL_PATH}/${CHECKSUM_FILE}"
LOG_PATH="${KB_BACKUP_LOCAL_PATH}/${LOG_FILE}"

# Track start time
START_TIME=$(date +%s)

# -----------------------------------------------------------------------------
# Logging Functions
# -----------------------------------------------------------------------------

log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
    echo "$msg"
    echo "$msg" >> "${LOG_PATH}"
}

log_error() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*"
    echo "$msg" >&2
    echo "$msg" >> "${LOG_PATH}"
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
# Pre-flight Validation
# -----------------------------------------------------------------------------

ensure_backup_dir() {
    log "Ensuring backup directory exists: ${KB_BACKUP_LOCAL_PATH}"
    if ! mkdir -p "${KB_BACKUP_LOCAL_PATH}"; then
        log_error "Failed to create backup directory"
        exit 1
    fi

    # Initialize log file
    touch "${LOG_PATH}"
    chmod 0600 "${LOG_PATH}"
}

validate_ssl_mode() {
    log "Validating SSL mode: ${KB_DB_SSLMODE}"

    case "${KB_DB_SSLMODE}" in
        disable|allow|prefer|require|verify-ca|verify-full)
            log "SSL mode '${KB_DB_SSLMODE}' is valid"
            ;;
        *)
            log_error "Invalid SSL mode: ${KB_DB_SSLMODE}"
            log_error "Valid options: disable, allow, prefer, require, verify-ca, verify-full"
            exit 1
            ;;
    esac

    # Security warning for non-secure modes in non-local environments
    if [[ "${KB_DB_HOST}" != "localhost" && "${KB_DB_HOST}" != "127.0.0.1" ]]; then
        if [[ "${KB_DB_SSLMODE}" == "disable" || "${KB_DB_SSLMODE}" == "allow" ]]; then
            log "WARNING: SSL mode '${KB_DB_SSLMODE}' is not recommended for non-local connections"
            log "WARNING: Consider using 'require' or 'verify-full' for production"
        fi
    fi
}

validate_connection() {
    log "Validating database connection..."

    local conn_start=$(date +%s)

    export PGPASSWORD="${KB_DB_PASSWORD}"

    if ! psql -h "${KB_DB_HOST}" \
              -p "${KB_DB_PORT}" \
              -U "${KB_DB_USER}" \
              -d "${KB_DB_NAME}" \
              -c "SELECT 1;" \
              --quiet \
              --no-align \
              --tuples-only \
              "sslmode=${KB_DB_SSLMODE}" > /dev/null 2>&1; then
        log_error "Database connection failed"
        log_error "Host: ${KB_DB_HOST}:${KB_DB_PORT}"
        log_error "Database: ${KB_DB_NAME}"
        log_error "User: ${KB_DB_USER}"
        log_error "SSL Mode: ${KB_DB_SSLMODE}"
        exit 2
    fi

    local conn_end=$(date +%s)
    local conn_duration=$((conn_end - conn_start))
    log "Connection OK (${conn_duration}s)"
}

get_entry_count() {
    export PGPASSWORD="${KB_DB_PASSWORD}"

    local count=$(psql -h "${KB_DB_HOST}" \
                       -p "${KB_DB_PORT}" \
                       -U "${KB_DB_USER}" \
                       -d "${KB_DB_NAME}" \
                       --quiet \
                       --no-align \
                       --tuples-only \
                       "sslmode=${KB_DB_SSLMODE}" \
                       -c "SELECT COUNT(*) FROM knowledge_entries;" 2>/dev/null || echo "0")

    echo "${count:-0}"
}

# -----------------------------------------------------------------------------
# Backup Operations
# -----------------------------------------------------------------------------

create_backup() {
    log "Starting pg_dump..."
    log "  Host: ${KB_DB_HOST}:${KB_DB_PORT}"
    log "  Database: ${KB_DB_NAME}"
    log "  Compression: gzip level ${KB_BACKUP_COMPRESSION_LEVEL}"

    local entry_count=$(get_entry_count)
    log "  Entry count: ${entry_count}"

    export PGPASSWORD="${KB_DB_PASSWORD}"

    local dump_start=$(date +%s)

    # pg_dump with compression piped to gzip
    if ! pg_dump -h "${KB_DB_HOST}" \
                 -p "${KB_DB_PORT}" \
                 -U "${KB_DB_USER}" \
                 -d "${KB_DB_NAME}" \
                 --format=plain \
                 --no-owner \
                 --no-privileges \
                 --clean \
                 --if-exists \
                 "sslmode=${KB_DB_SSLMODE}" 2>> "${LOG_PATH}" | \
         gzip -${KB_BACKUP_COMPRESSION_LEVEL} > "${BACKUP_PATH}"; then
        log_error "pg_dump failed"
        rm -f "${BACKUP_PATH}"
        exit 3
    fi

    local dump_end=$(date +%s)
    local dump_duration=$((dump_end - dump_start))

    # Get file size
    local file_size=$(du -h "${BACKUP_PATH}" | cut -f1)

    log "pg_dump complete (${dump_duration}s)"
    log "  Output: ${BACKUP_PATH}"
    log "  Size: ${file_size}"
}

generate_checksum() {
    log "Generating SHA-256 checksum..."

    if ! sha256sum "${BACKUP_PATH}" > "${CHECKSUM_PATH}"; then
        log_error "Checksum generation failed"
        rm -f "${BACKUP_PATH}" "${CHECKSUM_PATH}"
        exit 4
    fi

    local checksum=$(cat "${CHECKSUM_PATH}" | cut -d' ' -f1)
    log "Checksum: ${checksum:0:16}..."
    log "Checksum file: ${CHECKSUM_PATH}"
}

set_permissions() {
    log "Setting file permissions (0600)..."

    chmod 0600 "${BACKUP_PATH}"
    chmod 0600 "${CHECKSUM_PATH}"

    log "Permissions set"
}

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------

log_summary() {
    local entry_count=$(get_entry_count)
    local file_size=$(du -h "${BACKUP_PATH}" | cut -f1)
    local checksum=$(cat "${CHECKSUM_PATH}" | cut -d' ' -f1)

    echo ""
    log "========================================"
    log "BACKUP COMPLETE"
    log "========================================"
    log "Timestamp: ${TIMESTAMP}"
    log "Database: ${KB_DB_NAME}"
    log "Entries: ${entry_count}"
    log "File: ${BACKUP_PATH}"
    log "Size: ${file_size}"
    log "Checksum: ${checksum:0:16}..."
    log "Log: ${LOG_PATH}"
    log "Duration: $(elapsed_time)"
    log "========================================"
    echo ""

    # Output for scripting (stdout only, not logged)
    echo "BACKUP_FILE=${BACKUP_PATH}"
    echo "CHECKSUM_FILE=${CHECKSUM_PATH}"
    echo "CHECKSUM=${checksum}"
    echo "ENTRY_COUNT=${entry_count}"
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

main() {
    echo ""
    log "========================================"
    log "Knowledge Base Backup Starting"
    log "========================================"

    ensure_backup_dir
    validate_ssl_mode
    validate_connection
    create_backup
    generate_checksum
    set_permissions
    log_summary

    exit 0
}

# Run main
main
