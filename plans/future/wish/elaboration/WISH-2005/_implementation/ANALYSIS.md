# Elaboration Analysis - WISH-2005

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | FAIL | Critical | Story scope does NOT match stories.index.md - includes both drag-and-drop AND empty states/loading skeletons. Index shows WISH-2005 was split into WISH-2005a (drag-and-drop) and WISH-2005b (optimistic updates). |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, and AC are consistent. No contradictions found. |
| 3 | Reuse-First | PASS | — | Uses dnd-kit library, @repo/app-component-library, RTK Query patterns. EmptyStates component planned for reuse. |
| 4 | Ports & Adapters | **FAIL** | **Critical** | Story specifies endpoint location as `apps/api/endpoints/wishlist/reorder/handler.ts` (AWS Lambda pattern), but MUST use `apps/api/lego-api/domains/wishlist/` with Hono routes pattern per api-layer.md. Backend ALREADY EXISTS at correct location (routes.ts line 95). |
| 5 | Local Testability | PASS | — | .http tests (reorder endpoint), Playwright tests (drag-and-drop, empty states), and unit tests specified. |
| 6 | Decision Completeness | PASS | — | No blocking TBDs. Sensor thresholds, timeout windows, and visual feedback are specified. |
| 7 | Risk Disclosure | PASS | — | dnd-kit complexity and mobile touch support risks disclosed. |
| 8 | Story Sizing | **SPLIT** | High | Story has 10 ACs covering TWO major features: drag-and-drop reordering (6 ACs) + empty states/loading skeletons (4 ACs). stories.index.md confirms this story has been split into WISH-2005a and WISH-2005b. Story file is STALE. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | **Scope mismatch with index** | Critical | Story file is STALE. stories.index.md shows WISH-2005 was split into WISH-2005a (drag-and-drop) and WISH-2005b (optimistic updates). This file should be archived/updated to reflect the split. |
| 2 | **Wrong endpoint location pattern** | Critical | Story specifies `apps/api/endpoints/wishlist/reorder/handler.ts` (old AWS pattern). MUST specify service at `apps/api/lego-api/domains/wishlist/application/services.ts` and route at `apps/api/lego-api/domains/wishlist/routes.ts` per api-layer.md. **Backend ALREADY EXISTS** - PUT /reorder endpoint at routes.ts:95, reorderItems service at services.ts:198. Story should acknowledge existing implementation. |
| 3 | **HTTP method mismatch** | High | Story specifies **PATCH** /api/wishlist/reorder, but existing backend uses **PUT** /reorder (routes.ts:95). Frontend RTK Query will fail if it sends PATCH. Story must use PUT to match existing implementation. |
| 4 | **Missing RTK Query mutation** | High | Story mentions RTK Query integration but wishlist-gallery-api.ts does NOT have a `useReorderWishlistMutation()` hook. Story must add this mutation to RTK Query API. |
| 5 | **Frontend file locations incomplete** | Medium | Story lists 4 frontend files but doesn't specify test file locations or which components integrate drag-and-drop into main-page.tsx. |
| 6 | **Empty states not in stories.index.md split** | Medium | Empty states + loading skeletons are in this story's AC but NOT mentioned in WISH-2005a or WISH-2005b scope per stories.index.md. Unclear which split story owns this scope. |
| 7 | **Keyboard sensor mentioned without accessibility story** | Low | AC mentions KeyboardSensor but WISH-2006 (Accessibility) is deferred. Should clarify if keyboard drag is MVP-critical or deferred with WISH-2006. |

## Split Recommendation (if applicable)

**ALREADY SPLIT** per stories.index.md:
- **WISH-2005a**: Drag-and-drop reordering (ready-to-work, elaboration complete 2026-01-28)
- **WISH-2005b**: Optimistic updates and undo flow (ready-to-work, elaboration complete 2026-01-28)

**This story file (WISH-2005.md) is STALE and should be:**
1. Archived to `/plans/future/wish/elaboration/WISH-2005/WISH-2005-ORIGINAL.md`
2. Replaced with a redirect to WISH-2005a and WISH-2005b
3. OR updated to serve as a parent epic linking to sub-stories

## Preliminary Verdict

**FAIL: Story is stale and contradicts stories.index.md**

**Critical Blockers:**
1. Scope mismatch - Story has not been updated after split into WISH-2005a/WISH-2005b
2. Backend architecture pattern is outdated - references old AWS Lambda handler pattern instead of Hono
3. Backend ALREADY EXISTS - Reorder endpoint implemented at routes.ts:95 with service at services.ts:198
4. HTTP method mismatch - Story says PATCH, backend uses PUT

**Recommendation:**
- Archive this story file as historical reference
- Work on WISH-2005a and WISH-2005b instead (both are ready-to-work per index)
- Update those stories to reference existing backend implementation
- Add RTK Query mutation for reorder endpoint to frontend API client

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Story is stale after split | All implementation work on WISH-2005 | Archive this story, redirect implementers to WISH-2005a and WISH-2005b |
| 2 | Backend already exists but not acknowledged | Frontend integration | Update stories to reference existing PUT /reorder endpoint at routes.ts:95 |
| 3 | RTK Query mutation missing | Frontend cannot call reorder endpoint | Add `reorderWishlist` mutation and `useReorderWishlistMutation` hook to wishlist-gallery-api.ts |
| 4 | HTTP method mismatch (PATCH vs PUT) | Frontend API calls will fail | Story must specify PUT (to match existing backend) or backend must be changed to PATCH |

---

## Worker Token Summary

- Input: ~18k tokens (WISH-2005.md, stories.index.md, api-layer.md, wishlist routes/services, RTK Query API)
- Output: ~1.5k tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
