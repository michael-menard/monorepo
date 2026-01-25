# DEV-FEASIBILITY.md - STORY-012: MOC Instructions Gallery Linking

**Author:** pm-dev-feasibility-review sub-agent
**Date:** 2026-01-20
**Status:** Ready for Implementation

---

## Executive Summary

STORY-012 is a **low-risk, straightforward migration** of 3 existing AWS Lambda endpoints to Vercel serverless functions. The patterns are well-established from STORY-011 (MOC Read Operations) and STORY-008/009 (Gallery/Sets endpoints). The database schema already exists with proper relationships, and the business logic is simple CRUD operations on a join table.

**Estimated effort:** 1-2 days for implementation + testing

---

## 1. Risk Analysis

### 1.1 Low Risk Items

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Schema duplication** | High (by design) | Low | Vercel handlers use inline schema definitions per existing pattern. This is intentional technical debt to avoid complex build tooling. |
| **Authentication bypass edge cases** | Low | Medium | AUTH_BYPASS pattern is well-tested in 8+ existing Vercel endpoints. |
| **Database connection pool exhaustion** | Low | Medium | `max: 1` pattern ensures proper connection management in serverless. |

### 1.2 Medium Risk Items

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Nested route configuration** | Medium | Low | Vercel requires explicit rewrites in `vercel.json`. Pattern exists for `/api/mocs/:id` but not `/api/mocs/:id/gallery-images/:galleryImageId`. Need to add new rewrites. |
| **Cross-user gallery image linking** | Medium | Medium | AWS handler allows linking ANY gallery image (not just owner's). Story AC should clarify if this is intentional or if user should only link their own images. |

### 1.3 No Blockers Identified

All technical dependencies are satisfied:
- Database schema: `moc_gallery_images` table exists with proper FK constraints
- Relationships: `mocGalleryImages` relations defined in Drizzle schema
- Indexes: `idx_moc_gallery_images_moc_id_lazy` and `idx_moc_gallery_images_gallery_image_id_lazy` exist
- Cascading deletes: Both FKs have `onDelete: 'cascade'`

---

## 2. Change Surface Analysis

### 2.1 New Files Required

| File Path | Purpose |
|-----------|---------|
| `apps/api/platforms/vercel/api/mocs/[id]/gallery-images/index.ts` | GET (list) + POST (link) handlers |
| `apps/api/platforms/vercel/api/mocs/[id]/gallery-images/[galleryImageId].ts` | DELETE (unlink) handler |

### 2.2 Files Requiring Modification

| File Path | Change |
|-----------|--------|
| `apps/api/platforms/vercel/vercel.json` | Add 3 new rewrite rules |

### 2.3 Optional Enhancements (Out of Scope)

| File Path | Potential Enhancement |
|-----------|----------------------|
| `packages/backend/moc-instructions-core/src/index.ts` | Could add `linkGalleryImage`, `unlinkGalleryImage`, `getMocGalleryImages` core functions for future AWS/Vercel parity. **Recommendation: Skip for MVP** - inline logic is simpler and matches STORY-011 pattern. |

---

## 3. Hidden Dependencies

### 3.1 Database Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| `moc_instructions` table | Exists | Parent table for MOC ownership checks |
| `gallery_images` table | Exists | Source table for linked images |
| `moc_gallery_images` table | Exists | Join table - the core of this story |
| Cascade deletes | Configured | Both FKs have `onDelete: 'cascade'` |

### 3.2 Runtime Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| `pg` (node-postgres) | Installed | Used by all Vercel handlers |
| `drizzle-orm/node-postgres` | Installed | ORM layer |
| `@repo/logger` | Installed | Logging utility |
| `zod` | Installed | Input validation (optional for this story) |

### 3.3 Environment Dependencies

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_BYPASS` | Yes (dev only) | Set to `"true"` for local development |
| `DEV_USER_SUB` | Optional | Custom dev user ID (defaults to `dev-user-00000000-0000-0000-0000-000000000001`) |

---

## 4. Acceptance Criteria Gap Analysis

### 4.1 Gaps Identified in Story Scope

| Gap | Severity | Recommendation |
|-----|----------|----------------|
| **No unique constraint on `(moc_id, gallery_image_id)`** | Medium | The AWS handler checks for duplicates via SELECT before INSERT. Add this check to Vercel handler. Consider adding DB unique constraint in future migration. |
| **Cross-user linking behavior unclear** | Medium | AWS handler allows linking ANY gallery image, not just user's own. Clarify in AC: Should user be allowed to link images they don't own? |
| **Response format not specified** | Low | AWS returns `{ images: [...], total: number }` for GET. Should match for API parity. |
| **Error codes not specified** | Low | AWS uses `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`, `INTERNAL_ERROR`. Should match for API parity. |

### 4.2 Recommended AC Additions

```markdown
## Additional Acceptance Criteria (Recommended)

AC-5: GET /api/mocs/:id/gallery-images returns `{ images: [...], total: number }` format
AC-6: POST returns 409 CONFLICT if image is already linked to the MOC
AC-7: Error responses use standard error codes: UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, VALIDATION_ERROR, INTERNAL_ERROR
AC-8: All endpoints validate UUID format and return 400 for invalid IDs
AC-9: (CLARIFY) User can link any gallery image OR only their own images
```

---

## 5. Technical Implementation Notes

### 5.1 Vercel Route Configuration

Add to `vercel.json` rewrites array:

```json
{ "source": "/api/mocs/:id/gallery-images/:galleryImageId", "destination": "/api/mocs/[id]/gallery-images/[galleryImageId].ts" },
{ "source": "/api/mocs/:id/gallery-images", "destination": "/api/mocs/[id]/gallery-images/index.ts" }
```

**Important:** The more specific route (with `:galleryImageId`) MUST come before the general route.

### 5.2 Handler Pattern (from STORY-011)

```typescript
// Standard Vercel handler pattern
import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq, and } from 'drizzle-orm'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { logger } = loggerPkg

// Inline schema definitions (matches existing pattern)
const mocInstructions = pgTable('moc_instructions', { ... })
const galleryImages = pgTable('gallery_images', { ... })
const mocGalleryImages = pgTable('moc_gallery_images', { ... })

// DB singleton
let dbClient: ReturnType<typeof drizzle> | null = null
function getDb() { ... }

// Auth helper
function getAuthUserId(): string | null { ... }

// Handler
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> { ... }
```

### 5.3 Query Patterns from AWS Handlers

**GET (List linked images):**
```typescript
const linkedImages = await db
  .select({
    id: galleryImages.id,
    title: galleryImages.title,
    description: galleryImages.description,
    url: galleryImages.imageUrl,
    tags: galleryImages.tags,
    createdAt: galleryImages.createdAt,
    lastUpdatedAt: galleryImages.lastUpdatedAt,
  })
  .from(mocGalleryImages)
  .innerJoin(galleryImages, eq(mocGalleryImages.galleryImageId, galleryImages.id))
  .where(eq(mocGalleryImages.mocId, mocId))
  .orderBy(galleryImages.createdAt)
```

**POST (Link image):**
```typescript
// 1. Verify MOC exists + ownership
// 2. Verify gallery image exists
// 3. Check if link already exists (return 409 if so)
// 4. Insert into mocGalleryImages
```

**DELETE (Unlink image):**
```typescript
// 1. Verify MOC exists + ownership
// 2. Check if link exists (return 404 if not)
// 3. Delete from mocGalleryImages
```

---

## 6. Mitigations for PM to Bake Into Story

### 6.1 Required Before Implementation

1. **Clarify AC-9:** Should users be able to link gallery images they don't own?
   - Current AWS behavior: Yes (any image can be linked)
   - Recommendation: Maintain current behavior for MVP, consider restricting in future

2. **Add explicit response format AC:** Specify JSON response shapes for API documentation parity

### 6.2 Recommended Test Cases for QA

| Test Case | Expected Result |
|-----------|-----------------|
| GET /api/mocs/:id/gallery-images (no auth) | 401 Unauthorized |
| GET /api/mocs/:id/gallery-images (not owner) | 403 Forbidden |
| GET /api/mocs/:id/gallery-images (owner, no images) | 200 `{ images: [], total: 0 }` |
| GET /api/mocs/:id/gallery-images (owner, with images) | 200 `{ images: [...], total: N }` |
| POST /api/mocs/:id/gallery-images (missing body) | 400 Validation Error |
| POST /api/mocs/:id/gallery-images (invalid galleryImageId) | 404 Not Found |
| POST /api/mocs/:id/gallery-images (already linked) | 409 Conflict |
| POST /api/mocs/:id/gallery-images (success) | 201 Created |
| DELETE /api/mocs/:id/gallery-images/:galleryImageId (not linked) | 404 Not Found |
| DELETE /api/mocs/:id/gallery-images/:galleryImageId (success) | 200 OK |

### 6.3 Integration Test Scenario

```
1. Create MOC (via existing /api/mocs endpoint)
2. Upload gallery image (via existing /api/gallery/images/upload endpoint)
3. Link image to MOC (POST /api/mocs/:id/gallery-images)
4. Verify link appears (GET /api/mocs/:id/gallery-images)
5. Unlink image (DELETE /api/mocs/:id/gallery-images/:galleryImageId)
6. Verify link removed (GET /api/mocs/:id/gallery-images)
```

---

## 7. Conclusion

**Recommendation: Proceed with implementation**

This story is a clean migration with:
- Well-established patterns from STORY-011
- Existing database schema and relationships
- Simple business logic (CRUD on join table)
- No external service dependencies
- Clear path to completion

**Estimated Implementation Time:**
- Endpoint implementation: 4-6 hours
- Unit tests: 2-4 hours
- Integration testing: 2-3 hours
- Total: 1-2 days

---

*Last updated: 2026-01-20*
