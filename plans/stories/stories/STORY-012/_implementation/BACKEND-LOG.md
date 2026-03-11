# STORY-012 Backend Implementation Log

## Chunk 1 - GET + POST Handler for Gallery Images

- **Objective (maps to AC-1, AC-2)**: Implement GET /api/mocs/:id/gallery-images (list linked images) and POST /api/mocs/:id/gallery-images (link image to MOC)
- **Files changed**:
  - `apps/api/platforms/vercel/api/mocs/[id]/gallery-images/index.ts` (NEW)
- **Summary of changes**:
  - Created new handler file with GET and POST methods
  - GET returns all gallery images linked to a MOC with full image data (id, title, description, url, tags, createdAt, lastUpdatedAt)
  - POST creates a link between a gallery image and a MOC (cross-user linking permitted)
  - Implements all AC-1 and AC-2 requirements: 401 UNAUTHORIZED, 404 NOT_FOUND, 403 FORBIDDEN, 409 CONFLICT, 400 VALIDATION_ERROR
  - UUID format validation for both mocId and galleryImageId
- **Reuse compliance**:
  - Reused: `@repo/logger`, `pg`, `drizzle-orm/node-postgres`, inline schema pattern from `mocs/[id].ts`
  - New: Handler file with combined GET+POST methods
  - Why new was necessary: New endpoint required by STORY-012
- **Ports & adapters note**:
  - What stayed in core: N/A - per STORY-011 pattern, business logic inline in handler
  - What stayed in adapters: All request parsing, auth bypass, database operations, response formatting
- **Commands run**: `pnpm eslint apps/api/platforms/vercel/api/mocs/[id]/gallery-images/index.ts --fix` (passed)
- **Notes / Risks**: None

---

## Chunk 2 - DELETE Handler for Gallery Images

- **Objective (maps to AC-3)**: Implement DELETE /api/mocs/:id/gallery-images/:galleryImageId (unlink image from MOC)
- **Files changed**:
  - `apps/api/platforms/vercel/api/mocs/[id]/gallery-images/[galleryImageId].ts` (NEW)
- **Summary of changes**:
  - Created new handler file for DELETE method
  - Removes the association between a gallery image and a MOC
  - Implements all AC-3 requirements: 401 UNAUTHORIZED, 404 NOT_FOUND (MOC and link), 403 FORBIDDEN
  - UUID format validation for both mocId and galleryImageId
  - Returns 404 when image is not linked (idempotent behavior)
- **Reuse compliance**:
  - Reused: `@repo/logger`, `pg`, `drizzle-orm/node-postgres`, inline schema pattern
  - New: Handler file
  - Why new was necessary: New endpoint required by STORY-012
- **Ports & adapters note**:
  - What stayed in core: N/A - per STORY-011 pattern, business logic inline in handler
  - What stayed in adapters: All request parsing, auth bypass, database operations, response formatting
- **Commands run**: `pnpm eslint apps/api/platforms/vercel/api/mocs/[id]/gallery-images/[galleryImageId].ts --fix` (passed)
- **Notes / Risks**: None

---

## Chunk 3 - Vercel Route Configuration

- **Objective**: Add route rewrites for gallery-images endpoints
- **Files changed**:
  - `apps/api/platforms/vercel/vercel.json` (MODIFY)
- **Summary of changes**:
  - Added 2 new route rewrites BEFORE the `/api/mocs/:id` route:
    1. `/api/mocs/:id/gallery-images/:galleryImageId` -> `[galleryImageId].ts` (DELETE)
    2. `/api/mocs/:id/gallery-images` -> `index.ts` (GET, POST)
  - More specific route comes first per Vercel routing rules
- **Reuse compliance**:
  - Reused: Existing vercel.json structure and pattern
  - New: 2 route entries
  - Why new was necessary: Routes required for new endpoints
- **Ports & adapters note**:
  - What stayed in core: N/A
  - What stayed in adapters: Route configuration (infrastructure concern)
- **Commands run**: `node -e "JSON.parse(...)"` (valid JSON)
- **Notes / Risks**: None

---

## Chunk 4 - Seed Data for MOC Gallery Image Links

- **Objective (maps to Section 11)**: Add seed data for moc_gallery_images join table
- **Files changed**:
  - `apps/api/core/database/seeds/mocs.ts` (MODIFY)
- **Summary of changes**:
  - Added 3 MOC gallery image link records:
    1. King's Castle + Castle Tower Photo (happy path list test)
    2. King's Castle + Medieval Knight (multiple links test)
    3. Space Station + Private Image (cross-user link test)
  - Uses deterministic UUIDs (cccccccc-...) for idempotent seeding
  - ON CONFLICT DO NOTHING pattern for idempotency
- **Reuse compliance**:
  - Reused: Existing seed pattern, sql template literal
  - New: mocGalleryImageLinks array with 3 entries
  - Why new was necessary: Test data required by STORY-012
- **Ports & adapters note**:
  - What stayed in core: Seed data
  - What stayed in adapters: N/A
- **Commands run**: `pnpm eslint apps/api/core/database/seeds/mocs.ts --fix` (passed)
- **Notes / Risks**: Depends on gallery images from gallery.ts seed (11111111, 33333333, 55555555)

---

## Chunk 5 - HTTP Contract Documentation

- **Objective (maps to AC-5)**: Update mocs.http with all gallery linking requests
- **Files changed**:
  - `__http__/mocs.http` (MODIFY)
- **Summary of changes**:
  - Added STORY-012 section with 17 HTTP requests:
    - GET requests: 6 (happy path, cross-user, empty, 403, 404, 400)
    - POST requests: 8 (happy path, 409 conflict, 404 image, 404 MOC, 403, 400 missing, 400 invalid MOC, 400 invalid image)
    - DELETE requests: 6 (happy path, 404 not linked, 404 MOC, 403, 400 invalid MOC, 400 invalid image)
  - Each request has named identifier for easy reference
  - Notes added for requests that modify state (link/unlink)
- **Reuse compliance**:
  - Reused: Existing .http file structure, baseUrl variable
  - New: 17 HTTP request definitions
  - Why new was necessary: Contract verification required by STORY-012
- **Ports & adapters note**:
  - What stayed in core: N/A
  - What stayed in adapters: N/A (documentation file)
- **Commands run**: None (HTTP file syntax is validated by IDE)
- **Notes / Risks**: Some requests (linkGalleryImage, unlinkGalleryImage) will modify state - re-run seed to reset

---

## Summary

| Chunk | Files | Status |
|-------|-------|--------|
| 1 | `index.ts` (GET+POST) | Complete |
| 2 | `[galleryImageId].ts` (DELETE) | Complete |
| 3 | `vercel.json` routes | Complete |
| 4 | `seeds/mocs.ts` links | Complete |
| 5 | `mocs.http` requests | Complete |

## Files Created/Modified

### NEW Files
- `apps/api/platforms/vercel/api/mocs/[id]/gallery-images/index.ts`
- `apps/api/platforms/vercel/api/mocs/[id]/gallery-images/[galleryImageId].ts`

### MODIFIED Files
- `apps/api/platforms/vercel/vercel.json`
- `apps/api/core/database/seeds/mocs.ts`
- `__http__/mocs.http`

## Verification Commands

```bash
# ESLint (all passed)
pnpm eslint apps/api/platforms/vercel/api/mocs/\[id\]/gallery-images/index.ts --fix
pnpm eslint apps/api/platforms/vercel/api/mocs/\[id\]/gallery-images/\[galleryImageId\].ts --fix
pnpm eslint apps/api/core/database/seeds/mocs.ts --fix

# JSON validation
node -e "JSON.parse(require('fs').readFileSync('apps/api/platforms/vercel/vercel.json', 'utf8'))"
```

---

**BACKEND COMPLETE**
