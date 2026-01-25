# STORY-007 Backend Implementation Log

---

## Chunk 1 — Add Image Operation Schemas to Types

- **Objective (maps to story requirement/AC)**: AC-5 - Add schemas for image operations (FlagImageInputSchema, ListImagesFiltersSchema, SearchImagesFiltersSchema, ImageListResponseSchema, FlagResultSchema)
- **Files changed**:
  - `packages/backend/gallery-core/src/__types__/index.ts`
- **Summary of changes**:
  - Added `ListImagesFiltersSchema` - pagination + optional albumId filter
  - Added `SearchImagesFiltersSchema` - pagination + required search term
  - Added `FlagImageInputSchema` - imageId (required) + reason (optional)
  - Added `ImageListResponseSchema` - data array + pagination
  - Added `FlagResultSchema` - flag record response
  - Added `FlagRowSchema` - DB row format for gallery_flags
- **Reuse compliance**:
  - Reused: `PaginationSchema`, `GalleryImageSchema` (existing), `uuidRegex` (existing)
  - New: Image-specific filter schemas and flag schemas
  - Why new was necessary: These are new operations not covered by album schemas
- **Ports & adapters note**:
  - What stayed in core: All schemas are transport-agnostic Zod definitions
  - What stayed in adapters: N/A (types only)
- **Commands run**:
  - `pnpm check-types --filter=@repo/gallery-core`
- **Notes / Risks**: None

---

## Chunk 2 — Implement get-image.ts Core Function + Test

- **Objective (maps to story requirement/AC)**: AC-1 - Get Image Endpoint, AC-5 - Core function getGalleryImage
- **Files changed**:
  - `packages/backend/gallery-core/src/get-image.ts` (CREATE)
  - `packages/backend/gallery-core/src/__tests__/get-image.test.ts` (CREATE)
- **Summary of changes**:
  - Created `getGalleryImage` core function with DI for DB client
  - Implements ownership check (returns FORBIDDEN if userId mismatch)
  - Returns NOT_FOUND for non-existent image
  - Transforms DB Date objects to ISO strings
  - Added 6 test cases covering: happy path, NOT_FOUND, FORBIDDEN, date transform, full fields, DB_ERROR
- **Reuse compliance**:
  - Reused: `GalleryImageSchema`, `ImageRow` type from __types__
  - New: `GetImageDbClient`, `GetImageSchema`, `GetImageResult` interfaces
  - Why new was necessary: DI interfaces specific to this operation
- **Ports & adapters note**:
  - What stayed in core: Business logic (ownership check, data transform)
  - What stayed in adapters: N/A (core function only)
- **Commands run**:
  - `pnpm --filter=@repo/gallery-core exec tsc --noEmit` (passed)
- **Notes / Risks**: None

---

## Chunk 3 — Implement list-images.ts Core Function + Test

- **Objective (maps to story requirement/AC)**: AC-2 - List Images Endpoint, AC-5 - Core function listGalleryImages
- **Files changed**:
  - `packages/backend/gallery-core/src/list-images.ts` (CREATE)
  - `packages/backend/gallery-core/src/__tests__/list-images.test.ts` (CREATE)
- **Summary of changes**:
  - Created `listGalleryImages` core function with DI for DB client
  - Supports pagination (page, limit) with cap at 100
  - Supports optional albumId filter
  - When albumId not provided, returns standalone images (albumId IS NULL) - handled in Vercel handler
  - Added 7 test cases covering: paginated results, albumId filter, standalone filter, empty results, limit cap, totalPages calculation, date transform
- **Reuse compliance**:
  - Reused: `ImageListResponseSchema`, `GalleryImageSchema`, `ListImagesFilters` from __types__
  - New: `ListImagesDbClient`, `ListImagesSchema` interfaces
  - Why new was necessary: DI interfaces specific to this operation
- **Ports & adapters note**:
  - What stayed in core: Pagination logic, data transformation
  - What stayed in adapters: WHERE clause building (albumId IS NULL logic)
- **Commands run**:
  - `pnpm --filter=@repo/gallery-core exec tsc --noEmit` (passed)
- **Notes / Risks**: None

---

## Chunk 4 — Implement search-images.ts Core Function + Test

- **Objective (maps to story requirement/AC)**: AC-3 - Search Images Endpoint, AC-5 - Core function searchGalleryImages
- **Files changed**:
  - `packages/backend/gallery-core/src/search-images.ts` (CREATE)
  - `packages/backend/gallery-core/src/__tests__/search-images.test.ts` (CREATE)
- **Summary of changes**:
  - Created `searchGalleryImages` core function with DI for DB client
  - Returns discriminated union result (success/error)
  - Validates search term is non-empty
  - Returns empty array (not error) when no matches
  - Supports pagination with cap at 100
  - Added 8 test cases covering: matching results, multi-field search, empty results, pagination, empty search validation, whitespace validation, limit cap, DB error
- **Reuse compliance**:
  - Reused: `ImageListResponseSchema`, `GalleryImageSchema`, `SearchImagesFilters` from __types__
  - New: `SearchImagesDbClient`, `SearchImagesSchema`, `SearchImagesResult` interfaces
  - Why new was necessary: DI interfaces specific to this operation
- **Ports & adapters note**:
  - What stayed in core: Validation, pagination, data transformation
  - What stayed in adapters: ILIKE query building (PostgreSQL specific)
- **Commands run**:
  - `pnpm --filter=@repo/gallery-core exec tsc --noEmit` (passed)
- **Notes / Risks**: None

---

## Chunk 5 — Implement flag-image.ts Core Function + Test

- **Objective (maps to story requirement/AC)**: AC-4 - Flag Image Endpoint, AC-5 - Core function flagGalleryImage
- **Files changed**:
  - `packages/backend/gallery-core/src/flag-image.ts` (CREATE)
  - `packages/backend/gallery-core/src/__tests__/flag-image.test.ts` (CREATE)
- **Summary of changes**:
  - Created `flagGalleryImage` core function with DI for DB client
  - Checks image exists (NOT_FOUND if not)
  - Checks for existing flag by same user (CONFLICT if exists)
  - Handles PostgreSQL unique constraint violation (23505) as CONFLICT
  - Inserts flag record with optional reason
  - Added 8 test cases covering: create flag, with reason, without reason, NOT_FOUND, CONFLICT (check), CONFLICT (constraint), DB_ERROR, date transform
- **Reuse compliance**:
  - Reused: `FlagResultSchema`, `FlagImageInput`, `FlagResult`, `FlagRow` from __types__
  - New: `FlagImageDbClient`, `FlagImageSchema`, `FlagImageResult` interfaces
  - Why new was necessary: DI interfaces specific to this operation
- **Ports & adapters note**:
  - What stayed in core: Validation, existence check, conflict check, insert logic
  - What stayed in adapters: N/A (core function only)
- **Commands run**:
  - `pnpm --filter=@repo/gallery-core exec tsc --noEmit` (passed)
- **Notes / Risks**: None

---

## Chunk 6 — Update gallery-core Exports

- **Objective (maps to story requirement/AC)**: AC-5 - Export getGalleryImage, listGalleryImages, searchGalleryImages, flagGalleryImage
- **Files changed**:
  - `packages/backend/gallery-core/src/index.ts`
- **Summary of changes**:
  - Added exports for 4 new core functions: getGalleryImage, listGalleryImages, searchGalleryImages, flagGalleryImage
  - Added type exports for DI interfaces: GetImageDbClient, ListImagesDbClient, SearchImagesDbClient, FlagImageDbClient
  - Added type exports for result types: GetImageResult, SearchImagesResult, FlagImageResult
  - Added schema and type exports for image operations: ListImagesFilters, SearchImagesFilters, FlagImageInput, ImageListResponse, FlagRow, FlagResult
- **Reuse compliance**:
  - Reused: Existing index.ts structure with album exports
  - New: Image function and type exports
  - Why new was necessary: New functionality requires exports
- **Ports & adapters note**:
  - What stayed in core: All exports
  - What stayed in adapters: N/A
- **Commands run**:
  - `pnpm --filter=@repo/gallery-core exec tsc --noEmit` (passed)
- **Notes / Risks**: None

---

## Chunk 7 — Create Vercel Handlers (4 Handlers)

- **Objective (maps to story requirement/AC)**: AC-1, AC-2, AC-3, AC-4 - All image endpoints
- **Files changed**:
  - `apps/api/platforms/vercel/api/gallery/images/[id].ts` (CREATE)
  - `apps/api/platforms/vercel/api/gallery/images/index.ts` (CREATE)
  - `apps/api/platforms/vercel/api/gallery/images/search.ts` (CREATE)
  - `apps/api/platforms/vercel/api/gallery/images/flag.ts` (CREATE)
- **Summary of changes**:
  - `[id].ts`: GET single image, validates UUID, checks ownership, returns 400/401/403/404/200
  - `index.ts`: GET list images with pagination, supports albumId filter, standalone images when no albumId
  - `search.ts`: GET search images with PostgreSQL ILIKE across title/description/tags
  - `flag.ts`: POST flag image, validates body, checks image exists, checks duplicate flag
  - All handlers use inline schema (Drizzle), AUTH_BYPASS for dev auth, singleton DB pool
- **Reuse compliance**:
  - Reused: Handler pattern from albums/[id].ts, inline schema pattern, auth pattern
  - New: 4 new handler files
  - Why new was necessary: New endpoints require new handler files
- **Ports & adapters note**:
  - What stayed in core: N/A (handlers call DB directly per existing pattern)
  - What stayed in adapters: HTTP concerns, request/response handling, Drizzle queries
- **Commands run**:
  - `pnpm --filter=@repo/gallery-core exec tsc --noEmit` (passed)
- **Notes / Risks**: Fixed unused import in list-images.ts (ImageRow)

---

## Chunk 8 — Update vercel.json Routes

- **Objective (maps to story requirement/AC)**: Story section 9 - Vercel Configuration
- **Files changed**:
  - `apps/api/platforms/vercel/vercel.json`
- **Summary of changes**:
  - Added 4 new routes for image endpoints
  - Routes ordered correctly: specific routes (/search, /flag) before parameterized route (/:id)
  - `/api/gallery/images/search` -> `search.ts`
  - `/api/gallery/images/flag` -> `flag.ts`
  - `/api/gallery/images/:id` -> `[id].ts`
  - `/api/gallery/images` -> `index.ts`
- **Reuse compliance**:
  - Reused: Existing vercel.json structure and route pattern
  - New: 4 route entries
  - Why new was necessary: New endpoints require routing
- **Ports & adapters note**:
  - What stayed in core: N/A
  - What stayed in adapters: Vercel routing configuration
- **Commands run**: N/A (JSON file)
- **Notes / Risks**: Route order is critical - specific routes must come before parameterized

---

## Chunk 9 — Update Seed Data

- **Objective (maps to story requirement/AC)**: AC-6 - Seed data requirements
- **Files changed**:
  - `apps/api/core/database/seeds/gallery.ts`
- **Summary of changes**:
  - Added 5 new STORY-007 images with specific UUIDs per story requirements:
    - `11111111-...` Castle Tower Photo (standalone, dev-user) - happy path get/list
    - `22222222-...` Space Station Build (in Space Collection album) - album filter test
    - `33333333-...` Medieval Knight (standalone, dev-user) - search test ("medieval")
    - `44444444-...` Already Flagged Image (standalone, dev-user) - flag conflict test
    - `55555555-...` Private Image (standalone, other-user) - 403 test
  - Added Space Collection album (`aaaaaaaa-...`) for album filter test
  - Added gallery_flags record for pre-flagged image (44444444) - 409 conflict test
  - Kept existing STORY-006 images and albums for backward compatibility
  - All inserts use ON CONFLICT DO UPDATE for idempotency
- **Reuse compliance**:
  - Reused: Existing seed pattern, upsert pattern
  - New: STORY-007 specific test data
  - Why new was necessary: Test scenarios require specific deterministic data
- **Ports & adapters note**:
  - What stayed in core: N/A
  - What stayed in adapters: N/A (seed data)
- **Commands run**: N/A (requires running `pnpm seed` with database)
- **Notes / Risks**: None

---

## Chunk 10 — Update __http__/gallery.http with Image Requests

- **Objective (maps to story requirement/AC)**: AC-7 - HTTP Contract Verification
- **Files changed**:
  - `__http__/gallery.http`
- **Summary of changes**:
  - Added GALLERY IMAGES API CONTRACT TESTS section
  - Added GET Image requests:
    - `getGalleryImage` - 200 happy path (image 11111111)
    - `getGalleryImage404` - 404 non-existent image
    - `getGalleryImage403` - 403 other user's image (55555555)
    - `getGalleryImage400` - 400 invalid UUID
  - Added LIST Images requests:
    - `listGalleryImages` - 200 standalone images
    - `listGalleryImagesWithAlbum` - 200 with albumId filter
    - `listGalleryImagesPagination` - 200 with page/limit
    - `listGalleryImagesEmpty` - 200 page beyond total
    - `listGalleryImagesInvalidAlbum` - 400 invalid albumId
  - Added SEARCH Images requests:
    - `searchGalleryImages` - 200 search for "medieval"
    - `searchGalleryImagesCastle` - 200 search for "castle"
    - `searchGalleryImagesNoMatch` - 200 empty results
    - `searchGalleryImagesPagination` - 200 with pagination
    - `searchGalleryImagesMissing` - 400 missing search param
    - `searchGalleryImagesEmpty` - 400 empty search param
  - Added FLAG Image requests:
    - `flagGalleryImage` - 201 with reason
    - `flagGalleryImageNoReason` - 201 without reason
    - `flagGalleryImageConflict` - 409 already flagged (44444444)
    - `flagGalleryImage400` - 400 invalid imageId
    - `flagGalleryImage404` - 404 non-existent image
- **Reuse compliance**:
  - Reused: Existing gallery.http structure, variable pattern
  - New: 20 new HTTP requests for image endpoints
  - Why new was necessary: Contract testing requires all endpoint variations
- **Ports & adapters note**:
  - What stayed in core: N/A
  - What stayed in adapters: N/A (test file)
- **Commands run**:
  - `pnpm --filter=@repo/gallery-core exec tsc --noEmit` (passed)
  - `pnpm --filter=@repo/gallery-core test` (57 tests passed)
- **Notes / Risks**: None

---

## Final Verification

- **Type Check**: `pnpm --filter=@repo/gallery-core exec tsc --noEmit` - PASSED
- **Unit Tests**: `pnpm --filter=@repo/gallery-core test` - 57 tests PASSED (9 test files)
- **New Test Files**:
  - `get-image.test.ts` - 6 tests
  - `list-images.test.ts` - 7 tests
  - `search-images.test.ts` - 8 tests
  - `flag-image.test.ts` - 8 tests

---

BACKEND COMPLETE
