# Story lnch-1014: Database Operations Runbook

## Status

Draft

## Story

**As an** operator,
**I want** a database operations runbook,
**so that** I can perform routine database tasks safely.

## Epic Context

This is **Story 6 of Launch Readiness Epic: App Runbooks Workstream**.
Priority: **High** - Required for database management.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other runbooks)

## Related Stories

- lnch-1015: Database Troubleshooting Runbook (diagnostics companion)
- lnch-1020: Aurora Operations Runbook (Aurora-specific procedures)

## Acceptance Criteria

1. Runbook exists at `docs/operations/runbooks/database-operations.md`
2. Documents migration procedures
3. Documents backup verification
4. Documents point-in-time recovery
5. Documents connection management
6. Documents scaling procedures
7. Documents maintenance windows

## Tasks / Subtasks

- [ ] **Task 1: Create Runbook Structure** (AC: 1)
  - [ ] Create `docs/operations/runbooks/database-operations.md`
  - [ ] Add standard sections

- [ ] **Task 2: Document Migrations** (AC: 2)
  - [ ] Drizzle migration commands
  - [ ] Pre-migration checklist
  - [ ] Rollback procedures
  - [ ] Testing migrations in dev/staging

- [ ] **Task 3: Document Backups** (AC: 3)
  - [ ] Aurora automatic backups
  - [ ] Manual snapshot creation
  - [ ] Backup retention policy
  - [ ] Backup verification

- [ ] **Task 4: Document Recovery** (AC: 4)
  - [ ] Point-in-time recovery steps
  - [ ] Snapshot restore
  - [ ] Data validation after restore

- [ ] **Task 5: Document Connections** (AC: 5)
  - [ ] Connection pooling (RDS Proxy if used)
  - [ ] Max connections by stage
  - [ ] Connection string management

- [ ] **Task 6: Document Scaling** (AC: 6)
  - [ ] Aurora Serverless v2 ACU settings
  - [ ] How to adjust min/max ACU
  - [ ] Monitoring scaling events

- [ ] **Task 7: Document Maintenance** (AC: 7)
  - [ ] Maintenance window settings
  - [ ] Patching procedures
  - [ ] Notification setup

## Dev Notes

### Templates (Required)

This story produces **two documents** that must be created together:

1. **Runbook**: `docs/operations/runbooks/database-operations.md`
   - Use template: `docs/operations/RUNBOOK-TEMPLATE.md`
   - Covers migrations, backups, scaling, maintenance procedures

2. **Playbook**: `docs/operations/playbooks/database-operations-failure.md`
   - Use template: `docs/operations/PLAYBOOK-TEMPLATE.md`
   - Covers failed migrations, backup failures, scaling issues

The runbook handles normal operations; the playbook handles when things go wrong.

---

### Aurora Configuration (from serverless.yml)
- Engine: Aurora PostgreSQL Serverless v2
- ACU Range: 0.5-4 (varies by stage)
- Backup Retention: 7 days

### Drizzle Commands
```bash
# Generate migration
pnpm drizzle-kit generate

# Run migrations
pnpm drizzle-kit migrate

# View current schema
pnpm drizzle-kit studio
```

### Connection Strings
- Stored in AWS Secrets Manager
- Pattern: `lego-api-{stage}-db-credentials`

### Scaling (Aurora Serverless v2)
```bash
# View current capacity
aws rds describe-db-clusters --db-cluster-identifier lego-api-{stage}

# Modify capacity (if needed)
aws rds modify-db-cluster \
  --db-cluster-identifier lego-api-{stage} \
  --serverless-v2-scaling-configuration MinCapacity=0.5,MaxCapacity=8
```

## Testing

### Verification
- Commands work in each environment
- Recovery procedures are tested
- Links to AWS docs are valid

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
