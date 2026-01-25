#!/bin/bash
# =============================================================================
# Knowledge Base Monthly Backup Validation Script (KNOW-015)
# =============================================================================
#
# Validates all backups from the last 30 days to ensure they remain restorable.
# Part of periodic backup integrity monitoring. Implements AC8.
#
# Usage:
#   ./scripts/monthly-validate-all.sh
#   ./scripts/monthly-validate-all.sh --quick
#   ./scripts/monthly-validate-all.sh --days=60
#
# Arguments:
#   --quick        Skip dry-run restore (checksum + syntax only)
#   --days=N       Validate backups from last N days (default: 30)
#
# Environment Variables:
#   KB_BACKUP_LOCAL_PATH - Backup storage path (default: ./backups)
#
# Output:
#   - Updates .validation-log with results
#   - Prints summary to stdout
#   - Exit code 0 if all pass, 1 if any fail
#
# Schedule:
#   Run monthly (first Friday of each month)
#   See: docs/BACKUP-VALIDATION-SCHEDULE.md
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

# Defaults
KB_BACKUP_LOCAL_PATH="${KB_BACKUP_LOCAL_PATH:-${KB_ROOT}/backups}"
VALIDATION_LOG="${KB_BACKUP_LOCAL_PATH}/.validation-log"

# Script arguments
QUICK_MODE=false
DAYS_TO_VALIDATE=30

# Counters
TOTAL_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0

# Track failed backups
declare -a FAILED_BACKUPS=()

# Timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# -----------------------------------------------------------------------------
# Logging Functions
# -----------------------------------------------------------------------------

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log_result() {
    local status="$1"
    local file="$2"
    echo "  [${status}] $(basename ${file})"
}

# -----------------------------------------------------------------------------
# Argument Parsing
# -----------------------------------------------------------------------------

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --quick)
                QUICK_MODE=true
                shift
                ;;
            --days=*)
                DAYS_TO_VALIDATE="${1#*=}"
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                echo "ERROR: Unknown argument: $1" >&2
                show_usage
                exit 1
                ;;
        esac
    done
}

show_usage() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS]

Options:
  --quick        Skip dry-run restore (checksum + syntax only)
  --days=N       Validate backups from last N days (default: 30)
  -h, --help     Show this help message

Examples:
  $(basename "$0")            # Validate all backups from last 30 days
  $(basename "$0") --quick    # Quick validation (no dry-run restore)
  $(basename "$0") --days=60  # Validate backups from last 60 days

Output:
  Results are appended to: ${VALIDATION_LOG}

EOF
}

# -----------------------------------------------------------------------------
# Validation
# -----------------------------------------------------------------------------

find_recent_backups() {
    local cutoff_date=$(date -v-${DAYS_TO_VALIDATE}d "+%Y%m%d" 2>/dev/null || \
                       date -d "${DAYS_TO_VALIDATE} days ago" "+%Y%m%d" 2>/dev/null || echo "00000000")

    find "${KB_BACKUP_LOCAL_PATH}" -name "kb-backup-*.sql.gz" -type f 2>/dev/null | \
        while read -r backup_file; do
            local basename=$(basename "${backup_file}")
            # Extract date from filename: kb-backup-YYYYMMDD-HHMMSS.sql.gz
            if [[ "${basename}" =~ kb-backup-([0-9]{8})-[0-9]{6}\.sql\.gz ]]; then
                local backup_date="${BASH_REMATCH[1]}"
                if [[ "${backup_date}" -ge "${cutoff_date}" ]]; then
                    echo "${backup_file}"
                fi
            fi
        done | sort -r
}

validate_single_backup() {
    local backup_file="$1"

    local validate_args="--backup-file=${backup_file}"
    if [[ "${QUICK_MODE}" == "true" ]]; then
        validate_args="${validate_args} --quick"
    fi

    # Run validation script
    if "${SCRIPT_DIR}/validate-backup.sh" ${validate_args} > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

validate_all_backups() {
    log "Finding backups from last ${DAYS_TO_VALIDATE} days..."

    local backup_files=$(find_recent_backups)

    if [[ -z "${backup_files}" ]]; then
        log "No backup files found in the specified period"
        return 0
    fi

    echo ""
    log "Validating backups..."
    echo ""

    while IFS= read -r backup_file; do
        ((TOTAL_COUNT++)) || true

        if validate_single_backup "${backup_file}"; then
            log_result "PASS" "${backup_file}"
            ((PASS_COUNT++)) || true
        else
            log_result "FAIL" "${backup_file}"
            ((FAIL_COUNT++)) || true
            FAILED_BACKUPS+=("$(basename ${backup_file})")
        fi
    done <<< "${backup_files}"
}

# -----------------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------------

write_validation_log() {
    # Create log directory if needed
    mkdir -p "$(dirname ${VALIDATION_LOG})"

    # Append to validation log
    cat >> "${VALIDATION_LOG}" << EOF

========================================
MONTHLY VALIDATION - ${TIMESTAMP}
========================================
Period: Last ${DAYS_TO_VALIDATE} days
Mode: ${QUICK_MODE:+Quick}${QUICK_MODE:-Full (with dry-run)}

Backups validated: ${TOTAL_COUNT}
Passed: ${PASS_COUNT}
Failed: ${FAIL_COUNT}

EOF

    if [[ ${#FAILED_BACKUPS[@]} -gt 0 ]]; then
        echo "FAILED BACKUPS:" >> "${VALIDATION_LOG}"
        for backup in "${FAILED_BACKUPS[@]}"; do
            echo "  - ${backup}" >> "${VALIDATION_LOG}"
        done
        echo "" >> "${VALIDATION_LOG}"
    fi

    # Calculate next validation date (first Friday of next month)
    local next_month=$(date -v+1m "+%Y-%m" 2>/dev/null || date -d "next month" "+%Y-%m" 2>/dev/null || echo "????-??")
    echo "Next validation due: First Friday of ${next_month}" >> "${VALIDATION_LOG}"
    echo "========================================" >> "${VALIDATION_LOG}"
}

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------

print_summary() {
    echo ""
    log "========================================"
    log "MONTHLY VALIDATION COMPLETE"
    log "========================================"
    log "Period: Last ${DAYS_TO_VALIDATE} days"
    log "Mode: ${QUICK_MODE:+Quick (checksum + syntax)}${QUICK_MODE:-Full (with dry-run)}"
    echo ""
    log "Results:"
    log "  Total: ${TOTAL_COUNT}"
    log "  Passed: ${PASS_COUNT}"
    log "  Failed: ${FAIL_COUNT}"
    echo ""

    if [[ ${#FAILED_BACKUPS[@]} -gt 0 ]]; then
        log "FAILED BACKUPS:"
        for backup in "${FAILED_BACKUPS[@]}"; do
            log "  - ${backup}"
        done
        echo ""
        log "ACTION REQUIRED: Investigate failed backups immediately!"
        log "See: docs/DISASTER-RECOVERY-RUNBOOK.md#troubleshooting"
        echo ""
    else
        log "All backups validated successfully."
    fi

    log "Validation log: ${VALIDATION_LOG}"
    log "========================================"
    echo ""
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

main() {
    parse_args "$@"

    echo ""
    log "========================================"
    log "Knowledge Base Monthly Backup Validation"
    log "========================================"

    validate_all_backups
    write_validation_log
    print_summary

    # Exit with error if any backups failed
    if [[ ${FAIL_COUNT} -gt 0 ]]; then
        exit 1
    fi

    exit 0
}

# Run main
main "$@"
