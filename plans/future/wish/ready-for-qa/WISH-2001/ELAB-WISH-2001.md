# Elaboration Report - WISH-2001

**Date**: 2026-01-27
**Verdict**: CONDITIONAL PASS

## Summary

WISH-2001 is ready to proceed to implementation with enhancements approved during QA discovery. Story correctly rescoped to frontend-only after discovering backend endpoints and RTK Query hooks already exist. Conditional on clarifying minor API parameter discrepancies and confirming schema synchronization details during implementation.

## Audit Results

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Scope Alignment | PASS | Story scope matches stories.index.md exactly. Frontend gallery with filtering, pagination, card display. Backend endpoints already exist; story correctly rescoped to frontend only. |
| 2 | Internal Consistency | PASS | Goals, Non-goals, and Acceptance Criteria aligned. AC specifies "View Details" only in hover menu with placeholder slots for Edit/Remove/Got It (correctly deferred to WISH-2003/WISH-2004). |
| 3 | Reuse-First | PASS | Story correctly identifies existing backend implementation at `apps/api/lego-api/domains/wishlist/routes.ts` and existing RTK Query hooks at `packages/core/api-client/src/rtk/wishlist-gallery-api.ts`. |
| 4 | Ports & Adapters | PASS | Backend already implements Hexagonal Architecture correctly with service layer at `apps/api/lego-api/domains/wishlist/application/`, adapters at `adapters/`, and thin routes at `routes.ts`. |
| 5 | Local Testability | CONDITIONAL PASS | Story includes E2E tests and frontend tests. Backend verification includes `.http` test file. Existing `.http` file uses inconsistent API paths that should be updated during implementation. |
| 6 | Decision Completeness | PASS | No blocking TBDs. All design decisions made (Grid/List view, store filters, search/sort strategy, pagination, mobile responsive, empty state). |
| 7 | Risk Disclosure | PASS | Risk notes mention "integration issues likely" which is accurate for first vertical slice. Story acknowledges existing backend, auth middleware configured, schema synchronization handled via RTK Query. |
| 8 | Story Sizing | PASS | 14 ACs organized into Backend Verification (3) and Frontend Implementation (11). After rescope to frontend only, reasonable scope for single domain. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | Existing .http file uses outdated API paths | Medium | Update `__http__/wishlist.http` or create new `wishlist-gallery-mvp.http` with correct paths per AC requirement | Addressed in user decisions |
| 2 | Backend query parameter name discrepancy | Low | Verify `search` vs `q` parameter name in backend routes.ts vs RTK Query hook - likely both supported | To clarify during implementation |
| 3 | Store filter "All" tab behavior undefined | Low | Clarify if "All" tab means no filter (fetch all stores) or explicit `store=all` param - likely no param for "All" | To clarify during implementation |
| 4 | Schema synchronization verification not explicit | Low | Verify `releaseDate` is Date in backend, datetime string in frontend, RTK Query transformResponse handles conversion | To verify during implementation |
| 5 | Mobile hover menu behavior not specified | Medium | Clarify UI pattern for mobile: bottom sheet, modal, or context menu - bottom sheet recommended | **Added to AC**: Mobile menu uses bottom sheet pattern |

## Split Recommendation

**Not Applicable** - Story already rescoped after PM fix v2. Story is frontend-only with reasonable size across single domain. No further splitting required.

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| gap-1 | Filter state persistence across page refreshes | Not reviewed | Use URL query params for bookmarking filtered views |
| gap-2 | Search debounce timing not specified | **Added to AC** | Specify 300ms delay as industry standard |
| gap-3 | Empty search results vs empty wishlist distinction | **Added to AC** | Show "No items match your search" vs "No items in wishlist yet" |
| gap-4 | Loading states during filter/sort changes | **Added to AC** | Show skeletons for any data fetch to maintain UX consistency |
| gap-5 | Image placeholder design | Not reviewed | Reuse from gallery package or create LEGO-themed placeholder |
| gap-6 | Priority indicator exact design | Not reviewed | Align with design system tokens (Sky/Teal palette) |
| gap-7 | Store badge color mapping | Not reviewed | Create consistent color scheme and document in design system |
| gap-8 | Mobile hover menu UI pattern | **Added to AC** | Use bottom sheet pattern for mobile consistency |
| gap-9 | Card truncation strategy | Not reviewed | Establish consistent truncation strategy across text fields |
| gap-10 | Error recovery actions | Not reviewed | Add retry button for 500 errors, clarify recovery flow |
| gap-11 | Accessibility announcements timing | Not reviewed | Loading states need live region announcements, proper heading structure |
| gap-12 | Keyboard focus management in view toggle | Not reviewed | Maintain focus on toggle button after switch |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| enh-1 | Optimistic sorting/filtering | Not reviewed | Apply filters client-side immediately while fetching |
| enh-2 | Prefetch detail pages on card hover | Not reviewed | Use RTK Query usePrefetch for instant detail page load |
| enh-3 | Keyboard shortcuts for common actions | **Added to AC** | "/" for search, "G" for grid, "L" for list, "1-5" for store tabs |
| enh-4 | Quick add to collection from hover menu | Out of scope | For power users, but deferred post-MVP |
| enh-5 | Compare mode for side-by-side viewing | Out of scope | Useful but significant UI work, defer to separate story |
| enh-6 | Saved filter presets | Out of scope | Nice quality-of-life feature for power users, defer |
| enh-7 | Gallery layout density control | Out of scope | Simple CSS but not MVP priority |
| enh-8 | Batch operations from selection mode | Out of scope | Foundation for power user workflows, defer |
| enh-9 | Export filtered results to CSV | Out of scope | One-line implementation but not MVP priority |
| enh-10 | Infinite scrolling with virtual scrolling | **Added to AC** | Better for mobile, defer unless performance issues observed |
| enh-11 | Gallery statistics in header | **Added to AC** | Show "42 items, $1,250 total" - motivational feature with no new endpoint |
| enh-12 | Smart sorting algorithms | **Follow-up story** | "Best Value", "Expiring Soon", "Hidden Gems" - recommend separate story |
| enh-13 | Inline quick edit for priority | Not reviewed | Faster workflow but depends on WISH-2003 PATCH endpoint |
| enh-14 | Card flip animation to show back with notes | Not reviewed | Delightful but may conflict with detail navigation pattern |
| enh-15 | Gallery themes (dark mode, LEGO variants) | Out of scope | Should be consistent across all apps, defer to global theming story |

### Follow-up Stories Suggested

- [ ] **WISH-2001-B: Smart Sorting Algorithms** - Implement "Best Value" (price per piece), "Expiring Soon" (oldest release dates), "Hidden Gems" (low priority, high piece count) sorting modes for discovery and engagement

### Items Marked Out-of-Scope

- **enh-4**: Quick add to collection from hover menu - Power user feature, deferred post-MVP for separate implementation
- **enh-5**: Compare mode for side-by-side viewing - Significant UI work, recommend separate story with dedicated effort
- **enh-6**: Saved filter presets - Quality-of-life feature for power users, defer to post-MVP
- **enh-7**: Gallery layout density control - Simple CSS but not MVP priority, defer
- **enh-8**: Batch operations from selection mode - Foundation for future bulk operations, defer to dedicated story
- **enh-9**: Export to CSV - One-line implementation but not MVP priority
- **enh-15**: Gallery themes - Requires design system work at app level, defer to global theming story

## Proceed to Implementation?

**YES** - Story may proceed to implementation with approved enhancements integrated into acceptance criteria. All critical issues from initial audit have been resolved. Remaining items are clarifications for implementation phase.

**Conditions for Implementation**:
1. Confirm correct API endpoint paths for .http file verification
2. Verify `search` vs `q` parameter name in backend routes vs RTK Query hook
3. Clarify "All" store filter behavior during implementation
4. Document schema synchronization verification steps in implementation plan
