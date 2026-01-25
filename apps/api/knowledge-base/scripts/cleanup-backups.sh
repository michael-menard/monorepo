#!/bin/bash
# =============================================================================
# Knowledge Base Backup Cleanup Script (KNOW-015)
# =============================================================================
#
# Enforces multi-tier backup retention policy:
#   - Daily backups: Retained for 7 days
#   - Weekly backups (Sundays): Retained for 4 weeks
#   - Monthly backups (1st of month): Retained for 12 months
#
# Implements AC10.
#
# Usage:
#   ./scripts/cleanup-backups.sh
#   ./scripts/cleanup-backups.sh --dry-run
#
# Arguments:
#   --dry-run   Show what would be deleted without actually deleting
#
# Environment Variables:
#   KB_BACKUP_LOCAL_PATH - Backup storage path (default: ./backups)
#   KB_BACKUP_RETENTION_DAILY - Days for daily retention (default: 7)
#   KB_BACKUP_RETENTION_WEEKLY - Weeks for weekly retention (default: 4)
#   KB_BACKUP_RETENTION_MONTHLY - Months for monthly retention (default: 12)
#
# Exit Codes:
#   0 - Success
#   1 - Configuration error
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
KB_BACKUP_RETENTION_DAILY="${KB_BACKUP_RETENTION_DAILY:-7}"
KB_BACKUP_RETENTION_WEEKLY="${KB_BACKUP_RETENTION_WEEKLY:-4}"
KB_BACKUP_RETENTION_MONTHLY="${KB_BACKUP_RETENTION_MONTHLY:-12}"

# Script mode
DRY_RUN=false

# Counters
KEPT_COUNT=0
DELETED_COUNT=0
SKIPPED_COUNT=0

# Timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# -----------------------------------------------------------------------------
# Logging Functions
# -----------------------------------------------------------------------------

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log_keep() {
    echo "  [KEEP] $1 - $2"
    ((KEPT_COUNT++)) || true
}

log_delete() {
    if [[ "${DRY_RUN}" == "true" ]]; then
        echo "  [WOULD DELETE] $1"
    else
        echo "  [DELETE] $1"
    fi
    ((DELETED_COUNT++)) || true
}

# -----------------------------------------------------------------------------
# Argument Parsing
# -----------------------------------------------------------------------------

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --dry-run)
                DRY_RUN=true
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
  --dry-run   Show what would be deleted without actually deleting
  -h, --help  Show this help message

Environment Variables:
  KB_BACKUP_LOCAL_PATH     - Backup storage path (default: ./backups)
  KB_BACKUP_RETENTION_DAILY   - Days for daily retention (default: 7)
  KB_BACKUP_RETENTION_WEEKLY  - Weeks for weekly retention (default: 4)
  KB_BACKUP_RETENTION_MONTHLY - Months for monthly retention (default: 12)

Retention Policy:
  - All backups from last ${KB_BACKUP_RETENTION_DAILY} days are kept (daily tier)
  - Sunday backups from last ${KB_BACKUP_RETENTION_WEEKLY} weeks are kept (weekly tier)
  - 1st-of-month backups from last ${KB_BACKUP_RETENTION_MONTHLY} months are kept (monthly tier)

Examples:
  $(basename "$0")            # Run cleanup
  $(basename "$0") --dry-run  # Preview what would be deleted

EOF
}

# -----------------------------------------------------------------------------
# Date Utilities
# -----------------------------------------------------------------------------

# Parse backup filename to extract date
# kb-backup-YYYYMMDD-HHMMSS.sql.gz -> YYYY-MM-DD
extract_backup_date() {
    local filename="$1"
    local basename=$(basename "${filename}")

    # Extract date portion (YYYYMMDD)
    if [[ "${basename}" =~ kb-backup-([0-9]{8})-[0-9]{6}\.sql\.gz ]]; then
        local date_str="${BASH_REMATCH[1]}"
        local year="${date_str:0:4}"
        local month="${date_str:4:2}"
        local day="${date_str:6:2}"
        echo "${year}-${month}-${day}"
    else
        echo ""
    fi
}

# Check if date is within retention window
is_within_days() {
    local backup_date="$1"
    local days="$2"

    local backup_epoch=$(date -j -f "%Y-%m-%d" "${backup_date}" "+%s" 2>/dev/null || \
                        date -d "${backup_date}" "+%s" 2>/dev/null || echo "0")
    local cutoff_epoch=$(date -v-${days}d "+%s" 2>/dev/null || \
                        date -d "${days} days ago" "+%s" 2>/dev/null || echo "0")

    [[ ${backup_epoch} -ge ${cutoff_epoch} ]]
}

# Check if date is a Sunday
is_sunday() {
    local backup_date="$1"

    local day_of_week=$(date -j -f "%Y-%m-%d" "${backup_date}" "+%u" 2>/dev/null || \
                       date -d "${backup_date}" "+%u" 2>/dev/null || echo "0")

    [[ "${day_of_week}" == "7" ]]
}

# Check if date is 1st of month
is_first_of_month() {
    local backup_date="$1"
    local day="${backup_date:8:2}"

    [[ "${day}" == "01" ]]
}

# -----------------------------------------------------------------------------
# Retention Logic
# -----------------------------------------------------------------------------

should_keep_backup() {
    local backup_file="$1"
    local backup_date=$(extract_backup_date "${backup_file}")

    if [[ -z "${backup_date}" ]]; then
        echo "unknown_format"
        return 0
    fi

    # Check daily retention (most recent N days)
    if is_within_days "${backup_date}" "${KB_BACKUP_RETENTION_DAILY}"; then
        echo "daily_tier"
        return 0
    fi

    # Check weekly retention (Sundays within N weeks)
    local weekly_days=$((KB_BACKUP_RETENTION_WEEKLY * 7))
    if is_within_days "${backup_date}" "${weekly_days}" && is_sunday "${backup_date}"; then
        echo "weekly_tier"
        return 0
    fi

    # Check monthly retention (1st of month within N months)
    local monthly_days=$((KB_BACKUP_RETENTION_MONTHLY * 30))
    if is_within_days "${backup_date}" "${monthly_days}" && is_first_of_month "${backup_date}"; then
        echo "monthly_tier"
        return 0
    fi

    # Not in any retention tier
    echo "expired"
    return 1
}

# -----------------------------------------------------------------------------
# Cleanup Operations
# -----------------------------------------------------------------------------

cleanup_backups() {
    log "Scanning backup directory: ${KB_BACKUP_LOCAL_PATH}"

    if [[ ! -d "${KB_BACKUP_LOCAL_PATH}" ]]; then
        log "Backup directory does not exist"
        return 0
    fi

    # Find all backup files
    local backup_files=$(find "${KB_BACKUP_LOCAL_PATH}" -name "kb-backup-*.sql.gz" -type f 2>/dev/null | sort)

    if [[ -z "${backup_files}" ]]; then
        log "No backup files found"
        return 0
    fi

    echo ""
    log "Processing backup files..."
    echo ""

    while IFS= read -r backup_file; do
        local retention_tier=$(should_keep_backup "${backup_file}")
        local backup_date=$(extract_backup_date "${backup_file}")

        case "${retention_tier}" in
            daily_tier)
                log_keep "$(basename ${backup_file})" "daily (${backup_date})"
                ;;
            weekly_tier)
                log_keep "$(basename ${backup_file})" "weekly/Sunday (${backup_date})"
                ;;
            monthly_tier)
                log_keep "$(basename ${backup_file})" "monthly/1st (${backup_date})"
                ;;
            unknown_format)
                log "  [SKIP] $(basename ${backup_file}) - unknown filename format"
                ((SKIPPED_COUNT++)) || true
                ;;
            expired)
                log_delete "$(basename ${backup_file})"
                if [[ "${DRY_RUN}" == "false" ]]; then
                    rm -f "${backup_file}"
                    # Also delete checksum and log if they exist
                    rm -f "${backup_file}.sha256"
                    local log_file="${KB_BACKUP_LOCAL_PATH}/backup-${backup_date//-/}*.log"
                    rm -f ${log_file} 2>/dev/null || true
                fi
                ;;
        esac
    done <<< "${backup_files}"
}

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------

print_summary() {
    echo ""
    log "========================================"
    log "CLEANUP SUMMARY"
    log "========================================"
    log "Mode: ${DRY_RUN:+DRY RUN}${DRY_RUN:-LIVE}"
    log "Retention policy:"
    log "  Daily: ${KB_BACKUP_RETENTION_DAILY} days"
    log "  Weekly: ${KB_BACKUP_RETENTION_WEEKLY} weeks"
    log "  Monthly: ${KB_BACKUP_RETENTION_MONTHLY} months"
    echo ""
    log "Results:"
    log "  Kept: ${KEPT_COUNT}"
    log "  ${DRY_RUN:+Would delete}${DRY_RUN:-Deleted}: ${DELETED_COUNT}"
    log "  Skipped: ${SKIPPED_COUNT}"
    log "========================================"
    echo ""

    if [[ "${DRY_RUN}" == "true" && ${DELETED_COUNT} -gt 0 ]]; then
        log "Run without --dry-run to delete expired backups"
        echo ""
    fi
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

main() {
    parse_args "$@"

    echo ""
    log "========================================"
    log "Knowledge Base Backup Cleanup"
    log "========================================"

    if [[ "${DRY_RUN}" == "true" ]]; then
        log "Mode: DRY RUN (no files will be deleted)"
    fi

    cleanup_backups
    print_summary

    exit 0
}

# Run main
main "$@"
