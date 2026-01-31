# Implementation Plan - WISH-2013

## Summary

File Upload Security Hardening implementation for the wishlist feature. This plan covers server-side and client-side validation, virus scanning adapter, presigned URL security, and comprehensive test coverage.

## Implementation Phases

### Phase A: Core Security Utilities (Backend)

#### A1. File Validation Utilities

**Create:** `apps/api/lego-api/core/utils/file-validation.ts`

```typescript
// Exports:
// - validateMimeType(mimeType: string): ValidationResult
// - validateFileSize(size: number): ValidationResult
// - ValidationResultSchema (Zod)
// - ALLOWED_MIME_TYPES constant
// - MAX_FILE_SIZE constant (10MB)
```

**Create:** `apps/api/lego-api/core/utils/__tests__/file-validation.test.ts`
- Unit tests for MIME type validation (10+ test cases)
- Unit tests for file size validation (10+ test cases)
- Edge cases: boundary values, empty values, null handling

#### A2. Virus Scanner Port & Adapter

**Create:** `apps/api/lego-api/core/security/virus-scanner.ts`

```typescript
// Port (interface):
// - VirusScannerPort { scanFile(s3Key: string): Promise<ScanResult> }
// - ScanResultSchema (Zod)
//
// Adapter implementation:
// - ClamAVVirusScanner (implements VirusScannerPort)
// - MockVirusScanner (for testing)
```

**Create:** `apps/api/lego-api/core/security/__tests__/virus-scanner.test.ts`
- Unit tests for ClamAV adapter (5+ test cases)
- Mock responses: clean, infected, scan error

### Phase B: Backend Integration

#### B1. Enhance Presign Route

**Modify:** `apps/api/lego-api/domains/wishlist/routes.ts`

Add file size validation to presign endpoint:
- Extract fileSize from query/body params
- Validate against MAX_FILE_SIZE before generating URL
- Return 400 with structured error for oversized files

#### B2. Enhance Storage Adapter

**Modify:** `apps/api/lego-api/domains/wishlist/adapters/storage.ts`

- Add fileSize parameter to generateUploadUrl signature
- Validate file size in adapter
- Add error type: 'FILE_TOO_LARGE'
- Confirm 15-minute (900s) TTL already implemented

#### B3. Update Types

**Modify:** `apps/api/lego-api/domains/wishlist/types.ts`

- Add fileSize to PresignRequestSchema
- Add FILE_TOO_LARGE to PresignError type
- Add SecurityEventSchema for audit logging

#### B4. Security Audit Logging

**Modify:** `apps/api/lego-api/domains/wishlist/routes.ts`

Add structured security logging:
```typescript
logSecurityEvent({
  userId,
  fileName,
  rejectionReason,
  fileSize,
  mimeType,
  timestamp,
  ipAddress,
  sourceMethod,
})
```

### Phase C: Frontend Enhancements

#### C1. Enhanced Client Validation

**Modify:** `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts`

- Already has MIME type and file size validation
- Ensure error messages match AC2/AC4 requirements
- Verify validateFile returns proper error strings

#### C2. Enhanced Error Display

**Verify:** `apps/web/app-wishlist-gallery/src/components/WishlistForm/index.tsx`

- Confirm error messages display for file validation errors
- Verify aria-live region for accessibility (AC - Accessibility)

### Phase D: Test Infrastructure

#### D1. Security Test Fixtures

**Create:** `apps/web/app-wishlist-gallery/src/test/fixtures/security-mocks.ts`

```typescript
// - Mock virus scan responses (clean, infected, error)
// - Malicious file fixtures (executable, HTML, oversized)
// - Security event mock data
```

#### D2. Enhance MSW Handlers

**Modify:** `apps/web/app-wishlist-gallery/src/test/mocks/handlers.ts`

- Add file size validation error response (400)
- Add virus scan mock handlers
- Add MIME type error response

#### D3. Backend Tests

**Create:** `apps/api/lego-api/domains/wishlist/__tests__/storage.integration.test.ts`

- Test presign with oversized file (reject)
- Test presign with invalid MIME type (reject)
- Test presign with valid file (success)

### Phase E: Integration Tests

#### E1. Upload Security Tests

**Modify:** `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts`

Add test cases:
- Invalid file type rejection (AC12)
- Oversized file rejection (AC13)
- Expired presigned URL handling (AC14)
- Concurrent upload isolation (AC15)

#### E2. Form Security Tests

**Modify:** `apps/web/app-wishlist-gallery/src/components/WishlistForm/__tests__/WishlistForm.test.tsx`

Add test cases:
- File validation error display
- Security error accessibility

## Files Summary

### Files to Create

| File | Purpose |
|------|---------|
| `apps/api/lego-api/core/utils/file-validation.ts` | MIME type + size validation utilities |
| `apps/api/lego-api/core/utils/__tests__/file-validation.test.ts` | Validation unit tests |
| `apps/api/lego-api/core/security/virus-scanner.ts` | Virus scanner port + ClamAV adapter |
| `apps/api/lego-api/core/security/__tests__/virus-scanner.test.ts` | Virus scanner tests |
| `apps/api/lego-api/core/security/index.ts` | Security module exports |
| `apps/api/lego-api/core/utils/index.ts` | Utils module exports |
| `apps/web/app-wishlist-gallery/src/test/fixtures/security-mocks.ts` | Security test fixtures |

### Files to Modify

| File | Changes |
|------|---------|
| `apps/api/lego-api/domains/wishlist/routes.ts` | Add file size validation, security logging |
| `apps/api/lego-api/domains/wishlist/adapters/storage.ts` | Add file size validation to generateUploadUrl |
| `apps/api/lego-api/domains/wishlist/types.ts` | Add fileSize to PresignRequestSchema |
| `apps/api/lego-api/domains/wishlist/ports/index.ts` | Update WishlistImageStorage interface |
| `apps/web/app-wishlist-gallery/src/test/mocks/handlers.ts` | Add security error handlers |
| `apps/web/app-wishlist-gallery/src/test/fixtures/s3-mocks.ts` | Add security fixtures |
| `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts` | Add security tests |

## Acceptance Criteria Mapping

| AC | Implementation | Test Location |
|----|----------------|---------------|
| AC1 | file-validation.ts + routes.ts | file-validation.test.ts |
| AC2 | useS3Upload.ts (exists) | useS3Upload.test.ts |
| AC3 | file-validation.ts + storage.ts | file-validation.test.ts |
| AC4 | useS3Upload.ts (exists) | useS3Upload.test.ts |
| AC5 | virus-scanner.ts | virus-scanner.test.ts |
| AC6 | storage.ts (already 900s) | storage.test.ts |
| AC7-AC10 | Infrastructure docs | Manual verification |
| AC11 | security-mocks.ts | useS3Upload.test.ts |
| AC12-AC15 | Test cases | useS3Upload.test.ts |
| AC16 | routes.ts (logSecurityEvent) | routes.test.ts |
| AC17 | Documentation | Implementation artifacts |

## Infrastructure Notes (Documentation Only)

The following infrastructure configurations are documented but NOT deployed in this implementation:

1. **S3 Bucket Policy** - HTTPS-only, no public access
2. **IAM Policy** - Least-privilege S3 access
3. **CORS Configuration** - Frontend origins whitelist
4. **ClamAV Lambda Layer** - Virus scanning integration

These configurations should be deployed as IaC (Terraform/CloudFormation) in a separate infrastructure story.

## Risk Mitigation

1. **No Breaking Changes**: File size parameter is optional for backward compatibility
2. **Graceful Degradation**: Virus scanner failures quarantine files, don't block uploads
3. **Test Coverage**: 20+ unit tests, 15+ integration tests as specified

## Estimated Effort

- Backend utilities: 1 point
- Backend integration: 0.5 point
- Frontend enhancements: 0.25 point
- Test infrastructure: 0.75 point
- **Total**: ~2.5 points (matches story estimate)
