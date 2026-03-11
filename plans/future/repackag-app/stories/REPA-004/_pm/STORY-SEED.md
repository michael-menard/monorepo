---
generated: "2026-02-10"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: REPA-004

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No active baseline reality file exists for this epic. Proceeded with codebase scanning only.

### Relevant Existing Features
| Feature | Location | Status |
|---------|----------|--------|
| Image compression (browser-side) | `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` | Active - WISH-2022, WISH-2046, WISH-2058 |
| HEIC conversion (browser-side) | `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` | Active - WISH-2045 |
| useS3Upload hook | `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts` | Active - wishlist-specific |
| Image processing (backend) | `apps/api/lego-api/core/image-processing/optimizer.ts` | Active - WISH-2016 (Sharp-based) |
| Image processing package | `packages/backend/image-processing/src/index.ts` | Active - basic Sharp wrapper |
| Upload client package | `packages/core/upload-client` | Active - XHR upload with progress tracking |

### Active In-Progress Work
No baseline available to detect active work. Git status shows untracked backup files but no active story conflicts detected.

### Constraints to Respect
- **Reuse First (Non-Negotiable)**: Must leverage existing packages where possible
- **Package Boundary Rules**:
  - Core logic in `packages/core/*`
  - Backend utilities in `packages/backend/*`
  - Frontend components in `packages/core/app-component-library`
- **Import Policy**: Shared code MUST be imported via workspace package names, no deep relative imports

---

## Retrieved Context

### Related Endpoints
- Presigned URL endpoint for wishlist images (RTK Query: `useGetWishlistImagePresignUrlMutation`)
- Backend image processing (Sharp-based optimizer in API)

### Related Components
- `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` - Full implementation of:
  - Browser-based image compression (browser-image-compression library)
  - HEIC to JPEG conversion (heic2any library)
  - Compression presets (low-bandwidth, balanced, high-quality)
  - WebP conversion
  - Progress tracking
- `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts` - Upload orchestration hook:
  - HEIC conversion → compression → S3 upload flow
  - Progress tracking for each phase
  - Validation (file size, MIME types)
  - Preset selection
  - Background compression support
- `apps/api/lego-api/core/image-processing/optimizer.ts` - Backend Sharp-based optimizer:
  - Multi-size generation (thumbnail, medium, large)
  - Watermark application
  - WebP conversion
  - Aspect ratio preservation

### Reuse Candidates
| Package | Purpose | Current Usage |
|---------|---------|---------------|
| `@repo/upload-client` | XHR upload with progress tracking | Used by useS3Upload for presigned URL uploads |
| `packages/backend/image-processing` | Basic Sharp wrapper | Exists but underutilized |
| `packages/core/upload-types` | Upload-related types | Exists for type sharing |

---

## Knowledge Context

### Lessons Learned
No lessons loaded (Knowledge Base search skipped per agent constraints).

### Blockers to Avoid (from past stories)
- None identified (no KB access in this session)

### Architecture Decisions (ADRs)
| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Frontend: /api/v2/{domain}, Backend: /{domain} |
| ADR-003 | Image Storage and CDN Architecture | CloudFront in front of S3 with OAC |

**Note**: ADR-003 is relevant for understanding the upload flow - presigned S3 uploads followed by CloudFront URL conversion on read.

### Patterns to Follow
- Use Zod schemas for all types (per CLAUDE.md)
- Component directory structure with `__types__/` and `utils/` subdirectories
- Hexagonal architecture (ports/adapters) for backend services
- Progressive enhancement (compression, then upload, with fallbacks)

### Patterns to Avoid
- No barrel files (index.ts re-exports)
- No deep relative imports across package boundaries
- No console.log (use @repo/logger)
- No TypeScript interfaces without Zod schemas

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Migrate Image Processing to Shared Package

### Description

**Context:**
The wishlist gallery app contains well-implemented image processing functionality (compression, HEIC conversion, WebP transformation, presets) that is tightly coupled to the wishlist domain. This code could benefit other apps (instructions gallery, inspiration gallery, MOC uploads) but is not currently reusable.

Additionally, there's fragmentation in image processing:
- **Browser-side**: `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` (450+ lines, comprehensive)
- **Backend-side**:
  - `apps/api/lego-api/core/image-processing/optimizer.ts` (Sharp-based, multi-size generation)
  - `packages/backend/image-processing/src/index.ts` (basic Sharp wrapper, underutilized)

There's also a domain-specific hook (`useS3Upload`) that orchestrates HEIC conversion → compression → upload, which could be generalized.

**Problem:**
1. Image processing logic is duplicated and scattered across apps
2. No shared package for browser-side compression/conversion
3. Backend image processing exists in multiple places
4. Upload orchestration is wishlist-specific despite being a common need
5. Future apps will need to re-implement or copy-paste this functionality

**Proposed Solution:**
Create a unified `@repo/upload` package with clear separation of concerns:
- `@repo/upload/image` - Browser-side image processing (compression, HEIC conversion, presets, WebP)
- `@repo/upload/hooks` - Generalized upload orchestration hook (extracted from useS3Upload)
- Enhance `packages/backend/image-processing` to consolidate backend Sharp logic

This enables:
- Gallery apps to share image processing logic
- Instructions upload to leverage compression presets
- Inspiration gallery to use HEIC conversion
- MOC uploads to benefit from WebP transformation
- Consistent compression behavior across all upload surfaces

### Initial Acceptance Criteria
- [ ] AC-1: Create `@repo/upload` package under `packages/core/upload`
- [ ] AC-2: Extract browser-side compression to `@repo/upload/image/compression`
  - Move `compressImage`, `getPresetByName`, compression presets
  - Preserve existing functionality (presets, WebP conversion, progress callbacks)
  - Include Zod schemas for configuration types
- [ ] AC-3: Extract HEIC conversion to `@repo/upload/image/heic`
  - Move `convertHEICToJPEG`, `isHEIC`, HEIC detection logic
  - Preserve progress tracking and error handling
- [ ] AC-4: Extract presets to `@repo/upload/image/presets`
  - Move `COMPRESSION_PRESETS`, `getPresetByName`, `isValidPresetName`
  - Export as reusable configuration objects
- [ ] AC-5: Generalize `useS3Upload` hook to `@repo/upload/hooks/useUpload`
  - Remove wishlist-specific dependencies (RTK Query mutation)
  - Accept presigned URL function as parameter
  - Preserve orchestration flow (convert → compress → upload)
  - Maintain progress tracking for all phases
- [ ] AC-6: Update wishlist gallery to import from `@repo/upload`
  - Replace local imports with package imports
  - Ensure all existing tests pass
  - No behavior changes
- [ ] AC-7: Consolidate backend image processing (optional stretch goal)
  - Enhance `packages/backend/image-processing` with optimizer logic
  - Deprecate `apps/api/lego-api/core/image-processing/optimizer.ts` in favor of package

### Non-Goals
- NOT migrating backend image processing in this story (can be deferred to follow-up)
- NOT creating new compression algorithms or presets
- NOT changing compression behavior or quality settings
- NOT modifying S3 upload flow or presigned URL generation
- NOT refactoring the wishlist form component itself

### Reuse Plan
- **Components**:
  - Extract from `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts`
  - Extract from `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts`
- **Patterns**:
  - Hexagonal architecture for image processing (port/adapter)
  - Zod schemas for all configuration types
  - Progress callback pattern from existing implementation
  - Preset-based configuration from WISH-2046
- **Packages**:
  - Leverage `@repo/upload-client` for XHR upload (already used)
  - Use `zod` for schema validation
  - Use `@repo/logger` for debug logging
  - Keep external dependencies: `browser-image-compression`, `heic2any`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- Focus on migration safety: ensure all existing wishlist tests pass after package extraction
- Consider integration tests that verify the new package works with multiple consumers
- Test coverage for generalized `useUpload` hook with different presigned URL providers
- Validate that compression presets behave identically pre/post-migration

### For UI/UX Advisor
- No UI changes expected - this is a code organization story
- Verify that progress indicators still work correctly after hook generalization
- Ensure error messages and toasts remain user-friendly in wishlist app

### For Dev Feasibility
- Consider dependency management: `browser-image-compression` and `heic2any` will become package dependencies
- Evaluate TypeScript complexity of making `useUpload` generic across presigned URL providers
- Plan for gradual adoption: wishlist migrates first, other apps adopt incrementally
- Consider versioning strategy if API surface changes during extraction
- Identify potential circular dependencies between `@repo/upload` and other packages

---

**STORY-SEED COMPLETE WITH WARNINGS: 1 warning**

**Warning**: No active baseline reality file exists. Proceeded with codebase scanning only. Future conflicts with in-progress work may not be detected.
