# Story lnch-1012: Frontend Rollback Runbook

## Status

Draft

## Story

**As an** operator,
**I want** a step-by-step frontend rollback runbook,
**so that** I can quickly revert a failed frontend deployment.

## Epic Context

This is **Story 4 of Launch Readiness Epic: App Runbooks Workstream**.
Priority: **Critical** - Required for incident response.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- lnch-1011: Frontend Deployment Runbook (rollback requires understanding deployment)

## Related Stories

- lnch-1011: Frontend Deployment Runbook (deployment procedures)
- lnch-1018: Module Federation Runbook (MFE rollback coordination)

## Acceptance Criteria

1. Runbook exists at `docs/operations/runbooks/frontend-rollback.md`
2. Documents when to trigger rollback
3. Documents S3 version restore
4. Documents CloudFront invalidation
5. Documents verification steps
6. Documents communication templates
7. Documents Module Federation rollback coordination

## Tasks / Subtasks

- [ ] **Task 1: Create Runbook Structure** (AC: 1)
  - [ ] Create `docs/operations/runbooks/frontend-rollback.md`
  - [ ] Add standard runbook template sections

- [ ] **Task 2: Document Rollback Triggers** (AC: 2)
  - [ ] Blank page / app won't load
  - [ ] JavaScript errors in console
  - [ ] Module Federation failures
  - [ ] Critical UI bugs
  - [ ] Performance degradation

- [ ] **Task 3: Document S3 Restore** (AC: 3)
  - [ ] Enable S3 versioning (if not already)
  - [ ] List previous versions
  - [ ] Restore specific version
  - [ ] Alternative: rebuild and redeploy previous commit

- [ ] **Task 4: Document CloudFront Steps** (AC: 4)
  - [ ] Invalidate all paths
  - [ ] Wait for propagation
  - [ ] Verify cache cleared

- [ ] **Task 5: Document Verification** (AC: 5)
  - [ ] Test in incognito (no cache)
  - [ ] Test all micro-frontends load
  - [ ] Test critical user journeys

- [ ] **Task 6: Document Communications** (AC: 6)
  - [ ] Status page update
  - [ ] Slack notification
  - [ ] Stakeholder notification

- [ ] **Task 7: Document MFE Coordination** (AC: 7)
  - [ ] Shell app rollback
  - [ ] Remote app rollback
  - [ ] Version compatibility checks

## Dev Notes

### Templates (Required)

This story produces **two documents** that must be created together:

1. **Runbook**: `docs/operations/runbooks/frontend-rollback.md`
   - Use template: `docs/operations/RUNBOOK-TEMPLATE.md`
   - Covers S3 version restore, CloudFront invalidation procedures

2. **Playbook**: `docs/operations/playbooks/frontend-rollback-needed.md`
   - Use template: `docs/operations/PLAYBOOK-TEMPLATE.md`
   - Covers when to trigger rollback, MFE coordination decisions

The runbook handles the "how"; the playbook handles the "when" and "why".

---

### S3 Rollback Options

**Option 1: Redeploy Previous Commit**
```bash
git checkout <previous-commit>
pnpm build
aws s3 sync dist/ s3://bucket-name/ --delete
aws cloudfront create-invalidation --distribution-id E123 --paths "/*"
```

**Option 2: S3 Version Restore** (if versioning enabled)
```bash
# List versions
aws s3api list-object-versions --bucket bucket-name --prefix index.html

# Restore previous version
aws s3api copy-object \
  --bucket bucket-name \
  --copy-source bucket-name/index.html?versionId=abc123 \
  --key index.html
```

### Module Federation Considerations
- Shell app and remotes must be compatible
- May need to rollback multiple apps together
- Check `remoteEntry.js` versions match

## Testing

### Verification
- Runbook can be executed under pressure
- Commands are tested and working
- Communication templates are ready

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
