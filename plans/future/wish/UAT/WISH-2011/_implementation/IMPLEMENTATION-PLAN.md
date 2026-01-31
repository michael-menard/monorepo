# Implementation Plan - WISH-2011

## Overview

Create MSW handlers and test fixtures for S3 upload flows to enable reliable integration tests without external dependencies.

## Implementation Steps

### Step 1: Create Test Fixtures (s3-mocks.ts)

**File:** `apps/web/app-wishlist-gallery/src/test/fixtures/s3-mocks.ts`

Create fixtures with TypeScript `satisfies` for type safety:

```typescript
import { z } from 'zod'
import { PresignResponseSchema } from '@repo/api-client/schemas/wishlist'

type PresignResponse = z.infer<typeof PresignResponseSchema>

// Success fixtures
export const mockPresignSuccess = {
  presignedUrl: 'https://mock-s3.amazonaws.com/lego-moc-bucket/uploads/test.jpg?signature=xxx',
  key: 'uploads/test.jpg',
  expiresIn: 3600,
} satisfies PresignResponse

// Error fixtures
export const mockPresign500Error = { error: 'Internal Server Error', status: 500 }
export const mockPresign403Error = { error: 'Forbidden', status: 403 }

// Sample test files
export const createMockFile = (name: string, type: string, size = 1024): File => { ... }
export const mockJpegFile = createMockFile('test.jpg', 'image/jpeg')
export const mockPngFile = createMockFile('test.png', 'image/png')
export const mockWebpFile = createMockFile('test.webp', 'image/webp')
export const mockInvalidTextFile = createMockFile('test.txt', 'text/plain')
export const mockZeroByteFile = createMockFile('empty.jpg', 'image/jpeg', 0)
```

### Step 2: Create Fixtures Index

**File:** `apps/web/app-wishlist-gallery/src/test/fixtures/index.ts`

```typescript
export * from './s3-mocks'
```

### Step 3: Add MSW Handlers

**File:** `apps/web/app-wishlist-gallery/src/test/mocks/handlers.ts`

Add handlers for:
1. **Presign endpoint:** `POST ${API_BASE_URL}/api/wishlist/images/presign`
2. **S3 PUT endpoint:** `PUT https://*.amazonaws.com/*`

Include error injection capability via request headers or query params.

### Step 4: Add Fixture Validation Tests

**File:** `apps/web/app-wishlist-gallery/src/test/fixtures/__tests__/s3-mocks.test.ts`

Verify all fixtures validate against Zod schemas.

### Step 5: Add Concurrent Upload Test

Add test to `useS3Upload.test.ts` for concurrent uploads:
- Start two uploads simultaneously
- Verify both complete with unique keys
- Verify no state interference

### Step 6: Add 0-Byte File Test

Add test to `useS3Upload.test.ts` for empty file handling:
- Create 0-byte file
- Verify validation error or upload error
- Verify no partial state

### Step 7: Add WishlistForm Integration Test

Add to `WishlistForm.test.tsx`:
- Test that triggers actual MSW handler (not mocked useS3Upload)
- Verify presign request intercepted
- Verify S3 PUT request intercepted

### Step 8: Add AddItemPage Integration Test

Add to `AddItemPage.test.tsx`:
- Full add item flow with image upload
- Verify MSW handlers intercept all requests

## Files to Create

| File | Purpose |
|------|---------|
| `src/test/fixtures/s3-mocks.ts` | Test fixtures for presign responses and sample files |
| `src/test/fixtures/index.ts` | Re-export fixtures |
| `src/test/fixtures/__tests__/s3-mocks.test.ts` | Fixture validation tests |

## Files to Modify

| File | Changes |
|------|---------|
| `src/test/mocks/handlers.ts` | Add presign and S3 PUT handlers |
| `src/hooks/__tests__/useS3Upload.test.ts` | Add concurrent upload and 0-byte file tests |
| `src/components/WishlistForm/__tests__/WishlistForm.test.tsx` | Add MSW integration test |
| `src/pages/__tests__/AddItemPage.test.tsx` | Add MSW integration test |

## Acceptance Criteria Mapping

| AC | Implementation |
|----|----------------|
| AC1 | Step 3 - Presign handler |
| AC2 | Step 3 - S3 PUT handler |
| AC3 | Step 3 - Error injection for presign |
| AC4 | Step 3 - Error injection for S3 PUT |
| AC5 | Step 1 - Presign response fixtures |
| AC6 | Step 1 - Sample file fixtures |
| AC7 | Verify existing tests pass |
| AC8 | Step 5 - Concurrent upload test |
| AC9 | Step 6 - 0-byte file test |
| AC10 | Step 7 - WishlistForm integration test |
| AC11 | Step 8 - AddItemPage integration test |
| AC12 | Step 4 - Fixture validation test |
| AC13 | CI verification (implicit) |
| AC14 | MSW logs (implicit via onUnhandledRequest: 'error') |
| AC15 | Step 1 - TypeScript satisfies |

## Technical Decisions

1. **Fixture Location:** `src/test/fixtures/` - Follows existing test structure pattern
2. **MSW Handler Approach:** Use existing handlers.ts file - Maintains single source of truth
3. **Error Injection:** Use request headers (`x-mock-error: 500`) for flexibility
4. **File Creation Helper:** Create `createMockFile()` utility for reusable test files

## Validation Checklist

- [ ] All fixtures validate against Zod schemas
- [ ] MSW handlers intercept presign requests
- [ ] MSW handlers intercept S3 PUT requests
- [ ] Error injection works for both handlers
- [ ] All existing tests pass
- [ ] New tests pass
- [ ] No TypeScript errors
- [ ] No ESLint errors
