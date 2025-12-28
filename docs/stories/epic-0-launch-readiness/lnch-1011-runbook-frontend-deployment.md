# Story lnch-1011: Frontend Deployment Runbook

## Status

Draft

## Story

**As an** operator,
**I want** a step-by-step frontend deployment runbook,
**so that** I can deploy frontend changes safely.

## Epic Context

This is **Story 3 of Launch Readiness Epic: App Runbooks Workstream**.
Priority: **Critical** - Required for production operations.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with API runbooks)

## Related Stories

- lnch-1012: Frontend Rollback Runbook (companion rollback procedures)
- lnch-1018: Module Federation Runbook (MFE-specific procedures)

## Acceptance Criteria

1. Runbook exists at `docs/operations/runbooks/frontend-deployment.md`
2. Documents build process
3. Documents S3 sync procedure
4. Documents CloudFront invalidation
5. Includes smoke test verification
6. Documents Module Federation considerations
7. Documents cache-busting strategy

## Tasks / Subtasks

- [ ] **Task 1: Create Runbook Structure** (AC: 1)
  - [ ] Create `docs/operations/runbooks/frontend-deployment.md`
  - [ ] Add standard runbook template sections

- [ ] **Task 2: Document Build Process** (AC: 2)
  - [ ] Build commands for each app
  - [ ] Build artifact locations
  - [ ] Environment variable requirements

- [ ] **Task 3: Document S3 Sync** (AC: 3)
  - [ ] S3 bucket locations
  - [ ] Sync commands
  - [ ] File permissions

- [ ] **Task 4: Document CloudFront** (AC: 4)
  - [ ] Distribution IDs
  - [ ] Invalidation commands
  - [ ] Wait for propagation

- [ ] **Task 5: Document Smoke Tests** (AC: 5)
  - [ ] Load main app
  - [ ] Test navigation
  - [ ] Test micro-frontend loading

- [ ] **Task 6: Document Module Federation** (AC: 6)
  - [ ] Remote entry files
  - [ ] Version coordination
  - [ ] Dependency on shell app

- [ ] **Task 7: Document Cache Strategy** (AC: 7)
  - [ ] Hashed asset filenames
  - [ ] index.html caching (none)
  - [ ] Remote entry caching

## Dev Notes

### Templates (Required)

This story produces **two documents** that must be created together:

1. **Runbook**: `docs/operations/runbooks/frontend-deployment.md`
   - Use template: `docs/operations/RUNBOOK-TEMPLATE.md`
   - Covers step-by-step procedures, S3 sync, CloudFront invalidation

2. **Playbook**: `docs/operations/playbooks/frontend-deployment-failure.md`
   - Use template: `docs/operations/PLAYBOOK-TEMPLATE.md`
   - Covers deployment failure scenarios, rollback triggers

The runbook handles normal operations; the playbook handles when things go wrong.

---

### Build Commands
```bash
# Build all apps
pnpm build

# Build specific app
pnpm --filter main-app build
```

### S3 Sync
```bash
# Sync to S3
aws s3 sync dist/ s3://bucket-name/ --delete

# With cache headers
aws s3 sync dist/ s3://bucket-name/ \
  --cache-control "max-age=31536000" \
  --exclude "index.html" \
  --exclude "remoteEntry.js"

aws s3 cp dist/index.html s3://bucket-name/index.html \
  --cache-control "no-cache"
```

### CloudFront Invalidation
```bash
aws cloudfront create-invalidation \
  --distribution-id E1234567890 \
  --paths "/*"
```

### GitHub Workflow
- `.github/workflows/deploy-frontend.yml`

## Testing

### Verification
- Runbook can be followed step-by-step
- All commands are correct
- Smoke tests are comprehensive

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
