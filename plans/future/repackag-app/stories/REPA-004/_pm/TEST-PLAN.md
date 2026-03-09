# Test Plan: REPA-004 - Migrate Image Processing

## Scope Summary
- **Endpoints touched**: Wishlist image presigned URL endpoint (indirect - via hook refactoring)
- **UI touched**: No (code migration only, no UI changes)
- **Data/storage touched**: No (S3 upload flow preserved, no schema changes)

## Happy Path Tests

### Test 1: Browser-side compression with preset
**Setup**:
- Mock JPEG file (2MB, 1920x1080)
- Import `compressImage` from `@repo/upload/image/compression`
- Select "balanced" preset

**Action**:
- Call `compressImage(file, { preset: 'balanced', onProgress: callback })`

**Expected Outcome**:
- Compressed JPEG returned
- File size reduced by ~50-70%
- Aspect ratio preserved
- Progress callbacks fired (0% → 100%)
- No quality degradation beyond preset spec

**Evidence**:
- Assert output file size < 1MB
- Assert output MIME type === 'image/jpeg'
- Assert onProgress called with increasing percentages
- Compare visual quality (manual inspection or SSIM score)

### Test 2: HEIC to JPEG conversion
**Setup**:
- Mock HEIC file (iOS photo)
- Import `convertHEICToJPEG` and `isHEIC` from `@repo/upload/image/heic`

**Action**:
- Verify `isHEIC(file)` returns true
- Call `convertHEICToJPEG(file, { onProgress: callback })`

**Expected Outcome**:
- JPEG blob returned
- MIME type changed from 'image/heic' to 'image/jpeg'
- Image dimensions preserved
- Progress callbacks fired

**Evidence**:
- Assert output.type === 'image/jpeg'
- Assert onProgress called multiple times
- Verify converted image renders correctly

### Test 3: Generalized useUpload hook with custom presigned URL provider
**Setup**:
- Create test React component
- Mock presigned URL provider: `(file) => Promise.resolve({ url: 'https://s3.example.com/...', fields: {} })`
- Mock HEIC file

**Action**:
- Call `useUpload({ getPresignedUrl: mockProvider })`
- Trigger `upload(file, { preset: 'high-quality' })`

**Expected Outcome**:
- HEIC conversion triggered
- Compression applied with preset
- Upload to presigned URL succeeds
- Progress tracking shows phases: converting (0-33%), compressing (34-66%), uploading (67-100%)

**Evidence**:
- Assert mockProvider called with File object
- Assert XHR request sent to presigned URL
- Assert progress.phase transitions correctly
- Assert final status === 'success'

### Test 4: Wishlist app still works after migration
**Setup**:
- Start wishlist app in dev mode
- Navigate to wishlist creation form
- Select HEIC photo from iOS device

**Action**:
- Upload photo via existing wishlist form
- Submit form

**Expected Outcome**:
- Photo uploads successfully (no behavior change)
- Progress indicator shows phases correctly
- Form submission includes S3 key
- Image displays in wishlist gallery

**Evidence**:
- Playwright test: assert progress bar visible
- Assert network request to presigned URL succeeds
- Assert wishlist created with image_url field populated
- Assert image renders in gallery (CloudFront URL)

## Error Cases

### Error 1: Invalid file type
**Setup**:
- Pass PDF file to `compressImage`

**Action**:
- Call `compressImage(pdfFile, { preset: 'balanced' })`

**Expected Outcome**:
- Error thrown or rejected promise
- Error message indicates unsupported MIME type

**Evidence**:
- Assert error.message includes 'unsupported' or 'invalid file type'
- Assert no network requests made

### Error 2: HEIC conversion fails
**Setup**:
- Mock heic2any library to throw error
- Pass HEIC file to `convertHEICToJPEG`

**Action**:
- Call conversion function

**Expected Outcome**:
- Error caught and re-thrown with context
- Progress callback not called
- Original file returned (fallback) OR error propagated

**Evidence**:
- Assert error logged via @repo/logger
- Verify error message includes 'HEIC conversion failed'

### Error 3: Presigned URL request fails
**Setup**:
- Mock presigned URL provider to reject
- Call `useUpload` hook

**Action**:
- Trigger upload

**Expected Outcome**:
- Upload status transitions to 'error'
- Error message displayed (if UI hooked up)
- No XHR request attempted

**Evidence**:
- Assert upload.error contains rejection reason
- Assert upload.status === 'error'
- Assert no S3 upload attempted

### Error 4: S3 upload fails (network error)
**Setup**:
- Mock XHR to fail with network error
- Call useUpload with valid presigned URL

**Action**:
- Trigger upload after successful compression

**Expected Outcome**:
- Upload status transitions to 'error'
- Error includes S3 response or network error

**Evidence**:
- Assert upload.error contains XHR error
- Assert progress stops at upload phase

## Edge Cases (Reasonable)

### Edge 1: Very large file (10MB)
**Setup**:
- Mock 10MB JPEG

**Action**:
- Compress with 'low-bandwidth' preset

**Expected Outcome**:
- Compression succeeds
- Output file significantly smaller (target <500KB per preset)
- Progress callbacks fire incrementally
- No browser freeze (background worker if available)

**Evidence**:
- Assert output size < 500KB
- Assert compression duration < 10s
- Verify UI remains responsive

### Edge 2: Already compressed file
**Setup**:
- Mock heavily compressed JPEG (100KB, high quality)

**Action**:
- Compress with 'balanced' preset

**Expected Outcome**:
- Minimal size reduction
- No quality loss
- No error

**Evidence**:
- Assert output size ~= input size (±10%)
- Verify visual quality preserved

### Edge 3: Concurrent uploads
**Setup**:
- Call useUpload hook twice in same component
- Trigger both uploads simultaneously

**Action**:
- Upload two different files

**Expected Outcome**:
- Both uploads proceed independently
- Progress tracking isolated
- No cross-contamination of state

**Evidence**:
- Assert each upload has unique progress state
- Assert both complete successfully
- Verify correct files uploaded to correct S3 keys

### Edge 4: Invalid preset name
**Setup**:
- Call `getPresetByName('invalid-preset-name')`

**Action**:
- Retrieve preset

**Expected Outcome**:
- Returns null or throws error
- Fallback to default preset (if applicable)

**Evidence**:
- Assert return value is null OR error thrown
- Assert no compression attempted with undefined config

### Edge 5: WebP conversion on unsupported browser
**Setup**:
- Mock browser without WebP support
- Request WebP conversion in preset

**Action**:
- Compress image with webP: true option

**Expected Outcome**:
- Falls back to JPEG output
- No error thrown
- Warning logged

**Evidence**:
- Assert output type === 'image/jpeg'
- Assert @repo/logger.warn called with 'WebP not supported'

## Required Tooling Evidence

### Backend
- **.http requests**: None required (backend Sharp logic deferred to future story)
- **Assertions**: N/A (no backend changes in this story)

### Frontend
- **Playwright runs required**:
  - Wishlist upload E2E test: `tests/wishlist/upload-photo.spec.ts`
  - Navigate to wishlist form
  - Select HEIC photo
  - Assert progress bar visible
  - Assert upload completes
  - Assert image displays in gallery
- **Assertions**:
  - `await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible()`
  - `await expect(page.locator('[data-testid="photo-preview"]')).toHaveAttribute('src', /cloudfront/)`
- **Required artifacts**:
  - Video recording of upload flow (for debugging)
  - Network logs showing presigned URL request + S3 PUT
  - Trace file if Playwright test fails

### Package Tests
- **Vitest unit tests**:
  - `packages/core/upload/src/image/compression/__tests__/compressImage.test.ts`
  - `packages/core/upload/src/image/heic/__tests__/convertHEIC.test.ts`
  - `packages/core/upload/src/image/presets/__tests__/presets.test.ts`
  - `packages/core/upload/src/hooks/__tests__/useUpload.test.tsx`
- **Coverage requirement**: 80% for new package (per baseline)
- **CI checkpoint**: `pnpm test --filter=@repo/upload`

## Risks to Call Out

### Risk 1: Dependency version conflicts
- **Description**: `browser-image-compression` and `heic2any` added to `@repo/upload` package.json may conflict with existing versions in wishlist app
- **Mitigation**: Use exact same versions currently in wishlist app, document in REUSE-PLAN

### Risk 2: Type safety loss during generalization
- **Description**: Making `useUpload` generic across presigned URL providers may introduce `any` types
- **Mitigation**: Use Zod schemas for presigned URL response shape, validate in hook

### Risk 3: Missing edge cases from production
- **Description**: Wishlist app may have undocumented edge case handling (e.g., specific iOS photo formats) that tests miss
- **Mitigation**: Run full wishlist E2E suite after migration, compare before/after behavior

### Risk 4: Progress callback inconsistency
- **Description**: Different compression presets may fire progress callbacks at different rates, breaking UI assumptions
- **Mitigation**: Document progress callback contract in package README, add unit tests for callback frequency

### Risk 5: S3 presigned URL shape assumptions
- **Description**: Hook may assume specific response shape from wishlist endpoint that other apps don't provide
- **Mitigation**: Define presigned URL schema in `@repo/upload/types`, validate in hook, document in README
