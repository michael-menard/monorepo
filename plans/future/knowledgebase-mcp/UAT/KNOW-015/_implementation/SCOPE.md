# Scope - KNOW-015

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | false | No application code or API endpoints - purely operational scripts |
| frontend | false | No UI components or React code |
| infra | true | Bash scripts for backup/restore, documentation, DR procedures |

## Scope Summary

This story implements disaster recovery infrastructure for the Knowledge Base MCP Server's local PostgreSQL database. It creates operational Bash scripts (backup, restore, validate, cleanup) and comprehensive documentation (runbooks, sizing guides, drill procedures) with no API endpoints or UI changes. All deliverables are infrastructure/ops tooling for the `apps/api/knowledge-base/` package.

## Key Deliverables

### Scripts (Bash)
- `scripts/backup-kb.sh` - Automated pg_dump backup with gzip compression and SHA-256 checksums
- `scripts/restore-kb.sh` - Manual restore with pre-flight validation and lock file protection
- `scripts/validate-backup.sh` - Backup validation with SQL syntax check and dry-run restore
- `scripts/cleanup-backups.sh` - Multi-tier retention policy enforcement
- `scripts/monthly-validate-all.sh` - Monthly backup integrity validation

### Documentation
- `docs/DISASTER-RECOVERY-RUNBOOK.md` - Step-by-step DR procedures for non-dev personas
- `docs/BACKUP-SIZING.md` - Capacity planning guide with benchmark data
- `docs/BACKUP-VALIDATION-SCHEDULE.md` - Monthly validation schedule and procedures
- `docs/DR-DRILL-PROCEDURE.md` - DR drill execution and documentation templates

### Infrastructure
- Local filesystem backup storage (`./backups/`)
- Lock file mechanism for concurrent restore prevention
- Log files for backup/restore operations
- Validation and DR drill logs for audit trail

## Environment Variables (New)

| Variable | Purpose | Default |
|----------|---------|---------|
| KB_BACKUP_LOCAL_PATH | Local backup storage path | `./backups/` |
| KB_BACKUP_RETENTION_DAILY | Days to retain daily backups | `7` |
| KB_BACKUP_RETENTION_WEEKLY | Weeks to retain weekly backups | `4` |
| KB_BACKUP_RETENTION_MONTHLY | Months to retain monthly backups | `12` |
| KB_DB_SSLMODE | PostgreSQL SSL mode | `disable` (local) |

## Constraints

- Local-only MVP - no AWS/CloudWatch integration
- Manual restore only - no automated failover
- Bash scripts (not Node.js) - no @repo/logger dependency
- Daily backups only (24-hour RPO) - no real-time replication
