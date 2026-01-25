---
story_id: KNOW-015
title: Disaster Recovery
status: uat
epic: knowledgebase-mcp
created: 2026-01-25
updated: 2026-01-25
depends_on: [KNOW-001]
blocks: []
assignee: null
priority: P1
story_points: 5
tags: [disaster-recovery, backup, restore, rto, rpo, runbook, operations, local-only]
---

# KNOW-015: Disaster Recovery

## Context

The Knowledge Base MCP Server stores critical institutional memory in PostgreSQL, including knowledge entries, embeddings, and metadata. Loss of this data would be catastrophic to agent workflows and project continuity. This story establishes disaster recovery capabilities to protect against data loss from hardware failure, accidental deletion, corruption, or other disaster scenarios.

This is a production-readiness requirement identified in Epic Elaboration (Platform Finding PLAT-002). Without backup and restore procedures, the knowledge base cannot be safely deployed to production. This story must be completed before KNOW-008 (Workflow Integration) to ensure institutional memory is protected from day one.

This story depends on KNOW-001 (Package Infrastructure Setup) which provides the database schema and Docker Compose setup. The disaster recovery procedures will work with both local Docker environments (for development) and RDS (for production).

## Goal

Implement comprehensive disaster recovery capabilities for the Knowledge Base MVP (local-only deployment), including:
- **Automated backup procedures** for local PostgreSQL with compression and checksums
- **Manual restore procedures** with pre-flight validation and integrity checking
- **RTO/RPO targets** documented and tested (4 hour RTO, 24 hour RPO)
- **Disaster recovery runbook** for on-call engineers and PM/QA personas
- **Backup validation** depth including SQL syntax and dry-run restore capability
- **Periodic backup integrity monitoring** to prevent silent corruption
- **Backup retention tiers** supporting daily, weekly, monthly retention

Success means: an on-call engineer (or PM/QA) can restore the knowledge base to a known-good state within the RTO target (4 hours), with data loss limited to the RPO window (24 hours), using only the runbook documentation. Runbook validated by non-dev persona.

## Non-Goals

- **CloudWatch monitoring/alerting** - MVP is local-only; monitoring deferred to production RDS deployment
- **Cross-region disaster recovery** - Multi-region replication deferred to post-MVP (P2 enhancement)
- **Active-active multi-region setup** - Single-region DR only for MVP
- **Real-time replication (< 1 hour RPO)** - Daily backups sufficient for MVP
- **Automated failover** - Manual restore only; automatic failover deferred
- **Backup encryption key rotation** - Static keys for MVP; rotation deferred to production
- **Application-level backup** - Database backups only; configuration/code in git
- **Backup of secrets** - Secrets restoration documented separately (see KNOW-028)
- **Chaos testing** - Comprehensive resilience testing deferred to KNOW-014
- **Backup compression optimization** - Standard gzip for MVP; algorithm testing deferred
- **Automated restore testing in CI** - Manual restore drills only for MVP
- **Cross-region backup replication** - Single-region only for MVP

## Scope

### Packages Affected

**Modified:**
- `apps/api/knowledge-base/` - New `scripts/` directory for backup/restore automation
- `apps/api/knowledge-base/` - New `docs/` subdirectory for runbooks

**Potentially new (if reusable):**
- `packages/backend/ops-scripts/` - If backup automation is reusable across projects

### Endpoints

**None** - This story is infrastructure and operational procedures only. No API endpoints are exposed or modified.

### Infrastructure

**New:**
- Backup scripts (`backup-kb.sh`, `restore-kb.sh`, `validate-backup.sh`) - Bash with local PostgreSQL focus
- Disaster recovery runbook (markdown documentation)
- Local filesystem backup storage (default: `./backups/`)
- Backup validation and integrity checking with SQL syntax validation
- RTO/RPO documentation and validation
- Backup logging via stdout (local-only MVP)
- Environment variable documentation in `.env.example`

**Environment variables required:**
- `KB_BACKUP_S3_BUCKET` - S3 bucket for backups (production only)
- `KB_BACKUP_LOCAL_PATH` - Local filesystem path for backups (development)
- `KB_BACKUP_RETENTION_DAYS` - Retention period for daily backups (default: 30)
- All existing database connection variables (from KNOW-001)

## Acceptance Criteria

### AC1: Automated Backup Script (Local PostgreSQL)
- [ ] Script exists: `apps/api/knowledge-base/scripts/backup-kb.sh` (Bash)
- [ ] Script performs `pg_dump` of entire database from environment variables (KB_DB_HOST, KB_DB_PORT, KB_DB_NAME, KB_DB_USER, KB_DB_PASSWORD)
- [ ] Backup includes all tables in knowledge base schema
- [ ] Backup file named with timestamp: `kb-backup-YYYYMMDD-HHMMSS.sql.gz`
- [ ] Backup file compressed with gzip
- [ ] Script generates SHA-256 checksum file: `kb-backup-YYYYMMDD-HHMMSS.sql.gz.sha256`
- [ ] Backup stored in `KB_BACKUP_LOCAL_PATH` (default: `./backups/`)
- [ ] Script outputs backup file path and checksum to stdout
- [ ] Script exits with code 0 on success, non-zero on failure
- [ ] Script logs to stdout (timestamps for all operations)
- [ ] Backup completes for 1000-entry database in < 5 minutes
- [ ] Script validates connection before starting backup
- [ ] README documents how to run backup script and expected output

### AC2: Backup Encryption in Transit (TLS Requirements)
- [ ] Documentation specifies TLS 1.2+ for PostgreSQL connections during backup
- [ ] Environment variable `KB_DB_SSLMODE` documented as required
- [ ] Backup script validates `sslmode=require` or `sslmode=verify-full` in PostgreSQL connection string
- [ ] Backup files stored securely on filesystem with restricted permissions (mode 0600)
- [ ] README includes security considerations for backup data at rest
- [ ] Runbook includes guidance on secure backup file handling and storage

### AC3: Manual Restore Script (Local PostgreSQL)
- [ ] Script exists: `apps/api/knowledge-base/scripts/restore-kb.sh` (Bash)
- [ ] Script accepts `--backup-file` argument for backup file path
- [ ] Script prompts for confirmation before restore (destructive operation)
- [ ] **Pre-flight validation:** Backup file accessible, target DB accessible, sufficient storage available, application stopped
- [ ] Script validates backup file exists and checksum matches SHA-256 file
- [ ] Script validates backup file is readable and not empty
- [ ] Script drops and recreates database or restores to alternate database
- [ ] Script performs `pg_restore` or `psql < backup.sql`
- [ ] Script validates restore succeeded (entry count > 0, no SQL errors)
- [ ] Script outputs restore summary (entries restored, duration, status)
- [ ] Script exits with code 0 on success, non-zero on failure
- [ ] Restore completes for 1000-entry backup in < 10 minutes
- [ ] README documents how to run restore script with examples

### AC4: Multi-Version Restore Compatibility
- [ ] Restore script validates database schema version before restoring backup
- [ ] Backup file includes schema version metadata (in backup comments or separate metadata file)
- [ ] If schema version mismatch, restore script documents required migration steps
- [ ] README includes decision tree: "Can this backup be restored to current schema?"
- [ ] Runbook documents version compatibility matrix (which backups work with which schema versions)

### AC5: Concurrent Restore Prevention
- [ ] Restore script checks for lock file before starting destructive operation
- [ ] Lock file path: `KB_BACKUP_LOCAL_PATH/.restore.lock`
- [ ] Script creates lock file at start, removes at completion
- [ ] If lock file exists, script exits with error: "Restore already in progress. Remove lock file if stale."
- [ ] Lock file includes PID and timestamp for debugging stale locks
- [ ] README documents lock file location and manual cleanup if needed

### AC6: Backup Verification Depth (SQL Syntax & Dry-Run)
- [ ] Validate script exists: `apps/api/knowledge-base/scripts/validate-backup.sh` (Bash)
- [ ] Script accepts `--backup-file` argument
- [ ] Script verifies backup file exists and is readable
- [ ] Script validates checksum matches `.sha256` file (fails on mismatch)
- [ ] Script checks backup file size is reasonable (not empty, not suspiciously small)
- [ ] Script performs SQL syntax validation: `pg_restore --list` or SQL parse check
- [ ] Script performs dry-run restore to temp database to verify restore succeeds
- [ ] Script outputs validation report (PASS/FAIL with specific issues)
- [ ] Script exits with code 0 if valid, non-zero if invalid
- [ ] README documents validation procedure with examples

### AC7: Backup Size Estimation Documentation
- [ ] Document exists: `apps/api/knowledge-base/docs/BACKUP-SIZING.md`
- [ ] Document includes benchmark: "1000 knowledge entries ≈ X MB (compressed)"
- [ ] Document includes benchmark: "10,000 knowledge entries ≈ Y MB (compressed)"
- [ ] Document includes factors affecting backup size (entry complexity, embedding size, schema size)
- [ ] Document includes storage cost estimation for local filesystem
- [ ] Document includes disk space requirements for backup + restore temp space
- [ ] Runbook references sizing doc for capacity planning

### AC8: Periodic Backup Validation (Monthly)
- [ ] Add documentation: `apps/api/knowledge-base/docs/BACKUP-VALIDATION-SCHEDULE.md`
- [ ] Establish monthly backup validation schedule (e.g., first Friday of each month)
- [ ] Script: `apps/api/knowledge-base/scripts/monthly-validate-all.sh` - validates all backups from last 30 days
- [ ] Validation includes: checksum verification, SQL syntax check, dry-run restore
- [ ] If any backup fails validation, alert operator immediately
- [ ] Keep validation log: `./backups/.validation-log` with results and timestamps
- [ ] README documents monthly validation procedure and reporting
- [ ] Runbook includes: "How to interpret validation results and remediate failed backups"

### AC9: Local Logging and Progress Indicator
- [ ] Backup script outputs progress with timestamps to stdout
- [ ] Restore script outputs progress indicator for large restores: "Restored 1000/10000 entries (10%)"
- [ ] Both scripts include elapsed time and estimated remaining time
- [ ] Logs include: start time, operations completed, end time, final status (SUCCESS/FAILURE)
- [ ] Backup/restore logs saved to files: `./backups/backup-YYYYMMDD-HHMMSS.log`, `./backups/restore-YYYYMMDD-HHMMSS.log`
- [ ] README documents log file locations and how to interpret progress output

### AC10: Backup Retention Policy with Multiple Tiers
- [ ] Daily backups retained for 7 days
- [ ] Weekly backups (Sundays) retained for 4 weeks
- [ ] Monthly backups (first of month) retained for 12 months
- [ ] Retention policy configurable via environment variables
- [ ] Script: `apps/api/knowledge-base/scripts/cleanup-backups.sh` enforces retention policy
- [ ] Cleanup script runs automatically (e.g., daily at 3 AM) or manually
- [ ] README documents retention policy and rationale
- [ ] Cleanup script logs operations for audit trail

### AC11: Disaster Recovery Runbook and Non-Dev Validation
- [ ] Runbook exists: `apps/api/knowledge-base/docs/DISASTER-RECOVERY-RUNBOOK.md`
- [ ] Runbook includes **Prerequisites** section (access requirements, tools needed)
- [ ] Runbook includes **Backup Procedures** section (local backup with examples)
- [ ] Runbook includes **Restore Procedures** section with step-by-step instructions
- [ ] Runbook includes **Secret Restoration** section (references KNOW-028 for .env restoration)
- [ ] Runbook includes **Validation Steps** to verify restore succeeded
- [ ] Runbook includes **Troubleshooting** section (common errors, solutions)
- [ ] Runbook includes **Rollback** procedure (if restore fails)
- [ ] **Runbook tested by non-dev persona (PM or QA) following steps blind**
- [ ] Evidence captured: PM/QA name, date, restore time, success/failure
- [ ] Runbook written for non-technical audience (clear, actionable, no jargon)

### AC12: Disaster Recovery Drill Documentation
- [ ] Establish monthly DR drill schedule (e.g., second Friday of each month)
- [ ] DR drill procedure documented: `apps/api/knowledge-base/docs/DR-DRILL-PROCEDURE.md`
- [ ] Drill includes: simulate backup failure, trigger manual restore, validate data
- [ ] Drill log captured: `./backups/.dr-drill-log` with date, participants, issues, timing, lessons learned
- [ ] Post-drill debrief documenting any issues encountered and follow-up actions
- [ ] README documents how to run drill and interpret results
- [ ] Runbook updated based on drill findings

## Reuse Plan

### Existing Packages to Reuse
- `@repo/logger` - Logging for backup/restore scripts (if Node.js scripts; otherwise stdout)
- Docker Compose setup from KNOW-001 - Local PostgreSQL for testing
- Database schema from KNOW-001 - Backup/restore target

### New Reusable Components
- **`packages/backend/ops-scripts/`** (optional) - If backup automation is generic enough to reuse in other projects (e.g., API database backup)
- For MVP, scripts can live in `apps/api/knowledge-base/scripts/` without extraction

### Reuse Constraints
- Backup/restore scripts are knowledge-base-specific (table names, schema)
- CloudWatch alarm definitions may be generic (reusable IaC templates)
- Runbook structure/template is reusable for other services
- If RDS backup automation is implemented, consider extracting to shared ops package

## Architecture Notes

### Ports & Adapters Compliance
This story is operational infrastructure and does not involve application-level ports/adapters. However, it adheres to the following principles:

**Separation of Concerns:**
- Backup scripts are external operational tools, not application code
- Application does not implement backup logic (delegated to PostgreSQL/RDS)
- Restore procedures are out-of-band (application stopped during restore)

**Testability:**
- Backup/restore scripts are testable via execution and validation
- Test harness can simulate backup/restore scenarios in Docker
- Evidence captured via before/after database queries

**Reusability:**
- Scripts parameterized for local vs RDS environments
- Runbook template reusable for other services
- CloudWatch alarm patterns reusable

### Implementation Approach

**Local Docker Backup:**
- Use `pg_dump` to create SQL dump of entire database
- Compress with gzip for storage efficiency
- Generate SHA-256 checksum for integrity validation
- Store in local filesystem or mounted volume

**RDS Backup:**
- Use AWS CLI or SDK to trigger RDS snapshot
- Copy snapshot to S3 for long-term retention
- Leverage RDS automated backups for PITR
- Use S3 lifecycle policies for retention management

**Restore Procedures:**
- Local: `pg_restore` or `psql < backup.sql`
- RDS: Restore snapshot to new/test RDS instance
- PITR: RDS point-in-time recovery to specific timestamp
- Validation: Query entry counts, sample queries, application functionality

**Safety Mechanisms:**
- Confirmation prompts for destructive operations
- Target validation (prevent accidental production overwrite)
- Checksum validation before restore
- Rollback procedures documented

## Infrastructure Notes

### Deployment Requirements

**Local Development:**
- Docker Compose from KNOW-001 provides PostgreSQL
- Local filesystem for backup storage (or mounted volume)
- No AWS dependencies for local backup/restore

**Production (RDS):**
- RDS instance with automated backups enabled (retention >= 7 days)
- S3 bucket for backup storage (dedicated, encrypted)
- KMS key for S3 encryption at rest
- IAM role for backup automation (EC2/Lambda to access RDS and S3)
- CloudWatch Logs for backup script execution
- CloudWatch alarms for backup failures
- SNS topic for on-call notifications

### Environment Variables

All environment variables must follow KNOW-028 documentation and validation requirements. Add the following to `.env.example`:

**Required (existing from KNOW-001):**
- `KB_DB_HOST` - Database host (e.g., `localhost` for local Docker)
- `KB_DB_PORT` - Database port (e.g., `5432`)
- `KB_DB_NAME` - Database name (e.g., `knowledge_base`)
- `KB_DB_USER` - Database user (e.g., `kb_user`)
- `KB_DB_PASSWORD` - Database password (from KNOW-001 or KNOW-028)

**Connection Security (new for this story):**
- `KB_DB_SSLMODE` - PostgreSQL SSL mode (default: `disable` for local, `require` for production)

**New for this story:**
- `KB_BACKUP_LOCAL_PATH` - Local filesystem path for backups (default: `./backups/`)
- `KB_BACKUP_RETENTION_DAILY` - Daily backups retained (days, default: `7`)
- `KB_BACKUP_RETENTION_WEEKLY` - Weekly backups retained (weeks, default: `4`)
- `KB_BACKUP_RETENTION_MONTHLY` - Monthly backups retained (months, default: `12`)
- `KB_BACKUP_SCHEDULE_DAILY` - Cron expression for daily backups (default: `0 2 * * *`)

**Optional:**
- `KB_BACKUP_COMPRESSION_LEVEL` - Gzip compression level 1-9 (default: `6`)

### Migration Requirements

**None** - This story does not modify database schema or require migrations. However, enabling RDS automated backups may require infrastructure changes (Terraform/CDK updates).

### Observability (Local MVP)

**Local Logging:**
- Backup logs: `./backups/backup-YYYYMMDD-HHMMSS.log`
- Restore logs: `./backups/restore-YYYYMMDD-HHMMSS.log`
- Validation logs: `./backups/.validation-log`
- DR drill logs: `./backups/.dr-drill-log`

**Log Contents:**
- Timestamp, operation, status (SUCCESS/FAILURE), elapsed time, entry count
- Error messages and troubleshooting hints on failure
- No sensitive data in logs (no passwords or database contents)

**Log Rotation:**
- Backup/restore logs rotated daily (keep last 30 days)
- Validation and drill logs kept indefinitely for audit trail

**Manual Dashboard (Excel/CSV):**
- Script to generate CSV report of backup history: `backup-status-report.sh`
- Report includes: backup date, file size, validation status, restore time

## HTTP Contract Plan

**N/A** - This story does not introduce or modify HTTP endpoints. All backup/restore operations are out-of-band operational procedures.

## Seed Requirements

**N/A** - This story does not require database seeding. However, restore testing will require a test database with known data to validate restore correctness.

**Test Data for Restore Validation:**
- Use database from KNOW-003 or KNOW-004 (100+ entries)
- Known entry count for before/after comparison
- Known sample entries for content validation

## RTO/RPO Targets and Rationale

**RTO (Recovery Time Objective): 4 hours**
- Time from incident detection to fully restored and validated knowledge base
- Includes: backup download/restoration, validation, application restart
- Rationale: Knowledge base is non-critical for daily operations; 4-hour window acceptable for MVP
- If RTO cannot be met, investigate backup/restore optimization

**RPO (Recovery Point Objective): 24 hours**
- Maximum acceptable data loss window
- Daily backups provide 24-hour RPO
- If more frequent backup needed, re-evaluate via platform team
- Loss scenario: data added after last backup is lost permanently

## Test Plan

### Scope Summary
**Endpoints touched:** None (infrastructure/operational procedures)

**UI touched:** No

**Data/storage touched:** Yes (PostgreSQL database, local backups)

**Infrastructure touched:** Backup automation, local storage, validation scripts

### Happy Path Tests

**Test 1: Automated Backup Creation (Local PostgreSQL)**
- Setup: Knowledge base with 100+ entries running in Docker
- Action: Run `backup-kb.sh`
- Expected: Backup file created, checksum validated, entry count logged
- Evidence: Backup file exists, checksum matches .sha256, logs show SUCCESS with timestamp
- Expected Duration: < 5 minutes

**Test 2: Manual Full Database Restore (Local PostgreSQL)**
- Setup: Valid backup file from Test 1, alternate database for restore target
- Action: Run `restore-kb.sh --backup-file=<file>`, confirm restore
- Expected: Database restored, entry count matches original, queries work
- Evidence: Entry counts match, sample queries return expected results, restore log shows SUCCESS
- Expected Duration: < 10 minutes

**Test 3: Backup Validation Script (Dry-Run Restore)**
- Setup: Valid backup file from Test 1
- Action: Run `validate-backup.sh --backup-file=<file>`
- Expected: Validation passes, includes SQL syntax check and dry-run restore
- Evidence: Script exits 0, validation report shows PASS, dry-run successful

**Test 4: Backup Integrity Monitoring (Monthly Validation)**
- Setup: Multiple backups from past 30 days
- Action: Run `monthly-validate-all.sh`
- Expected: All backups pass validation, logs saved to .validation-log
- Evidence: Validation log shows PASS for all, no corrupted backups found

**Test 5: RTO/RPO Verification (Timed Restore)**
- Setup: Knowledge base with 100+ entries, valid backup
- Action: Time full backup and restore procedure
- Expected: Backup completes in < 5 min, restore in < 10 min (total < 15 min, well within 4h RTO)
- Evidence: Logs show timestamps, total duration documented, data loss = 0 (daily RPO = 24h)

**Test 6: Runbook by Non-Dev (PM/QA)**
- Setup: Disaster recovery runbook, fresh developer, PM or QA follows blind
- Action: PM/QA follows runbook steps without dev assistance
- Expected: Restore completes successfully, data integrity validated
- Evidence: DR drill log signed by PM/QA, timestamp, success status

**Test 7: Multi-Backup Concurrent Management**
- Setup: Multiple backup files, concurrent restore attempt
- Action: Attempt to run restore while another restore in progress
- Expected: Lock file prevents concurrent restore, script exits with error
- Evidence: Error message mentions lock file, second restore fails cleanly

### Error Cases

**Error 1: Backup Fails Due to Database Unavailability**
- Setup: PostgreSQL unreachable (stop Docker container)
- Action: Run `backup-kb.sh`
- Expected: Backup fails gracefully, error logged, script exits non-zero
- Evidence: Error log mentions connection refused, script exit code != 0

**Error 2: Restore Fails Due to Corrupted Backup**
- Setup: Corrupted backup file (simulate with `dd if=/dev/urandom of=backup.sql.gz bs=1 count=100`)
- Action: Run `restore-kb.sh --backup-file=<corrupted>`
- Expected: Restore detects corruption, fails before applying changes
- Evidence: Checksum validation fails, script exits non-zero before restore starts

**Error 3: Insufficient Storage for Backup**
- Setup: Backup destination with limited storage (create small mount or quota)
- Action: Run `backup-kb.sh`
- Expected: Backup fails gracefully, partial files cleaned up
- Evidence: Error mentions disk full, no partial backup files left in directory

**Error 4: Restore Already in Progress (Lock File)**
- Setup: Restore script running, attempt second restore
- Action: Run `restore-kb.sh` in second terminal
- Expected: Second restore fails with lock file error
- Evidence: Error mentions lock file, script exits non-zero

**Error 5: Version Mismatch on Restore**
- Setup: Backup from older schema version, current schema has new tables
- Action: Run `restore-kb.sh --backup-file=<old-backup>`
- Expected: Script detects version mismatch, prompts for migration or fails safely
- Evidence: Script identifies version mismatch, provides guidance

### Edge Cases

**Edge 1: Large Database Backup (1000+ entries)**
- Setup: Knowledge base with 1000+ entries
- Action: Run `backup-kb.sh`
- Expected: Backup completes in < 5 minutes, file size reasonable
- Evidence: Backup duration logged, file size within expected range

**Edge 2: Concurrent Backup and Database Writes**
- Setup: Running backup tool while application actively adding entries
- Action: Run `backup-kb.sh` while `kb_add` operations executing
- Expected: Backup captures consistent snapshot, application writes not blocked
- Evidence: Backup completes successfully, new entries added after backup are not in backup

**Edge 3: Multiple Consecutive Restores**
- Setup: Multiple backup files from different dates
- Action: Restore backup A, then backup B, then backup A again
- Expected: Each restore produces expected state (entries from that date)
- Evidence: Entry counts match expected for each backup timestamp

**Edge 4: Backup During Extended Outage (Very Large Backup)**
- Setup: Knowledge base with months of accumulated entries
- Action: Run `backup-kb.sh` with very large database
- Expected: Backup completes, though may take longer
- Evidence: Backup file created, restore succeeds

**Edge 5: Empty Database Backup and Restore**
- Setup: Fresh database with no entries (schema only)
- Action: Run `backup-kb.sh`, then `restore-kb.sh`
- Expected: Backup succeeds, restore produces empty database with schema intact
- Evidence: Backup file created, restore succeeds, 0 entries, schema valid

### Required Tooling Evidence (Captured in PROOF-KNOW-015.md)

**Backup Scripts:**
- `scripts/backup-kb.sh` produces backup file, checksum, and success log
- Backup output: file path, checksum, entry count, duration
- Backup test evidence: 100+ entry database backed up successfully

**Restore Scripts:**
- `scripts/restore-kb.sh --backup-file=<file>` restores from local backup
- Restore output: entries restored, duration, validation status
- Restore test evidence: backup restored to alternate DB, entry counts match

**Validation Scripts:**
- `scripts/validate-backup.sh --backup-file=<file>` validates integrity (checksum, SQL syntax, dry-run)
- Validation output: PASS/FAIL status, specific issues found
- Validation test evidence: valid backup passes, corrupted backup fails

**Periodic Validation Script:**
- `scripts/monthly-validate-all.sh` validates all backups from last 30 days
- Output: validation log with all results, any failures highlighted
- Test evidence: all backups pass monthly validation

**Database Queries:**
- `SELECT COUNT(*) FROM knowledge_entries` before/after backup
- Sample queries to verify content correctness (entries selected, embeddings intact)
- Test evidence: entry counts match, sample queries return identical results

**Local Logging:**
- Backup logs: timestamps, operations, status
- Restore logs: timestamps, progress, validation
- Validation logs: results for each backup
- DR drill logs: participants, timing, issues, lessons learned

**RTO/RPO:**
- Timed backup test (measured duration vs < 5 min target)
- Timed restore test (measured duration vs < 10 min target)
- Data loss window validation (24-hour RPO satisfied by daily backups)

### Risks to Call Out

**Risk 1: RTO/RPO Targets Not Achievable**
- If backup > 5 min or restore > 10 min (combined still << 4h RTO), targets met
- Risk: Performance degradation with large databases; monitored monthly

**Risk 2: Local Storage Failure**
- Single backup location in local filesystem; no redundancy in MVP
- Risk: Disk failure = complete data loss; mitigation = frequent backups + storage monitoring
- Post-MVP: Consider NFS or S3 backup replication

**Risk 3: Secret Restoration Dependency**
- Secrets not in backup; runbook must document manual .env restoration (KNOW-028)
- Risk: Cannot fully restore without secrets; must block on KNOW-028 completion

**Risk 4: Backup File Security**
- Backups contain sensitive knowledge base data; files stored with restricted permissions
- Risk: Unauthorized access to backups; mitigation = filesystem permissions + encryption guidelines

**Risk 5: Restore Testing Frequency**
- Monthly DR drills required to validate procedures work
- Risk: Procedures decay without practice; dry-run restores validate runbook stays current

**Risk 6: Application Downtime During Restore**
- Restore is destructive; application must be stopped during restore
- Risk: Downtime counted in RTO; mitigation = restore to alternate DB first, then promote

**Risk 7: Concurrent Restore Prevention**
- Lock file prevents concurrent restores; risk of stale locks
- Mitigation: Document stale lock cleanup; include in troubleshooting section

**Risk 8: Backup Rotation and Cleanup**
- Cleanup script manages retention; risk of accidental data loss if rotation fails
- Mitigation: Retention policy tested, cleanup logged for audit trail

## UI/UX Notes

**N/A** - This story does not touch UI. All backup/restore operations are CLI scripts and operational runbooks for on-call engineers.

---

## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on 2026-01-25_

### MVP Scope Clarification

This story has been updated to reflect **local-only MVP deployment** (no AWS, no CloudWatch). Key changes:
- Removed all RDS/AWS-specific procedures
- Removed CloudWatch monitoring and alarms
- Focused on local PostgreSQL backup/restore using standard tools
- Emphasis on operational runbooks for PM/QA personas (not just engineers)

### Acceptance Criteria Summary (12 total)

1. **AC1**: Local PostgreSQL backup script (pg_dump, gzip, SHA-256 checksum)
2. **AC2**: Backup encryption in transit (TLS for PostgreSQL connections)
3. **AC3**: Restore script with pre-flight validation
4. **AC4**: Multi-version restore compatibility checking
5. **AC5**: Concurrent restore prevention (lock file)
6. **AC6**: Backup verification depth (SQL syntax + dry-run)
7. **AC7**: Backup size estimation documentation
8. **AC8**: Monthly backup integrity monitoring script
9. **AC9**: Local logging and progress indicators
10. **AC10**: Multi-tier retention policy (daily 7d, weekly 4w, monthly 12m)
11. **AC11**: Runbook with non-dev (PM/QA) validation required
12. **AC12**: Monthly DR drill documentation and debrief process

### RTO/RPO Targets

- **RTO (4 hours)**: Time from incident to fully restored service
- **RPO (24 hours)**: Maximum data loss window (satisfied by daily backups)

### Risks & Mitigations

**Risk**: Local storage failure = complete data loss
- **Mitigation**: Frequent backups, monthly validation, storage monitoring

**Risk**: Application downtime during restore
- **Mitigation**: Restore to alternate DB first, then promote

**Risk**: Procedures decay without practice
- **Mitigation**: Monthly DR drills with documentation, runbook validation by non-dev

### Follow-up Stories Suggested

- [ ] KNOW-016 (Post-MVP): Automated restore testing in CI to validate backups restorable
- [ ] KNOW-017 (Post-MVP): Cross-region backup replication for true disaster recovery
- [ ] KNOW-018 (Post-MVP): Backup cost optimization and compression algorithm benchmarking
- [ ] KNOW-029 (Parallel): Secrets management integration (depends on KNOW-028 completion)

### Dependencies & Implementation Order

**Blocks**: None (foundation story)
**Depends On**:
- KNOW-001 (Database infrastructure) - required before implementation
- KNOW-028 (Secrets) - for runbook integration (can proceed in parallel)

---

## Agent Log

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-25 10:00 | pm-story-generation-leader | Story generation initiated | KNOW-015.md, _pm/TEST-PLAN.md, _pm/DEV-FEASIBILITY.md |
| 2026-01-25 15:00 | elab-completion-leader | Applied 12 AC decisions, MVP scope clarification | ELAB-KNOW-015.md, updated KNOW-015.md, status -> ready-to-work |
