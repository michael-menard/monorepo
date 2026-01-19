# Story lnch-1013: Lambda Troubleshooting Runbook

## Status

Draft

## Story

**As an** operator,
**I want** a Lambda troubleshooting runbook,
**so that** I can diagnose and resolve Lambda issues quickly.

## Epic Context

This is **Story 5 of Launch Readiness Epic: App Runbooks Workstream**.
Priority: **High** - Required for operational support.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other runbooks)

## Related Stories

- lnch-1009: API Deployment Runbook (Lambda deployment)
- lnch-1024: On-Call Playbook (links to this runbook)
- lnch-1015: Database Troubleshooting (connection issues overlap)

## Acceptance Criteria

1. Runbook exists at `docs/operations/runbooks/lambda-troubleshooting.md`
2. Documents cold start diagnosis
3. Documents timeout issues
4. Documents memory issues (OOM)
5. Documents connection errors
6. Documents how to read CloudWatch logs
7. Documents common error patterns and solutions

## Tasks / Subtasks

- [ ] **Task 1: Create Runbook Structure** (AC: 1)
  - [ ] Create `docs/operations/runbooks/lambda-troubleshooting.md`
  - [ ] Add problem/solution format

- [ ] **Task 2: Document Cold Starts** (AC: 2)
  - [ ] How to identify cold starts in logs
  - [ ] Provisioned concurrency options
  - [ ] Warmup strategies

- [ ] **Task 3: Document Timeouts** (AC: 3)
  - [ ] How to identify timeout errors
  - [ ] Common causes (DB, external APIs)
  - [ ] How to increase timeout
  - [ ] How to optimize code

- [ ] **Task 4: Document Memory Issues** (AC: 4)
  - [ ] How to identify OOM errors
  - [ ] Memory usage monitoring
  - [ ] How to increase memory
  - [ ] Memory optimization tips

- [ ] **Task 5: Document Connection Errors** (AC: 5)
  - [ ] VPC/network issues
  - [ ] Database connection pooling
  - [ ] External API failures
  - [ ] DNS resolution issues

- [ ] **Task 6: Document Log Reading** (AC: 6)
  - [ ] CloudWatch Logs Insights queries
  - [ ] Log group locations
  - [ ] Structured log parsing
  - [ ] X-Ray trace correlation

- [ ] **Task 7: Document Common Patterns** (AC: 7)
  - [ ] Error code reference
  - [ ] Stack trace interpretation
  - [ ] Known issues and workarounds

## Dev Notes

### Templates (Required)

This story produces **two documents** that must be created together:

1. **Runbook**: `docs/operations/runbooks/lambda-troubleshooting.md`
   - Use template: `docs/operations/RUNBOOK-TEMPLATE.md`
   - Covers diagnostic procedures, log analysis, common fixes

2. **Playbook**: `docs/operations/playbooks/lambda-failures.md`
   - Use template: `docs/operations/PLAYBOOK-TEMPLATE.md`
   - Covers incident detection, severity assessment, response procedures

The runbook is the diagnostic guide; the playbook is the incident response flow.

---

### CloudWatch Log Groups
- Pattern: `/aws/lambda/lego-api-{stage}-{functionName}`

### Useful Log Insights Queries

**Find Errors**
```
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 50
```

**Find Cold Starts**
```
fields @timestamp, @message, @duration
| filter @type = "REPORT"
| filter @initDuration > 0
| sort @timestamp desc
```

**Find Timeouts**
```
fields @timestamp, @message
| filter @message like /Task timed out/
| sort @timestamp desc
```

### Lambda Limits (Current)
- Timeout: 30 seconds (API Gateway max)
- Memory: 1024 MB (configurable in serverless.yml)

## Testing

### Verification
- Queries work in CloudWatch Logs Insights
- Solutions are actionable
- Links to AWS docs are valid

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
