# Story 3.1.59: Upload Session Handler Test Coverage

## Status

Draft

## Story

**As a** developer maintaining the multipart upload system,
**I want** comprehensive test coverage for error scenarios and edge cases,
**so that** I can confidently deploy changes without risking silent failures in production.

## Background

PR #334 review (Story 3.1.27 deployment) identified significant test coverage gaps in the upload session handlers. While the handlers have good top-level error handling, many failure scenarios are untested, and some error handling patterns could silently mask issues.

**Source:** PR Review by code-reviewer, pr-test-analyzer, and silent-failure-hunter agents (2025-12-26)

## Acceptance Criteria

1. **Finalize Handler Tests**
   - [ ] Success path test (201 with MOC data)
   - [ ] Session not found returns 404
   - [ ] Idempotent return (200) when already finalized
   - [ ] Session lock acquisition behavior tested
   - [ ] Missing instruction file detection tested

2. **S3 Error Handling Tests**
   - [ ] CreateMultipartUpload failure in register-file
   - [ ] CreateMultipartUpload returns undefined UploadId
   - [ ] UploadPart failure in upload-part
   - [ ] UploadPart returns undefined ETag
   - [ ] CompleteMultipartUpload failure in complete-file
   - [ ] HeadObject/GetObject failure in finalize (NoSuchKey, AccessDenied)

3. **Database Error Handling Tests**
   - [ ] Unique constraint violation (23505) in finalize
   - [ ] Foreign key violation (23503)
   - [ ] Connection timeout handling

4. **Authorization Tests**
   - [ ] Cross-user session access returns 404 (not 403 to avoid enumeration)
   - [ ] Cross-user file registration blocked
   - [ ] Cross-user part upload blocked

5. **Validation Tests**
   - [ ] Complete-file: part count mismatch
   - [ ] Complete-file: file already completed
   - [ ] Register-file: file exceeds size limit (413)
   - [ ] Register-file: invalid MIME type (415)
   - [ ] Upload-part: session expired
   - [ ] Upload-part: session not active

6. **Error Handling Improvements**
   - [ ] Log warnings in `categoryToFileType()` for unknown categories
   - [ ] Make `verifyFilesInS3` catch block specific (NoSuchKey, AccessDenied, etc.)
   - [ ] Handle lock-clearing failures without masking original error
   - [ ] Improve `isPostgresUniqueViolation` to handle other constraint types

## Tasks / Subtasks

- [ ] **Task 1: Finalize Handler Success Path Tests**
  - [ ] Refactor database mocking to support chained query patterns
  - [ ] Add success case returning 201 with MOC data
  - [ ] Add idempotency test (200 on duplicate finalize)
  - [ ] Add session validation tests (404, expired, locked)

- [ ] **Task 2: S3 Error Scenario Tests**
  - [ ] Add S3 mock that can be configured to fail
  - [ ] Test register-file with CreateMultipartUpload failure
  - [ ] Test upload-part with UploadPart failure
  - [ ] Test complete-file with CompleteMultipartUpload failure
  - [ ] Test finalize with HeadObject/GetObject failures

- [ ] **Task 3: Database Error Tests**
  - [ ] Add test for Postgres unique violation (23505)
  - [ ] Add test for connection timeout
  - [ ] Verify error messages don't leak internal details

- [ ] **Task 4: Authorization Cross-User Tests**
  - [ ] Create fixtures for multi-user scenarios
  - [ ] Test session access with wrong user
  - [ ] Test file operations with wrong user

- [ ] **Task 5: Validation Edge Case Tests**
  - [ ] Test part count mismatch in complete-file
  - [ ] Test file already completed
  - [ ] Test size limit enforcement (413)
  - [ ] Test MIME type validation (415)
  - [ ] Test session expiration handling

- [ ] **Task 6: Error Handling Code Improvements**
  - [ ] Add logging to `categoryToFileType()` fallback
  - [ ] Refactor `verifyFilesInS3` catch block for specificity
  - [ ] Improve lock-clearing error handling
  - [ ] Extend constraint violation detection

## Dev Notes

### Files to Modify

**Test Files:**
- `apps/api/endpoints/moc-uploads/sessions/create/__tests__/handler.test.ts`
- `apps/api/endpoints/moc-uploads/sessions/register-file/__tests__/handler.test.ts`
- `apps/api/endpoints/moc-uploads/sessions/upload-part/__tests__/handler.test.ts`
- `apps/api/endpoints/moc-uploads/sessions/complete-file/__tests__/handler.test.ts`
- `apps/api/endpoints/moc-uploads/sessions/finalize/__tests__/handler.test.ts`

**Handler Files (for error handling improvements):**
- `apps/api/endpoints/moc-uploads/sessions/create/handler.ts`
- `apps/api/endpoints/moc-uploads/sessions/finalize/handler.ts`

### Current Test Coverage

| Handler | Auth | Validation | Session | Success | S3 Errors | DB Errors |
|---------|------|------------|---------|---------|-----------|-----------|
| create-session | Pass | Partial | N/A | Pass | N/A | Missing |
| register-file | Pass | Partial | Partial | Pass | Missing | Missing |
| upload-part | Pass | Partial | Partial | Pass | Missing | Missing |
| complete-file | Pass | Partial | Partial | Pass | Missing | Missing |
| finalize | Pass | Partial | **Missing** | **Missing** | Missing | Missing |

### Priority Ranking (from PR Review)

1. Finalize handler success path & session validation (Rating: 10/10)
2. S3 error handling across all handlers (Rating: 9/10)
3. Database error handling (Rating: 8/10)
4. Complete-file part mismatch (Rating: 8/10)
5. Cross-user authorization (Rating: 7/10)
6. File validation (size/MIME) (Rating: 6/10)
7. Session status validation (Rating: 6/10)

### Mock Refactoring Notes

The current database mock pattern is brittle:
```typescript
mockDbSelect.mockReturnValue({
  from: vi.fn(() => ({
    where: vi.fn(() => ({
      limit: vi.fn(() => Promise.resolve([mockSession])),
    })),
  })),
})
```

Consider creating a more robust mock builder or using a test database for complex scenarios.

## Testing

- [ ] All new tests pass
- [ ] Existing 60 handler tests still pass
- [ ] No regressions in coverage percentage
- [ ] Error messages verified for user-friendliness

## Change Log

| Date       | Version | Description                          | Author |
| ---------- | ------- | ------------------------------------ | ------ |
| 2025-12-26 | 0.1     | Created from PR #334 review findings | Agent  |
