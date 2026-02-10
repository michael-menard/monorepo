# INST-1105 Backend Unit Tests Log

**Date**: 2025-02-09
**Story**: INST-1105 - Presigned Upload for Large PDFs

## Test File Created

**Location**: `apps/api/lego-api/domains/mocs/application/__tests__/upload-session-services.test.ts`

## Test Summary

| Category | Tests | Status |
|----------|-------|--------|
| createUploadSession - Happy Path | 4 | PASS |
| createUploadSession - File Validation | 5 | PASS |
| createUploadSession - MOC Authorization | 2 | PASS |
| createUploadSession - Rate Limiting | 2 | PASS |
| createUploadSession - Error Handling | 5 | PASS |
| createUploadSession - Edge Cases | 4 | PASS |
| completeUploadSession - Happy Path | 6 | PASS |
| completeUploadSession - Session Validation | 5 | PASS |
| completeUploadSession - S3 Verification | 6 | PASS |
| completeUploadSession - Error Handling | 3 | PASS |
| completeUploadSession - Edge Cases | 3 | PASS |
| End-to-end Flow | 1 | PASS |
| **TOTAL** | **47** | **ALL PASS** |

## Test Execution Results

```
pnpm vitest run apps/api/lego-api/domains/mocs/application/__tests__/upload-session-services.test.ts

 Test Files  1 passed (1)
      Tests  47 passed (47)
   Duration  678ms
```

## Test Coverage by Acceptance Criteria

### createUploadSession (AC31-AC48)

| AC | Description | Test(s) |
|----|-------------|---------|
| AC31 | Validate request fields | `VALIDATION_ERROR for missing/empty filename` |
| AC36 | Validate MIME type | `INVALID_MIME_TYPE for non-PDF` |
| AC38 | Validate min file size (>10MB) | `FILE_TOO_SMALL tests` |
| AC39 | Validate max file size (<=50MB) | `FILE_TOO_LARGE test` |
| AC35 | Verify MOC ownership | `MOC_NOT_FOUND tests` |
| AC40 | Check rate limit | `RATE_LIMIT_EXCEEDED test` |
| AC41 | Rate limit userId | `calls checkRateLimit with correct userId` |
| AC42 | Generate S3 key pattern | `generates correct S3 key pattern` |
| AC44 | Generate presigned PUT URL | `generates presigned PUT URL via S3 storage port` |
| AC46 | Create session record | `creates session record in repository` |
| AC47 | Return session info | `creates session and returns presigned URL` |

### completeUploadSession (AC49-AC65)

| AC | Description | Test(s) |
|----|-------------|---------|
| AC50 | Session not found | `SESSION_NOT_FOUND when session does not exist` |
| AC51 | User ownership | `FORBIDDEN when user does not own session` |
| AC52 | Already completed | `SESSION_ALREADY_COMPLETED test` |
| AC52 | Expired session | `EXPIRED_SESSION test` |
| AC53 | Verify S3 file | `verifies file exists in S3 via headObject` |
| AC54 | File not in S3 | `FILE_NOT_IN_S3 test` |
| AC55 | Size mismatch | `SIZE_MISMATCH when S3 size differs by >5%` |
| AC56 | Size tolerance | `accepts file within 5% tolerance tests` |
| AC58 | Insert moc_files | `inserts moc_files record` |
| AC59 | Update session status | `updates session status to completed` |
| AC60 | DB transaction error | `DB_ERROR on insert/update failure` |
| AC61 | Return file record | `completes session and returns file record` |

## Mock Dependencies

The test suite properly mocks all external dependencies:

- **@repo/logger** - Mocked logger functions
- **MocRepository** - Mock MOC lookup and validation
- **UploadSessionRepository** - Mock session CRUD operations
- **S3StoragePort** - Mock presigned URL generation, headObject, publicUrl
- **checkRateLimit** - Mock rate limiting
- **insertMocFile** - Mock file insertion
- **crypto.randomUUID** - Mocked for deterministic session IDs

## Edge Cases Covered

1. Filenames with special characters (sanitization)
2. Unicode filenames
3. Boundary file sizes (10MB+1, 50MB exact)
4. Null originalFilename handling
5. Null originalFileSize handling
6. CloudFront vs S3 public URL generation
7. Session MOC ID mismatch

## Run Command

```bash
pnpm vitest run apps/api/lego-api/domains/mocs/application/__tests__/upload-session-services.test.ts
```

## Notes

- Tests use Vitest's fake timers for consistent date handling
- All tests are isolated with proper `beforeEach` cleanup
- Test data constants match service implementation thresholds
