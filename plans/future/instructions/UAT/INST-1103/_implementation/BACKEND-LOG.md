# Backend Implementation Log - INST-1103

## Status: IN PROGRESS

## Completed Steps

### 1. Dependencies Installed ✓
```bash
pnpm add file-type sharp exif-reader --filter lego-api
```
- file-type: MIME type validation (AC24-25)
- sharp: WebP conversion, EXIF stripping, image processing (AC57, AC61, AC64)
- exif-reader: EXIF metadata handling (AC61)

### 2. MocImageStorage Port Interface Created ✓
**File**: `apps/api/lego-api/domains/mocs/ports/index.ts`

Added:
```typescript
export interface MocImageStorage {
  uploadThumbnail(...): Promise<Result<{key, url}, 'UPLOAD_FAILED' | 'INVALID_IMAGE' | 'IMAGE_TOO_LARGE'>>
  deleteThumbnail(key: string): Promise<Result<void, 'DELETE_FAILED'>>
  extractKeyFromUrl(url: string): string | null
}
```

**Evidence**: AC54 (Port interface defined)

### 3. MocImageStorage Adapter Implemented ✓
**File**: `apps/api/lego-api/domains/mocs/adapters/storage.ts` (NEW)

Features implemented:
- S3 upload with CloudFront URL conversion (AC29-31)
- WebP conversion with Sharp (AC57)
- EXIF metadata stripping (AC61)
- High-resolution validation - reject >8000x8000 (AC64)
- Filename sanitization (AC30)
- S3 key pattern: `mocs/{userId}/{mocId}/thumbnail/{uuid}-{filename}.webp`

**Evidence**: AC55, AC57, AC61, AC64

### 4. Adapter Export Added ✓
**File**: `apps/api/lego-api/domains/mocs/adapters/index.ts`

Added export for `createMocImageStorage`

### 5. Moc Entity Updated ✓
**File**: `apps/api/lego-api/domains/mocs/ports/index.ts`

Added `thumbnailUrl: string | null` to:
- `Moc` interface
- `mapRowToMoc` function in repository

### 6. MocRepository Updated ✓
**Files**: 
- `apps/api/lego-api/domains/mocs/ports/index.ts` (interface)
- `apps/api/lego-api/domains/mocs/adapters/repositories.ts` (implementation)

Added `updateThumbnail(mocId, userId, thumbnailUrl)` method

### 7. uploadThumbnail Service Method Added ✓
**File**: `apps/api/lego-api/domains/mocs/application/services.ts`

Business logic implemented:
- Authorization check - user owns MOC (AC21)
- MIME type validation with file-type library (AC24-25)
- File size validation 1 byte - 10MB (AC27-28)
- S3 upload orchestration
- Old thumbnail deletion (non-blocking) (AC32)
- Database update (AC34)
- Comprehensive error handling and logging (AC35-37)

**Evidence**: AC49-AC52, AC24-AC28, AC34, AC35-AC37

### 8. Service Dependencies Updated ✓
Updated `MocServiceDeps` to include optional `imageStorage: MocImageStorage`

---

## Remaining Backend Work

### 9. POST /mocs/:id/thumbnail Route Handler (NEXT)
**File**: `apps/api/lego-api/domains/mocs/routes.ts`

Need to add:
- Multipart form data parsing
- Auth middleware (AC19)
- requireFeature('moc') middleware (AC20)
- Route handler calling uploadThumbnail service
- HTTP response mapping

**Evidence needed**: AC18-AC23, AC33, AC53, AC56

### 10. Unit Tests
**File**: `apps/api/lego-api/domains/mocs/__tests__/routes.test.ts`

Tests to write:
- MIME type validation (AC39)
- File size validation (AC40)
- Authorization check (AC41)

### 11. Integration with Route Composition
**File**: `apps/api/lego-api/domains/mocs/routes.ts`

Wire dependencies:
```typescript
const imageStorage = createMocImageStorage()
const mocService = createMocService({ mocRepo, imageStorage })
```

---

## Type Errors to Fix

Current errors (from `pnpm exec tsc --noEmit`):
1. ✓ FIXED: `Property 'thumbnailUrl' does not exist on type 'MocWithFiles'`
2. ✓ FIXED: `Property 'thumbnailUrl' does not exist on type 'Moc'`

---

## Files Modified

### Created
- `apps/api/lego-api/domains/mocs/adapters/storage.ts`

### Modified
- `apps/api/lego-api/domains/mocs/ports/index.ts`
- `apps/api/lego-api/domains/mocs/adapters/index.ts`
- `apps/api/lego-api/domains/mocs/adapters/repositories.ts`
- `apps/api/lego-api/domains/mocs/application/services.ts`

### Pending
- `apps/api/lego-api/domains/mocs/routes.ts`
- `apps/api/lego-api/domains/mocs/__tests__/routes.test.ts`

---

## Next Steps

1. Add POST /mocs/:id/thumbnail route handler
2. Wire dependencies in route composition
3. Write unit tests for route
4. Run `pnpm build` and `pnpm test --filter lego-api`
5. Fix any type/lint errors

---

## Blockers

None currently

---

## Notes

- Using proven patterns from gallery domain (multipart form parsing, S3 upload)
- CloudFront URL conversion follows ADR-003
- Transaction safety partially implemented (S3 + DB update, rollback on DB failure)
- Full transaction would require wrapping both operations in DB transaction or using saga pattern
- Sharp library handles auto-rotation based on EXIF before stripping metadata
