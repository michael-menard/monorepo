# Plan Validation: STORY-012

## Summary

- Status: **VALID**
- Issues Found: 1 (minor)
- Blockers: 0

---

## AC Coverage

| AC | Addressed in Step | Status |
|----|-------------------|--------|
| AC-1: GET /api/mocs/:id/gallery-images | Step 1, 2 | OK |
| AC-2: POST /api/mocs/:id/gallery-images | Step 1, 3 | OK |
| AC-3: DELETE /api/mocs/:id/gallery-images/:galleryImageId | Step 4, 5 | OK |
| AC-4: Error Response Format | Steps 2, 3, 5 (inline) | OK |
| AC-5: HTTP Contract Verification | Step 9 | OK |

**All 5 Acceptance Criteria are addressed in the implementation plan.**

---

## File Path Validation

### NEW Files

| File | Valid Path Pattern | Status |
|------|-------------------|--------|
| `apps/api/platforms/vercel/api/mocs/[id]/gallery-images/index.ts` | apps/** | OK |
| `apps/api/platforms/vercel/api/mocs/[id]/gallery-images/[galleryImageId].ts` | apps/** | OK |

### MODIFY Files

| File | Exists | Status |
|------|--------|--------|
| `apps/api/platforms/vercel/vercel.json` | Yes | OK |
| `apps/api/core/database/seeds/mocs.ts` | Yes | OK |
| `__http__/mocs.http` | Yes | OK |

**All file paths are valid and follow directory rules.**

---

## Reuse Target Validation

| Target | Exists | Location |
|--------|--------|----------|
| `apps/api/platforms/vercel/api/mocs/[id].ts` | **Yes** | `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/mocs/[id].ts` |
| `apps/api/platforms/aws/endpoints/moc-instructions/get-gallery-images/handler.ts` | **Yes** | `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/aws/endpoints/moc-instructions/get-gallery-images/handler.ts` |
| `apps/api/platforms/aws/endpoints/moc-instructions/link-gallery-image/handler.ts` | **Yes** | `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/aws/endpoints/moc-instructions/link-gallery-image/handler.ts` |
| `apps/api/platforms/aws/endpoints/moc-instructions/unlink-gallery-image/handler.ts` | **Yes** | `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/aws/endpoints/moc-instructions/unlink-gallery-image/handler.ts` |

**All 4 reuse targets exist and are accessible.**

---

## Database Schema Validation

| Table | Exists | Location |
|-------|--------|----------|
| `moc_gallery_images` | **Yes** | `/Users/michaelmenard/Development/Monorepo/apps/api/core/database/schema/index.ts` (line 322-338) |
| `gallery_images` | **Yes** | Same schema file (line 23-45) |
| `moc_instructions` | **Yes** | Same schema file (line 89-288) |

**Database schema confirmed:**
- `mocGalleryImages` table has `id`, `mocId`, `galleryImageId` columns
- FK cascade deletes configured for both `mocId` and `galleryImageId`
- No UNIQUE constraint on `(mocId, galleryImageId)` - app-level duplicate check required (as documented in story)

---

## Seed Data Validation

### Gallery Images Available (from `apps/api/core/database/seeds/gallery.ts`)

| Image ID | Title | Owner | Notes |
|----------|-------|-------|-------|
| `11111111-1111-1111-1111-111111111111` | Castle Tower Photo | dev-user | For link test |
| `22222222-2222-2222-2222-222222222222` | Space Station Build | dev-user | For POST link test |
| `33333333-3333-3333-3333-333333333333` | Medieval Knight | dev-user | For link test |
| `55555555-5555-5555-5555-555555555555` | Private Image | other-user | For cross-user link test |
| `66666666-6666-6666-6666-666666666666` | Update Test Image | dev-user | Available for link test |

### MOCs Available (from `apps/api/core/database/seeds/mocs.ts`)

| MOC ID | Title | Owner | Status |
|--------|-------|-------|--------|
| `dddddddd-dddd-dddd-dddd-dddddddd0001` | King's Castle | dev-user | published |
| `dddddddd-dddd-dddd-dddd-dddddddd0002` | Space Station | dev-user | draft |
| `dddddddd-dddd-dddd-dddd-dddddddd0004` | Technic Supercar | other-user | published |

**Seed data requirements are fully satisfied.** The implementation plan requires adding `moc_gallery_images` seed entries to `mocs.ts`, which will create links between existing MOCs and gallery images.

---

## Step Analysis

| Step | Objective | Files | Verification | Status |
|------|-----------|-------|--------------|--------|
| 1 | Create GET + POST handler file structure | index.ts | File exists, no compile errors | OK |
| 2 | Implement GET handler | index.ts | `pnpm eslint` | OK |
| 3 | Implement POST handler | index.ts | `pnpm eslint` | OK |
| 4 | Create DELETE handler file | [galleryImageId].ts | File exists | OK |
| 5 | Implement DELETE handler | [galleryImageId].ts | `pnpm eslint` | OK |
| 6 | Update vercel.json routes | vercel.json | JSON syntax, route order | OK |
| 7 | Add seed data for moc_gallery_images | mocs.ts | `pnpm eslint` | OK |
| 8 | Run seed | N/A | `pnpm seed` | OK |
| 9 | Update mocs.http | mocs.http | Manual HTTP syntax review | OK |
| 10 | Start Vercel dev server | N/A | localhost:3001 | OK |
| 11 | Execute HTTP contract tests | mocs.http | Expected responses | OK |
| 12 | Final lint and type check | All | eslint + tsc | OK |

**Summary:**
- Total steps: 12
- Steps with verification: 12/12 (100%)
- Dependency order: Correct (Steps build on each other logically)
- Issues: None

---

## Vercel Routes Validation

### Current Routes in `vercel.json` (relevant section)

```json
{ "source": "/api/mocs/:id", "destination": "/api/mocs/[id].ts" },
{ "source": "/api/mocs", "destination": "/api/mocs/index.ts" }
```

### Routes to Add (per implementation plan)

```json
{ "source": "/api/mocs/:id/gallery-images/:galleryImageId", "destination": "/api/mocs/[id]/gallery-images/[galleryImageId]" },
{ "source": "/api/mocs/:id/gallery-images", "destination": "/api/mocs/[id]/gallery-images/index" }
```

**Route Order Requirement:** The specific route (`:galleryImageId`) MUST come before the general route. The plan correctly specifies this requirement in Step 6.

**Insertion Point:** New routes must be added BEFORE `/api/mocs/:id` to ensure correct matching.

---

## Test Plan Feasibility

### .http File Tests

| Test | Method | Path | Feasible | Notes |
|------|--------|------|----------|-------|
| getMocGalleryImages | GET | /api/mocs/:id/gallery-images | Yes | MOC `dddddddd-0001` with seeded links |
| getMocGalleryImagesEmpty | GET | /api/mocs/:id/gallery-images | Yes | MOC `dddddddd-0003` (no links) |
| getMocGalleryImages403 | GET | /api/mocs/:id/gallery-images | Yes | Other user's MOC `dddddddd-0004` |
| linkGalleryImage | POST | /api/mocs/:id/gallery-images | Yes | Link `22222222` to `dddddddd-0001` |
| linkGalleryImage409 | POST | /api/mocs/:id/gallery-images | Yes | Re-link already linked image |
| linkGalleryImage404Image | POST | /api/mocs/:id/gallery-images | Yes | Non-existent image UUID |
| unlinkGalleryImage | DELETE | /api/mocs/:id/gallery-images/:galleryImageId | Yes | Unlink seeded link |
| unlinkGalleryImage404 | DELETE | /api/mocs/:id/gallery-images/:galleryImageId | Yes | Unlink non-existent link |

**All .http tests are feasible with the available seed data.**

### Playwright Tests

**NOT APPLICABLE** - Backend-only story with no UI changes.

### Commands

| Command | Valid | Notes |
|---------|-------|-------|
| `pnpm eslint apps/api/platforms/vercel/api/mocs/[id]/gallery-images/*.ts --fix` | Yes | Valid glob path |
| `pnpm tsc --noEmit -p apps/api/platforms/vercel/tsconfig.json` | Yes | Standard type check |
| `pnpm seed` | Yes | Runs seed from apps/api/platforms/vercel |

---

## Minor Issues

### Issue 1: Seed file does not currently include moc_gallery_images inserts

**Severity:** Low (not a blocker)

**Current State:** The `apps/api/core/database/seeds/mocs.ts` file seeds `moc_instructions` and `moc_files` tables but does not seed `moc_gallery_images`.

**Resolution:** Step 7 of the implementation plan correctly identifies this and specifies adding `moc_gallery_images` seed data. This is a planned modification, not a blocker.

---

## Verdict

**VALID**

The implementation plan is complete and executable:

1. All 5 acceptance criteria are mapped to specific implementation steps
2. All file paths are valid and follow monorepo conventions
3. All 4 reuse targets exist and provide the required patterns
4. Database schema (`moc_gallery_images` table) exists with proper FK cascade deletes
5. Seed data for MOCs and gallery images exists; gallery link seeds will be added in Step 7
6. Steps are in logical order with clear dependencies
7. All 12 steps have verification actions
8. Vercel route configuration is well-documented with correct ordering
9. Test plan is feasible with existing infrastructure

No blockers identified. The plan can proceed to implementation.

---

**PLAN VALID**
