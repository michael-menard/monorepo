---
status: uat
---

# STORY-012: MOC Instructions - Gallery Linking

## 1. Title

Migrate MOC Instructions gallery linking endpoints (get, link, unlink) from AWS Lambda to Vercel serverless functions.

---

## 2. Context

The Vercel migration is progressing through the API surface. STORY-011 established the MOC Instructions read operations migration patterns. This story migrates the gallery linking endpoints, enabling users to associate inspiration gallery images with their MOC instruction builds.

The AWS Lambda handlers at `apps/api/platforms/aws/endpoints/moc-instructions/` implement:
- Get all gallery images linked to a MOC (ownership required)
- Link an existing gallery image to a MOC (ownership required)
- Unlink a gallery image from a MOC (ownership required)

These endpoints operate on the `moc_gallery_images` join table, which already exists with proper FK constraints and cascade deletes.

**PM Decision: Cross-User Gallery Linking**
The current AWS implementation allows users to link ANY gallery image to their MOC, not just images they own. This enables inspiration sharing - users can reference community inspiration images when documenting their builds. This behavior is **maintained for MVP**.

---

## 3. Goal

Enable linking, unlinking, and listing gallery images associated with MOC Instructions via Vercel serverless functions with identical API behavior to the existing AWS Lambda implementation.

---

## 4. Non-Goals

- **Gallery image ownership validation**: Users can link any gallery image (not just their own). Future story may add optional ownership restriction.
- **Pagination for linked images**: MVP returns all linked images. Pagination deferred unless performance issues arise.
- **Unique constraint migration**: Database does not have `UNIQUE(moc_id, gallery_image_id)` constraint - duplicate prevention is application-level via SELECT check.
- **Core package extraction**: Business logic stays inline in handlers per STORY-011 pattern. Core functions deferred.
- **UI changes**: No frontend modifications. Existing RTK Query slices continue to work unchanged.

---

## 5. Scope

### Endpoints

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/mocs/:id/gallery-images` | List linked images | Returns all gallery images linked to a MOC |
| POST | `/api/mocs/:id/gallery-images` | Link image | Creates association between gallery image and MOC |
| DELETE | `/api/mocs/:id/gallery-images/:galleryImageId` | Unlink image | Removes association between gallery image and MOC |

### Packages/Apps Affected

| Location | Change Type |
|----------|-------------|
| `apps/api/platforms/vercel/api/mocs/[id]/gallery-images/index.ts` | NEW - GET + POST handlers |
| `apps/api/platforms/vercel/api/mocs/[id]/gallery-images/[galleryImageId].ts` | NEW - DELETE handler |
| `apps/api/platforms/vercel/vercel.json` | MODIFY - add route rewrites |
| `apps/api/core/database/seeds/mocs.ts` | MODIFY - add gallery image links |
| `__http__/mocs.http` | MODIFY - add gallery linking requests |

---

## 6. Acceptance Criteria

### AC-1: GET /api/mocs/:id/gallery-images Endpoint

- [ ] Returns 401 UNAUTHORIZED without valid authentication
- [ ] Returns 404 NOT_FOUND for non-existent MOC ID
- [ ] Returns 403 FORBIDDEN when accessing another user's MOC
- [ ] Returns 200 OK with `{ images: [], total: 0 }` when MOC has no linked images
- [ ] Returns 200 OK with `{ images: [...], total: N }` when MOC has linked images
- [ ] Each image object includes: `id`, `title`, `description`, `url`, `tags`, `createdAt`, `lastUpdatedAt`
- [ ] Images are ordered by gallery image `createdAt` ascending
- [ ] Invalid UUID format returns 400 VALIDATION_ERROR

### AC-2: POST /api/mocs/:id/gallery-images Endpoint

- [ ] Returns 401 UNAUTHORIZED without valid authentication
- [ ] Returns 404 NOT_FOUND for non-existent MOC ID
- [ ] Returns 403 FORBIDDEN when linking to another user's MOC
- [ ] Returns 400 VALIDATION_ERROR when `galleryImageId` is missing from request body
- [ ] Returns 404 NOT_FOUND when gallery image does not exist
- [ ] Returns 409 CONFLICT when image is already linked to the MOC
- [ ] Returns 201 CREATED with `{ message, link: { id, mocId, galleryImageId } }` on success
- [ ] Creates record in `moc_gallery_images` join table
- [ ] Allows linking gallery images owned by any user (cross-user linking permitted)

### AC-3: DELETE /api/mocs/:id/gallery-images/:galleryImageId Endpoint

- [ ] Returns 401 UNAUTHORIZED without valid authentication
- [ ] Returns 404 NOT_FOUND for non-existent MOC ID
- [ ] Returns 403 FORBIDDEN when unlinking from another user's MOC
- [ ] Returns 404 NOT_FOUND when image is not linked to the MOC
- [ ] Returns 200 OK with `{ message: "Gallery image unlinked successfully" }` on success
- [ ] Removes record from `moc_gallery_images` join table
- [ ] Subsequent unlink of same image returns 404

### AC-4: Error Response Format

- [ ] All error responses use standard codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`, `INTERNAL_ERROR`
- [ ] Error responses include `{ error: CODE, message: string }` format
- [ ] Invalid UUID format is treated as validation error, not 404

### AC-5: HTTP Contract Verification

- [ ] `__http__/mocs.http` updated with all gallery linking requests
- [ ] All happy path requests documented and executable
- [ ] Error case requests documented (401, 403, 404, 409)

---

## 7. Reuse Plan

### Packages to Reuse

| Package | Usage |
|---------|-------|
| `@repo/logger` | Logging in handlers |
| `pg` | PostgreSQL connection |
| `drizzle-orm/node-postgres` | ORM layer |

### Patterns to Reuse

| Pattern Source | Usage |
|---------------|-------|
| `apps/api/platforms/vercel/api/mocs/[id].ts` | Handler structure, auth bypass, DB singleton, inline schema |
| `apps/api/platforms/aws/endpoints/moc-instructions/get-gallery-images/handler.ts` | Query patterns |

### Prohibited Patterns

- Do NOT extract to `moc-instructions-core` package (keep inline per STORY-011 pattern)
- Do NOT add pagination (MVP returns all linked images)
- Do NOT restrict cross-user gallery image linking

---

## 8. Architecture Notes (Ports & Adapters)

```
+-------------------------------------------------------------+
|                    Vercel Handler (Adapter)                  |
|  apps/api/platforms/vercel/api/mocs/[id]/gallery-images/...  |
|                                                              |
|  - Parse request params and body                             |
|  - Extract auth (AUTH_BYPASS or JWT)                         |
|  - Validate ownership                                        |
|  - Execute database operations                               |
|  - Return JSON response                                      |
+------------------------------+-------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                    Database (Infrastructure)                 |
|  packages/backend/db                                         |
|                                                              |
|  - moc_instructions table (ownership)                        |
|  - gallery_images table (image data)                         |
|  - moc_gallery_images join table (links)                     |
|  - FK cascade deletes configured                             |
+-------------------------------------------------------------+
```

---

## 9. Required Vercel / Infra Notes

### Environment Variables Required

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | YES |
| `AWS_REGION` | AWS region (e.g., `us-east-1`) | YES |
| `COGNITO_USER_POOL_ID` | Cognito user pool ID | YES |
| `COGNITO_CLIENT_ID` | Cognito client ID | YES |
| `AUTH_BYPASS` | Enable dev auth bypass (dev only) | DEV ONLY |
| `DEV_USER_SUB` | Mock user ID for bypass | DEV ONLY |

### Infrastructure References (Dev)

| Resource | Value |
|----------|-------|
| Cognito User Pool | `us-east-1_vtW1Slo3o` |
| Cognito Client ID | `4527ui02h63b7c0ra7vs00gua5` |
| Cognito Issuer | `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_vtW1Slo3o` |

### Cognito JWT Validation

Vercel handlers validate Cognito JWTs using the `@repo/vercel-adapter` package:

```typescript
import { validateCognitoJwt } from '@repo/vercel-adapter'

// In handler:
const userId = await getAuthUserId(req) // Uses AUTH_BYPASS in dev, validates JWT in prod
```

**JWT Validation Flow:**
1. Extract `Authorization: Bearer <token>` header
2. Fetch Cognito JWKS from `{issuer}/.well-known/jwks.json` (cached)
3. Verify token signature, expiry, audience, and issuer
4. Extract `sub` claim as user ID

**Local Development:**
- Set `AUTH_BYPASS=true` and `DEV_USER_SUB=<test-user-id>` to skip JWT validation
- Useful for testing without real Cognito tokens

### Vercel Configuration

Add to `apps/api/platforms/vercel/vercel.json` rewrites array:

```json
{ "source": "/api/mocs/:id/gallery-images/:galleryImageId", "destination": "/api/mocs/[id]/gallery-images/[galleryImageId]" },
{ "source": "/api/mocs/:id/gallery-images", "destination": "/api/mocs/[id]/gallery-images/index" }
```

**Note**: The more specific route (with `:galleryImageId`) MUST come before the general route.

---

## 10. HTTP Contract Plan

### Required `.http` Requests

| Request Name | Path | Method | Required |
|--------------|------|--------|----------|
| `getMocGalleryImages` | `/__http__/mocs.http` | GET | YES |
| `getMocGalleryImagesEmpty` | `/__http__/mocs.http` | GET | YES |
| `getMocGalleryImages403` | `/__http__/mocs.http` | GET | YES |
| `linkGalleryImage` | `/__http__/mocs.http` | POST | YES |
| `linkGalleryImage409` | `/__http__/mocs.http` | POST | YES |
| `linkGalleryImage404Image` | `/__http__/mocs.http` | POST | YES |
| `unlinkGalleryImage` | `/__http__/mocs.http` | DELETE | YES |
| `unlinkGalleryImage404` | `/__http__/mocs.http` | DELETE | YES |

### Evidence Requirements

QA Verify MUST capture:
1. Response status code
2. Response body (JSON)
3. Verify error codes match expected (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`)
4. Verify response structure matches schema

---

## 11. Seed Requirements

### Required Entities

Extend existing `apps/api/core/database/seeds/mocs.ts` with MOC-Gallery image links:

**MOC Gallery Image Links:**

| Link Purpose | MOC ID | Gallery Image ID | Notes |
|--------------|--------|------------------|-------|
| Happy path list test | `dddddddd-dddd-dddd-dddd-dddddddd0001` (King's Castle) | `11111111-1111-1111-1111-111111111111` (Castle Tower Photo) | Dev user's MOC + dev user's image |
| Multiple links test | `dddddddd-dddd-dddd-dddd-dddddddd0001` (King's Castle) | `33333333-3333-3333-3333-333333333333` (Medieval Knight) | Same MOC, different image |
| Cross-user link test | `dddddddd-dddd-dddd-dddd-dddddddd0002` (Space Station) | `55555555-5555-5555-5555-555555555555` (Private Image - other user) | Dev user's MOC + other user's image |

**Available for linking tests (NOT pre-linked):**

| Image ID | Title | Notes |
|----------|-------|-------|
| `22222222-2222-2222-2222-222222222222` | Space Station Build | Available for POST link test |
| `66666666-6666-6666-6666-666666666666` | Update Test Image | Available for POST link test |

### Seed Requirements

- **Deterministic**: Same IDs every run (use fixed UUIDs)
- **Idempotent**: ON CONFLICT DO NOTHING pattern
- **Location**: Extend `apps/api/core/database/seeds/mocs.ts` with `moc_gallery_images` inserts
- **Command**: `pnpm seed` includes gallery link seed

---

## 12. Test Plan (Happy Path / Error Cases / Edge Cases)

*Synthesized from `_pm/TEST-PLAN.md`*

### Happy Path Tests

| ID | Test | Expected | Evidence |
|----|------|----------|----------|
| HP-1 | GET /api/mocs/:id/gallery-images (MOC with 2 linked images) | 200 `{ images: [...], total: 2 }` | `.http` response |
| HP-2 | GET /api/mocs/:id/gallery-images (MOC with no links) | 200 `{ images: [], total: 0 }` | `.http` response |
| HP-3 | POST /api/mocs/:id/gallery-images (new link) | 201 `{ message, link }` | `.http` response |
| HP-4 | DELETE /api/mocs/:id/gallery-images/:galleryImageId (existing link) | 200 `{ message }` | `.http` response |
| HP-5 | GET response includes all image fields | 200 with id, title, description, url, tags, createdAt, lastUpdatedAt | `.http` response |

### Error Cases

| ID | Test | Expected |
|----|------|----------|
| ERR-1 | GET without auth | 401 UNAUTHORIZED |
| ERR-2 | GET non-existent MOC | 404 NOT_FOUND |
| ERR-3 | GET other user's MOC | 403 FORBIDDEN |
| ERR-4 | POST without auth | 401 UNAUTHORIZED |
| ERR-5 | POST missing galleryImageId | 400 VALIDATION_ERROR |
| ERR-6 | POST non-existent gallery image | 404 NOT_FOUND |
| ERR-7 | POST already linked image | 409 CONFLICT |
| ERR-8 | DELETE without auth | 401 UNAUTHORIZED |
| ERR-9 | DELETE non-linked image | 404 NOT_FOUND |
| ERR-10 | DELETE other user's MOC | 403 FORBIDDEN |

### Edge Cases

| ID | Test | Expected |
|----|------|----------|
| EDGE-1 | Link same image to two different MOCs | Both succeed (same image can link to multiple MOCs) |
| EDGE-2 | Link gallery image owned by different user | 201 success (cross-user linking permitted) |
| EDGE-3 | Link image to draft MOC | 201 success (linking works regardless of status) |
| EDGE-4 | Gallery image with null description/tags | 200 with null values preserved |
| EDGE-5 | Delete link, then delete again | First: 200, Second: 404 |
| EDGE-6 | Invalid UUID format for MOC ID | 400 VALIDATION_ERROR |

---

## 13. Open Questions

*None - all blocking decisions resolved.*

**Decision Log:**
- Cross-user gallery linking: **PERMITTED** - Enables inspiration sharing across users
- Pagination: **DEFERRED** - MVP returns all linked images
- Core package extraction: **DEFERRED** - Keep inline per STORY-011 pattern

---

## Agent Log

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-20 | PM | Generated story from index | `plans/stories/STORY-012/STORY-012.md` |
| 2026-01-20 | pm-draft-test-plan | Created test plan | `plans/stories/STORY-012/_pm/TEST-PLAN.md` |
| 2026-01-20 | pm-dev-feasibility-review | Created feasibility analysis | `plans/stories/STORY-012/_pm/DEV-FEASIBILITY.md` |
| 2026-01-20 | PM | Marked UI/UX as SKIPPED | `plans/stories/STORY-012/_pm/UIUX-NOTES.md` |
