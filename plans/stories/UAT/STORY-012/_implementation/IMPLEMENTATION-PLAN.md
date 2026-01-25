# STORY-012 Implementation Plan: MOC Instructions - Gallery Linking

## Scope Surface

- **backend/API**: yes
- **frontend/UI**: no
- **infra/config**: yes (vercel.json routes)
- **notes**: Backend-only story. Three endpoints for linking gallery images to MOCs. No core package extraction (inline per STORY-011 pattern).

---

## Acceptance Criteria Checklist

### AC-1: GET /api/mocs/:id/gallery-images
- [ ] 401 without auth
- [ ] 404 for non-existent MOC ID
- [ ] 403 when accessing another user's MOC
- [ ] 200 with `{ images: [], total: 0 }` for MOC with no links
- [ ] 200 with `{ images: [...], total: N }` for MOC with links
- [ ] Each image includes: id, title, description, url, tags, createdAt, lastUpdatedAt
- [ ] Images ordered by createdAt ascending
- [ ] 400 for invalid UUID format

### AC-2: POST /api/mocs/:id/gallery-images
- [ ] 401 without auth
- [ ] 404 for non-existent MOC ID
- [ ] 403 when linking to another user's MOC
- [ ] 400 when galleryImageId missing from body
- [ ] 404 when gallery image does not exist
- [ ] 409 when image already linked
- [ ] 201 with `{ message, link: { id, mocId, galleryImageId } }` on success
- [ ] Cross-user gallery image linking permitted

### AC-3: DELETE /api/mocs/:id/gallery-images/:galleryImageId
- [ ] 401 without auth
- [ ] 404 for non-existent MOC ID
- [ ] 403 when unlinking from another user's MOC
- [ ] 404 when image not linked
- [ ] 200 with `{ message: "Gallery image unlinked successfully" }` on success
- [ ] Subsequent unlink returns 404

### AC-4: Error Response Format
- [ ] All errors use codes: UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, VALIDATION_ERROR, INTERNAL_ERROR
- [ ] Format: `{ error: CODE, message: string }`

### AC-5: HTTP Contract
- [ ] mocs.http updated with all gallery linking requests
- [ ] Happy path requests documented
- [ ] Error case requests documented (401, 403, 404, 409)

---

## Files To Touch (Expected)

### NEW Files

| File | Purpose |
|------|---------|
| `apps/api/platforms/vercel/api/mocs/[id]/gallery-images/index.ts` | GET + POST handlers |
| `apps/api/platforms/vercel/api/mocs/[id]/gallery-images/[galleryImageId].ts` | DELETE handler |

### MODIFY Files

| File | Change |
|------|--------|
| `apps/api/platforms/vercel/vercel.json` | Add 2 route rewrites for gallery-images endpoints |
| `apps/api/core/database/seeds/mocs.ts` | Add moc_gallery_images seed data |
| `__http__/mocs.http` | Add 8+ gallery linking HTTP requests |

---

## Reuse Targets

| Source | Usage |
|--------|-------|
| `apps/api/platforms/vercel/api/mocs/[id].ts` | Handler structure, auth bypass, DB singleton, inline schema pattern |
| `apps/api/platforms/aws/endpoints/moc-instructions/get-gallery-images/handler.ts` | Query pattern for JOIN with gallery_images |
| `apps/api/platforms/aws/endpoints/moc-instructions/link-gallery-image/handler.ts` | POST logic: existence check, conflict check, insert |
| `apps/api/platforms/aws/endpoints/moc-instructions/unlink-gallery-image/handler.ts` | DELETE logic: link existence check, delete |

---

## Architecture Notes (Ports & Adapters)

### Handler Layer (Adapter)
- All 3 endpoints live in Vercel handlers
- Inline schema definitions (match core schema, no import)
- Auth via AUTH_BYPASS (dev) or Cognito JWT (prod)
- Direct database operations via drizzle

### Database Layer (Infrastructure)
- `moc_instructions` table: ownership validation
- `gallery_images` table: image data JOIN
- `moc_gallery_images` table: link records (no UNIQUE constraint, app-level duplicate check)

### Core Layer
- **NOT USED** - per STORY-011 pattern, business logic stays inline in handlers
- No moc-instructions-core package extraction

### Boundaries
- Handler validates MOC ownership before any link operation
- Cross-user gallery image linking permitted (design decision)
- No pagination (MVP returns all linked images)

---

## Step-by-Step Plan (Small Steps)

### Step 1: Create GET + POST handler file structure
**Objective**: Create the directory and index.ts file for gallery-images endpoints
**Files**: `apps/api/platforms/vercel/api/mocs/[id]/gallery-images/index.ts`
**Verification**: File exists with proper TypeScript structure, no compile errors

### Step 2: Implement GET handler
**Objective**: Implement GET /api/mocs/:id/gallery-images with all AC-1 requirements
**Files**: `apps/api/platforms/vercel/api/mocs/[id]/gallery-images/index.ts`
**Verification**: `pnpm eslint apps/api/platforms/vercel/api/mocs/[id]/gallery-images/index.ts --fix`

Implementation details:
1. Extract mocId from query params
2. Validate UUID format (400 if invalid)
3. Check auth (401 if missing)
4. Check MOC exists (404 if not)
5. Check ownership (403 if not owner)
6. JOIN query moc_gallery_images + gallery_images
7. Return images with proper fields, ordered by createdAt ASC

### Step 3: Implement POST handler
**Objective**: Implement POST /api/mocs/:id/gallery-images with all AC-2 requirements
**Files**: `apps/api/platforms/vercel/api/mocs/[id]/gallery-images/index.ts`
**Verification**: `pnpm eslint apps/api/platforms/vercel/api/mocs/[id]/gallery-images/index.ts --fix`

Implementation details:
1. Extract mocId from query, galleryImageId from body
2. Validate UUID formats (400 if invalid)
3. Validate galleryImageId present in body (400 if missing)
4. Check auth (401 if missing)
5. Check MOC exists (404 if not)
6. Check ownership (403 if not owner)
7. Check gallery image exists (404 if not)
8. Check link doesn't exist (409 if conflict)
9. Insert into moc_gallery_images
10. Return 201 with link object

### Step 4: Create DELETE handler file
**Objective**: Create the [galleryImageId].ts file for DELETE endpoint
**Files**: `apps/api/platforms/vercel/api/mocs/[id]/gallery-images/[galleryImageId].ts`
**Verification**: File exists with proper TypeScript structure

### Step 5: Implement DELETE handler
**Objective**: Implement DELETE /api/mocs/:id/gallery-images/:galleryImageId with all AC-3 requirements
**Files**: `apps/api/platforms/vercel/api/mocs/[id]/gallery-images/[galleryImageId].ts`
**Verification**: `pnpm eslint apps/api/platforms/vercel/api/mocs/[id]/gallery-images/[galleryImageId].ts --fix`

Implementation details:
1. Extract mocId and galleryImageId from query params
2. Validate UUID formats (400 if invalid)
3. Check auth (401 if missing)
4. Check MOC exists (404 if not)
5. Check ownership (403 if not owner)
6. Check link exists (404 if not linked)
7. Delete from moc_gallery_images
8. Return 200 with success message

### Step 6: Update vercel.json routes
**Objective**: Add route rewrites for gallery-images endpoints
**Files**: `apps/api/platforms/vercel/vercel.json`
**Verification**: JSON syntax valid, routes in correct order (specific before general)

Routes to add (BEFORE `/api/mocs/:id` route):
```json
{ "source": "/api/mocs/:id/gallery-images/:galleryImageId", "destination": "/api/mocs/[id]/gallery-images/[galleryImageId]" },
{ "source": "/api/mocs/:id/gallery-images", "destination": "/api/mocs/[id]/gallery-images/index" }
```

### Step 7: Add seed data for moc_gallery_images
**Objective**: Extend mocs.ts with gallery image link seed data
**Files**: `apps/api/core/database/seeds/mocs.ts`
**Verification**: `pnpm eslint apps/api/core/database/seeds/mocs.ts --fix`

Seed data per story requirements:
| Link Purpose | MOC ID | Gallery Image ID |
|--------------|--------|------------------|
| Happy path list test | dddddddd-0001 (King's Castle) | 11111111-... (Castle Tower) |
| Multiple links test | dddddddd-0001 (King's Castle) | 33333333-... (Medieval Knight) |
| Cross-user link test | dddddddd-0002 (Space Station) | 55555555-... (Private Image - other user) |

Available for POST tests (not pre-linked):
- 22222222-... (Space Station Build)
- 66666666-... (Update Test Image)

### Step 8: Run seed to populate test data
**Objective**: Execute seed to create moc_gallery_images records
**Files**: None (runtime only)
**Verification**: `cd apps/api/platforms/vercel && pnpm seed`

### Step 9: Update mocs.http with gallery linking requests
**Objective**: Add 8+ HTTP requests for contract verification
**Files**: `__http__/mocs.http`
**Verification**: Manual review of HTTP file syntax

Requests to add:
1. `getMocGalleryImages` - GET happy path (MOC with 2+ links)
2. `getMocGalleryImagesEmpty` - GET empty case (MOC with no links)
3. `getMocGalleryImages403` - GET forbidden (other user's MOC)
4. `linkGalleryImage` - POST happy path (new link)
5. `linkGalleryImage409` - POST conflict (already linked)
6. `linkGalleryImage404Image` - POST not found (non-existent image)
7. `unlinkGalleryImage` - DELETE happy path (existing link)
8. `unlinkGalleryImage404` - DELETE not found (not linked)

### Step 10: Start Vercel dev server
**Objective**: Run local dev server for HTTP testing
**Files**: None (runtime only)
**Verification**: Server starts on localhost:3001

### Step 11: Execute HTTP contract tests
**Objective**: Verify all endpoints work via .http file
**Files**: `__http__/mocs.http`
**Verification**: All requests return expected status codes and response shapes

### Step 12: Final lint and type check
**Objective**: Ensure all new code passes quality gates
**Files**: All new/modified files
**Verification**:
- `pnpm eslint apps/api/platforms/vercel/api/mocs/[id]/gallery-images/*.ts --fix`
- `pnpm tsc --noEmit -p apps/api/platforms/vercel/tsconfig.json`

---

## Test Plan

### Unit Tests
- **None** - per STORY-011 pattern, inline handlers do not get unit tests
- Business logic is simple enough to verify via HTTP contract tests

### Integration Tests
- **None** - HTTP contract tests provide integration coverage

### Type Check
```bash
pnpm tsc --noEmit -p apps/api/platforms/vercel/tsconfig.json
```

### Lint
```bash
pnpm eslint apps/api/platforms/vercel/api/mocs/[id]/gallery-images/*.ts --fix
pnpm eslint apps/api/core/database/seeds/mocs.ts --fix
```

### HTTP Contract (Primary Verification)
```bash
# Start dev server
cd apps/api/platforms/vercel && pnpm dev

# Execute .http requests in VSCode REST Client or similar
# Verify each request in __http__/mocs.http
```

### Playwright
- **NOT APPLICABLE** - backend-only story, no UI changes

---

## Stop Conditions / Blockers

### No Blockers Identified

All required information is available:
- Database schema for `moc_gallery_images` exists with FK cascade deletes
- Gallery images seed data exists with required UUIDs
- MOC seed data exists with required UUIDs
- AWS Lambda handlers provide reference implementation
- Vercel handler patterns established in STORY-011

### Pre-existing Monorepo Issues (Expected)

Per LESSONS-LEARNED, the following pre-existing failures should NOT block STORY-012:
- @repo/app-dashboard build failures (design-system export)
- @repo/file-validator type errors
- @repo/sets-core type errors
- lego-api-serverless lint errors

Verification commands must be scoped to STORY-012 files only.
