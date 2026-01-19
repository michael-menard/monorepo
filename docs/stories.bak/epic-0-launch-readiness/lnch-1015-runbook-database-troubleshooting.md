# Story lnch-1015: Database Troubleshooting Runbook

## Status

Draft

## Story

**As an** operator,
**I want** a database troubleshooting runbook,
**so that** I can diagnose and resolve database issues quickly.

## Epic Context

This is **Story 7 of Launch Readiness Epic: App Runbooks Workstream**.
Priority: **High** - Required for incident response.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- lnch-1014: Database Operations Runbook (context for normal operations)

## Related Stories

- lnch-1014: Database Operations Runbook (normal operations)
- lnch-1020: Aurora Operations Runbook (Aurora-specific)
- lnch-1024: On-Call Playbook (links to this runbook)

## Acceptance Criteria

1. Runbook exists at `docs/operations/runbooks/database-troubleshooting.md`
2. Documents connection issues diagnosis
3. Documents slow query investigation
4. Documents high CPU/memory issues
5. Documents replication lag (if applicable)
6. Documents deadlock resolution
7. Documents common error patterns

## Tasks / Subtasks

- [ ] **Task 1: Create Runbook Structure** (AC: 1)
  - [ ] Create `docs/operations/runbooks/database-troubleshooting.md`
  - [ ] Add problem/solution format

- [ ] **Task 2: Document Connection Issues** (AC: 2)
  - [ ] "Too many connections" error
  - [ ] Connection timeout
  - [ ] Authentication failures
  - [ ] VPC/security group issues

- [ ] **Task 3: Document Slow Queries** (AC: 3)
  - [ ] Enable Performance Insights
  - [ ] Identify slow queries
  - [ ] Analyze query plans
  - [ ] Index recommendations

- [ ] **Task 4: Document Resource Issues** (AC: 4)
  - [ ] High CPU diagnosis
  - [ ] High memory diagnosis
  - [ ] ACU scaling behavior
  - [ ] When to scale up

- [ ] **Task 5: Document Replication** (AC: 5)
  - [ ] Reader lag monitoring
  - [ ] Failover procedures
  - [ ] Writer promotion

- [ ] **Task 6: Document Deadlocks** (AC: 6)
  - [ ] Identify deadlocks in logs
  - [ ] Kill blocking queries
  - [ ] Prevention strategies

- [ ] **Task 7: Document Error Patterns** (AC: 7)
  - [ ] Common PostgreSQL errors
  - [ ] Aurora-specific errors
  - [ ] Resolution steps

## Dev Notes

### Templates (Required)

This story produces **two documents** that must be created together:

1. **Runbook**: `docs/operations/runbooks/database-troubleshooting.md`
   - Use template: `docs/operations/RUNBOOK-TEMPLATE.md`
   - Covers diagnostic queries, performance analysis, fixes

2. **Playbook**: `docs/operations/playbooks/database-incident.md`
   - Use template: `docs/operations/PLAYBOOK-TEMPLATE.md`
   - Covers connection failures, deadlocks, high CPU incidents

The runbook is the diagnostic guide; the playbook is the incident response flow.

---

### Performance Insights
- Available in staging/production
- Shows top SQL queries
- Shows wait events

### Useful Queries

**Check Active Connections**
```sql
SELECT count(*) FROM pg_stat_activity;
```

**Find Slow Queries**
```sql
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

**Find Blocking Queries**
```sql
SELECT blocked_locks.pid AS blocked_pid,
       blocking_locks.pid AS blocking_pid,
       blocked_activity.query AS blocked_query,
       blocking_activity.query AS blocking_query
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

**Kill a Query**
```sql
SELECT pg_terminate_backend(pid);
```

### CloudWatch Alarms
- `aurora-high-cpu` - CPU > 80%
- `aurora-high-connections` - Connections > 50

## Testing

### Verification
- Queries work in PostgreSQL
- Solutions are actionable
- Links to AWS docs are valid

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
