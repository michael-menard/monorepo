# STORY-007 Implementation Plan: Gallery - Images Read

---

## Scope Surface

| Area | In Scope |
|------|----------|
| Backend/API | YES |
| Frontend/UI | NO |
| Infra/Config | YES |

**Notes**:
- Extends existing `packages/backend/gallery-core/` package with image operations
- Creates 4 new Vercel handlers under `apps/api/platforms/vercel/api/gallery/images/`
- Updates `vercel.json` routing and seed data
- No frontend changes required

---

## Acceptance Criteria Checklist

### AC-1: Get Image Endpoint
- [ ] `GET /api/gallery/images/:id` returns image object for valid ID
- [ ] Returns 404 for non-existent image
- [ ] Returns 403 for image owned by different user
- [ ] Returns 400 for invalid UUID format
- [ ] Returns 401 when auth bypass disabled and no token

### AC-2: List Images Endpoint
- [ ] `GET /api/gallery/images` returns paginated array
- [ ] Supports `page` and `limit` params (defaults: page=1, limit=20)
- [ ] Supports `albumId` filter for images in specific album
- [ ] Without `albumId`, returns only standalone images (albumId=null)
- [ ] Sorted by `createdAt` DESC
- [ ] Response includes pagination metadata

### AC-3: Search Images Endpoint
- [ ] `GET /api/gallery/images/search` accepts `search` param (required)
- [ ] Searches across `title`, `description`, `tags` with PostgreSQL ILIKE
- [ ] Supports pagination (defaults: page=1, limit=20)
- [ ] Returns empty array when no matches (not error)
- [ ] Returns 400 if `search` param missing/empty

### AC-4: Flag Image Endpoint
- [ ] `POST /api/gallery/images/flag` accepts `{ imageId, reason? }`
- [ ] Creates record in `gallery_flags` table
- [ ] Returns 201 with flag confirmation
- [ ] Returns 409 if user already flagged this image
- [ ] Returns 400 for invalid imageId format
- [ ] `reason` field is optional

### AC-5: Extend gallery-core Package
- [ ] Add to existing `packages/backend/gallery-core/`
- [ ] Export: `getGalleryImage`, `listGalleryImages`, `searchGalleryImages`, `flagGalleryImage`
- [ ] Add schemas: `FlagImageInputSchema`, `ListImagesFiltersSchema`, `SearchImagesFiltersSchema`
- [ ] Unit tests for all new core functions
- [ ] Follow patterns from existing album functions

### AC-6: Seed Data
- [ ] 5+ gallery images with varied tags/titles
- [ ] 1+ album with images assigned
- [ ] 1 pre-flagged image for conflict testing
- [ ] Idempotent (safe to run multiple times)

### AC-7: HTTP Contract Verification
- [ ] All image requests in `__http__/gallery.http`
- [ ] Happy path and error cases documented

---

## Files To Touch (Expected)

### Gallery Core Package (MODIFY)
| File | Action |
|------|--------|
| `packages/backend/gallery-core/src/__types__/index.ts` | ADD schemas for image operations |
| `packages/backend/gallery-core/src/get-image.ts` | CREATE |
| `packages/backend/gallery-core/src/list-images.ts` | CREATE |
| `packages/backend/gallery-core/src/search-images.ts` | CREATE |
| `packages/backend/gallery-core/src/flag-image.ts` | CREATE |
| `packages/backend/gallery-core/src/index.ts` | ADD exports for image functions |
| `packages/backend/gallery-core/src/__tests__/get-image.test.ts` | CREATE |
| `packages/backend/gallery-core/src/__tests__/list-images.test.ts` | CREATE |
| `packages/backend/gallery-core/src/__tests__/search-images.test.ts` | CREATE |
| `packages/backend/gallery-core/src/__tests__/flag-image.test.ts` | CREATE |

### Vercel Handlers (CREATE)
| File | Action |
|------|--------|
| `apps/api/platforms/vercel/api/gallery/images/[id].ts` | CREATE - GET single image |
| `apps/api/platforms/vercel/api/gallery/images/index.ts` | CREATE - GET list images |
| `apps/api/platforms/vercel/api/gallery/images/search.ts` | CREATE - GET search images |
| `apps/api/platforms/vercel/api/gallery/images/flag.ts` | CREATE - POST flag image |

### Configuration (MODIFY)
| File | Action |
|------|--------|
| `apps/api/platforms/vercel/vercel.json` | ADD image endpoint routes |
| `apps/api/core/database/seeds/gallery.ts` | UPDATE with image/flag seed data |
| `__http__/gallery.http` | ADD image endpoint requests |

---

## Reuse Targets

### Packages to Reuse
| Package | Usage |
|---------|-------|
| `@repo/logger` | Logging in handlers |
| `@repo/gallery-core` | Extend with image operations |
| `packages/backend/db` | Schema reference for tables |

### Code Patterns to Follow
| Source | Pattern |
|--------|---------|
| `packages/backend/gallery-core/src/get-album.ts` | DB client interface, result type, ownership check |
| `packages/backend/gallery-core/src/list-albums.ts` | Pagination pattern, response schema |
| `apps/api/platforms/vercel/api/gallery/albums/[id].ts` | Vercel handler pattern, inline schema, auth |
| `apps/api/platforms/vercel/api/gallery/albums/list.ts` | List handler with pagination |
| `apps/api/platforms/vercel/api/wishlist/search.ts` | Search handler pattern (if exists) |
| `apps/api/core/database/seeds/gallery.ts` | Seed pattern with deterministic UUIDs |

---

## Architecture Notes (Ports & Adapters)

### Core Layer (packages/backend/gallery-core)
- **Pure business logic** - no HTTP concerns
- **Dependency injection** for DB client - enables unit testing with mocks
- **Zod validation** for all inputs
- **Discriminated union results** - `{ success: true, data }` or `{ success: false, error, message }`

### Adapter Layer (apps/api/platforms/vercel)
- **HTTP concerns only** - request parsing, response formatting
- **Auth extraction** - AUTH_BYPASS or JWT token
- **Inline schema definition** - matches existing pattern in album handlers
- **Error mapping** - core errors to HTTP status codes

### Infrastructure
- **Database**: `gallery_images`, `gallery_albums`, `gallery_flags` tables
- **Indexes**: Already exist for userId, albumId, createdAt

### Boundary Rules
- Vercel handlers DO NOT contain business logic
- Core functions DO NOT know about HTTP
- Schema validation happens at BOTH layers (Zod in core, parse in handler)

---

## Step-by-Step Plan (Small Steps)

### Phase 1: Core Types and Schemas (Foundation)

#### Step 1: Add Image Operation Schemas to Types
**Objective**: Define Zod schemas for image operation inputs/outputs
**Files**:
- `packages/backend/gallery-core/src/__types__/index.ts`

**Add**:
```typescript
// ListImagesFiltersSchema - pagination + albumId filter
// SearchImagesFiltersSchema - pagination + search term
// FlagImageInputSchema - imageId + optional reason
// ImageListResponseSchema - data array + pagination
// FlagResultSchema - flag record response
```

**Verification**: `pnpm check-types --filter=@repo/gallery-core`

---

#### Step 2: Implement get-image.ts Core Function
**Objective**: Create core function to get single image by ID with ownership check
**Files**:
- `packages/backend/gallery-core/src/get-image.ts` (CREATE)

**Pattern**: Follow `get-album.ts` exactly
- `GetImageDbClient` interface for DI
- `GetImageSchema` interface for table refs
- `GetImageResult` discriminated union
- Ownership validation (userId match)
- Transform Date to ISO string

**Verification**: `pnpm check-types --filter=@repo/gallery-core`

---

#### Step 3: Add get-image Unit Tests
**Objective**: Test core get-image function
**Files**:
- `packages/backend/gallery-core/src/__tests__/get-image.test.ts` (CREATE)

**Test Cases**:
1. Returns image for valid ID and matching user
2. Returns NOT_FOUND for non-existent ID
3. Returns FORBIDDEN for image owned by another user
4. Transforms dates to ISO strings correctly

**Verification**: `pnpm test --filter=@repo/gallery-core`

---

#### Step 4: Implement list-images.ts Core Function
**Objective**: Create core function to list images with pagination and albumId filter
**Files**:
- `packages/backend/gallery-core/src/list-images.ts` (CREATE)

**Logic**:
- If `albumId` provided: filter by albumId
- If `albumId` not provided: filter by `albumId IS NULL` (standalone images)
- Count total matching images
- Apply pagination (page, limit with cap at 100)
- Order by createdAt DESC

**Verification**: `pnpm check-types --filter=@repo/gallery-core`

---

#### Step 5: Add list-images Unit Tests
**Objective**: Test core list-images function
**Files**:
- `packages/backend/gallery-core/src/__tests__/list-images.test.ts` (CREATE)

**Test Cases**:
1. Returns paginated images for user
2. Filters by albumId when provided
3. Returns only standalone images when albumId not provided
4. Handles empty results
5. Caps limit at 100
6. Calculates totalPages correctly

**Verification**: `pnpm test --filter=@repo/gallery-core`

---

#### Step 6: Implement search-images.ts Core Function
**Objective**: Create core function to search images using PostgreSQL ILIKE
**Files**:
- `packages/backend/gallery-core/src/search-images.ts` (CREATE)

**Logic**:
- Validate search term is non-empty
- Build ILIKE conditions for title, description
- For tags (JSONB array): use `tags::text ILIKE` or `array_to_string`
- Apply pagination
- Return empty array (not error) for no matches

**Verification**: `pnpm check-types --filter=@repo/gallery-core`

---

#### Step 7: Add search-images Unit Tests
**Objective**: Test core search-images function
**Files**:
- `packages/backend/gallery-core/src/__tests__/search-images.test.ts` (CREATE)

**Test Cases**:
1. Returns matching images for search term
2. Searches across title, description, tags
3. Returns empty array when no matches
4. Supports pagination
5. Case-insensitive matching

**Verification**: `pnpm test --filter=@repo/gallery-core`

---

#### Step 8: Implement flag-image.ts Core Function
**Objective**: Create core function to flag image for moderation
**Files**:
- `packages/backend/gallery-core/src/flag-image.ts` (CREATE)

**Logic**:
- Validate imageId format
- Check image exists (return NOT_FOUND if not)
- Check for existing flag by same user (return CONFLICT if exists)
- Insert into gallery_flags table
- Return flag record

**Verification**: `pnpm check-types --filter=@repo/gallery-core`

---

#### Step 9: Add flag-image Unit Tests
**Objective**: Test core flag-image function
**Files**:
- `packages/backend/gallery-core/src/__tests__/flag-image.test.ts` (CREATE)

**Test Cases**:
1. Creates flag record successfully
2. Creates flag with optional reason
3. Creates flag without reason (null)
4. Returns NOT_FOUND for non-existent image
5. Returns CONFLICT for duplicate flag

**Verification**: `pnpm test --filter=@repo/gallery-core`

---

#### Step 10: Update gallery-core Exports
**Objective**: Export all new image functions from package index
**Files**:
- `packages/backend/gallery-core/src/index.ts`

**Add**:
```typescript
export { getGalleryImage } from './get-image.js'
export { listGalleryImages } from './list-images.js'
export { searchGalleryImages } from './search-images.js'
export { flagGalleryImage } from './flag-image.js'
// Plus types
```

**Verification**: `pnpm build --filter=@repo/gallery-core && pnpm check-types --filter=@repo/gallery-core`

---

### Phase 2: Vercel Handlers

#### Step 11: Create GET /api/gallery/images/:id Handler
**Objective**: Vercel handler for single image retrieval
**Files**:
- `apps/api/platforms/vercel/api/gallery/images/[id].ts` (CREATE)

**Pattern**: Follow `apps/api/platforms/vercel/api/gallery/albums/[id].ts`
- Only allow GET method
- Validate UUID format
- Get userId from AUTH_BYPASS
- Query image, check ownership
- Return 400/401/403/404/200 appropriately

**Verification**: Manual test with `vercel dev` (deferred to Step 17)

---

#### Step 12: Create GET /api/gallery/images Handler (List)
**Objective**: Vercel handler for listing images with pagination
**Files**:
- `apps/api/platforms/vercel/api/gallery/images/index.ts` (CREATE)

**Pattern**: Follow `apps/api/platforms/vercel/api/gallery/albums/list.ts`
- Parse page/limit query params with defaults
- Parse optional albumId filter
- If no albumId: filter for albumId IS NULL
- Return paginated response

**Verification**: Manual test with `vercel dev` (deferred to Step 17)

---

#### Step 13: Create GET /api/gallery/images/search Handler
**Objective**: Vercel handler for image search
**Files**:
- `apps/api/platforms/vercel/api/gallery/images/search.ts` (CREATE)

**Logic**:
- Require `search` query param (return 400 if missing/empty)
- Parse page/limit with defaults
- Build ILIKE query across title, description, tags
- Return paginated results

**Verification**: Manual test with `vercel dev` (deferred to Step 17)

---

#### Step 14: Create POST /api/gallery/images/flag Handler
**Objective**: Vercel handler for flagging images
**Files**:
- `apps/api/platforms/vercel/api/gallery/images/flag.ts` (CREATE)

**Logic**:
- Only allow POST method
- Parse body: `{ imageId: string, reason?: string }`
- Validate imageId is valid UUID
- Check image exists
- Check for existing flag (unique constraint on imageId+userId)
- Insert flag record
- Return 201 with flag data

**Verification**: Manual test with `vercel dev` (deferred to Step 17)

---

### Phase 3: Configuration and Routing

#### Step 15: Update vercel.json with Image Routes
**Objective**: Add routing for image endpoints
**Files**:
- `apps/api/platforms/vercel/vercel.json`

**Add to rewrites array (ORDER MATTERS - specific routes first)**:
```json
{ "source": "/api/gallery/images/search", "destination": "/api/gallery/images/search.ts" },
{ "source": "/api/gallery/images/flag", "destination": "/api/gallery/images/flag.ts" },
{ "source": "/api/gallery/images/:id", "destination": "/api/gallery/images/[id].ts" },
{ "source": "/api/gallery/images", "destination": "/api/gallery/images/index.ts" }
```

**Verification**: Inspect file for correct syntax

---

#### Step 16: Update Seed Data
**Objective**: Add test images and flags for all test scenarios
**Files**:
- `apps/api/core/database/seeds/gallery.ts`

**Add/Update**:
```typescript
// Images (per story requirements):
// 11111111-1111-1111-1111-111111111111 - Castle Tower Photo (standalone, dev-user)
// 22222222-2222-2222-2222-222222222222 - Space Station Build (in Album A, dev-user)
// 33333333-3333-3333-3333-333333333333 - Medieval Knight (standalone, dev-user, search test)
// 44444444-4444-4444-4444-444444444444 - Already Flagged Image (standalone, dev-user)
// 55555555-5555-5555-5555-555555555555 - Private Image (standalone, other-user, 403 test)

// Album (from story):
// aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa - Space Collection (dev-user)

// Flags:
// Flag for image 44444444-4444-4444-4444-444444444444 by dev-user
```

**Verification**: `pnpm seed` (requires database)

---

### Phase 4: HTTP Contract and Integration

#### Step 17: Update gallery.http with Image Requests
**Objective**: Add all image endpoint tests to HTTP file
**Files**:
- `__http__/gallery.http`

**Add sections**:
```http
### IMAGES SECTION

### getGalleryImage - GET image by ID (200)
### getGalleryImage404 - GET non-existent image (404)
### getGalleryImage403 - GET other user's image (403)
### getGalleryImage400 - GET invalid UUID (400)

### listGalleryImages - List standalone images (200)
### listGalleryImagesWithAlbum - List with albumId filter (200)
### listGalleryImagesEmpty - List with page beyond total (200, empty)
### listGalleryImagesPagination - List with custom page/limit (200)

### searchGalleryImages - Search with matching term (200)
### searchGalleryImagesNoMatch - Search with no results (200, empty)
### searchGalleryImagesMissing - Search without search param (400)

### flagGalleryImage - Flag image (201)
### flagGalleryImageNoReason - Flag without reason (201)
### flagGalleryImageConflict - Flag already flagged (409)
### flagGalleryImage400 - Flag invalid imageId (400)
```

**Verification**: Run each request in VS Code REST Client

---

### Phase 5: Final Verification

#### Step 18: Run All Quality Checks
**Objective**: Ensure all code passes quality gates
**Commands**:
```bash
pnpm check-types --filter=@repo/gallery-core
pnpm lint --filter=@repo/gallery-core
pnpm test --filter=@repo/gallery-core
pnpm build --filter=@repo/gallery-core
```

**Verification**: All commands exit 0

---

#### Step 19: Integration Test via HTTP
**Objective**: Verify all endpoints work end-to-end
**Prerequisites**:
- Database running (`docker-compose up`)
- Seed data applied (`pnpm seed`)
- Vercel dev running (`pnpm dev` or `vercel dev`)

**Run**: Execute all requests in `__http__/gallery.http` images section

**Verification**: All expected status codes returned

---

## Test Plan

### Unit Tests
```bash
pnpm test --filter=@repo/gallery-core
```

**Expected Files**:
- `get-image.test.ts` - 4+ test cases
- `list-images.test.ts` - 6+ test cases
- `search-images.test.ts` - 5+ test cases
- `flag-image.test.ts` - 5+ test cases

### Type Check
```bash
pnpm check-types --filter=@repo/gallery-core
```

### Lint
```bash
pnpm lint --filter=@repo/gallery-core
```

### Build
```bash
pnpm build --filter=@repo/gallery-core
```

### HTTP Contract Tests
Execute in VS Code with REST Client extension:
- `__http__/gallery.http` - Images section

**Evidence Capture**:
- Screenshot or copy response for each request
- Verify status codes match expectations

### Database Verification (for flag tests)
```sql
SELECT * FROM gallery_flags WHERE image_id = '44444444-4444-4444-4444-444444444444';
```

---

## Stop Conditions / Blockers

**None identified.**

All requirements are clear from the story:
- Endpoint contracts defined
- Seed data specified with exact UUIDs
- Error cases enumerated
- PostgreSQL ILIKE confirmed (no OpenSearch)
- No Redis caching
- Existing patterns in codebase to follow

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Tags search complexity (JSONB) | Use `tags::text ILIKE` which flattens array to searchable string |
| Unique constraint violation handling | Catch Postgres error code 23505 for conflict detection |
| Route order in vercel.json | Place specific routes (`/search`, `/flag`) before parameterized route (`/:id`) |
| Seed data conflicts with existing | Use ON CONFLICT DO UPDATE pattern (already established) |
