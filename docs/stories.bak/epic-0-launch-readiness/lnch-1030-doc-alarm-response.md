# Story lnch-1030: Alarm Response Runbooks

## Status

Draft

## Story

**As an** on-call engineer,
**I want** alarm-specific response runbooks,
**so that** I can quickly respond to each type of alert.

## Epic Context

This is **Story 2 of Launch Readiness Epic: Monitoring Documentation Workstream**.
Priority: **High** - Required for incident response.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- lnch-1029: CloudWatch Dashboard Guide (dashboard context)

## Related Stories

- lnch-1029: CloudWatch Dashboard Guide (overview)
- lnch-1024: On-Call Playbook (links to these runbooks)
- lnch-1031: Metrics Reference Guide (metric details)

## Acceptance Criteria

1. Runbooks exist at `docs/operations/monitoring/alarms/`
2. One runbook per configured alarm
3. Each runbook includes symptoms and diagnosis
4. Each runbook includes resolution steps
5. Each runbook includes escalation criteria
6. Runbooks are linked from alarm descriptions
7. Runbooks cover all 10 configured alarms

## Tasks / Subtasks

- [ ] **Task 1: Create Runbook Directory** (AC: 1)
  - [ ] Create `docs/operations/monitoring/alarms/`
  - [ ] Create index file

- [ ] **Task 2: Create Lambda Errors Runbook** (AC: 2, 3, 4, 5)
  - [ ] `lambda-errors.md`
  - [ ] Symptoms, diagnosis, resolution, escalation

- [ ] **Task 3: Create API 5xx Runbook** (AC: 2, 3, 4, 5)
  - [ ] `api-5xx-errors.md`
  - [ ] Symptoms, diagnosis, resolution, escalation

- [ ] **Task 4: Create Latency Runbook** (AC: 2, 3, 4, 5)
  - [ ] `api-high-latency.md`
  - [ ] Symptoms, diagnosis, resolution, escalation

- [ ] **Task 5: Create Database Runbooks** (AC: 2, 3, 4, 5)
  - [ ] `aurora-high-cpu.md`
  - [ ] `aurora-high-connections.md`

- [ ] **Task 6: Create OpenSearch Runbooks** (AC: 2, 3, 4, 5)
  - [ ] `opensearch-cluster-red.md`
  - [ ] `opensearch-jvm-pressure.md`

- [ ] **Task 7: Create Remaining Runbooks** (AC: 2, 3, 4, 5, 6, 7)
  - [ ] `dynamodb-throttle.md`
  - [ ] `lambda-slow.md`
  - [ ] `health-check-failing.md`
  - [ ] Create index linking all runbooks

## Dev Notes

### Configured Alarms (from serverless.yml)
1. `lambda-errors` - Lambda Errors > 5 in 5min
2. `api-5xx-errors` - API Gateway 5xx > 10 in 5min
3. `api-high-latency` - API Gateway p95 > 5000ms
4. `aurora-high-cpu` - RDS CPU > 80%
5. `aurora-high-connections` - RDS Connections > 50
6. `opensearch-cluster-red` - ES ClusterStatus.red >= 1
7. `opensearch-jvm-pressure` - ES JVMMemoryPressure > 80%
8. `dynamodb-throttle` - DynamoDB ThrottledRequests >= 1
9. `lambda-slow` - Lambda Duration p95 > 25000ms
10. `health-check-failing` - Lambda Errors (health) >= 1

### Runbook Template
```markdown
# Alarm: [Alarm Name]

## Overview
- **Metric:** [Metric name]
- **Threshold:** [Threshold value]
- **Severity:** SEV[X]

## Symptoms
- [What users experience]
- [What operators observe]

## Quick Diagnosis
1. Check [X]
2. Look at [Y]
3. Verify [Z]

## Common Causes
- Cause 1: [description] → [fix]
- Cause 2: [description] → [fix]

## Resolution Steps
1. Step 1
2. Step 2
3. Step 3

## Escalation
Escalate if:
- [Condition 1]
- [Condition 2]

## Related
- [Link to related runbook]
- [Link to dashboard]
```

### Note
Alarms exist but no SNS topics are configured for notifications. Story should include recommendation to configure SNS.

## Testing

### Verification
- All 10 alarms have runbooks
- Runbooks are complete and actionable
- Links between alarms and runbooks work

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
