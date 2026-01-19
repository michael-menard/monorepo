# Story lnch-1008: README for s3-client Package

## Status

Draft

## Story

**As a** developer,
**I want** comprehensive documentation for the s3-client package,
**so that** I can use S3 operations correctly in Lambda handlers.

## Epic Context

This is **Story 9 of Launch Readiness Epic: Package Documentation Workstream**.
Priority: **Low** - Internal backend utility.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other README stories)

## Related Stories

- lnch-1003: README for upload-client Package (frontend counterpart)
- lnch-1004: README for upload-types Package (shared types)
- lnch-1001: README for logger Package (also backend)

## Acceptance Criteria

1. README.md exists at `packages/backend/s3-client/README.md`
2. Documents all exported functions
3. Shows presigned URL generation
4. Documents multipart upload helpers
5. Shows error handling patterns
6. Documents configuration options

## Tasks / Subtasks

- [ ] **Task 1: Audit Package Exports** (AC: 2)
  - [ ] Review `packages/backend/s3-client/src/index.ts`
  - [ ] List all exported functions
  - [ ] Document return types

- [ ] **Task 2: Create README Structure** (AC: 1)
  - [ ] Create `packages/backend/s3-client/README.md`
  - [ ] Add package overview
  - [ ] Add configuration section

- [ ] **Task 3: Document Presigned URLs** (AC: 3)
  - [ ] Upload presigned URLs
  - [ ] Download presigned URLs
  - [ ] TTL configuration

- [ ] **Task 4: Document Multipart** (AC: 4)
  - [ ] Create multipart upload
  - [ ] Upload part
  - [ ] Complete multipart
  - [ ] Abort multipart

- [ ] **Task 5: Document Error Handling** (AC: 5)
  - [ ] S3 error types
  - [ ] Retry behavior
  - [ ] Common failure modes

- [ ] **Task 6: Document Configuration** (AC: 6)
  - [ ] Environment variables
  - [ ] Bucket configuration
  - [ ] Region settings

## Dev Notes

### Package Location
- `packages/backend/s3-client/`

### Environment Variables
- `S3_BUCKET` - Target bucket name
- `AWS_REGION` - AWS region

### Common Operations
```typescript
import { getPresignedUploadUrl, getPresignedDownloadUrl } from '@repo/s3-client'

const uploadUrl = await getPresignedUploadUrl(key, contentType)
const downloadUrl = await getPresignedDownloadUrl(key)
```

## Testing

### Verification
- README renders correctly in GitHub
- Code examples are syntactically correct

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
