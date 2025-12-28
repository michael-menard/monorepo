# Story lnch-1009: API Deployment Runbook

## Status

Draft

## Story

**As an** operator,
**I want** a step-by-step API deployment runbook,
**so that** I can deploy API changes safely and consistently.

## Epic Context

This is **Story 1 of Launch Readiness Epic: App Runbooks Workstream**.
Priority: **Critical** - Required for production operations.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (first story in runbooks workstream)

## Related Stories

- lnch-1010: API Rollback Runbook (companion rollback procedures)
- lnch-1024: On-Call Playbook (links to this runbook)

## Acceptance Criteria

1. Runbook exists at `docs/operations/runbooks/api-deployment.md`
2. Documents pre-deployment checklist
3. Documents deployment commands for each environment
4. Includes smoke test verification steps
5. Documents how to monitor deployment progress
6. Includes rollback trigger criteria
7. Documents post-deployment verification

## Tasks / Subtasks

- [ ] **Task 1: Create Runbook Structure** (AC: 1)
  - [ ] Create `docs/operations/runbooks/` directory if needed
  - [ ] Create `api-deployment.md`
  - [ ] Add standard runbook template sections

- [ ] **Task 2: Document Pre-Deployment** (AC: 2)
  - [ ] Check CI/CD pipeline status
  - [ ] Review changes in deployment
  - [ ] Verify no active incidents
  - [ ] Notify stakeholders

- [ ] **Task 3: Document Deployment Steps** (AC: 3)
  - [ ] Dev environment: `npx serverless deploy --stage dev`
  - [ ] Staging environment: via GitHub Actions
  - [ ] Production environment: via GitHub Actions with approval

- [ ] **Task 4: Document Smoke Tests** (AC: 4)
  - [ ] Health endpoint check
  - [ ] Authentication flow test
  - [ ] Critical API endpoint tests

- [ ] **Task 5: Document Monitoring** (AC: 5)
  - [ ] CloudWatch dashboard location
  - [ ] Key metrics to watch
  - [ ] Expected behavior vs anomalies

- [ ] **Task 6: Document Rollback Triggers** (AC: 6)
  - [ ] Error rate thresholds
  - [ ] Latency thresholds
  - [ ] Failed smoke tests
  - [ ] Customer-reported issues

- [ ] **Task 7: Document Post-Deployment** (AC: 7)
  - [ ] Verify all functions deployed
  - [ ] Check CloudWatch for errors
  - [ ] Update deployment log

## Dev Notes

### Templates (Required)

This story produces **two documents** that must be created together:

1. **Runbook**: `docs/operations/runbooks/api-deployment.md`
   - Use template: `docs/operations/RUNBOOK-TEMPLATE.md`
   - Covers step-by-step procedures, prerequisites, verification

2. **Playbook**: `docs/operations/playbooks/api-deployment-failure.md`
   - Use template: `docs/operations/PLAYBOOK-TEMPLATE.md`
   - Covers incident scenarios, detection, response decision trees

The runbook handles normal operations; the playbook handles when things go wrong.

---

### Deployment Methods

**GitHub Actions (Recommended)**
- Push to main triggers dev deployment
- Manual dispatch for staging/production

**Manual (Emergency)**
```bash
cd apps/api
npx serverless deploy --stage dev
npx serverless deploy --stage staging
npx serverless deploy --stage production
```

### Serverless.yml Location
- `apps/api/serverless.yml`

### GitHub Workflows
- `.github/workflows/deploy-lego-api.yml`
- `.github/workflows/deploy-api-lambdas.yml`

## Testing

### Verification
- Runbook can be followed by someone unfamiliar with the system
- All commands are correct and tested
- Links to dashboards are valid

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
