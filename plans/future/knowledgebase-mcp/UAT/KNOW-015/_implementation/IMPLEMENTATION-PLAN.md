# Implementation Plan - KNOW-015: Disaster Recovery

## Overview

This plan implements comprehensive disaster recovery capabilities for the Knowledge Base MCP Server's local PostgreSQL database. The implementation is infrastructure/ops focused with Bash scripts and markdown documentation.

## Implementation Order

The implementation follows a logical dependency order:

1. **Infrastructure Setup** (Foundation)
   - Create directory structure
   - Add environment variables to .env.example

2. **Core Scripts** (AC1, AC3, AC6)
   - backup-kb.sh (AC1)
   - restore-kb.sh (AC3, AC4, AC5)
   - validate-backup.sh (AC6)

3. **Retention and Maintenance** (AC10, AC8)
   - cleanup-backups.sh (AC10)
   - monthly-validate-all.sh (AC8)

4. **Documentation** (AC2, AC7, AC11, AC12)
   - DISASTER-RECOVERY-RUNBOOK.md (AC11)
   - BACKUP-SIZING.md (AC7)
   - BACKUP-VALIDATION-SCHEDULE.md (AC8)
   - DR-DRILL-PROCEDURE.md (AC12)

5. **Logging Integration** (AC9)
   - Add progress indicators to all scripts
   - Log file management

---

## Chunk 1: Infrastructure Setup

**Files Created:**
- `apps/api/knowledge-base/scripts/` (directory)
- `apps/api/knowledge-base/docs/` (directory)
- `apps/api/knowledge-base/backups/.gitkeep`

**Files Modified:**
- `apps/api/knowledge-base/.env.example` (add backup variables)

**Environment Variables to Add:**

```bash
# ============================================================================
# Disaster Recovery Configuration (KNOW-015)
# ============================================================================

# Local backup storage path (default: ./backups/)
KB_BACKUP_LOCAL_PATH=./backups

# PostgreSQL SSL mode for backup connections
# Options: disable (local dev), require (production), verify-full (production+CA)
KB_DB_SSLMODE=disable

# Daily backup retention (days, default: 7)
KB_BACKUP_RETENTION_DAILY=7

# Weekly backup retention (weeks, default: 4)
KB_BACKUP_RETENTION_WEEKLY=4

# Monthly backup retention (months, default: 12)
KB_BACKUP_RETENTION_MONTHLY=12

# Gzip compression level (1-9, default: 6)
KB_BACKUP_COMPRESSION_LEVEL=6
```

**Acceptance Criteria Addressed:** Foundation for all ACs

---

## Chunk 2: Backup Script (AC1, AC2, AC9)

**File:** `apps/api/knowledge-base/scripts/backup-kb.sh`

**Functionality:**
1. Load environment variables from `.env`
2. Validate database connection before backup
3. Validate TLS requirements (AC2 - document sslmode)
4. Execute `pg_dump` with proper options
5. Compress output with gzip
6. Generate SHA-256 checksum
7. Set file permissions to 0600
8. Log progress with timestamps (AC9)
9. Output backup path and stats

**Script Structure:**

```bash
#!/bin/bash
set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KB_ROOT="$(dirname "$SCRIPT_DIR")"
source "${KB_ROOT}/.env"

# Defaults
KB_BACKUP_LOCAL_PATH="${KB_BACKUP_LOCAL_PATH:-${KB_ROOT}/backups}"
KB_BACKUP_COMPRESSION_LEVEL="${KB_BACKUP_COMPRESSION_LEVEL:-6}"

# Timestamp and filenames
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="kb-backup-${TIMESTAMP}.sql.gz"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
LOG_FILE="backup-${TIMESTAMP}.log"

# Functions
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_PATH}"; }

# Pre-flight validation
validate_connection()
validate_ssl_mode()
ensure_backup_dir()

# Main backup
create_backup()
generate_checksum()
set_permissions()
log_summary()
```

**Output Format:**
- Backup: `kb-backup-YYYYMMDD-HHMMSS.sql.gz`
- Checksum: `kb-backup-YYYYMMDD-HHMMSS.sql.gz.sha256`
- Log: `backup-YYYYMMDD-HHMMSS.log`

**Exit Codes:**
- 0: Success
- 1: Connection failed
- 2: Backup failed
- 3: Checksum failed

**AC1 Checklist:**
- [x] Script exists at correct path
- [x] Performs pg_dump from env vars
- [x] Includes all tables
- [x] Named with timestamp
- [x] Compressed with gzip
- [x] SHA-256 checksum file
- [x] Stored in KB_BACKUP_LOCAL_PATH
- [x] Outputs path and checksum
- [x] Exit codes
- [x] Logs with timestamps
- [x] Connection validation

**AC2 Checklist:**
- [x] Documents TLS 1.2+ requirement
- [x] KB_DB_SSLMODE documented
- [x] Validates sslmode in script
- [x] File permissions 0600
- [x] Security considerations in README

---

## Chunk 3: Restore Script (AC3, AC4, AC5, AC9)

**File:** `apps/api/knowledge-base/scripts/restore-kb.sh`

**Functionality:**
1. Parse `--backup-file` argument
2. Check lock file (AC5 - concurrent prevention)
3. Pre-flight validation (AC3)
   - Backup file exists and readable
   - Checksum matches
   - Target database accessible
   - Sufficient storage
4. Schema version check (AC4)
5. Confirmation prompt
6. Create lock file with PID/timestamp
7. Execute restore (psql < backup.sql)
8. Validate restore (entry count > 0)
9. Log progress with entry counts (AC9)
10. Remove lock file

**Lock File Format:**

```
PID=12345
TIMESTAMP=2026-01-25T14:30:00Z
BACKUP_FILE=kb-backup-20260125-143000.sql.gz
```

**Script Structure:**

```bash
#!/bin/bash
set -euo pipefail

# Parse arguments
parse_args() # --backup-file, --force (skip confirmation)

# Lock file management
LOCK_FILE="${KB_BACKUP_LOCAL_PATH}/.restore.lock"
acquire_lock()
release_lock()

# Pre-flight checks
validate_backup_file()
validate_checksum()
check_disk_space()
validate_target_db()
check_schema_version()

# Restore
confirm_restore() # Interactive prompt
perform_restore()
validate_restore() # Entry count check

# Progress tracking
track_progress() # "Restored X entries (Y%)"
```

**Exit Codes:**
- 0: Success
- 1: Argument error
- 2: Lock file exists
- 3: Pre-flight failed
- 4: Restore failed
- 5: Validation failed

**AC3 Checklist:**
- [x] --backup-file argument
- [x] Confirmation prompt
- [x] Pre-flight validation
- [x] Checksum validation
- [x] File readable/not empty
- [x] Recreates database
- [x] Validates restore (entry count)
- [x] Output summary
- [x] Exit codes

**AC4 Checklist:**
- [x] Schema version validation
- [x] Backup includes version metadata
- [x] Documents migration steps
- [x] Decision tree in README

**AC5 Checklist:**
- [x] Lock file check
- [x] Lock file path documented
- [x] Creates lock at start
- [x] Removes lock at completion
- [x] Error if lock exists
- [x] PID/timestamp in lock
- [x] Manual cleanup documented

---

## Chunk 4: Validation Script (AC6)

**File:** `apps/api/knowledge-base/scripts/validate-backup.sh`

**Functionality:**
1. Parse `--backup-file` argument
2. Verify file exists and readable
3. Validate checksum matches .sha256
4. Check file size (not empty, not suspiciously small)
5. SQL syntax validation (gunzip + pg_restore --list)
6. Dry-run restore to temp database
7. Output validation report

**Validation Report Format:**

```
========================================
BACKUP VALIDATION REPORT
========================================
File: kb-backup-20260125-143000.sql.gz
Date: 2026-01-25 14:30:00

CHECKS:
[PASS] File exists and readable
[PASS] File size: 1.2 MB (within expected range)
[PASS] SHA-256 checksum matches
[PASS] SQL syntax valid (pg_restore --list)
[PASS] Dry-run restore to temp database

RESULT: PASS

Entries in backup: 1234
Estimated restore time: ~2 minutes
========================================
```

**Exit Codes:**
- 0: PASS
- 1: File not found
- 2: Checksum mismatch
- 3: SQL syntax error
- 4: Dry-run restore failed

**AC6 Checklist:**
- [x] Script exists
- [x] --backup-file argument
- [x] File exists/readable
- [x] Checksum validation
- [x] Size check
- [x] SQL syntax validation
- [x] Dry-run restore
- [x] Validation report output
- [x] Exit codes

---

## Chunk 5: Retention Cleanup (AC10)

**File:** `apps/api/knowledge-base/scripts/cleanup-backups.sh`

**Functionality:**
1. Load retention settings from env
2. Identify backup tiers:
   - Daily: All backups from last N days
   - Weekly: Sunday backups from last N weeks
   - Monthly: First-of-month backups from last N months
3. Delete backups outside retention
4. Log deleted files

**Retention Logic:**

```bash
# Default retention
DAILY_RETENTION=${KB_BACKUP_RETENTION_DAILY:-7}    # 7 days
WEEKLY_RETENTION=${KB_BACKUP_RETENTION_WEEKLY:-4}  # 4 weeks
MONTHLY_RETENTION=${KB_BACKUP_RETENTION_MONTHLY:-12} # 12 months

# Keep:
# - All backups from last 7 days (daily tier)
# - Sunday backups from last 4 weeks (weekly tier)
# - First-of-month backups from last 12 months (monthly tier)
```

**Exit Codes:**
- 0: Success
- 1: Configuration error

**AC10 Checklist:**
- [x] Daily backups: 7 days
- [x] Weekly backups: 4 weeks
- [x] Monthly backups: 12 months
- [x] Configurable via env
- [x] Cleanup script
- [x] Can run automatically or manually
- [x] README documents policy
- [x] Logged for audit trail

---

## Chunk 6: Monthly Validation (AC8)

**File:** `apps/api/knowledge-base/scripts/monthly-validate-all.sh`

**Functionality:**
1. Find all backups from last 30 days
2. Run validate-backup.sh on each
3. Aggregate results
4. Write to .validation-log
5. Alert on any failures

**Log Format (`.validation-log`):**

```
========================================
MONTHLY VALIDATION - 2026-01-25
========================================
Backups validated: 30
Passed: 30
Failed: 0

DETAILS:
[PASS] kb-backup-20260125-020000.sql.gz
[PASS] kb-backup-20260124-020000.sql.gz
...

Next validation due: 2026-02-25
========================================
```

**AC8 Checklist:**
- [x] Documentation exists
- [x] Monthly schedule established
- [x] Validation script
- [x] Checksum + SQL + dry-run
- [x] Alerts on failure
- [x] .validation-log maintained
- [x] README documents procedure
- [x] Runbook remediation section

---

## Chunk 7: Documentation - DR Runbook (AC11)

**File:** `apps/api/knowledge-base/docs/DISASTER-RECOVERY-RUNBOOK.md`

**Sections:**
1. Prerequisites
   - Access requirements
   - Tools needed (psql, gzip, sha256sum)
   - Environment setup
2. Backup Procedures
   - Daily automated backup
   - Manual backup
   - Verifying backup success
3. Restore Procedures
   - Step-by-step with screenshots
   - Commands to copy-paste
   - Validation steps
4. Secret Restoration
   - References KNOW-028
   - .env file recovery
5. Validation Steps
   - Entry count verification
   - Sample query tests
6. Troubleshooting
   - Common errors and solutions
   - Lock file issues
   - Checksum failures
7. Rollback
   - If restore fails partway
   - Recovery options

**Writing Style:**
- Non-technical audience (PM/QA can follow)
- Step-by-step numbered lists
- Copy-paste command blocks
- "If you see X, do Y" format
- No jargon

**AC11 Checklist:**
- [x] Runbook exists
- [x] Prerequisites section
- [x] Backup procedures
- [x] Restore procedures (step-by-step)
- [x] Secret restoration (KNOW-028 reference)
- [x] Validation steps
- [x] Troubleshooting
- [x] Rollback procedure
- [x] Tested by non-dev (documented in PROOF)
- [x] Evidence captured
- [x] Non-technical writing style

---

## Chunk 8: Documentation - Sizing and Schedules (AC7, AC8, AC12)

**Files:**

### BACKUP-SIZING.md (AC7)

```markdown
# Backup Sizing Guide

## Benchmarks

| Entries | Compressed Size | Backup Time | Restore Time |
|---------|-----------------|-------------|--------------|
| 100     | ~100 KB         | <10s        | <10s         |
| 1,000   | ~1 MB           | ~30s        | ~1 min       |
| 10,000  | ~10 MB          | ~3 min      | ~5 min       |

## Size Factors
- Entry complexity
- Embedding size (1536 floats = 6KB per entry)
- Schema overhead

## Storage Requirements
- Backup + temp space for restore
- Recommend 3x largest backup size free

## Cost Estimation
- Local: Free (filesystem)
- S3: ~$0.023/GB/month (future)
```

### BACKUP-VALIDATION-SCHEDULE.md (AC8)

```markdown
# Monthly Backup Validation Schedule

## Schedule
- When: First Friday of each month at 9:00 AM
- Duration: ~30 minutes
- Frequency: Monthly

## Procedure
1. Run: `./scripts/monthly-validate-all.sh`
2. Review .validation-log
3. Investigate any failures
4. Update Runbook if issues found
```

### DR-DRILL-PROCEDURE.md (AC12)

```markdown
# Disaster Recovery Drill Procedure

## Schedule
- When: Second Friday of each month at 10:00 AM
- Duration: ~1 hour
- Participants: At least one dev, one non-dev

## Drill Steps
1. Simulate disaster (stop database)
2. Follow runbook to restore
3. Validate data integrity
4. Document timing and issues

## Debrief Template
- Date:
- Participants:
- Restore time:
- Issues encountered:
- Lessons learned:
- Runbook updates needed:
```

---

## Chunk 9: Logging Enhancement (AC9)

**Modifications:**
- All scripts output progress with timestamps
- Progress indicator for large restores
- Elapsed time and ETA
- Log files with consistent format

**Log Format:**

```
[2026-01-25 14:30:00] Starting backup...
[2026-01-25 14:30:01] Validating database connection...
[2026-01-25 14:30:02] Connection OK (0.5s)
[2026-01-25 14:30:02] Running pg_dump...
[2026-01-25 14:32:15] pg_dump complete (2m 13s)
[2026-01-25 14:32:15] Compressing with gzip (level 6)...
[2026-01-25 14:32:30] Compression complete (15s)
[2026-01-25 14:32:30] Generating checksum...
[2026-01-25 14:32:31] Checksum: abc123...
[2026-01-25 14:32:31] Setting permissions (0600)...
[2026-01-25 14:32:31] SUCCESS: Backup complete
[2026-01-25 14:32:31] Output: ./backups/kb-backup-20260125-143000.sql.gz
[2026-01-25 14:32:31] Size: 1.2 MB
[2026-01-25 14:32:31] Duration: 2m 31s
```

**Restore Progress:**

```
[2026-01-25 15:00:00] Restoring backup...
[2026-01-25 15:00:30] Progress: 100/1000 entries (10%)
[2026-01-25 15:01:00] Progress: 300/1000 entries (30%)
...
[2026-01-25 15:03:00] Progress: 1000/1000 entries (100%)
[2026-01-25 15:03:00] SUCCESS: Restore complete
```

**AC9 Checklist:**
- [x] Progress with timestamps
- [x] Progress indicator for large restores
- [x] Elapsed time and ETA
- [x] Start/end/status in logs
- [x] Log files saved
- [x] Log locations documented

---

## Testing Strategy

### Manual Test Sequence

1. **Setup Test**
   - Start Docker Compose
   - Run pnpm db:seed (100+ entries)

2. **Backup Test (AC1, AC2, AC9)**
   - Run backup-kb.sh
   - Verify file created
   - Verify checksum file
   - Verify log file
   - Verify permissions

3. **Validation Test (AC6)**
   - Run validate-backup.sh
   - Verify all checks pass
   - Corrupt a backup, verify failure

4. **Restore Test (AC3, AC4, AC5, AC9)**
   - Run restore-kb.sh
   - Verify confirmation prompt
   - Verify lock file
   - Verify entry count matches
   - Test concurrent restore blocked

5. **Retention Test (AC10)**
   - Create multiple backups with old dates
   - Run cleanup-backups.sh
   - Verify retention policy applied

6. **Monthly Validation Test (AC8)**
   - Run monthly-validate-all.sh
   - Verify .validation-log created

7. **RTO/RPO Test**
   - Time full backup
   - Time full restore
   - Verify < 4h total

---

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| KNOW-001 (Database) | COMPLETED | Docker Compose, schema |
| KNOW-028 (Env Vars) | COMPLETED | .env.example pattern |
| psql | Required | PostgreSQL client |
| pg_dump | Required | PostgreSQL backup |
| gzip | Required | Compression |
| sha256sum | Required | Checksums |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Script errors | Comprehensive test suite |
| Lock file stale | Document cleanup in troubleshooting |
| Large database slow | Progress indicators, timing benchmarks |
| Non-dev can't follow runbook | Write for non-technical, test with PM/QA |

---

## No Architectural Decisions Required

This story is infrastructure/ops work with well-defined requirements:
- Bash scripts (not Node.js) - specified in story
- Local filesystem storage - specified in story
- pg_dump/psql tools - standard PostgreSQL
- No API endpoints
- No database schema changes

All implementation choices follow PostgreSQL best practices and the story requirements.

---

## Estimated Effort

| Chunk | Files | Estimated Time |
|-------|-------|----------------|
| 1. Infrastructure | 4 | 15 min |
| 2. Backup Script | 1 | 45 min |
| 3. Restore Script | 1 | 60 min |
| 4. Validation Script | 1 | 30 min |
| 5. Cleanup Script | 1 | 30 min |
| 6. Monthly Validation | 1 | 20 min |
| 7. DR Runbook | 1 | 45 min |
| 8. Sizing/Schedules | 3 | 30 min |
| 9. Logging Enhancement | - | 20 min |
| **Total** | **13** | **~5 hours** |
