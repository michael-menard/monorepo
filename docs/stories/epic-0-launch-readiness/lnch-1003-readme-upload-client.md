# Story lnch-1003: README for upload-client Package

## Status

Draft

## Story

**As a** developer,
**I want** comprehensive documentation for the upload-client package,
**so that** I can implement file uploads correctly in frontend applications.

## Epic Context

This is **Story 4 of Launch Readiness Epic: Package Documentation Workstream**.
Priority: **High** - Critical for understanding upload flows.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other README stories)

## Related Stories

- lnch-1004: README for upload-types Package (shared types)
- lnch-1008: README for s3-client Package (backend counterpart)

## Acceptance Criteria

1. README.md exists at `packages/core/upload-client/README.md`
2. Documents the upload client API
3. Shows multipart upload flow
4. Documents progress tracking
5. Shows error handling patterns
6. Documents retry logic
7. Includes architecture diagram or flow description

## Tasks / Subtasks

- [ ] **Task 1: Audit Package Exports** (AC: 2)
  - [ ] Review `packages/core/upload-client/src/index.ts`
  - [ ] List all exported functions and classes
  - [ ] Document configuration options

- [ ] **Task 2: Create README Structure** (AC: 1)
  - [ ] Create `packages/core/upload-client/README.md`
  - [ ] Add package overview
  - [ ] Add installation section

- [ ] **Task 3: Document Upload Flow** (AC: 3, 7)
  - [ ] Session creation
  - [ ] File registration
  - [ ] Part upload (multipart)
  - [ ] File completion
  - [ ] Session finalization

- [ ] **Task 4: Document Progress Tracking** (AC: 4)
  - [ ] Progress callback API
  - [ ] Per-file progress
  - [ ] Overall progress calculation

- [ ] **Task 5: Document Error Handling** (AC: 5)
  - [ ] Error types
  - [ ] Recovery strategies
  - [ ] User-facing error messages

- [ ] **Task 6: Document Retry Logic** (AC: 6)
  - [ ] Automatic retry configuration
  - [ ] Exponential backoff
  - [ ] Max retries

## Dev Notes

### Package Location
- `packages/core/upload-client/`

### Related Packages
- `@repo/upload-types` - Zod schemas for upload data

### Upload Flow Overview
1. Create session → Get session ID
2. Register files → Get presigned URLs
3. Upload parts → Track progress
4. Complete files → Trigger S3 multipart complete
5. Finalize session → Commit to database

## Testing

### Verification
- README renders correctly in GitHub
- Flow description matches actual implementation
- Code examples are syntactically correct

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
