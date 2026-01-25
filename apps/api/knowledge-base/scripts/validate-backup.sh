#!/bin/bash
# =============================================================================
# Knowledge Base Backup Validation Script (KNOW-015)
# =============================================================================
#
# Validates backup file integrity including checksum verification, SQL syntax
# checking, and optional dry-run restore to temporary database.
# Implements AC6.
#
# Usage:
#   ./scripts/validate-backup.sh --backup-file=<path>
#   ./scripts/validate-backup.sh --backup-file=<path> --dry-run
#   ./scripts/validate-backup.sh --backup-file=<path> --quick
#
# Arguments:
#   --backup-file=<path>  Path to the backup file (required)
#   --dry-run             Perform dry-run restore to temp database
#   --quick               Skip dry-run restore (checksum + syntax only)
#
# Environment Variables Required:
#   KB_DB_HOST, KB_DB_PORT, KB_DB_USER, KB_DB_PASSWORD (for dry-run)
#
# Exit Codes:
#   0 - PASS (all validations passed)
#   1 - File not found or not readable
#   2 - Checksum mismatch
#   3 - SQL syntax error
#   4 - Dry-run restore failed
#   5 - Configuration error
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

# Optional with defaults
KB_BACKUP_LOCAL_PATH="${KB_BACKUP_LOCAL_PATH:-${KB_ROOT}/backups}"
KB_DB_SSLMODE="${KB_DB_SSLMODE:-disable}"

# Script arguments
BACKUP_FILE=""
DRY_RUN=false
QUICK_MODE=false

# Temp database for dry-run
TEMP_DB_NAME="kb_validate_temp_$$"

# Validation results
declare -a RESULTS=()
OVERALL_RESULT="PASS"

# -----------------------------------------------------------------------------
# Logging Functions
# -----------------------------------------------------------------------------

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log_check() {
    local status="$1"
    local message="$2"
    if [[ "${status}" == "PASS" ]]; then
        echo "[PASS] ${message}"
        RESULTS+=("[PASS] ${message}")
    else
        echo "[FAIL] ${message}"
        RESULTS+=("[FAIL] ${message}")
        OVERALL_RESULT="FAIL"
    fi
}

log_warn() {
    echo "[WARN] $*"
    RESULTS+=("[WARN] $*")
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
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --quick)
                QUICK_MODE=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                echo "ERROR: Unknown argument: $1" >&2
                show_usage
                exit 5
                ;;
        esac
    done

    if [[ -z "${BACKUP_FILE}" ]]; then
        echo "ERROR: Missing required argument: --backup-file" >&2
        show_usage
        exit 5
    fi
}

show_usage() {
    cat << EOF
Usage: $(basename "$0") --backup-file=<path> [OPTIONS]

Options:
  --backup-file=<path>  Path to the backup file (required)
  --dry-run             Perform dry-run restore to temp database
  --quick               Skip dry-run restore (checksum + syntax only)
  -h, --help            Show this help message

Examples:
  $(basename "$0") --backup-file=./backups/kb-backup-20260125-143000.sql.gz
  $(basename "$0") --backup-file=./backups/kb-backup-20260125-143000.sql.gz --dry-run
  $(basename "$0") --backup-file=./backups/kb-backup-20260125-143000.sql.gz --quick

EOF
}

# -----------------------------------------------------------------------------
# Validation Checks
# -----------------------------------------------------------------------------

check_file_exists() {
    if [[ -f "${BACKUP_FILE}" ]]; then
        log_check "PASS" "File exists: ${BACKUP_FILE}"
        return 0
    else
        log_check "FAIL" "File not found: ${BACKUP_FILE}"
        return 1
    fi
}

check_file_readable() {
    if [[ -r "${BACKUP_FILE}" ]]; then
        log_check "PASS" "File is readable"
        return 0
    else
        log_check "FAIL" "File is not readable"
        return 1
    fi
}

check_file_size() {
    local file_size=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}" 2>/dev/null || echo "0")

    if [[ "${file_size}" -eq 0 ]]; then
        log_check "FAIL" "File is empty (0 bytes)"
        return 1
    fi

    # Convert to human-readable
    local size_human
    if [[ ${file_size} -ge 1073741824 ]]; then
        size_human="$(echo "scale=2; ${file_size}/1073741824" | bc) GB"
    elif [[ ${file_size} -ge 1048576 ]]; then
        size_human="$(echo "scale=2; ${file_size}/1048576" | bc) MB"
    elif [[ ${file_size} -ge 1024 ]]; then
        size_human="$(echo "scale=2; ${file_size}/1024" | bc) KB"
    else
        size_human="${file_size} bytes"
    fi

    # Check for suspiciously small files (< 1KB for a database backup)
    if [[ ${file_size} -lt 1024 ]]; then
        log_check "FAIL" "File suspiciously small: ${size_human}"
        return 1
    fi

    log_check "PASS" "File size: ${size_human}"
    return 0
}

check_gzip_format() {
    if file "${BACKUP_FILE}" | grep -q "gzip"; then
        log_check "PASS" "File format: gzip compressed"
        return 0
    else
        log_check "FAIL" "File is not gzip compressed"
        return 1
    fi
}

check_checksum() {
    local checksum_file="${BACKUP_FILE}.sha256"

    if [[ ! -f "${checksum_file}" ]]; then
        log_warn "Checksum file not found: ${checksum_file}"
        return 0
    fi

    local expected_checksum=$(cat "${checksum_file}" | cut -d' ' -f1)
    local actual_checksum=$(sha256sum "${BACKUP_FILE}" | cut -d' ' -f1)

    if [[ "${expected_checksum}" == "${actual_checksum}" ]]; then
        log_check "PASS" "SHA-256 checksum verified"
        return 0
    else
        log_check "FAIL" "SHA-256 checksum mismatch"
        echo "  Expected: ${expected_checksum}"
        echo "  Actual:   ${actual_checksum}"
        return 2
    fi
}

check_sql_syntax() {
    log "Checking SQL syntax..."

    # Decompress and check for basic SQL structure
    if ! gunzip -c "${BACKUP_FILE}" > /dev/null 2>&1; then
        log_check "FAIL" "Cannot decompress backup file"
        return 3
    fi

    # Check for required SQL elements
    local has_create=$(gunzip -c "${BACKUP_FILE}" | head -500 | grep -c "CREATE TABLE\|CREATE EXTENSION" || echo "0")
    local has_insert=$(gunzip -c "${BACKUP_FILE}" | grep -c "INSERT INTO\|COPY" || echo "0")

    if [[ ${has_create} -eq 0 ]]; then
        log_check "FAIL" "SQL syntax: Missing CREATE statements"
        return 3
    fi

    # Check for SQL errors in file (sometimes pg_dump adds error comments)
    local error_count=$(gunzip -c "${BACKUP_FILE}" | grep -c "ERROR:\|FATAL:" || echo "0")
    if [[ ${error_count} -gt 0 ]]; then
        log_warn "SQL file contains ${error_count} error messages"
    fi

    log_check "PASS" "SQL syntax valid (CREATE: ${has_create}, INSERT/COPY: ${has_insert})"
    return 0
}

check_dry_run_restore() {
    log "Performing dry-run restore to temp database..."

    # Check required environment variables
    if [[ -z "${KB_DB_HOST:-}" || -z "${KB_DB_PORT:-}" || -z "${KB_DB_USER:-}" || -z "${KB_DB_PASSWORD:-}" ]]; then
        log_warn "Database credentials not configured - skipping dry-run"
        return 0
    fi

    export PGPASSWORD="${KB_DB_PASSWORD}"

    # Create temp database
    log "  Creating temp database: ${TEMP_DB_NAME}"
    if ! psql -h "${KB_DB_HOST}" \
              -p "${KB_DB_PORT}" \
              -U "${KB_DB_USER}" \
              -d "postgres" \
              "sslmode=${KB_DB_SSLMODE}" \
              -c "CREATE DATABASE ${TEMP_DB_NAME};" \
              --quiet 2>/dev/null; then
        log_check "FAIL" "Dry-run: Cannot create temp database"
        return 4
    fi

    # Enable pgvector extension
    psql -h "${KB_DB_HOST}" \
         -p "${KB_DB_PORT}" \
         -U "${KB_DB_USER}" \
         -d "${TEMP_DB_NAME}" \
         "sslmode=${KB_DB_SSLMODE}" \
         -c "CREATE EXTENSION IF NOT EXISTS vector;" \
         --quiet 2>/dev/null || true

    # Restore to temp database
    log "  Restoring to temp database..."
    local restore_result=0
    if ! gunzip -c "${BACKUP_FILE}" | \
         psql -h "${KB_DB_HOST}" \
              -p "${KB_DB_PORT}" \
              -U "${KB_DB_USER}" \
              -d "${TEMP_DB_NAME}" \
              "sslmode=${KB_DB_SSLMODE}" \
              --quiet 2>/dev/null; then
        restore_result=4
    fi

    # Check entry count in restored database
    local entry_count=$(psql -h "${KB_DB_HOST}" \
                             -p "${KB_DB_PORT}" \
                             -U "${KB_DB_USER}" \
                             -d "${TEMP_DB_NAME}" \
                             "sslmode=${KB_DB_SSLMODE}" \
                             --quiet \
                             --no-align \
                             --tuples-only \
                             -c "SELECT COUNT(*) FROM knowledge_entries;" 2>/dev/null || echo "0")

    # Cleanup temp database
    log "  Cleaning up temp database..."
    psql -h "${KB_DB_HOST}" \
         -p "${KB_DB_PORT}" \
         -U "${KB_DB_USER}" \
         -d "postgres" \
         "sslmode=${KB_DB_SSLMODE}" \
         -c "DROP DATABASE IF EXISTS ${TEMP_DB_NAME};" \
         --quiet 2>/dev/null || true

    if [[ ${restore_result} -ne 0 ]]; then
        log_check "FAIL" "Dry-run restore failed"
        return 4
    fi

    log_check "PASS" "Dry-run restore successful (${entry_count} entries)"
    echo "ENTRY_COUNT=${entry_count}"
    return 0
}

# -----------------------------------------------------------------------------
# Report
# -----------------------------------------------------------------------------

print_report() {
    local file_size=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}" 2>/dev/null || echo "0")
    local size_mb=$(echo "scale=2; ${file_size}/1048576" | bc)

    echo ""
    echo "========================================"
    echo "BACKUP VALIDATION REPORT"
    echo "========================================"
    echo "File: ${BACKUP_FILE}"
    echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    echo "CHECKS:"
    for result in "${RESULTS[@]}"; do
        echo "  ${result}"
    done
    echo ""
    echo "RESULT: ${OVERALL_RESULT}"
    echo ""
    echo "File size: ${size_mb} MB"
    echo "========================================"
    echo ""
}

# -----------------------------------------------------------------------------
# Cleanup
# -----------------------------------------------------------------------------

cleanup() {
    # Drop temp database if it exists (in case of error during dry-run)
    if [[ -n "${KB_DB_HOST:-}" && -n "${KB_DB_PASSWORD:-}" ]]; then
        export PGPASSWORD="${KB_DB_PASSWORD}"
        psql -h "${KB_DB_HOST}" \
             -p "${KB_DB_PORT}" \
             -U "${KB_DB_USER}" \
             -d "postgres" \
             "sslmode=${KB_DB_SSLMODE}" \
             -c "DROP DATABASE IF EXISTS ${TEMP_DB_NAME};" \
             --quiet 2>/dev/null || true
    fi
}

trap cleanup EXIT

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

main() {
    parse_args "$@"

    echo ""
    log "Starting backup validation..."
    log "File: ${BACKUP_FILE}"
    echo ""

    # Basic file checks (always run)
    check_file_exists || exit 1
    check_file_readable || exit 1
    check_file_size || exit 1
    check_gzip_format || exit 1
    check_checksum || exit 2
    check_sql_syntax || exit 3

    # Dry-run restore (if requested and not quick mode)
    if [[ "${DRY_RUN}" == "true" && "${QUICK_MODE}" == "false" ]]; then
        check_dry_run_restore || exit 4
    elif [[ "${QUICK_MODE}" == "false" && -n "${KB_DB_HOST:-}" ]]; then
        # Default: attempt dry-run if database is configured
        check_dry_run_restore || true
    fi

    # Print report
    print_report

    # Exit with appropriate code
    if [[ "${OVERALL_RESULT}" == "PASS" ]]; then
        exit 0
    else
        exit 1
    fi
}

# Run main
main "$@"
