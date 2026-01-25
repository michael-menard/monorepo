---
story_id: KNOW-015
title: Disaster Recovery
status: backlog
epic: knowledgebase-mcp
created: 2026-01-25
updated: 2026-01-25
depends_on: [KNOW-001]
blocks: []
assignee: null
priority: P1
story_points: 5
tags: [disaster-recovery, backup, restore, pitr, rto, rpo, runbook, operations]
---

# KNOW-015: Disaster Recovery

## Context

The Knowledge Base MCP Server stores critical institutional memory in PostgreSQL, including knowledge entries, embeddings, and metadata. Loss of this data would be catastrophic to agent workflows and project continuity. This story establishes disaster recovery capabilities to protect against data loss from hardware failure, accidental deletion, corruption, or other disaster scenarios.

This is a production-readiness requirement identified in Epic Elaboration (Platform Finding PLAT-002). Without backup and restore procedures, the knowledge base cannot be safely deployed to production. This story must be completed before KNOW-008 (Workflow Integration) to ensure institutional memory is protected from day one.

This story depends on KNOW-001 (Package Infrastructure Setup) which provides the database schema and Docker Compose setup. The disaster recovery procedures will work with both local Docker environments (for development) and RDS (for production).

## Goal

Implement comprehensive disaster recovery capabilities for the Knowledge Base, including:
- **Automated backup procedures** for both local Docker and RDS environments
- **Manual and point-in-time restore procedures** with validation steps
- **RTO/RPO targets** documented and tested
- **Disaster recovery runbook** for on-call engineers
- **Monitoring and alerting** for backup failures
- **Backup validation** and integrity checking

Success means: an on-call engineer can restore the knowledge base to a known-good state within the RTO target, with data loss limited to the RPO window, using only the runbook documentation.

## Non-Goals

- **Cross-region disaster recovery** - Multi-region replication deferred to post-MVP (P2 enhancement)
- **Active-active multi-region setup** - Single-region DR only for MVP
- **Real-time replication (< 1 hour RPO)** - Daily backups sufficient for MVP
- **Automated failover** - Manual restore only; automatic failover deferred
- **Backup encryption key rotation** - Static KMS keys for MVP; rotation deferred
- **Application-level backup** - Database backups only; configuration/code in git
- **Backup of secrets** - Secrets restoration documented separately (see KNOW-028)
- **Chaos testing** - Comprehensive resilience testing deferred to KNOW-014

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
- Backup scripts (`backup-kb.sh`, `restore-kb.sh`, `validate-backup.sh`)
- Disaster recovery runbook (markdown documentation)
- CloudWatch alarms for backup failures (RDS)
- S3 bucket for backup storage (RDS, production)
- IAM roles/policies for backup automation
- Backup validation and integrity checking
- RTO/RPO documentation

**Environment variables required:**
- `KB_BACKUP_S3_BUCKET` - S3 bucket for backups (production only)
- `KB_BACKUP_LOCAL_PATH` - Local filesystem path for backups (development)
- `KB_BACKUP_RETENTION_DAYS` - Retention period for daily backups (default: 30)
- All existing database connection variables (from KNOW-001)

## Acceptance Criteria

### AC1: Automated Backup Script (Local Docker)
- [ ] Script exists: `apps/api/knowledge-base/scripts/backup-kb.sh`
- [ ] Script accepts `--local` flag for Docker environment
- [ ] Script performs `pg_dump` of entire database
- [ ] Backup includes both `knowledge_entries` and `embedding_cache` tables
- [ ] Backup file named with timestamp: `kb-backup-YYYYMMDD-HHMMSS.sql.gz`
- [ ] Backup file compressed with gzip
- [ ] Script generates SHA-256 checksum file: `kb-backup-YYYYMMDD-HHMMSS.sql.gz.sha256`
- [ ] Script outputs backup file path and checksum to stdout
- [ ] Script exits with code 0 on success, non-zero on failure
- [ ] Script logs to @repo/logger (or stdout if unavailable)
- [ ] Backup completes for 1000-entry database in < 5 minutes
- [ ] README documents how to run backup script

### AC2: Automated Backup for RDS (Production)
- [ ] Script accepts `--rds` flag for RDS environment
- [ ] Script triggers RDS snapshot via AWS CLI or SDK
- [ ] Snapshot named with timestamp: `kb-snapshot-YYYYMMDD-HHMMSS`
- [ ] Script copies snapshot to S3 bucket defined by `KB_BACKUP_S3_BUCKET`
- [ ] S3 backup encrypted at rest with KMS
- [ ] S3 bucket has lifecycle policy to delete backups after `KB_BACKUP_RETENTION_DAYS`
- [ ] Script verifies snapshot creation succeeded before exiting
- [ ] Script outputs snapshot ID and S3 path to stdout
- [ ] CloudWatch Logs capture backup script execution
- [ ] README documents RDS backup procedure

### AC3: Manual Restore Script (Local Docker)
- [ ] Script exists: `apps/api/knowledge-base/scripts/restore-kb.sh`
- [ ] Script accepts `--local` flag and `--backup-file` argument
- [ ] Script prompts for confirmation before restore (destructive operation)
- [ ] Script validates backup file exists and checksum matches
- [ ] Script stops knowledge base application (if running)
- [ ] Script drops and recreates database (or restores to new database)
- [ ] Script performs `pg_restore` or `psql < backup.sql`
- [ ] Script validates restore succeeded (entry count > 0, no errors)
- [ ] Script outputs restore summary (entries restored, duration)
- [ ] Script exits with code 0 on success, non-zero on failure
- [ ] Restore completes for 1000-entry backup in < 10 minutes
- [ ] README documents how to run restore script

### AC4: RDS Restore Procedure (Production)
- [ ] Script accepts `--rds` flag and `--snapshot-id` argument
- [ ] Script prompts for confirmation and target RDS instance ID
- [ ] Script validates target is not production (or requires explicit `--force-production`)
- [ ] Script restores RDS snapshot to target instance
- [ ] Script waits for restore to complete (polls status)
- [ ] Script validates restore succeeded (database accessible, entry count matches)
- [ ] Script outputs restore summary (snapshot ID, target instance, duration)
- [ ] README documents RDS restore procedure with examples

### AC5: Point-in-Time Recovery (PITR) Procedure
- [ ] RDS automated backups enabled with retention period >= 7 days
- [ ] Script accepts `--pitr` flag, `--target-time` (ISO 8601), and `--target-instance` arguments
- [ ] Script performs PITR restore to specified timestamp
- [ ] Script validates target timestamp is within retention window
- [ ] Script waits for PITR restore to complete
- [ ] Script validates restored state matches target timestamp
- [ ] README documents PITR procedure with decision tree (when to use PITR vs snapshot)
- [ ] Runbook includes PITR examples with timestamps

### AC6: Backup Validation Script
- [ ] Script exists: `apps/api/knowledge-base/scripts/validate-backup.sh`
- [ ] Script accepts `--backup-file` argument
- [ ] Script verifies backup file exists and is readable
- [ ] Script validates checksum matches `.sha256` file
- [ ] Script performs basic SQL syntax validation (if local backup)
- [ ] Script checks backup file size is reasonable (not empty, not suspiciously small)
- [ ] Script outputs validation report (PASS/FAIL, issues found)
- [ ] Script exits with code 0 if valid, non-zero if invalid
- [ ] README documents validation procedure

### AC7: RTO/RPO Documentation
- [ ] Document exists: `apps/api/knowledge-base/docs/RTO-RPO.md`
- [ ] **RTO Target:** 4 hours (time from incident to fully restored service)
- [ ] **RPO Target:** 24 hours (maximum acceptable data loss window)
- [ ] Document explains RTO/RPO definitions and rationale
- [ ] Document includes timed restore test results (actual vs target)
- [ ] Document identifies RTO/RPO bottlenecks and optimization opportunities
- [ ] Document reviewed and approved by PM and platform lead

### AC8: Disaster Recovery Runbook
- [ ] Runbook exists: `apps/api/knowledge-base/docs/DISASTER-RECOVERY-RUNBOOK.md`
- [ ] Runbook includes **Prerequisites** section (access requirements, tools needed)
- [ ] Runbook includes **Backup Procedures** section (local and RDS)
- [ ] Runbook includes **Restore Procedures** section with step-by-step instructions
- [ ] Runbook includes **PITR Procedure** with decision tree
- [ ] Runbook includes **Secret Restoration** section (references KNOW-028 for .env restoration)
- [ ] Runbook includes **Validation Steps** to verify restore succeeded
- [ ] Runbook includes **Troubleshooting** section (common errors, solutions)
- [ ] Runbook includes **Rollback** procedure (if restore fails)
- [ ] Runbook tested by running through full restore procedure
- [ ] Runbook written for on-call engineer audience (clear, actionable)

### AC9: CloudWatch Monitoring and Alerting (RDS)
- [ ] CloudWatch alarm created for backup failures
- [ ] Alarm triggers if no successful backup in 25 hours (>= RPO + 1 hour buffer)
- [ ] Alarm sends SNS notification to ops team
- [ ] CloudWatch dashboard shows backup success/failure metrics
- [ ] Dashboard shows time since last successful backup
- [ ] Dashboard shows backup file sizes over time
- [ ] Dashboard shows restore test results (if automated)
- [ ] README documents how to access dashboard and interpret metrics

### AC10: Backup Retention and Lifecycle
- [ ] Daily backups retained for 30 days (configurable via `KB_BACKUP_RETENTION_DAYS`)
- [ ] S3 lifecycle policy automatically deletes backups after retention period
- [ ] Local backups include cleanup script or documentation for manual deletion
- [ ] README documents retention policy and rationale
- [ ] Retention policy balances recovery window with storage costs

### AC11: Test Evidence and Validation
- [ ] **Test 1 (Automated Backup):** Successful backup of 100+ entry database, checksum validated
- [ ] **Test 2 (Manual Restore):** Full restore from backup, entry counts match, queries work
- [ ] **Test 3 (PITR):** Point-in-time restore to known timestamp, data state validated
- [ ] **Test 4 (Backup Validation):** Validation script passes for valid backup, fails for corrupted backup
- [ ] **Test 5 (RTO/RPO):** Restore timed at <= 4 hours, data loss <= 24 hours
- [ ] **Test 6 (Runbook):** On-call engineer (or PM) follows runbook to successful restore
- [ ] **Test 7 (Alerts):** CloudWatch alarm fires when backup fails (simulated failure)
- [ ] All test evidence captured in `PROOF-KNOW-015.md`

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

All environment variables must follow KNOW-028 documentation and validation requirements.

**Required:**
- `KB_DB_HOST` - Database host (from KNOW-001)
- `KB_DB_PORT` - Database port (from KNOW-001)
- `KB_DB_NAME` - Database name (from KNOW-001)
- `KB_DB_USER` - Database user (from KNOW-001)
- `KB_DB_PASSWORD` - Database password (from KNOW-001 or KNOW-028)

**New for this story:**
- `KB_BACKUP_S3_BUCKET` - S3 bucket for backups (RDS only, optional for local)
- `KB_BACKUP_LOCAL_PATH` - Local filesystem path (default: `./backups/`)
- `KB_BACKUP_RETENTION_DAYS` - Retention period (default: `30`)
- `KB_BACKUP_SCHEDULE` - Cron expression for automated backups (default: `0 2 * * *` = 2 AM daily)

**AWS-specific (RDS):**
- `AWS_REGION` - AWS region for RDS and S3
- `AWS_ACCESS_KEY_ID` - AWS credentials (or IAM role)
- `AWS_SECRET_ACCESS_KEY` - AWS credentials (or IAM role)

### Migration Requirements

**None** - This story does not modify database schema or require migrations. However, enabling RDS automated backups may require infrastructure changes (Terraform/CDK updates).

### Observability

**CloudWatch Metrics (RDS):**
- `KB/BackupSuccess` - Count of successful backups (custom metric)
- `KB/BackupFailure` - Count of failed backups (custom metric)
- `KB/BackupDuration` - Time to complete backup (custom metric)
- `KB/TimeSinceLastBackup` - Hours since last successful backup (custom metric)

**CloudWatch Alarms:**
- `KB-BackupFailure` - Fires if no backup in 25 hours
- `KB-BackupDurationHigh` - Fires if backup takes > 30 minutes (indicates growing dataset)

**CloudWatch Logs:**
- `/aws/knowledgebase/backup` - Backup script execution logs
- `/aws/knowledgebase/restore` - Restore script execution logs

**Dashboard Panels:**
- Backup success/failure rate (24h, 7d, 30d)
- Time since last successful backup
- Backup file sizes over time (trend analysis)
- Restore test results (if automated)

## HTTP Contract Plan

**N/A** - This story does not introduce or modify HTTP endpoints. All backup/restore operations are out-of-band operational procedures.

## Seed Requirements

**N/A** - This story does not require database seeding. However, restore testing will require a test database with known data to validate restore correctness.

**Test Data for Restore Validation:**
- Use database from KNOW-003 or KNOW-004 (100+ entries)
- Known entry count for before/after comparison
- Known sample entries for content validation

## Test Plan

### Scope Summary
**Endpoints touched:** None (infrastructure/operational procedures)

**UI touched:** No

**Data/storage touched:** Yes (PostgreSQL database, S3 backups)

**Infrastructure touched:** Backup automation, CloudWatch monitoring, S3 storage

### Happy Path Tests

**Test 1: Automated Backup Creation (Local Docker)**
- Setup: Knowledge base with 100+ entries
- Action: Run `backup-kb.sh --local`
- Expected: Backup file created, checksum validated, entry count logged
- Evidence: Backup file exists, checksum matches, logs show success

**Test 2: Manual Full Database Restore (Local Docker)**
- Setup: Valid backup file from Test 1
- Action: Run `restore-kb.sh --local --backup-file=<file>`
- Expected: Database restored, entry count matches, queries work
- Evidence: Entry counts match, sample queries return expected results

**Test 3: Point-in-Time Recovery (RDS)**
- Setup: RDS with known state at timestamp T1
- Action: Run `restore-kb.sh --pitr --target-time=T1 --target-instance=test-db`
- Expected: Database restored to T1 state
- Evidence: Entry count matches T1, entries added after T1 absent

**Test 4: Backup Validation Script**
- Setup: Valid backup file
- Action: Run `validate-backup.sh --backup-file=<file>`
- Expected: Validation passes
- Evidence: Script exits 0, validation report shows PASS

**Test 5: RTO/RPO Verification**
- Setup: Disaster recovery runbook
- Action: Time full restore procedure
- Expected: Restore completes within RTO (4 hours), data loss within RPO (24 hours)
- Evidence: Measured restore time <= 4 hours, data loss <= 24 hours

### Error Cases

**Error 1: Backup Fails Due to Database Unavailability**
- Setup: PostgreSQL unreachable
- Action: Trigger backup
- Expected: Backup fails gracefully, error logged, alert triggered
- Evidence: Error log, CloudWatch alarm fired

**Error 2: Restore Fails Due to Corrupted Backup**
- Setup: Corrupted backup file (simulate with dd)
- Action: Attempt restore
- Expected: Restore detects corruption, fails before applying changes
- Evidence: Error message mentions corruption/checksum mismatch

**Error 3: Insufficient Storage for Backup**
- Setup: Backup destination with limited storage
- Action: Trigger backup
- Expected: Backup fails, error logged, partial backup cleaned up
- Evidence: Error message mentions storage, no partial backup left

**Error 4: Restore to Wrong Database Instance**
- Setup: Attempt restore to production instance
- Action: Run restore script
- Expected: Script prompts for confirmation, prevents accidental overwrite
- Evidence: Confirmation prompt, safety check logs

### Edge Cases

**Edge 1: Large Database Backup (10k+ entries)**
- Setup: Knowledge base with 10,000+ entries
- Action: Trigger backup
- Expected: Backup completes in < 30 minutes
- Evidence: Backup duration logged, file size reasonable

**Edge 2: Concurrent Backup and Write Operations**
- Setup: Active kb_add operations during backup
- Action: Trigger backup
- Expected: Backup captures consistent snapshot, writes not blocked
- Evidence: Backup checksum validates, writes complete successfully

**Edge 3: Multiple Consecutive Restores**
- Setup: Multiple backup files from different timestamps
- Action: Restore T1, then T2, then T1 again
- Expected: Each restore produces expected state
- Evidence: Entry counts match expected for each timestamp

**Edge 4: Backup During Maintenance Window**
- Setup: Database schema migration in progress
- Action: Trigger backup
- Expected: Backup includes schema changes, is restorable
- Evidence: Restored database has correct schema, application works

**Edge 5: Zero-Entry Database Backup**
- Setup: Fresh database with no entries
- Action: Trigger backup
- Expected: Backup succeeds, restore produces empty database with schema
- Evidence: Backup file created, restore succeeds, 0 entries

### Required Tooling Evidence

**Backup Scripts:**
- `scripts/backup-kb.sh --local` produces backup file and checksum
- `scripts/backup-kb.sh --rds` triggers RDS snapshot

**Restore Scripts:**
- `scripts/restore-kb.sh --local --backup-file=<file>` restores from local backup
- `scripts/restore-kb.sh --rds --snapshot-id=<id> --target-instance=<instance>` restores RDS

**Validation Scripts:**
- `scripts/validate-backup.sh --backup-file=<file>` validates backup integrity

**Database Queries:**
- `SELECT COUNT(*) FROM knowledge_entries` before/after backup
- Sample queries to verify content correctness

**CloudWatch:**
- Logs for backup/restore operations
- Alarms configured and tested

**RTO/RPO:**
- Timed restore test (measured duration)
- Data loss window validation

### Risks to Call Out

**Risk 1: RTO/RPO Targets Not Achievable**
- If restore takes > 4 hours, targets must be adjusted or infrastructure optimized

**Risk 2: Cross-Region Restore Not Specified**
- Disaster recovery scoped to single region; multi-region deferred

**Risk 3: Secret Restoration Complexity**
- Secrets not in backup; runbook must document manual restoration (KNOW-028)

**Risk 4: Backup Storage Security**
- Backups contain sensitive data; must be encrypted and access-controlled

**Risk 5: Restore Testing Frequency**
- Quarterly restore drills required to validate procedures work

**Risk 6: Application Downtime During Restore**
- Restore is destructive; application must be stopped

**Risk 7: Backup Retention Policy Cost**
- 30-day retention may be costly for large databases; monitor S3 costs

## UI/UX Notes

**N/A** - This story does not touch UI. All backup/restore operations are CLI scripts and operational runbooks for on-call engineers.

---

## Agent Log

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-25 10:00 | pm-story-generation-leader | Story generation initiated | KNOW-015.md, _pm/TEST-PLAN.md, _pm/DEV-FEASIBILITY.md |
