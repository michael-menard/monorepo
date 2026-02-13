---
id: REPA-004
title: "Migrate Image Processing to Shared Package"
status: uat
priority: P2
points: 5
story_type: refactor
feature: repackag-app
epic: repackag-app
depends_on: [REPA-001]
experiment_variant: control
created_at: "2026-02-10"
elaborated_at: "2026-02-11"
surfaces:
  - packages/core/upload
  - apps/web/app-wishlist-gallery
touches_frontend: true
touches_backend: false
touches_database: false
touches_infra: false
---

# REPA-004: Migrate Image Processing to Shared Package

## Context

The wishlist gallery app contains well-implemented image processing functionality (compression, HEIC conversion, WebP transformation, presets) that is tightly coupled to the wishlist domain. This code is located in:
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` (450+ lines, comprehensive)
- `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts` (upload orchestration hook)

This functionality could benefit other apps:
- **Instructions gallery**: MOC upload with compression
- **Inspiration gallery**: User-generated content uploads
- **Future upload surfaces**: Profile pictures, custom thumbnails

Additionally, there's fragmentation in image processing:
- **Browser-side**: Wishlist-specific implementation
- **Backend-side**:
  - `apps/api/lego-api/core/image-processing/optimizer.ts` (Sharp-based, multi-size generation)
  - `packages/backend/image-processing/src/index.ts` (basic Sharp wrapper, underutilized)

The domain-specific `useS3Upload` hook orchestrates HEIC conversion → compression → upload, which is a common pattern across all upload surfaces.

**Problem Statement**:
1. Image processing logic is duplicated and scattered across apps
2. No shared package for browser-side compression/conversion
3. Backend image processing exists in multiple places
4. Upload orchestration is wishlist-specific despite being a common need
5. Future apps will need to re-implement or copy-paste this functionality

**Current State**:
- Browser compression uses `browser-image-compression` library
- HEIC conversion uses `heic2any` library
- Three compression presets: low-bandwidth, balanced, high-quality
- Progress tracking for all phases (conversion, compression, upload)
- Validation for file size and MIME types
- S3 upload via presigned URLs (from RTK Query mutation)

## Goal

Create a unified `@repo/upload` package with clear separation of concerns for image processing, enabling all apps to share compression, HEIC conversion, and upload orchestration logic.

## Non-Goals

- **NOT** migrating backend image processing in this story (deferred to follow-up REPA-005)
- **NOT** creating new compression algorithms or presets
- **NOT** changing compression behavior or quality settings
- **NOT** modifying S3 upload flow or presigned URL generation
- **NOT** refactoring the wishlist form component itself
- **NOT** adopting package in other apps yet (wishlist only for this story)
- **NOT** optimizing compression performance (preserve existing timings)

**Protected Features** (from seed):
- CloudFront CDN architecture (ADR-003)
- Presigned S3 upload flow
- Existing compression quality presets

## Scope

### Packages Touched
- `packages/core/upload/` (NEW - created by REPA-001)
  - `src/image/compression/` - browser-side compression
  - `src/image/heic/` - HEIC to JPEG conversion
  - `src/image/presets/` - compression preset configurations
  - `src/hooks/` - generalized upload orchestration
  - `src/__types__/` - Zod schemas for all types
- `apps/web/app-wishlist-gallery/` (UPDATE)
  - `src/utils/imageCompression.ts` - DELETE after extraction
  - `src/hooks/useS3Upload.ts` - DELETE after extraction
  - `src/components/*` - UPDATE imports to `@repo/upload`

### Endpoints Touched
- No endpoint changes
- Presigned URL endpoint behavior unchanged (RTK Query mutation remains in wishlist app)

### Data Model
- No database changes
- S3 storage pattern unchanged

## Acceptance Criteria

- [ ] **AC-1**: Create `@repo/upload/image/compression` module
  - Move `compressImage`, `getPresetByName` functions
  - Preserve existing functionality (presets, WebP conversion, progress callbacks)
  - Include Zod schemas for `CompressionConfig` and `CompressionResult` types
  - Export as named exports (no barrel file)
  - Add unit tests with 80%+ coverage

- [ ] **AC-2**: Create `@repo/upload/image/heic` module
  - Move `convertHEICToJPEG`, `isHEIC`, HEIC detection logic
  - Preserve progress tracking and error handling
  - Include Zod schema for `HEICConversionOptions`
  - Add unit tests for conversion and detection

- [ ] **AC-3**: Create `@repo/upload/image/presets` module
  - Move `COMPRESSION_PRESETS` constant
  - Export `getPresetByName`, `isValidPresetName` utilities
  - Include Zod schema for `CompressionPreset` type
  - Document preset selection guidelines in JSDoc

- [ ] **AC-4**: Generalize `useS3Upload` hook to `@repo/upload/hooks/useUpload`
  - Remove wishlist-specific dependencies (RTK Query mutation)
  - Accept presigned URL function as parameter: `getPresignedUrl: (file: File) => Promise<PresignedUrlResponse>`
  - Define `PresignedUrlResponse` schema in `@repo/upload/types`
  - Preserve orchestration flow (convert → compress → upload)
  - Maintain progress tracking for all phases: converting (0-33%), compressing (34-66%), uploading (67-100%)
  - Return error states (no thrown errors)
  - Add React Testing Library tests for hook behavior

- [ ] **AC-5**: Update wishlist gallery to import from `@repo/upload`
  - Replace `import { compressImage } from '../utils/imageCompression'` with `import { compressImage } from '@repo/upload/image/compression'`
  - Replace `import { useS3Upload } from '../hooks/useS3Upload'` with `import { useUpload } from '@repo/upload/hooks'`
  - Adapt wishlist RTK mutation to match `PresignedUrlResponse` schema
  - Update all component imports
  - Remove old `utils/imageCompression.ts` file
  - Remove old `hooks/useS3Upload.ts` file

- [ ] **AC-6**: All existing wishlist tests pass
  - Run `pnpm test --filter=app-wishlist-gallery`
  - No console errors or warnings
  - No behavior changes in upload flow
  - Playwright E2E tests pass (upload photo flow)

- [ ] **AC-7**: Package builds and tests pass in isolation
  - Run `pnpm build --filter=@repo/upload` succeeds
  - Run `pnpm test --filter=@repo/upload` passes
  - Run `pnpm check-types --filter=@repo/upload` passes
  - No imports from `apps/web/*` in package code
  - Coverage meets 80% threshold

- [ ] **AC-8**: Create useUpload hook tests
  - Create `useUpload.test.tsx` with React Testing Library
  - Cover upload orchestration (convert → compress → upload flow)
  - Cover error states (conversion failure, compression failure, upload failure)
  - Cover retry logic
  - Test isolated progress tracking for concurrent uploads
  - _Added by autonomous elaboration_

- [ ] **AC-9**: Verify REPA-001 dependency completed
  - Confirm `packages/core/upload/` directory structure exists
  - Confirm package.json configured with correct dependencies
  - Confirm Turborepo build order includes @repo/upload
  - _Added by autonomous elaboration_

- [ ] **AC-10**: Verify presigned URL schema compatibility
  - Verify PresignedUrlResponse schema matches RTK Query mutation output from wishlist app
  - Document any schema differences in migration notes
  - Update RTK mutation response type if needed to match PresignedUrlResponse
  - Add integration test validating wishlist presigned URL endpoint response shape
  - _Added by autonomous elaboration_

## Reuse Plan

### Existing Components to Extract
| Component | Source Location | Target Location |
|-----------|----------------|-----------------|
| `compressImage` | `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` | `packages/core/upload/src/image/compression/index.ts` |
| `convertHEICToJPEG` | `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` | `packages/core/upload/src/image/heic/index.ts` |
| `COMPRESSION_PRESETS` | `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` | `packages/core/upload/src/image/presets/index.ts` |
| `useS3Upload` hook | `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts` | `packages/core/upload/src/hooks/useUpload.ts` |

### Patterns to Preserve
- **Hexagonal architecture**: Port/adapter pattern for image processing
- **Zod-first types**: All configuration types defined with Zod schemas
- **Progress callback pattern**: Consistent `onProgress(percent: number, phase: string)` signature
- **Preset-based configuration**: Named presets from WISH-2046
- **Error logging**: Use `@repo/logger` for all errors

### Packages to Leverage
| Package | Purpose | Usage |
|---------|---------|-------|
| `@repo/upload-client` | XHR upload with progress | Already used by `useS3Upload`, continue using |
| `zod` | Schema validation | Define all types (CompressionConfig, PresignedUrlResponse, etc.) |
| `@repo/logger` | Logging | Replace console.log calls |
| `browser-image-compression` | Image compression | Move to package dependencies (exact version from wishlist) |
| `heic2any` | HEIC conversion | Move to package dependencies (exact version from wishlist) |

### Import Policy
- All imports from package use workspace name: `@repo/upload/*`
- No deep relative imports across package boundaries
- No barrel files (no `index.ts` re-exports)
- Direct imports from source files: `@repo/upload/image/compression`

## Architecture Notes

### Package Structure (Created by REPA-001)
```
packages/core/upload/
├── src/
│   ├── image/
│   │   ├── compression/
│   │   │   ├── index.ts          # compressImage, getPresetByName
│   │   │   ├── __types__/
│   │   │   │   └── index.ts      # Zod schemas
│   │   │   └── __tests__/
│   │   │       └── compression.test.ts
│   │   ├── heic/
│   │   │   ├── index.ts          # convertHEICToJPEG, isHEIC
│   │   │   ├── __types__/
│   │   │   │   └── index.ts
│   │   │   └── __tests__/
│   │   │       └── heic.test.ts
│   │   └── presets/
│   │       ├── index.ts          # COMPRESSION_PRESETS, getPresetByName
│   │       ├── __types__/
│   │       │   └── index.ts
│   │       └── __tests__/
│   │           └── presets.test.ts
│   ├── hooks/
│   │   ├── useUpload.ts          # Generalized upload hook
│   │   ├── __types__/
│   │   │   └── index.ts          # PresignedUrlResponse, UploadState
│   │   └── __tests__/
│   │       └── useUpload.test.tsx
│   └── types/
│       └── index.ts              # Shared types
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Type Definitions (Zod-First)

**Compression Config**:
```typescript
import { z } from 'zod'

const CompressionConfigSchema = z.object({
  preset: z.enum(['low-bandwidth', 'balanced', 'high-quality']).optional(),
  maxSizeMB: z.number().positive().optional(),
  maxWidthOrHeight: z.number().positive().optional(),
  useWebWorker: z.boolean().optional(),
  onProgress: z.function()
    .args(z.number().min(0).max(100), z.string())
    .returns(z.void())
    .optional()
})

type CompressionConfig = z.infer<typeof CompressionConfigSchema>
```

**Presigned URL Response**:
```typescript
const PresignedUrlResponseSchema = z.object({
  url: z.string().url(),
  fields: z.record(z.string()).optional()
})

type PresignedUrlResponse = z.infer<typeof PresignedUrlResponseSchema>
```

**Upload State**:
```typescript
const UploadStateSchema = z.object({
  status: z.enum(['idle', 'converting', 'compressing', 'uploading', 'success', 'error']),
  progress: z.number().min(0).max(100),
  phase: z.enum(['converting', 'compressing', 'uploading']).optional(),
  error: z.instanceof(Error).nullable()
})

type UploadState = z.infer<typeof UploadStateSchema>
```

### Generalized Hook API

**Before (wishlist-specific)**:
```typescript
const { upload, progress, status, error } = useS3Upload()
// RTK Query mutation baked in
```

**After (generic)**:
```typescript
const { upload, progress, status, error, retry } = useUpload({
  getPresignedUrl: async (file: File) => {
    const response = await getWishlistImagePresignUrl({ filename: file.name })
    return { url: response.url, fields: response.fields }
  }
})

// Call upload
await upload(file, { preset: 'balanced' })
```

### Error Handling Strategy
- Hook returns error states (no thrown errors)
- Consuming apps display error messages
- All errors logged via `@repo/logger`
- Retry function exposed for user-initiated retries

### WebP Fallback Behavior
- If preset specifies WebP but browser doesn't support it:
  - Log warning via `@repo/logger`
  - Fall back to JPEG output
  - Do NOT error or block upload

## Infrastructure Notes

- **Build order**: Turborepo ensures `@repo/upload` builds before apps
- **Dependency management**: Use exact versions from wishlist app for `browser-image-compression` (v2.0.2) and `heic2any` (v0.0.4)
- **Bundle size**: Monitor for duplicate dependencies in CI
- **Type checking**: Package type-checks in isolation before apps import

## Test Plan

### Scope Summary
- **Endpoints touched**: Presigned URL endpoint (indirect via hook refactoring)
- **UI touched**: No (code migration only)
- **Data/storage touched**: No

### Happy Path Tests
1. **Browser-side compression with preset**
   - Mock 2MB JPEG, compress with "balanced" preset
   - Assert file size reduced, aspect ratio preserved, progress callbacks fired

2. **HEIC to JPEG conversion**
   - Mock HEIC file, verify `isHEIC()` returns true
   - Convert to JPEG, assert MIME type changed, dimensions preserved

3. **Generalized useUpload hook**
   - Mock custom presigned URL provider
   - Upload HEIC file with compression
   - Assert phases transition correctly: converting → compressing → uploading

4. **Wishlist app still works**
   - Playwright E2E: Upload HEIC photo via wishlist form
   - Assert progress bar visible, image displays in gallery

### Error Cases
1. **Invalid file type**: Pass PDF to `compressImage`, assert error
2. **HEIC conversion fails**: Mock heic2any error, assert error logged
3. **Presigned URL request fails**: Mock rejection, assert status === 'error'
4. **S3 upload fails**: Mock XHR error, assert progress stops

### Edge Cases
1. **Very large file (10MB)**: Compress with low-bandwidth preset, assert <500KB output
2. **Already compressed file**: Minimal size reduction, no quality loss
3. **Concurrent uploads**: Two simultaneous uploads, isolated progress tracking
4. **Invalid preset name**: Assert null or error returned
5. **WebP unsupported browser**: Falls back to JPEG, warning logged

### Required Tooling Evidence
- **Playwright**: Wishlist upload E2E test passes
- **Vitest**: Package unit tests pass with 80%+ coverage
- **CI checkpoints**: `pnpm build --filter=@repo/upload`, `pnpm test --filter=@repo/upload`

### Risks
- Dependency version conflicts (mitigate: use exact versions)
- Type safety loss (mitigate: Zod schemas for all APIs)
- Progress callback inconsistency (mitigate: document contract)
- S3 presigned URL shape assumptions (mitigate: define schema)

## UI/UX Notes

No UI changes in this story. This is a code organization refactor only.

**Preserved Behaviors**:
- Progress indicators work identically
- Error messages remain unchanged
- Toast notifications preserved
- Upload flow timing unchanged

**Verification**:
- Visual regression test (screenshot comparison before/after)
- Manual QA: Upload HEIC photo in wishlist, compare UX to baseline

## Reality Baseline

### Existing Features (Do Not Break)
| Feature | Location | Status | Story |
|---------|----------|--------|-------|
| Image compression | `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` | Active | WISH-2022, WISH-2046, WISH-2058 |
| HEIC conversion | `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` | Active | WISH-2045 |
| useS3Upload hook | `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts` | Active | wishlist-specific |
| Backend Sharp optimizer | `apps/api/lego-api/core/image-processing/optimizer.ts` | Active | WISH-2016 |
| Upload client package | `packages/core/upload-client` | Active | XHR upload with progress |

### Active In-Progress Work
No conflicts detected (per STORY-SEED.md).

### Constraints to Respect
- **Reuse First (Non-Negotiable)**: Leverage existing packages (`@repo/upload-client`, `@repo/logger`)
- **Package Boundary Rules**: Core logic in `packages/core/*`
- **Import Policy**: Shared code via workspace package names, no deep relative imports
- **ADR-001**: API path schema (no changes required)
- **ADR-003**: CloudFront in front of S3 with OAC (no changes required)

### Dependencies
- **Depends on**: REPA-001 (Create @repo/upload Package Structure)
- **Blocks**: REPA-005 (Migrate Upload Components)

## Predictions

```yaml
predictions:
  split_risk: 0.4
  review_cycles: 2
  token_estimate: 150000
  confidence: low
  similar_stories: []
  generated_at: "2026-02-10T00:00:00Z"
  model: haiku
  wkfl_version: "007-v1"
```

**Confidence Rationale**: Low confidence due to no similar stories found in KB and WKFL-006 patterns unavailable. Predictions based on heuristics only.

## Completion Criteria

### Definition of Done
- [ ] All 7 ACs marked complete
- [ ] Package builds in isolation: `pnpm build --filter=@repo/upload` passes
- [ ] Package tests pass: `pnpm test --filter=@repo/upload` passes (80%+ coverage)
- [ ] Wishlist app tests pass: `pnpm test --filter=app-wishlist-gallery` passes
- [ ] Wishlist E2E tests pass: Playwright upload flow green
- [ ] Type checking passes: `pnpm check-types` for package and wishlist app
- [ ] No console errors in browser during upload
- [ ] Bundle size check: Wishlist app bundle <5% increase
- [ ] Visual regression test passes
- [ ] Code review approved
- [ ] Documentation updated (package README with usage examples)

### Evidence Required
1. CI pipeline green for all jobs
2. Playwright test artifacts (video, trace)
3. Bundle size comparison report
4. Test coverage report (80%+)
5. Type coverage report (no `any` in public API)

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-11_

### MVP Gaps Resolved
| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| 1 | Missing useUpload hook tests | Core validation of generalized hook behavior. Created test AC for React Testing Library coverage of upload orchestration, error states, and retry logic. | AC-8 |
| 2 | Dependency on REPA-001 (package structure) | Blocks story start. Cannot extract code to @repo/upload without package structure in place. Added verification AC. | AC-9 |
| 3 | No verification of presigned URL schema compatibility | Risk of runtime errors if schema assumptions wrong. Must verify PresignedUrlResponse schema matches RTK Query mutation output. | AC-10 |

### Non-Blocking Items (Logged for Future Reference)
| # | Finding | Category | Status |
|---|---------|----------|--------|
| 1 | No retry mechanism in useUpload hook | edge-case | Documented for future enhancement |
| 2 | WebP fallback behavior not tested | edge-case | Documented for future enhancement |
| 3 | Concurrent upload isolation not verified | edge-case | Documented for future enhancement |
| 4 | Progress callback contract not documented | ux-polish | Documented for future enhancement |
| 5 | No bundle size impact analysis tool | observability | Documented for future enhancement |
| 6 | HEIC burst photo handling edge case | edge-case | Documented for future enhancement |
| 7 | Compression result not exposed in hook | ux-polish | Documented for future enhancement |

### Summary
- MVP ACs added: 3 (AC-8, AC-9, AC-10)
- Non-blocking gaps documented: 7
- Enhancement opportunities documented: 8
- KB entries created: 0 (KB unavailable)
- Mode: autonomous
- Story sizing: Upper boundary (10 ACs total) but acceptable for refactor scope

**Status**: Ready to proceed after REPA-001 verification

---

**Story Status**: ready-to-work
**Next Steps**: Start implementation after confirming REPA-001 completion
