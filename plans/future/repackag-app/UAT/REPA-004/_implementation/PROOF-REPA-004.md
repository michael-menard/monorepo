# PROOF-REPA-004: Migrate Image Processing to Shared Package

**Generated**: 2026-02-11T04:55:00Z
**Source**: EVIDENCE.yaml v2

## Summary

REPA-004 extracts image processing logic (compression, HEIC conversion, presets) from `app-wishlist-gallery` into the shared `@repo/upload` package. The wishlist gallery app was updated to import from the new package. All 10 acceptance criteria pass.

## Acceptance Criteria Results

| AC | Title | Status | Evidence |
|----|-------|--------|----------|
| AC-1 | Compression module | PASS | 3 files created, 17 tests passing |
| AC-2 | HEIC module | PASS | 3 files created, 20 tests passing |
| AC-3 | Presets module | PASS | 3 files created, 15 tests passing |
| AC-4 | useUpload hook | PASS | 3 files created, 18 tests passing |
| AC-5 | Wishlist imports updated | PASS | 3 files updated, 2 files deleted |
| AC-6 | Wishlist tests pass | PASS* | 606 pass, 13 fail (all pre-existing) |
| AC-7 | Package builds/tests in isolation | PASS | Build success, 117 tests, no app imports |
| AC-8 | useUpload hook tests | PASS | 18 RTL tests covering orchestration/errors |
| AC-9 | REPA-001 dependency verified | PASS | Package structure, config, build order confirmed |
| AC-10 | Presigned URL schema compatible | PASS | Schemas compatible (upload more permissive) |

*AC-6 note: 13 failures are all pre-existing (baseline: 14 failures). Zero new failures introduced.

## Test Evidence

### @repo/upload Package
- **8 test files**, **117 tests passed**, 2 skipped
- Modules: presets (15), compression (17), heic (20), useUpload (18), client (47)
- Build: 22 modules transformed successfully

### Wishlist Gallery (app-wishlist-gallery)
- **34 files passed**, 5 files failed (pre-existing)
- **606 tests passed**, 13 failed (pre-existing)
- Key fixed test files: useS3Upload (51 pass), useBackgroundCompression (22 pass)

## Files Changed

### Created (14 files)
| File | Purpose |
|------|---------|
| `packages/core/upload/src/image/presets/__types__/index.ts` | Zod schemas |
| `packages/core/upload/src/image/presets/index.ts` | COMPRESSION_PRESETS, utilities |
| `packages/core/upload/src/image/presets/__tests__/presets.test.ts` | 15 tests |
| `packages/core/upload/src/image/compression/__types__/index.ts` | Zod schemas |
| `packages/core/upload/src/image/compression/index.ts` | compressImage, utilities |
| `packages/core/upload/src/image/compression/__tests__/compression.test.ts` | 17 tests |
| `packages/core/upload/src/image/heic/__types__/index.ts` | Zod schemas |
| `packages/core/upload/src/image/heic/index.ts` | isHEIC, convertHEICToJPEG |
| `packages/core/upload/src/image/heic/__tests__/heic.test.ts` | 20 tests |
| `packages/core/upload/src/hooks/__types__/index.ts` | PresignedUrlResponse, UploadState |
| `packages/core/upload/src/hooks/useUpload.ts` | Generalized upload hook |
| `packages/core/upload/src/hooks/__tests__/useUpload.test.tsx` | 18 RTL tests |
| `packages/core/upload/src/hooks/index.ts` | Module exports |
| `packages/core/upload/src/image/index.ts` | Module exports |

### Modified (8 files)
| File | Change |
|------|--------|
| `packages/core/upload/package.json` | Added deps + subpath exports |
| `packages/core/upload/vite.config.ts` | Added entry points |
| `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts` | Imports from @repo/upload |
| `apps/web/app-wishlist-gallery/src/hooks/useBackgroundCompression.ts` | Imports from @repo/upload |
| `apps/web/app-wishlist-gallery/src/components/WishlistForm/index.tsx` | Imports from @repo/upload |
| `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts` | Updated mocks |
| `apps/web/app-wishlist-gallery/src/hooks/__tests__/useBackgroundCompression.test.ts` | Updated mocks |
| `apps/web/app-wishlist-gallery/src/test/setup.ts` | Added Worker mock |

### Deleted (2 files)
| File | Reason |
|------|--------|
| `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` | Extracted to @repo/upload |
| `apps/web/app-wishlist-gallery/src/utils/__tests__/imageCompression.test.ts` | Tests now in @repo/upload |

## Notable Decisions

1. **useS3Upload.ts kept as wrapper** (not deleted): Contains wishlist-specific RTK Query mutation. Adapted to import image processing from @repo/upload.
2. **PresignedUrlResponseSchema.expiresIn optional**: More permissive for future backends.
3. **imageCompression.test.ts deleted**: Tests migrated to @repo/upload package test files.

## Known Deviations

| Deviation | Severity | Explanation |
|-----------|----------|-------------|
| useS3Upload.ts not deleted | Low | Intentionally kept as domain-specific wrapper |
| 13 pre-existing test failures | Low | Verified against baseline (14 failures before changes) |

## E2E Tests

**Status**: Exempt
**Reason**: Refactor story with no behavior changes. Requires live S3/CloudFront environment. Manual QA verification recommended.

## Verdict

**PASS** - All 10 ACs satisfied. Zero new test failures. Package builds and tests in isolation. Wishlist gallery successfully migrated to shared package.
