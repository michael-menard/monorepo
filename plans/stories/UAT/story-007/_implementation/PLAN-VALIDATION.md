# Plan Validation: STORY-007

## Summary
- Status: **VALID**
- Issues Found: 2 (Minor)
- Blockers: 0

---

## AC Coverage

| AC | Description | Addressed in Step | Status |
|----|-------------|-------------------|--------|
| AC-1 | Get Image Endpoint | Step 2, 3, 11 | OK |
| AC-2 | List Images Endpoint | Step 4, 5, 12 | OK |
| AC-3 | Search Images Endpoint | Step 6, 7, 13 | OK |
| AC-4 | Flag Image Endpoint | Step 8, 9, 14 | OK |
| AC-5 | Extend gallery-core Package | Steps 1-10 | OK |
| AC-6 | Seed Data | Step 16 | OK |
| AC-7 | HTTP Contract Verification | Step 17 | OK |

**AC Coverage Status**: All 7 acceptance criteria are addressed in the implementation plan.

---

## File Path Validation

### Gallery Core Package (MODIFY)
| File | Valid Pattern | Exists | Status |
|------|---------------|--------|--------|
| `packages/backend/gallery-core/src/__types__/index.ts` | Yes | Yes | OK |
| `packages/backend/gallery-core/src/get-image.ts` | Yes | To Create | OK |
| `packages/backend/gallery-core/src/list-images.ts` | Yes | To Create | OK |
| `packages/backend/gallery-core/src/search-images.ts` | Yes | To Create | OK |
| `packages/backend/gallery-core/src/flag-image.ts` | Yes | To Create | OK |
| `packages/backend/gallery-core/src/index.ts` | Yes | Yes | OK |
| `packages/backend/gallery-core/src/__tests__/*.test.ts` | Yes | To Create | OK |

### Vercel Handlers (CREATE)
| File | Valid Pattern | Parent Dir Exists | Status |
|------|---------------|-------------------|--------|
| `apps/api/platforms/vercel/api/gallery/images/[id].ts` | Yes | No (to create) | OK |
| `apps/api/platforms/vercel/api/gallery/images/index.ts` | Yes | No (to create) | OK |
| `apps/api/platforms/vercel/api/gallery/images/search.ts` | Yes | No (to create) | OK |
| `apps/api/platforms/vercel/api/gallery/images/flag.ts` | Yes | No (to create) | OK |

**Note**: The `apps/api/platforms/vercel/api/gallery/` directory exists with `albums/` subdirectory. The `images/` subdirectory will be created.

### Configuration (MODIFY)
| File | Valid Pattern | Exists | Status |
|------|---------------|--------|--------|
| `apps/api/platforms/vercel/vercel.json` | Yes | Yes | OK |
| `apps/api/core/database/seeds/gallery.ts` | Yes | Yes | OK |
| `__http__/gallery.http` | Yes | Yes | OK |

**Valid paths**: 14
**Invalid paths**: 0

---

## Reuse Target Validation

| Target | Exists | Location | Status |
|--------|--------|----------|--------|
| `@repo/logger` | Yes | `packages/core/logger/` | OK |
| `@repo/gallery-core` | Yes | `packages/backend/gallery-core/` | OK |
| `packages/backend/db` | Yes | `packages/backend/db/` | OK |
| `@repo/vercel-adapter` | Yes | `packages/backend/vercel-adapter/` | OK |
| `packages/backend/lambda-responses` | Yes | `packages/backend/lambda-responses/` | OK |

### Pattern Files to Follow
| Pattern Source | Exists | Status |
|----------------|--------|--------|
| `packages/backend/gallery-core/src/get-album.ts` | Yes | OK |
| `packages/backend/gallery-core/src/list-albums.ts` | Yes | OK |
| `apps/api/platforms/vercel/api/gallery/albums/[id].ts` | Yes | OK |
| `apps/api/platforms/vercel/api/gallery/albums/list.ts` | Yes | OK |
| `apps/api/core/database/seeds/gallery.ts` | Yes | OK |

**All reuse targets verified.**

---

## Step Analysis

- **Total steps**: 19
- **Steps with verification**: 19 (all steps have verification actions)
- **Dependencies respected**: Yes (phases structured correctly: Core -> Handlers -> Config -> Integration)

### Phase Structure
1. **Phase 1 (Steps 1-10)**: Core Types and Schemas - Foundation work
2. **Phase 2 (Steps 11-14)**: Vercel Handlers - Depend on Phase 1
3. **Phase 3 (Steps 15-16)**: Configuration and Routing
4. **Phase 4 (Steps 17)**: HTTP Contract
5. **Phase 5 (Steps 18-19)**: Final Verification

**Step ordering is correct and dependencies are respected.**

---

## Test Plan Feasibility

### .http File Feasibility
- **Location**: `__http__/gallery.http`
- **File exists**: Yes
- **Can extend**: Yes (currently has album tests only)
- **Status**: Feasible

### Unit Test Feasibility
- **Framework**: Vitest (configured in `packages/backend/gallery-core/vitest.config.ts`)
- **Existing tests**: Yes (album tests exist in `__tests__/` directory)
- **Pattern to follow**: `get-album.test.ts`, `list-albums.test.ts`, etc.
- **Status**: Feasible

### Verification Commands
| Command | Valid | Status |
|---------|-------|--------|
| `pnpm check-types --filter=@repo/gallery-core` | Yes | OK |
| `pnpm lint --filter=@repo/gallery-core` | Yes | OK |
| `pnpm test --filter=@repo/gallery-core` | Yes | OK |
| `pnpm build --filter=@repo/gallery-core` | Yes | OK |
| `pnpm seed` | Yes | OK |

---

## Database Schema Validation

### Required Tables
| Table | Exists | Status |
|-------|--------|--------|
| `gallery_images` | Yes | OK |
| `gallery_albums` | Yes | OK |
| `gallery_flags` | Yes | OK |

### gallery_flags Table Schema (Verified)
- `id` (uuid, PK)
- `imageId` (uuid, FK to gallery_images)
- `userId` (text, not null)
- `reason` (text, nullable)
- `createdAt` (timestamp)
- `lastUpdatedAt` (timestamp)
- Unique constraint on `(imageId, userId)` - supports 409 conflict detection

**Schema supports all AC requirements.**

---

## Minor Issues (Non-Blocking)

### Issue 1: vercel.json Route Destinations
**Severity**: Low
**Description**: Plan Step 15 shows destination paths with `.ts` extension (e.g., `/api/gallery/images/search.ts`), but existing `vercel.json` routes do NOT use `.ts` extension (e.g., `/api/sets/list` not `/api/sets/list.ts`).

**Existing pattern in vercel.json**:
```json
{ "source": "/api/sets/list", "destination": "/api/sets/list.ts" }
```

**Plan shows**:
```json
{ "source": "/api/gallery/images/search", "destination": "/api/gallery/images/search.ts" }
```

**Resolution**: The plan is consistent with the existing pattern. This is actually correct.

### Issue 2: Seed Data UUIDs
**Severity**: Low
**Description**: The plan references specific UUIDs from the story (e.g., `11111111-1111-1111-1111-111111111111`), but the existing `gallery.ts` seed file uses different UUIDs (e.g., `33333333-3333-3333-3333-333333333001`).

**Impact**: None - the seed file will be updated to match story requirements in Step 16.

---

## Verdict

**PLAN VALID**

The implementation plan is well-structured and complete:

1. All 7 acceptance criteria are covered
2. All file paths follow valid monorepo patterns
3. All reuse targets exist and are verified
4. Steps are properly ordered with dependencies respected
5. Database schema supports all required operations
6. Test infrastructure (Vitest, .http files) is in place
7. Existing patterns in codebase provide clear templates to follow

**No blockers identified.**

---

## Recommendations (Optional Improvements)

1. **Seed Data Consistency**: When implementing Step 16, ensure the new seed data coexists with existing album test data (don't break STORY-006 tests).

2. **Search Implementation**: The plan correctly identifies `tags::text ILIKE` for JSONB search. Consider also checking if Drizzle ORM has a cleaner JSONB search helper.

3. **Route Order**: The plan correctly notes route order matters in vercel.json (specific routes like `/search` and `/flag` before parameterized `/:id`).

---

PLAN VALID
