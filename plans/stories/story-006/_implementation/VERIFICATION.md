# STORY-006 Verification

## Service Running Checks

| Service | Status | Notes |
|---------|--------|-------|
| PostgreSQL | RUNNING | Docker container via docker-compose |
| Vercel Dev | RUNNING | Port 3001 |

## Commands Executed

### Build

```bash
$ pnpm build --filter=@repo/gallery-core
@repo/gallery-core:build: cache miss, executing 6f0fcb23d1d4c24a
@repo/gallery-core:build:
@repo/gallery-core:build: > @repo/gallery-core@1.0.0 build /Users/michaelmenard/Development/Monorepo/packages/backend/gallery-core
@repo/gallery-core:build: > tsc
@repo/gallery-core:build:

 Tasks:    1 successful, 1 total
Cached:    0 cached, 1 total
  Time:    1.421s
```

### Type Check

```bash
$ pnpm exec tsc --noEmit -p packages/backend/gallery-core/tsconfig.json
(no output - success)
```

### Lint

```bash
$ pnpm eslint packages/backend/gallery-core/src apps/api/platforms/vercel/api/gallery
(no errors after fixes)
```

### Tests

```bash
$ pnpm test --filter=@repo/gallery-core

 RUN  v3.0.8 /Users/michaelmenard/Development/Monorepo/packages/backend/gallery-core

 ✓ src/__tests__/delete-album.test.ts (5 tests) 7ms
 ✓ src/__tests__/update-album.test.ts (8 tests) 5ms
 ✓ src/__tests__/create-album.test.ts (5 tests) 6ms
 ✓ src/__tests__/list-albums.test.ts (5 tests) 6ms
 ✓ src/__tests__/get-album.test.ts (5 tests) 5ms

 Test Files  5 passed (5)
      Tests  28 passed (28)
   Start at  22:28:03
   Duration  289ms (transform 81ms, setup 0ms, collect 173ms, tests 29ms, environment 0ms, prepare 170ms)
```

### Migrations

N/A - No migrations required per story spec. Using existing gallery_albums and gallery_images tables.

### Seed

```bash
$ cd apps/api && pnpm db:seed

🌱 Starting database seeding...
  Seeding sets...
  ✓ Inserted 3 sets
  Seeding wishlist items...
  ✓ Upserted 4 wishlist items
  Seeding gallery albums and images...
  ✓ Upserted 3 gallery images
  ✓ Upserted 3 gallery albums
✅ Database seeding completed successfully
```

## HTTP Contract Evidence

### CREATE Operations

```
=== CREATE: Album with required fields only (201) ===
{"id":"b5622bd3-f92c-47c4-a8cf-067e1ab4bb74","userId":"dev-user-00000000-0000-0000-0000-000000000001","title":"My New Album","description":null,"coverImageId":null,"coverImageUrl":null,"imageCount":0,"createdAt":"2026-01-19T04:33:08.503Z","lastUpdatedAt":"2026-01-19T04:33:08.503Z"}
HTTP Status: 201

=== CREATE: Album missing title (400) ===
{"error":"Bad Request","message":"Invalid input: expected string, received undefined"}
HTTP Status: 400

=== CREATE: Forbidden cover image (403) ===
{"error":"Forbidden","message":"Cover image belongs to another user"}
HTTP Status: 403
```

### LIST Operations

```
=== LIST: Albums with default pagination (200) ===
{"data":[{"id":"b5622bd3-f92c-47c4-a8cf-067e1ab4bb74","userId":"dev-user-00000000-0000-0000-0000-000000000001","title":"My New Album",...}],"pagination":{"page":1,"limit":20,"total":3,"totalPages":1}}
HTTP Status: 200
```

### GET Operations

```
=== GET: Existing album (200) ===
{"id":"22222222-2222-2222-2222-222222222001","userId":"dev-user-00000000-0000-0000-0000-000000000001","title":"Castle Builds","description":"Collection of castle inspiration images","coverImageId":"33333333-3333-3333-3333-333333333001","coverImageUrl":"https://example.com/images/castle.jpg","imageCount":2,...,"images":[...]}
HTTP Status: 200

=== GET: Non-existent album (404) ===
{"error":"Not Found","message":"Album not found"}
HTTP Status: 404

=== GET: Invalid UUID (400) ===
{"error":"Bad Request","message":"Invalid album ID format"}
HTTP Status: 400

=== GET: Other user's album (403) ===
{"error":"Forbidden","message":"You do not have permission to access this album"}
HTTP Status: 403
```

### UPDATE Operations

```
=== PATCH: Update album title (200) ===
{"id":"22222222-2222-2222-2222-222222222001","userId":"dev-user-00000000-0000-0000-0000-000000000001","title":"Updated Castle Builds",...,"lastUpdatedAt":"2026-01-19T04:33:28.398Z"}
HTTP Status: 200

=== PATCH: Clear coverImageId (200) ===
{"id":"22222222-2222-2222-2222-222222222002",...,"coverImageId":null,"coverImageUrl":null,...}
HTTP Status: 200

=== PATCH: Non-existent album (404) ===
{"error":"Not Found","message":"Album not found"}
HTTP Status: 404

=== PATCH: Other user's album (403) ===
{"error":"Forbidden","message":"You do not have permission to update this album"}
HTTP Status: 403
```

### DELETE Operations

```
=== DELETE: Non-existent album (404) ===
{"error":"Not Found","message":"Album not found"}
HTTP Status: 404

=== DELETE: Other user's album (403) ===
{"error":"Forbidden","message":"You do not have permission to delete this album"}
HTTP Status: 403

=== DELETE: Invalid UUID (400) ===
{"error":"Bad Request","message":"Invalid album ID format"}
HTTP Status: 400

=== DELETE: Existing album (204) ===
HTTP Status: 204

=== Verify album deleted ===
{"error":"Not Found","message":"Album not found"}
HTTP Status: 404
```

## Playwright Video

N/A - Story is backend-only.

---
