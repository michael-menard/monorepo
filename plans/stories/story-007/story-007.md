---
doc_type: story
story_id: STORY-007
title: "Gallery - Images Read"
status: ready-to-work
created_at: "2026-01-18T21:27:00-07:00"
updated_at: "2026-01-18T23:15:00-07:00"
depends_on:
  - STORY-006
tags:
  - vercel
  - migration
  - gallery
  - images
  - read
---

# STORY-007: Gallery - Images Read

## 1. Title

Migrate gallery image read endpoints (get, list, search, flag) from AWS Lambda to Vercel serverless functions.

---

## 2. Context

The Vercel migration is progressing through the API surface. STORY-006 establishes album CRUD operations and the `gallery-core` package. This story adds image reading capabilities that allow users to browse, search, and flag inspiration gallery images.

The AWS Lambda handlers at `apps/api/platforms/aws/endpoints/gallery/` implement:
- Get single image by ID with ownership validation
- List images with pagination and album filtering
- Search images (PostgreSQL ILIKE for MVP; OpenSearch deferred)
- Flag images for moderation review

These must be migrated to Vercel while maintaining API contract compatibility.

---

## 3. Goal

Enable browsing, searching, and flagging of inspiration gallery images via Vercel serverless functions with identical API behavior to the existing AWS Lambda implementation.

---

## 4. Non-Goals

- **OpenSearch integration**: Search will use PostgreSQL ILIKE queries only. OpenSearch integration is deferred.
- **Redis caching**: Caching is not implemented for Vercel handlers. Performance optimization via caching is a future story.
- **Image upload**: This story is read-only (plus flag). Upload operations are STORY-009.
- **UI changes**: No frontend modifications. Existing RTK Query slices continue to work unchanged.
- **Thumbnail generation**: Assumes thumbnails already exist in S3.

---

## 5. Scope

### Endpoints

| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/gallery/images/:id` | Get single image by ID |
| GET | `/api/gallery/images` | List images with pagination |
| GET | `/api/gallery/images/search` | Search images |
| POST | `/api/gallery/images/flag` | Flag image for moderation |

### Packages/Apps Affected

| Location | Change Type |
|----------|-------------|
| `packages/backend/gallery-core/` | MODIFY — add image functions to existing package |
| `apps/api/platforms/vercel/api/gallery/images/` | NEW — Vercel handlers |
| `apps/api/platforms/vercel/vercel.json` | MODIFY — add routes |
| `apps/api/core/database/seeds/gallery.ts` | MODIFY — add image seed data |
| `__http__/gallery.http` | MODIFY — add image endpoint requests |

**NOTE**: Per reuse-first principle, image functions are added to the existing `packages/backend/gallery-core/` package rather than creating a separate `gallery-images-core` package. The `gallery-core` package already exports `GalleryImageSchema`, `ImageRowSchema`, and related types. Adding image operations maintains domain cohesion.

---

## 6. Acceptance Criteria

### AC-1: Get Image Endpoint
- [ ] `GET /api/gallery/images/:id` returns image object for valid ID
- [ ] Returns 404 for non-existent image
- [ ] Returns 403 for image owned by different user
- [ ] Returns 400 for invalid UUID format
- [ ] Returns 401 when auth bypass is disabled and no token provided

### AC-2: List Images Endpoint
- [ ] `GET /api/gallery/images` returns paginated array of images
- [ ] Supports `page` and `limit` query params (defaults: page=1, limit=20)
- [ ] Supports `albumId` filter to show only images in specific album
- [ ] When `albumId` not provided, returns only standalone images (albumId=null)
- [ ] Images sorted by `createdAt` DESC
- [ ] Response includes pagination metadata: `page`, `limit`, `total`, `totalPages`

### AC-3: Search Images Endpoint
- [ ] `GET /api/gallery/images/search` accepts `search` query param (required)
- [ ] Searches across `title`, `description`, and `tags` fields
- [ ] Uses PostgreSQL ILIKE for case-insensitive partial matching
- [ ] Supports pagination via `page` and `limit` params (defaults: page=1, limit=20)
- [ ] Returns empty array (not error) when no matches found
- [ ] Returns 400 if `search` param is missing or empty

### AC-4: Flag Image Endpoint
- [ ] `POST /api/gallery/images/flag` accepts `{ imageId, reason? }` body
- [ ] Creates flag record in `gallery_flags` table
- [ ] Returns 201 with flag confirmation on success
- [ ] Returns 409 if user has already flagged this image
- [ ] Returns 400 for invalid imageId format
- [ ] `reason` field is optional (nullable)

### AC-5: Extend gallery-core Package
- [ ] Add to existing `packages/backend/gallery-core/` package
- [ ] Add exports: `getGalleryImage`, `listGalleryImages`, `searchGalleryImages`, `flagGalleryImage`
- [ ] Extend `__types__/index.ts` with any new schemas needed (e.g., `FlagImageInputSchema`, `ListImagesFiltersSchema`, `SearchImagesFiltersSchema`)
- [ ] Unit tests for new image core functions
- [ ] Follow existing patterns established by album functions in the package

### AC-6: Seed Data
- [ ] `pnpm seed` creates deterministic gallery test data
- [ ] Seed includes 5+ gallery images with varied tags/titles
- [ ] Seed includes 1+ album with images assigned
- [ ] Seed includes 1 pre-flagged image for conflict testing
- [ ] Seed is idempotent (safe to run multiple times)

### AC-7: HTTP Contract Verification
- [ ] `__http__/gallery.http` updated with all required image requests
- [ ] All happy path requests documented and executable
- [ ] Error case requests documented (404, 403, 409)

---

## 7. Reuse Plan

### Packages to Reuse

| Package | Usage |
|---------|-------|
| `@repo/logger` | Logging in handlers |
| `@repo/vercel-adapter` | Request/response transformation, auth middleware |
| `packages/backend/db` | Drizzle schema and client |
| `packages/backend/lambda-responses` | Response helpers (ok, error patterns) |
| `packages/backend/gallery-core` | **Existing** — extend with image operations |

### Extend Existing Package

| Package | Justification |
|---------|--------------|
| `packages/backend/gallery-core` | Already exports `GalleryImageSchema`, `ImageRowSchema`, `PaginationSchema`. Image operations belong in the same domain package as album operations. Reuse-first principle. |

### Prohibited Patterns

- ❌ Do NOT create a separate `gallery-images-core` package
- ❌ Do NOT duplicate Zod schemas between AWS and Vercel handlers
- ❌ Do NOT implement OpenSearch client in this story
- ❌ Do NOT add Redis/caching logic
- ❌ Do NOT inline database queries in Vercel handlers (use core package)

---

## 8. Architecture Notes (Ports & Adapters)

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Handler (Adapter)                 │
│  apps/api/platforms/vercel/api/gallery/images/[id].ts       │
│                                                             │
│  - Parse request (via @repo/vercel-adapter)                 │
│  - Extract auth (AUTH_BYPASS or JWT)                        │
│  - Call core function                                       │
│  - Transform response                                       │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Core Logic (Port)                        │
│  packages/backend/gallery-core/src/get-image.ts             │
│                                                             │
│  - Validate input (Zod)                                     │
│  - Query database (Drizzle)                                 │
│  - Apply business rules (ownership check)                   │
│  - Return typed result                                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (Infrastructure)                │
│  packages/backend/db                                        │
│                                                             │
│  - galleryImages table                                      │
│  - galleryAlbums table                                      │
│  - galleryFlags table                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Required Vercel / Infra Notes

### Environment Variables Required

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | YES |
| `AUTH_BYPASS` | Enable dev auth bypass (dev only) | DEV ONLY |
| `DEV_USER_SUB` | Mock user ID for bypass | DEV ONLY |

### Vercel Configuration

Add to `apps/api/platforms/vercel/vercel.json`:

```json
{
  "rewrites": [
    { "source": "/api/gallery/images/search", "destination": "/api/gallery/images/search" },
    { "source": "/api/gallery/images/flag", "destination": "/api/gallery/images/flag" },
    { "source": "/api/gallery/images/:id", "destination": "/api/gallery/images/[id]" },
    { "source": "/api/gallery/images", "destination": "/api/gallery/images/index" }
  ]
}
```

---

## 10. HTTP Contract Plan

### Required `.http` Requests

| Request Name | Path | Method | Required |
|-------------|------|--------|----------|
| `getGalleryImage` | `/__http__/gallery.http` | GET | YES |
| `getGalleryImage404` | `/__http__/gallery.http` | GET | YES |
| `getGalleryImage403` | `/__http__/gallery.http` | GET | YES |
| `listGalleryImages` | `/__http__/gallery.http` | GET | YES |
| `listGalleryImagesWithAlbum` | `/__http__/gallery.http` | GET | YES |
| `listGalleryImagesEmpty` | `/__http__/gallery.http` | GET | YES |
| `searchGalleryImages` | `/__http__/gallery.http` | GET | YES |
| `searchGalleryImagesNoMatch` | `/__http__/gallery.http` | GET | YES |
| `flagGalleryImage` | `/__http__/gallery.http` | POST | YES |
| `flagGalleryImageConflict` | `/__http__/gallery.http` | POST | YES |

### Evidence Requirements

QA Verify MUST capture:
1. Response status code
2. Response body (JSON)
3. Verify database state for flag operations

---

## 11. Seed Requirements

### Required Entities

**Gallery Images (5 minimum):**

| ID | Title | Album | User | Purpose |
|----|-------|-------|------|---------|
| `11111111-1111-1111-1111-111111111111` | Castle Tower Photo | null | dev-user | Happy path get/list |
| `22222222-2222-2222-2222-222222222222` | Space Station Build | Album A | dev-user | Album filter test |
| `33333333-3333-3333-3333-333333333333` | Medieval Knight | null | dev-user | Search test (medieval) |
| `44444444-4444-4444-4444-444444444444` | Already Flagged Image | null | dev-user | Flag conflict test |
| `55555555-5555-5555-5555-555555555555` | Private Image | null | other-user | 403 test |

**Gallery Albums (1 minimum):**

| ID | Title | User |
|----|-------|------|
| `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` | Space Collection | dev-user |

**Gallery Flags (1 minimum):**

| Image ID | User | Purpose |
|----------|------|---------|
| `44444444-4444-4444-4444-444444444444` | dev-user | 409 conflict test |

### Seed Requirements

- **Deterministic**: Same IDs every run
- **Idempotent**: Upsert pattern (ON CONFLICT DO UPDATE)
- **Location**: `apps/api/core/database/seeds/gallery.ts`
- **Command**: `pnpm seed` includes gallery seed

---

## 12. Test Plan (Happy Path / Error Cases / Edge Cases)

### Happy Path Tests

| ID | Test | Evidence |
|----|------|----------|
| HP-1 | Get image by ID returns 200 + image object | `.http` response |
| HP-2 | List images returns 200 + paginated array | `.http` response |
| HP-3 | List images with albumId filter works | `.http` response |
| HP-4 | Search images via PostgreSQL ILIKE returns matching results | `.http` response |
| HP-5 | Flag image returns 201 + flag object | `.http` response |

### Error Cases

| ID | Test | Expected |
|----|------|----------|
| ERR-1 | Get image without auth (bypass disabled) | 401 Unauthorized |
| ERR-2 | Get image with non-existent ID | 404 Not Found |
| ERR-3 | Get image owned by another user | 403 Forbidden |
| ERR-4 | Get image with invalid UUID | 400 Validation Error |
| ERR-5 | List images with invalid pagination | 400 Validation Error |
| ERR-6 | Search with empty query | 400 Validation Error |
| ERR-7 | Flag already-flagged image | 409 Conflict |
| ERR-8 | Flag with invalid body | 400 Validation Error |

### Edge Cases

| ID | Test | Expected |
|----|------|----------|
| EDGE-1 | List images when none exist | 200 + empty array |
| EDGE-2 | Search with no matching results | 200 + empty array |
| EDGE-3 | List images page beyond total | 200 + empty array |
| EDGE-4 | Image URLs are valid HTTPS | URL format check |
| EDGE-5 | Flag without reason field | 201 + reason=null |

### Evidence Requirements

- All HP tests must have `.http` response captured
- All ERR tests must show correct status code
- Database state verified for flag operations

---

## 13. Open Questions

*None — all blocking decisions resolved.*

---

## 14. QA Audit Resolution Log

| Issue | Severity | Resolution |
|-------|----------|------------|
| #1: Reuse-First Violation — New package vs extending existing | HIGH | **RESOLVED**: Story updated to extend existing `packages/backend/gallery-core/` instead of creating `gallery-images-core`. AC-5 updated accordingly. Scope table updated. Reuse Plan clarified. |
| #2: Seed file location | LOW | **CONFIRMED**: Location `apps/api/core/database/seeds/gallery.ts` is correct per existing pattern (verified `sets.ts`, `wishlist.ts` exist there). |
| #3: OpenSearch mention in TEST-PLAN.md | LOW | **RESOLVED**: Updated HP-4 in Test Plan (Section 12) to explicitly say "PostgreSQL ILIKE". Note: `_pm/TEST-PLAN.md` should be updated separately by Dev during implementation. |
| #4: Missing search pagination defaults | LOW | **RESOLVED**: AC-3 now explicitly states "defaults: page=1, limit=20" for search endpoint. |

---

## Agent Log

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-18T21:27:00-07:00 | PM | Generated story from index | `plans/stories/story-007/story-007.20260118-2127.md` |
| 2026-01-18T23:15:00-07:00 | PM | Revised story per QA Audit findings | `plans/stories/story-007/story-007.md` |
