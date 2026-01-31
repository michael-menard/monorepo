# Elaboration Report - WISH-2005

**Date**: 2026-01-28
**Verdict**: FAIL

## Summary

WISH-2005 is a stale/superseded story that has already been split into WISH-2005a (drag-and-drop reordering) and WISH-2005b (optimistic updates and undo). Both child stories have completed elaboration and are ready-to-work. This parent story should not proceed; implementers should work on the split stories instead.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | FAIL | Critical | Story scope does NOT match stories.index.md - includes both drag-and-drop AND empty states/loading skeletons. Index shows WISH-2005 was split into WISH-2005a (drag-and-drop) and WISH-2005b (optimistic updates). |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, and AC are consistent. No contradictions found. |
| 3 | Reuse-First | PASS | — | Uses dnd-kit library, @repo/app-component-library, RTK Query patterns. EmptyStates component planned for reuse. |
| 4 | Ports & Adapters | FAIL | Critical | Story specifies endpoint location as `apps/api/endpoints/wishlist/reorder/handler.ts` (AWS Lambda pattern), but MUST use `apps/api/lego-api/domains/wishlist/` with Hono routes pattern per api-layer.md. Backend ALREADY EXISTS at correct location (routes.ts line 95). |
| 5 | Local Testability | PASS | — | .http tests (reorder endpoint), Playwright tests (drag-and-drop, empty states), and unit tests specified. |
| 6 | Decision Completeness | PASS | — | No blocking TBDs. Sensor thresholds, timeout windows, and visual feedback are specified. |
| 7 | Risk Disclosure | PASS | — | dnd-kit complexity and mobile touch support risks disclosed. |
| 8 | Story Sizing | SPLIT | High | Story has 10 ACs covering TWO major features: drag-and-drop reordering (6 ACs) + empty states/loading skeletons (4 ACs). stories.index.md confirms this story has been split into WISH-2005a and WISH-2005b. Story file is STALE. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | Scope mismatch with index | Critical | Story file is STALE. stories.index.md shows WISH-2005 was split into WISH-2005a (drag-and-drop) and WISH-2005b (optimistic updates). This file should be archived. | N/A - Story marked for deletion |
| 2 | Wrong endpoint location pattern | Critical | Story specifies old AWS Lambda handler pattern instead of Hono service/routes. Backend ALREADY EXISTS at correct location (routes.ts:95, services.ts:198). | N/A - Story marked for deletion |
| 3 | HTTP method mismatch | High | Story specifies PATCH /api/wishlist/reorder, but existing backend uses PUT /reorder. | N/A - Story marked for deletion |
| 4 | Missing RTK Query mutation | High | Story mentions RTK Query integration but wishlist-gallery-api.ts does NOT have a `useReorderWishlistMutation()` hook. | N/A - Story marked for deletion |
| 5 | Frontend file locations incomplete | Medium | Story lists 4 frontend files but doesn't specify test file locations clearly. | N/A - Story marked for deletion |
| 6 | Empty states not in child story scope | Medium | Empty states + loading skeletons are in this story's AC but unclear which split story owns this scope. | N/A - Story marked for deletion |
| 7 | Keyboard sensor deferred | Low | AC mentions KeyboardSensor but WISH-2006 (Accessibility) is deferred. Clarification needed in child stories. | N/A - Story marked for deletion |

## User Decision

**Action**: DELETE
**Reason**: Story is stale - already split into WISH-2005a and WISH-2005b which are in ready-to-work with completed elaboration. User chose to delete the stale parent story.

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Story superseded by split stories | DELETE | WISH-2005a and WISH-2005b are ready-to-work with elaboration complete. This parent story is historical. |
| 2 | Backend implementation already exists | REDIRECT | Reorder endpoint implemented at `apps/api/lego-api/domains/wishlist/routes.ts:95` and service at `services.ts:198`. Child stories should acknowledge and reference existing code. |
| 3 | RTK Query mutation not yet created | DELEGATE | Child stories (particularly WISH-2005b) should include RTK Query mutation as part of integration work. |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Parent epic pattern | NO | WISH-2005 could serve as parent epic linking to WISH-2005a and WISH-2005b, but user chose deletion instead. |
| 2 | Documentation of split strategy | NOT NEEDED | Split already documented in stories.index.md. |

### Follow-up Stories Suggested

- None - implementation proceeds on WISH-2005a and WISH-2005b (both ready-to-work)

### Items Marked Out-of-Scope

- N/A - Story marked for deletion

## Proceed to Implementation?

**NO - Story is stale and superseded**

Work should proceed on:
- **WISH-2005a**: Drag-and-drop reordering (ready-to-work)
- **WISH-2005b**: Optimistic updates and undo flow (ready-to-work)

Both child stories have completed elaboration and are waiting for implementation.

---

## Completion Notes

This elaboration analysis confirms that WISH-2005 should not proceed. The story was previously split into two more focused stories (WISH-2005a and WISH-2005b), both of which have already completed the elaboration phase and are ready-to-work.

The analysis identified:
- **Scope mismatch**: This story contains 10 ACs covering two distinct features (drag-and-drop vs optimistic updates)
- **Backend already exists**: Reorder endpoint is already implemented using Hono patterns at the correct locations
- **Outdated architecture references**: Story references old AWS Lambda handler patterns instead of current Hono service/routes

**Recommendation**: Archive this story directory after deletion. Implementers should consult WISH-2005a and WISH-2005b for the actual implementation work.
