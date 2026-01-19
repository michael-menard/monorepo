# STORY-006 Implementation Plan

## Scope Surface

| Area | Impacted |
|------|----------|
| Backend/API | YES |
| Frontend/UI | NO |
| Infra/Config | NO |

## Acceptance Criteria Checklist

- [ ] AC-1: Create Album (POST /api/gallery/albums)
- [ ] AC-2: List Albums (GET /api/gallery/albums)
- [ ] AC-3: Get Album (GET /api/gallery/albums/:id)
- [ ] AC-4: Update Album (PATCH /api/gallery/albums/:id)
- [ ] AC-5: Delete Album (DELETE /api/gallery/albums/:id)
- [ ] AC-6: Validation Rules
- [ ] AC-7: Testing & Evidence

## Files to Create/Touch

### New Package: `packages/backend/gallery-core`

| File | Purpose |
|------|---------|
| `package.json` | Package manifest |
| `tsconfig.json` | TypeScript config |
| `vitest.config.ts` | Test config |
| `src/__types__/index.ts` | Zod schemas for album types |
| `src/create-album.ts` | Create album core function |
| `src/list-albums.ts` | List albums core function |
| `src/get-album.ts` | Get album core function |
| `src/update-album.ts` | Update album core function |
| `src/delete-album.ts` | Delete album core function |
| `src/index.ts` | Package exports |
| `src/__tests__/create-album.test.ts` | Unit tests |
| `src/__tests__/list-albums.test.ts` | Unit tests |
| `src/__tests__/get-album.test.ts` | Unit tests |
| `src/__tests__/update-album.test.ts` | Unit tests |
| `src/__tests__/delete-album.test.ts` | Unit tests |

### Vercel Endpoints: `apps/api/platforms/vercel/api/gallery/albums`

| File | Purpose |
|------|---------|
| `index.ts` | POST /api/gallery/albums (create) |
| `list.ts` | GET /api/gallery/albums (list) |
| `[id].ts` | GET/PATCH/DELETE /api/gallery/albums/:id |

### Seed Data

| File | Purpose |
|------|---------|
| `apps/api/core/database/seeds/gallery.ts` | Seed albums and images |
| `apps/api/core/database/seeds/index.ts` | Update to include gallery seed |

### HTTP Contracts

| File | Purpose |
|------|---------|
| `__http__/gallery.http` | HTTP contract tests |

## Reuse Targets

| Pattern | Source | Reuse |
|---------|--------|-------|
| DB client interface | `wishlist-core/*.ts` | YES |
| Discriminated union result | `sets-core/create-set.ts` | YES |
| Vercel endpoint structure | `wishlist/list.ts`, `wishlist/[id].ts` | YES |
| Auth bypass pattern | `wishlist/list.ts` | YES |
| Dynamic route `[id].ts` | `wishlist/[id].ts` | YES |
| Package structure | `wishlist-core/` | YES |

## Ports & Adapters Boundaries

### Core Layer (Transport-Agnostic)
- `packages/backend/gallery-core/src/*.ts`
- No HTTP concerns
- DB client injected via interface

### Adapter Layer (Platform-Specific)
- `apps/api/platforms/vercel/api/gallery/albums/*.ts`
- Handles HTTP request/response
- Wires Drizzle DB client to core functions
- Handles authentication

## Step-by-Step Plan

### Step 1: Create gallery-core package structure
1. Create `packages/backend/gallery-core/` directory
2. Create `package.json`, `tsconfig.json`, `vitest.config.ts`

### Step 2: Create Zod schemas
1. Create `src/__types__/index.ts` with:
   - `AlbumSchema` (response format)
   - `AlbumRowSchema` (DB row format)
   - `CreateAlbumInputSchema`
   - `UpdateAlbumInputSchema`
   - `ListAlbumsFiltersSchema`
   - `AlbumListResponseSchema`

### Step 3: Create core functions
1. `create-album.ts` - validates coverImageId ownership
2. `list-albums.ts` - paginated list with imageCount
3. `get-album.ts` - returns album with images array
4. `update-album.ts` - patch semantics, coverImageId validation
5. `delete-album.ts` - orphans images, returns 204

### Step 4: Create unit tests
1. Test each core function with mock DB
2. Cover happy paths and error cases

### Step 5: Create Vercel endpoints
1. `index.ts` - POST handler
2. `list.ts` - GET handler for list
3. `[id].ts` - GET/PATCH/DELETE combined handler

### Step 6: Create seed data
1. Create `apps/api/core/database/seeds/gallery.ts`
2. Add dev-user albums and images
3. Add other-user album and image for 403 tests
4. Update `index.ts` to include gallery seed

### Step 7: Create HTTP contracts
1. Create `__http__/gallery.http` with all test cases

### Step 8: Verify
1. Run build
2. Run type check
3. Run lint on touched files
4. Run tests
5. Run seed
6. Execute HTTP contracts

## Test Plan

### Commands to Run

```bash
# Build
pnpm build

# Type check
pnpm check-types

# Lint (touched files)
pnpm lint packages/backend/gallery-core
pnpm lint apps/api/platforms/vercel/api/gallery

# Unit tests
pnpm test packages/backend/gallery-core

# Seed
pnpm seed
```

### HTTP Contract Execution
- All requests in `__http__/gallery.http`
- Capture request/response pairs

## Stop Conditions

- STOP if coverImageId validation cannot be implemented
- STOP if galleryImages/galleryAlbums tables missing required columns
- STOP if Drizzle queries cannot express required joins
- STOP if any acceptance criteria cannot be met
