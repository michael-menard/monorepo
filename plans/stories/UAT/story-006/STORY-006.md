---
doc_type: story
story_id: STORY-006
title: "Gallery - Albums (Full CRUD)"
status: ready
created_at: "2026-01-18T22:30:00-07:00"
tags:
  - gallery
  - albums
  - vercel
  - api
  - crud
---

# STORY-006: Gallery - Albums (Full CRUD)

## 1. Context

The Vercel migration has established patterns for read and write operations through STORY-004 (Wishlist Read) and STORY-005 (Wishlist Write). This story applies those patterns to the Inspiration Gallery album management feature.

Gallery albums allow users to organize their inspiration images into collections. The existing AWS Lambda handlers provide the reference implementation, which must be migrated to Vercel serverless functions while maintaining the established ports/adapters architecture.

The `gallery_albums` and `gallery_images` tables already exist in the database schema, so no migrations are required.

## 2. Goal

Enable authenticated users to create, read, update, and delete gallery albums through the Vercel API, following the platform-agnostic architecture established in prior stories.

## 3. Non-Goals

- Image upload to albums (STORY-009)
- Redis caching layer (deferred to future optimization story)
- OpenSearch indexing (deferred to future optimization story)
- Soft delete / trash functionality
- Nested album hierarchies
- Album sharing between users
- Frontend UI integration

## 4. Scope

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/gallery/albums` | Create new album |
| GET | `/api/gallery/albums` | List user's albums (paginated) |
| GET | `/api/gallery/albums/:id` | Get album by ID with images |
| PATCH | `/api/gallery/albums/:id` | Update album metadata |
| DELETE | `/api/gallery/albums/:id` | Delete album (orphans images) |

### Packages/Apps Affected

| Location | Changes |
|----------|---------|
| `packages/backend/gallery-core/` | NEW package: 5 core functions + types + tests |
| `apps/api/platforms/vercel/api/gallery/albums/` | 3 new Vercel endpoint files |
| `__http__/gallery.http` | NEW file: HTTP contract tests |
| `apps/api/core/database/seeds/gallery.ts` | NEW file: Seed data for testing |

## 5. Acceptance Criteria

### AC-1: Create Album (POST /api/gallery/albums)

- [ ] Accepts JSON body with `title` (required, 1-200 chars)
- [ ] Accepts optional `description` (max 2000 chars)
- [ ] Accepts optional `coverImageId` (valid UUID)
- [ ] Server generates UUID for `id` field
- [ ] Server sets `createdAt` and `lastUpdatedAt` to current timestamp
- [ ] If `coverImageId` provided, validates image exists and belongs to user
- [ ] Returns 201 Created with album object including `imageCount: 0`
- [ ] Returns 400 Bad Request if title missing or invalid
- [ ] Returns 400 Bad Request if coverImageId format invalid
- [ ] Returns 400 Bad Request if coverImageId references non-existent image
- [ ] Returns 403 Forbidden if coverImageId references another user's image
- [ ] Returns 401 Unauthorized if not authenticated

### AC-2: List Albums (GET /api/gallery/albums)

- [ ] Returns paginated list of user's albums
- [ ] Supports `page` query param (default 1, min 1)
- [ ] Supports `limit` query param (default 20, min 1, max 100)
- [ ] Each album includes `imageCount` (integer)
- [ ] Each album includes `coverImageUrl` (string or null)
- [ ] Returns albums ordered by `createdAt` DESC
- [ ] Returns 200 OK with `{ data: [...], pagination: { page, limit, total, totalPages } }`
- [ ] Returns empty `data` array if user has no albums
- [ ] Returns 401 Unauthorized if not authenticated

### AC-3: Get Album (GET /api/gallery/albums/:id)

- [ ] Returns album with `images` array (all images in album)
- [ ] Returns `imageCount` field
- [ ] Images ordered by `createdAt` DESC
- [ ] Returns 200 OK with album object
- [ ] Returns 400 Bad Request if ID is not valid UUID
- [ ] Returns 404 Not Found if album doesn't exist
- [ ] Returns 403 Forbidden if album belongs to different user
- [ ] Returns 401 Unauthorized if not authenticated

### AC-4: Update Album (PATCH /api/gallery/albums/:id)

- [ ] Accepts partial JSON body (patch semantics)
- [ ] Can update `title`, `description`, `coverImageId`
- [ ] Setting `coverImageId` to `null` clears cover image
- [ ] Validates coverImageId ownership if provided (non-null)
- [ ] `lastUpdatedAt` is set to current timestamp on any update
- [ ] `createdAt` is never modified
- [ ] Returns 200 OK with updated album
- [ ] Returns 400 Bad Request for invalid UUID format in path
- [ ] Returns 400 Bad Request for invalid field values
- [ ] Returns 404 Not Found if album doesn't exist
- [ ] Returns 403 Forbidden if album belongs to different user
- [ ] Returns 403 Forbidden if coverImageId references another user's image
- [ ] Returns 401 Unauthorized if not authenticated

### AC-5: Delete Album (DELETE /api/gallery/albums/:id)

- [ ] Deletes album record from database
- [ ] Sets `albumId = null` for all images that were in the album (orphan, not delete)
- [ ] Images are NOT deleted, only unlinked from album
- [ ] Returns 204 No Content on success
- [ ] Returns 400 Bad Request for invalid UUID format
- [ ] Returns 404 Not Found if album doesn't exist
- [ ] Returns 403 Forbidden if album belongs to different user
- [ ] Returns 401 Unauthorized if not authenticated

### AC-6: Validation Rules

- [ ] `title`: Required, non-empty string, max 200 chars
- [ ] `description`: Optional string, max 2000 chars
- [ ] `coverImageId`: Optional UUID or null
- [ ] Path param `id`: Must be valid UUID

### AC-7: Testing & Evidence

- [ ] Unit tests pass for all core functions
- [ ] All `.http` requests execute successfully
- [ ] Evidence captured in `proof.md`

## 6. Reuse Plan

### Packages to Reuse

| Package | Usage |
|---------|-------|
| `@repo/logger` | Logging in core functions and endpoints |
| `drizzle-orm` | Database operations (insert, update, delete, select) |
| `zod` | Input validation schemas |
| `pg` | PostgreSQL connection pool |

### Patterns to Reuse

| Pattern | Source | Usage |
|---------|--------|-------|
| DB client interface | `wishlist-core/*.ts` | Dependency injection for core functions |
| Discriminated union result | `sets-core/create-set.ts` | Error handling pattern |
| Vercel endpoint structure | `wishlist/list.ts`, `wishlist/[id].ts` | HTTP adapter pattern |
| Auth bypass pattern | `wishlist/list.ts` | Local dev authentication |
| Dynamic route `[id].ts` | `wishlist/[id].ts` | Combined GET/PATCH/DELETE |

### Schemas to Reuse

| Schema | Source |
|--------|--------|
| `CreateAlbumSchema` | `apps/api/platforms/aws/endpoints/gallery/schemas/index.ts` |
| `UpdateAlbumSchema` | `apps/api/platforms/aws/endpoints/gallery/schemas/index.ts` |
| `AlbumIdSchema` | `apps/api/platforms/aws/endpoints/gallery/schemas/index.ts` |
| `ListAlbumsQuerySchema` | `apps/api/platforms/aws/endpoints/gallery/schemas/index.ts` |

### New Package Required

| Package | Purpose |
|---------|---------|
| `packages/backend/gallery-core` | Core business logic for gallery operations |

## 7. Architecture Notes (Ports & Adapters)

### Core Layer (Port Definition)

```typescript
// packages/backend/gallery-core/src/create-album.ts

export interface CreateAlbumDbClient {
  insert: (table: unknown) => {
    values: (data: Record<string, unknown>) => {
      returning: () => Promise<AlbumRow[]>
    }
  }
  select: (fields: unknown) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<ImageRow[]>
    }
  }
}

export type CreateAlbumResult =
  | { success: true; data: Album }
  | { success: false; error: 'VALIDATION_ERROR' | 'FORBIDDEN' | 'DB_ERROR'; message: string }
```

### Adapter Layer (Vercel)

```typescript
// apps/api/platforms/vercel/api/gallery/albums/index.ts

// Wires:
// - VercelRequest/Response to HTTP layer
// - Drizzle db client to core function
// - getAuthUserId() for authentication
// - Response transformation to JSON
```

### Data Flow

```
Client Request
      |
      v
+------------------+
| Vercel Endpoint  |  <- Adapter (HTTP + Auth)
| albums/index.ts  |
+--------+---------+
         |
         v
+------------------+
| Core Function    |  <- Port (business logic)
| createAlbum()    |
+--------+---------+
         |
         v
+------------------+
| Drizzle DB       |  <- Infrastructure
| PostgreSQL       |
+------------------+
```

## 8. Required Vercel / Infra Notes

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_BYPASS` | Dev only | Set to "true" for local dev |
| `DEV_USER_SUB` | Dev only | Override user ID when AUTH_BYPASS=true |

### Vercel Configuration

No changes required. New endpoints follow existing file-based routing pattern.

### Database

No migrations required. `gallery_albums` and `gallery_images` tables exist with all needed columns and indexes.

## 9. HTTP Contract Plan

### Required `.http` Requests

All requests must be added to `/__http__/gallery.http`:

#### Create Operations
- `createAlbum` - POST with required fields (201)
- `createAlbumFull` - POST with all optional fields (201)
- `createAlbumMissingTitle` - 400 error case
- `createAlbumInvalidCover` - 400 error case

#### List Operations
- `listAlbums` - GET with default pagination (200)
- `listAlbumsPaginated` - GET with custom page/limit (200)
- `listAlbumsEmpty` - GET for user with no albums (200, empty array)

#### Get Operations
- `getAlbum` - GET existing album (200)
- `getAlbumNotFound` - 404 error case
- `getAlbumInvalidId` - 400 error case
- `getAlbumForbidden` - 403 error case (other user's album)

#### Update Operations
- `updateAlbum` - PATCH with partial update (200)
- `updateAlbumClearCover` - PATCH with `coverImageId: null` (200)
- `updateAlbumNotFound` - 404 error case
- `updateAlbumForbidden` - 403 error case
- `updateAlbumInvalidId` - 400 error case

#### Delete Operations
- `deleteAlbum` - DELETE existing album (204)
- `deleteAlbumNotFound` - 404 error case
- `deleteAlbumForbidden` - 403 error case
- `deleteAlbumInvalidId` - 400 error case

### Evidence Requirements

- Each `.http` request must be executed
- Response status code and key JSON fields captured
- Proof saved in `plans/stories/story-006/PROOF-STORY-006.md`

## 10. Seed Requirements

### Required Seed Data

Create `apps/api/core/database/seeds/gallery.ts` with:

| Entity | ID Pattern | User | Purpose |
|--------|------------|------|---------|
| Album 1 | `22222222-2222-2222-2222-222222222001` | dev-user | Happy path CRUD tests |
| Album 2 | `22222222-2222-2222-2222-222222222002` | dev-user | List pagination tests |
| Album 3 | `22222222-2222-2222-2222-222222222003` | other-user | Forbidden tests (403) |
| Image 1 | `33333333-3333-3333-3333-333333333001` | dev-user | Cover image tests |
| Image 2 | `33333333-3333-3333-3333-333333333002` | dev-user | Album membership tests |
| Image 3 | `33333333-3333-3333-3333-333333333003` | other-user | Forbidden cover tests |

### Seed Execution

```bash
pnpm seed
```

### Idempotency Requirement

Seed must use `ON CONFLICT DO UPDATE` pattern to be safely re-runnable.

## 11. Test Plan (Happy Path / Error Cases / Edge Cases)

### Create Album

#### Happy Path
| Test | Input | Expected |
|------|-------|----------|
| Required fields only | `{ "title": "My Album" }` | 201, album with generated id |
| All fields | `{ "title": "My Album", "description": "Test", "coverImageId": "<valid>" }` | 201, all fields persisted |
| Unicode title | `{ "title": "Album" }` | 201 |

#### Error Cases
| Test | Input | Expected |
|------|-------|----------|
| Missing title | `{}` | 400 |
| Empty title | `{ "title": "" }` | 400 |
| Title too long | `{ "title": "<201 chars>" }` | 400 |
| Invalid coverImageId format | `{ "title": "Test", "coverImageId": "bad" }` | 400 |
| Non-existent coverImageId | `{ "title": "Test", "coverImageId": "<nonexistent-uuid>" }` | 400 |
| Other user's image as cover | `{ "title": "Test", "coverImageId": "<other-user-image>" }` | 403 |

### List Albums

#### Happy Path
| Test | Input | Expected |
|------|-------|----------|
| Default pagination | No params | 200, page 1, limit 20 |
| Custom pagination | `?page=2&limit=5` | 200, correct page/limit |
| Empty result | User with no albums | 200, empty data array |

#### Edge Cases
| Test | Input | Expected |
|------|-------|----------|
| Page beyond total | `?page=999` | 200, empty data array |
| Limit capped | `?limit=200` | 200, limit=100 |

### Get Album

#### Happy Path
| Test | Input | Expected |
|------|-------|----------|
| Existing album | Valid UUID | 200, album with images |

#### Error Cases
| Test | Input | Expected |
|------|-------|----------|
| Invalid UUID | `not-a-uuid` | 400 |
| Not found | Nonexistent UUID | 404 |
| Other user's album | Other user's album ID | 403 |

### Update Album

#### Happy Path
| Test | Input | Expected |
|------|-------|----------|
| Single field | `{ "title": "Updated" }` | 200, title changed |
| Multiple fields | `{ "title": "New", "description": "New" }` | 200 |
| Clear cover | `{ "coverImageId": null }` | 200, cover cleared |
| Empty body | `{}` | 200, only lastUpdatedAt changes |

#### Error Cases
| Test | Input | Expected |
|------|-------|----------|
| Invalid UUID | `not-a-uuid` | 400 |
| Not found | Nonexistent UUID | 404 |
| Other user's album | Other user's album ID | 403 |
| Other user's image as cover | `{ "coverImageId": "<other-user-image>" }` | 403 |

### Delete Album

#### Happy Path
| Test | Input | Expected |
|------|-------|----------|
| Delete existing | Valid album UUID | 204 |
| Images orphaned | Delete album with images | Images have albumId=null |

#### Error Cases
| Test | Input | Expected |
|------|-------|----------|
| Invalid UUID | `not-a-uuid` | 400 |
| Not found | Nonexistent UUID | 404 |
| Other user's album | Other user's album ID | 403 |

### Evidence Requirements

- All `.http` requests executed with responses captured
- Unit test output included
- Proof document at `plans/stories/story-006/PROOF-STORY-006.md`

---

## Agent Log

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-18T22:30:00-07:00 | PM | Generated story from index with sub-agent artifacts | `STORY-006.md`, `_pm/TEST-PLAN.md`, `_pm/UIUX-NOTES.md`, `_pm/DEV-FEASIBILITY.md`, `_pm/BLOCKERS.md` |
