# Story lnch-1023: S3 Lifecycle Management Runbook

## Status

Draft

## Story

**As an** operator,
**I want** an S3 lifecycle management runbook,
**so that** I can manage file storage effectively.

## Epic Context

This is **Story 5 of Launch Readiness Epic: Infrastructure Runbooks Workstream**.
Priority: **Low** - Storage management procedures.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other runbooks)

## Related Stories

- lnch-1008: README for s3-client Package (S3 client code)
- lnch-1036: Data Retention Documentation (retention policies)

## Acceptance Criteria

1. Runbook exists at `docs/operations/runbooks/s3-lifecycle.md`
2. Documents bucket structure
3. Documents lifecycle rules
4. Documents orphaned file cleanup
5. Documents storage cost monitoring
6. Documents manual cleanup procedures
7. Documents multipart upload cleanup

## Tasks / Subtasks

- [ ] **Task 1: Create Runbook Structure** (AC: 1)
  - [ ] Create `docs/operations/runbooks/s3-lifecycle.md`
  - [ ] Add standard sections

- [ ] **Task 2: Document Bucket Structure** (AC: 2)
  - [ ] Bucket naming convention
  - [ ] Key prefix structure
  - [ ] Access patterns

- [ ] **Task 3: Document Lifecycle Rules** (AC: 3)
  - [ ] Current lifecycle policies
  - [ ] Expiration rules
  - [ ] Transition rules (if any)

- [ ] **Task 4: Document Orphan Cleanup** (AC: 4)
  - [ ] How orphans occur
  - [ ] Scheduled cleanup job
  - [ ] Manual cleanup procedure

- [ ] **Task 5: Document Cost Monitoring** (AC: 5)
  - [ ] Storage metrics location
  - [ ] Cost allocation tags
  - [ ] Budget alerts

- [ ] **Task 6: Document Manual Cleanup** (AC: 6)
  - [ ] Safe deletion procedures
  - [ ] Bulk deletion
  - [ ] Recovery options (versioning)

- [ ] **Task 7: Document Multipart Cleanup** (AC: 7)
  - [ ] Incomplete multipart uploads
  - [ ] Lifecycle rule for cleanup
  - [ ] Manual abort procedure

## Dev Notes

### Templates (Required)

This story produces **two documents** that must be created together:

1. **Runbook**: `docs/operations/runbooks/s3-lifecycle.md`
   - Use template: `docs/operations/RUNBOOK-TEMPLATE.md`
   - Covers lifecycle rules, cleanup, cost monitoring

2. **Playbook**: `docs/operations/playbooks/storage-incident.md`
   - Use template: `docs/operations/PLAYBOOK-TEMPLATE.md`
   - Covers storage capacity alerts, orphaned files, cost spikes

The runbook handles normal operations; the playbook handles when things go wrong.

---

### S3 Buckets
- `lego-api-files-{stage}` - User uploaded files

### Key Structure
```
/users/{userId}/
├── mocs/{mocId}/
│   ├── instructions/
│   ├── images/
│   └── thumbnails/
├── inspiration/
└── wishlist/
```

### Lifecycle Rules (from serverless.yml)
- Incomplete multipart uploads: Expire after 7 days
- (Add other rules as configured)

### Orphan Cleanup Job
- Lambda: `dailyCleanup`
- Schedule: Daily at 3am UTC
- Finds files not referenced in database

### Manual Cleanup Commands

**List Objects**
```bash
aws s3 ls s3://lego-api-files-production/users/123/ --recursive
```

**Delete Object**
```bash
aws s3 rm s3://lego-api-files-production/path/to/file.pdf
```

**Bulk Delete**
```bash
aws s3 rm s3://lego-api-files-production/users/123/ --recursive
```

**Abort Incomplete Multipart**
```bash
# List incomplete uploads
aws s3api list-multipart-uploads --bucket lego-api-files-production

# Abort specific upload
aws s3api abort-multipart-upload \
  --bucket lego-api-files-production \
  --key path/to/file \
  --upload-id abc123
```

### Storage Metrics
- CloudWatch: S3 bucket metrics
- Cost Explorer: Storage costs by bucket

## Testing

### Verification
- Commands work with actual buckets
- Cleanup is safe (no accidental deletion)
- Cost monitoring is accurate

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
