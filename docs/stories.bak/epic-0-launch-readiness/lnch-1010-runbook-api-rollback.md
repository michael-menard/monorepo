# Story lnch-1010: API Rollback Runbook

## Status

Draft

## Story

**As an** operator,
**I want** a step-by-step API rollback runbook,
**so that** I can quickly revert a failed deployment.

## Epic Context

This is **Story 2 of Launch Readiness Epic: App Runbooks Workstream**.
Priority: **Critical** - Required for incident response.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- lnch-1009: API Deployment Runbook (rollback requires understanding deployment)

## Related Stories

- lnch-1009: API Deployment Runbook (deployment procedures)
- lnch-1024: On-Call Playbook (links to this runbook)
- lnch-1014: Database Operations Runbook (DB rollback procedures)

## Acceptance Criteria

1. Runbook exists at `docs/operations/runbooks/api-rollback.md`
2. Documents when to trigger rollback
3. Documents Lambda rollback procedure
4. Documents database migration rollback (if applicable)
5. Includes verification steps post-rollback
6. Documents communication templates
7. Documents incident logging requirements

## Tasks / Subtasks

- [ ] **Task 1: Create Runbook Structure** (AC: 1)
  - [ ] Create `docs/operations/runbooks/api-rollback.md`
  - [ ] Add standard runbook template sections

- [ ] **Task 2: Document Rollback Triggers** (AC: 2)
  - [ ] Error rate exceeds X%
  - [ ] Latency exceeds Xms
  - [ ] Failed smoke tests
  - [ ] Customer-impacting bugs
  - [ ] Security vulnerabilities

- [ ] **Task 3: Document Lambda Rollback** (AC: 3)
  - [ ] Identify previous version
  - [ ] Rollback command: `serverless rollback --timestamp <timestamp>`
  - [ ] Alternative: redeploy previous git commit

- [ ] **Task 4: Document Database Rollback** (AC: 4)
  - [ ] Check if migration was included
  - [ ] Drizzle rollback procedure
  - [ ] Point-in-time recovery (nuclear option)

- [ ] **Task 5: Document Verification** (AC: 5)
  - [ ] Smoke test endpoints
  - [ ] Verify error rates normalized
  - [ ] Check customer reports

- [ ] **Task 6: Document Communications** (AC: 6)
  - [ ] Status page update template
  - [ ] Slack notification template
  - [ ] Stakeholder email template

- [ ] **Task 7: Document Incident Logging** (AC: 7)
  - [ ] Create incident ticket
  - [ ] Log timeline
  - [ ] Schedule post-mortem

## Dev Notes

### Templates (Required)

This story produces **two documents** that must be created together:

1. **Runbook**: `docs/operations/runbooks/api-rollback.md`
   - Use template: `docs/operations/RUNBOOK-TEMPLATE.md`
   - Covers step-by-step rollback procedures, verification

2. **Playbook**: `docs/operations/playbooks/api-rollback-needed.md`
   - Use template: `docs/operations/PLAYBOOK-TEMPLATE.md`
   - Covers when to trigger rollback, decision trees, escalation

The runbook handles the "how"; the playbook handles the "when" and "why".

---

### Lambda Rollback Options

**Option 1: Serverless Rollback**
```bash
# List available versions
serverless deploy list --stage production

# Rollback to specific timestamp
serverless rollback --stage production --timestamp 1703692800
```

**Option 2: Redeploy Previous Commit**
```bash
git checkout <previous-commit>
serverless deploy --stage production
```

**Option 3: AWS Console**
- Navigate to Lambda function
- Click "Versions" tab
- Select previous version
- Update alias to point to it

### Database Considerations
- Schema-only changes: Generally safe
- Data migrations: May require manual intervention
- Aurora point-in-time recovery: Last resort (data loss possible)

## Testing

### Verification
- Runbook can be executed under pressure
- Rollback commands are tested and working
- Communication templates are ready to use

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
