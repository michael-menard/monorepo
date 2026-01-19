# Story lnch-1020: Aurora Operations Runbook

## Status

Draft

## Story

**As an** operator,
**I want** an Aurora operations runbook,
**so that** I can manage Aurora Serverless v2 effectively.

## Epic Context

This is **Story 2 of Launch Readiness Epic: Infrastructure Runbooks Workstream**.
Priority: **High** - Critical database infrastructure.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- lnch-1014: Database Operations Runbook (general DB ops context)

## Related Stories

- lnch-1014: Database Operations Runbook (general database)
- lnch-1015: Database Troubleshooting Runbook (diagnostics)

## Acceptance Criteria

1. Runbook exists at `docs/operations/runbooks/aurora-operations.md`
2. Documents Aurora Serverless v2 scaling
3. Documents cluster management
4. Documents reader endpoint usage
5. Documents failover procedures
6. Documents backup and restore
7. Documents cost optimization

## Tasks / Subtasks

- [ ] **Task 1: Create Runbook Structure** (AC: 1)
  - [ ] Create `docs/operations/runbooks/aurora-operations.md`
  - [ ] Add standard sections

- [ ] **Task 2: Document Scaling** (AC: 2)
  - [ ] ACU min/max configuration
  - [ ] Scaling behavior
  - [ ] Monitoring scaling events
  - [ ] Adjusting capacity

- [ ] **Task 3: Document Cluster Management** (AC: 3)
  - [ ] Cluster identifier naming
  - [ ] Parameter groups
  - [ ] Engine version

- [ ] **Task 4: Document Reader Endpoint** (AC: 4)
  - [ ] Reader vs writer endpoint
  - [ ] When to use reader
  - [ ] Connection string format

- [ ] **Task 5: Document Failover** (AC: 5)
  - [ ] Automatic failover
  - [ ] Manual failover trigger
  - [ ] Failover time expectations

- [ ] **Task 6: Document Backup/Restore** (AC: 6)
  - [ ] Automatic backup retention
  - [ ] Manual snapshot creation
  - [ ] Point-in-time recovery
  - [ ] Cross-region considerations

- [ ] **Task 7: Document Cost Optimization** (AC: 7)
  - [ ] ACU pricing
  - [ ] Pause/resume (if applicable)
  - [ ] Right-sizing recommendations

## Dev Notes

### Templates (Required)

This story produces **two documents** that must be created together:

1. **Runbook**: `docs/operations/runbooks/aurora-operations.md`
   - Use template: `docs/operations/RUNBOOK-TEMPLATE.md`
   - Covers scaling, failover, backup/restore procedures

2. **Playbook**: `docs/operations/playbooks/aurora-incident.md`
   - Use template: `docs/operations/PLAYBOOK-TEMPLATE.md`
   - Covers cluster health issues, failover events, capacity alerts

The runbook handles normal operations; the playbook handles when things go wrong.

---

### Aurora Configuration (from serverless.yml)
- Engine: Aurora PostgreSQL 15.4
- Instance Class: `db.serverless`
- ACU Range:
  - Dev: 0.5-2 ACU
  - Staging: 0.5-4 ACU
  - Production: 0.5-4 ACU

### Cluster Identifiers
- `lego-api-dev`
- `lego-api-staging`
- `lego-api-production`

### Connection Strings
Stored in Secrets Manager:
- `lego-api-{stage}-db-credentials`

### Scaling Commands
```bash
# View current capacity
aws rds describe-db-clusters \
  --db-cluster-identifier lego-api-production \
  --query 'DBClusters[0].ServerlessV2ScalingConfiguration'

# Modify capacity
aws rds modify-db-cluster \
  --db-cluster-identifier lego-api-production \
  --serverless-v2-scaling-configuration MinCapacity=1,MaxCapacity=8 \
  --apply-immediately
```

### Backup Commands
```bash
# Create manual snapshot
aws rds create-db-cluster-snapshot \
  --db-cluster-identifier lego-api-production \
  --db-cluster-snapshot-identifier manual-backup-2025-01-01
```

## Testing

### Verification
- Commands work with actual clusters
- Scaling procedures are tested
- Recovery procedures are documented

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
