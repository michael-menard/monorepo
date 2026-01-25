# STORY-006 Dev Feasibility Review

## Summary: FEASIBLE

Story is implementable as written. No blocking issues identified.

---

## 1. Change Surface Analysis

### 1.1 New Files Required

| Location | File | Purpose |
|----------|------|---------|
| `apps/api/platforms/vercel/api/gallery/` | `albums/index.ts` | POST - Create album |
| `apps/api/platforms/vercel/api/gallery/` | `albums/list.ts` | GET - List albums |
| `apps/api/platforms/vercel/api/gallery/` | `albums/[id].ts` | GET, PATCH, DELETE - Single album ops |
| `packages/backend/gallery-core/src/` | `create-album.ts` | Core create logic |
| `packages/backend/gallery-core/src/` | `get-album.ts` | Core get logic |
| `packages/backend/gallery-core/src/` | `list-albums.ts` | Core list logic |
| `packages/backend/gallery-core/src/` | `update-album.ts` | Core update logic |
| `packages/backend/gallery-core/src/` | `delete-album.ts` | Core delete logic |
| `packages/backend/gallery-core/src/__types__/` | `album.ts` | Zod schemas |
| `packages/backend/gallery-core/src/__tests__/` | `*.test.ts` | Unit tests |
| `__http__/` | `gallery.http` | HTTP contract tests |

### 1.2 Existing Code to Reuse

| Source | Usage |
|--------|-------|
| `wishlist-core` pattern | Ports/adapters structure |
| `apps/api/platforms/vercel/api/wishlist/*.ts` | Vercel endpoint pattern |
| `apps/api/platforms/aws/endpoints/gallery/schemas/index.ts` | Existing Zod schemas |
| `apps/api/core/database/schema/index.ts` | `galleryAlbums`, `galleryImages` tables |

### 1.3 Dependencies

| Dependency | Status | Risk |
|------------|--------|------|
| `galleryAlbums` table | EXISTS | None - schema in place |
| `galleryImages` table | EXISTS | None - for image count join |
| Drizzle ORM | EXISTS | None - established pattern |
| `@repo/logger` | EXISTS | None |
| `zod` | EXISTS | None |
| `pg` connection pool | EXISTS | None |

---

## 2. Risk Analysis

### 2.1 Low Risk

| Risk | Mitigation |
|------|------------|
| Database schema changes | None required - `gallery_albums` table exists |
| Auth middleware | Established pattern from STORY-004/005 |
| Response format | Follow existing endpoint patterns |

### 2.2 Medium Risk

| Risk | Mitigation |
|------|------------|
| Cover image validation | Requires JOIN to verify image ownership before set |
| Image orphaning on delete | Existing AWS handler shows pattern - set `albumId=null` |
| List query performance | Use LEFT JOIN with aggregate - pattern exists in AWS handler |

### 2.3 No High Risks Identified

---

## 3. Hidden Dependencies

### 3.1 Cross-Table Operations

**Create with coverImageId:**
- Must verify `galleryImages.id` exists
- Must verify `galleryImages.userId` matches requesting user
- Pattern exists in AWS handler at lines 39-52

**Delete album:**
- Must update `galleryImages.albumId = null` for orphaned images
- Must NOT delete images (soft orphan only)
- Pattern exists in AWS handler at lines 35-40

**List with imageCount:**
- Requires LEFT JOIN to `galleryImages`
- Requires GROUP BY for count aggregation
- Pattern exists in AWS handler at lines 44-55

### 3.2 Redis/OpenSearch (Non-Blocking)

The AWS handlers include Redis caching and OpenSearch indexing. For Vercel MVP:

**Decision:** DEFER Redis/OpenSearch integration
- These are non-critical (marked as `try/catch` with non-critical logging)
- Core DB operations must work first
- Can be added in future story if needed

---

## 4. Missing AC Gaps

### 4.1 No Gaps Identified

All acceptance criteria are clear and testable:
- CRUD operations fully specified
- Error codes defined
- Validation rules match existing schemas

### 4.2 Implicit Requirements (Now Explicit)

| Requirement | Status |
|-------------|--------|
| Cover image ownership validation | Covered in error cases |
| Images not deleted on album delete | Covered in happy path |
| Pagination structure | Follows existing pattern |

---

## 5. Package Structure Decision

**Decision:** Create `packages/backend/gallery-core` package

**Justification:**
- Follows established pattern (`wishlist-core`, `sets-core`)
- Separates business logic from Vercel adapter
- Enables future AWS adapter without code duplication
- Unit testable without HTTP layer

**Alternative Considered:** Inline in Vercel endpoints
- Rejected: Violates reuse-first principle
- Rejected: Would duplicate logic when AWS adapter needed

---

## 6. Recommendations for PM

### 6.1 Scope Confirmation

- Confirm Redis/OpenSearch are OUT OF SCOPE for MVP
- Confirm soft-delete for albums is OUT OF SCOPE (delete is hard delete)

### 6.2 Test Data

- Will need seed data for gallery albums
- Suggest creating `apps/api/core/database/seeds/gallery.ts`
- Pattern exists from wishlist seed

---

## 7. Conclusion

**Feasibility:** PASS

No blocking issues. Implementation can proceed with:
1. Create `gallery-core` package
2. Implement 5 core functions with unit tests
3. Create 3 Vercel endpoint files (using dynamic routing for single-album ops)
4. Add HTTP contract tests
5. Seed data for testing

Estimated complexity: MEDIUM (similar to STORY-004 + STORY-005 combined)
