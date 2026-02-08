# Backend Implementation Log - WISH-2013

## Summary

Implemented file upload security hardening for the wishlist feature backend.

## Components Created

### 1. File Validation Utilities

**Path:** `apps/api/lego-api/core/utils/file-validation.ts`

```typescript
// Key exports:
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_FILE_SIZE = 10 * 1024 * 1024
export const MIN_FILE_SIZE = 1

export function validateMimeType(mimeType: string): ValidationResult
export function validateFileSize(sizeBytes: number): ValidationResult
export function validateFileUpload(mimeType: string, sizeBytes: number): ValidationResult
export function logSecurityEvent(event: SecurityLogEvent): void
```

**Tests:** 41 unit tests covering valid/invalid MIME types, file sizes, edge cases

### 2. Virus Scanner Adapter

**Path:** `apps/api/lego-api/core/security/virus-scanner.ts`

```typescript
// Port interface:
interface VirusScannerPort {
  scanFile(s3Key: string): Promise<ScanResult>
  handleInfectedFile(s3Key: string, threats: string[]): Promise<QuarantineAction>
}

// Adapters:
export function createClamAVVirusScanner(): VirusScannerPort
export function createMockVirusScanner(config?): VirusScannerPort
export function createVirusScanner(): VirusScannerPort // Factory
```

**Tests:** 21 unit tests covering scan results, error handling, mock behavior

## Components Modified

### 1. Storage Adapter

**Path:** `apps/api/lego-api/domains/wishlist/adapters/storage.ts`

**Changes:**
- Added `fileSize` parameter to `generateUploadUrl()`
- Removed GIF from `ALLOWED_IMAGE_EXTENSIONS` and `ALLOWED_MIME_TYPES`
- Added `MIN_FILE_SIZE` constant
- Replaced `console.*` with `logger.*`
- Added security logging for rejections

### 2. Ports Interface

**Path:** `apps/api/lego-api/domains/wishlist/ports/index.ts`

**Changes:**
- Added optional `fileSize` parameter to `WishlistImageStorage.generateUploadUrl()`
- Added new error types: `FILE_TOO_LARGE`, `FILE_TOO_SMALL`

### 3. Domain Types

**Path:** `apps/api/lego-api/domains/wishlist/types.ts`

**Changes:**
- Added `MAX_FILE_SIZE` constant
- Added `fileSize` to `PresignRequestSchema`

### 4. Routes

**Path:** `apps/api/lego-api/domains/wishlist/routes.ts`

**Changes:**
- Pass `fileSize` from query params to service
- Enhanced error responses with `allowedTypes` and `maxSizeBytes`
- Updated error messages for clarity

### 5. Services

**Path:** `apps/api/lego-api/domains/wishlist/application/services.ts`

**Changes:**
- Added `fileSize` parameter to `generateImageUploadUrl()`
- Replaced `console.*` with `logger.*`

## Test Changes

### Updated Tests:
1. `domains/wishlist/__tests__/services.test.ts` - Updated mock call expectations
2. `domains/wishlist/__tests__/purchase.test.ts` - Updated logger mocking
3. `domains/wishlist/adapters/__tests__/storage.test.ts` - Updated GIF tests to expect rejection

## API Changes

### GET /api/wishlist/images/presign

**New Query Parameter:**
- `fileSize` (optional): File size in bytes for server-side validation

**New Error Responses:**
```json
// FILE_TOO_LARGE
{
  "error": "FILE_TOO_LARGE",
  "message": "File size exceeds maximum limit of 10MB",
  "maxSizeBytes": 10485760
}

// INVALID_MIME_TYPE
{
  "error": "INVALID_MIME_TYPE",
  "message": "Unsupported file type. Allowed: image/jpeg, image/png, image/webp",
  "allowedTypes": ["image/jpeg", "image/png", "image/webp"]
}
```

## Security Considerations

1. **Whitelist Approach:** Only explicitly allowed MIME types accepted
2. **GIF Removed:** Potential for embedded scripts, complexity in scanning
3. **Server-Side Validation:** All validation done server-side regardless of client
4. **Structured Logging:** All security events logged for CloudWatch analysis
5. **15-Minute TTL:** Presigned URLs expire quickly to minimize exposure
