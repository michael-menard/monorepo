# Elaboration Analysis - WISH-2001

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | **PASS** | — | Story scope matches stories.index.md exactly. Frontend gallery with filtering, pagination, card display. GET /api/wishlist and GET /api/wishlist/:id endpoints specified. Backend already exists, story correctly rescoped to frontend only after PM fix v2. |
| 2 | Internal Consistency | **PASS** | — | Goals, Non-goals, and Acceptance Criteria are aligned. AC specifies "View Details" only in hover menu with placeholder slots for Edit/Remove/Got It (correctly deferred to WISH-2003/WISH-2004). |
| 3 | Reuse-First | **PASS** | — | Story correctly identifies existing backend implementation at `apps/api/lego-api/domains/wishlist/routes.ts` and existing RTK Query hooks at `packages/core/api-client/src/rtk/wishlist-gallery-api.ts`. Reuse plan specifies primitives from `@repo/app-component-library` and layout patterns from `apps/web/app-sets-gallery`. |
| 4 | Ports & Adapters | **PASS** | — | Backend already implements Hexagonal Architecture correctly with service layer at `apps/api/lego-api/domains/wishlist/application/`, adapters at `adapters/`, and thin routes at `routes.ts`. Story references this architecture and requires verification only. |
| 5 | Local Testability | **CONDITIONAL PASS** | Medium | Story includes E2E tests and frontend tests. Backend verification includes `.http` test file requirement at `__http__/wishlist-gallery-mvp.http`. However, existing `.http` file at `__http__/wishlist.http` uses inconsistent API paths that should be updated to match actual routes. |
| 6 | Decision Completeness | **PASS** | — | No blocking TBDs. All design decisions made (Grid/List view, store filters, search/sort strategy, pagination, mobile responsive, empty state). |
| 7 | Risk Disclosure | **PASS** | — | Risk notes mention "integration issues likely" which is accurate for first vertical slice. Story acknowledges existing backend, auth middleware configured, schema synchronization handled via RTK Query transformResponse. |
| 8 | Story Sizing | **PASS** | — | Story has 14 ACs organized into Backend Verification (3) and Frontend Implementation (11). After rescope to frontend only, this is reasonable. Sizing warning removed after PM fix. Single domain (frontend), independently testable. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Existing .http file uses outdated API paths | Medium | Existing `__http__/wishlist.http` references `/api/wishlist/list` and `/api/wishlist/search` endpoints but actual routes are `/api/wishlist` (GET with query params). Story should either update existing file or create new `wishlist-gallery-mvp.http` with correct paths per AC requirement. |
| 2 | Backend query parameter name discrepancy | Low | Story AC specifies `q` param for search (line 43) but backend routes.ts line 49 accepts `search` param. RTK Query hook uses `q` (line 42). Need to verify which is correct or if both are supported. |
| 3 | Store filter "All" tab behavior undefined | Low | AC lists "All" tab (line 42) but doesn't specify if this means no filter (fetch all stores) or explicit `store=all` param. Should clarify expected query param behavior - likely no param for "All". |
| 4 | Schema synchronization verification not explicit | Low | AC mentions "Schema synchronization verified" (line 38) but doesn't specify what to verify. Should verify: `releaseDate` is Date in backend schema, datetime string in frontend schema, RTK Query transformResponse handles conversion automatically. |
| 5 | Frontend app already exists - verification redundant | Low | Story assumes `apps/web/app-wishlist-gallery` needs verification (line 95) but git status and bash verification confirm it exists. This AC can be marked complete or converted to "Verify app build config" check. |

## Split Recommendation

**Not Applicable** - Story already split and rescoped after PM fix v2. Story is now frontend-only with reasonable size (14 ACs across single domain). No further splitting required.

## Preliminary Verdict

**CONDITIONAL PASS** - Story can proceed with minor clarifications. All critical issues from initial ELAB-WISH-2001.md have been resolved by PM fix v2. Remaining issues are low severity and can be addressed during implementation.

**Verdict**: CONDITIONAL PASS

**Conditions**:
1. Clarify correct API endpoint paths for .http file (use `/api/wishlist?search=term` not `/api/wishlist/search?q=term` based on routes.ts)
2. Verify `search` vs `q` parameter name in backend routes.ts line 49 vs RTK Query hook line 42
3. Confirm "All" store filter behavior (no param vs explicit param)
4. Document schema synchronization verification steps in implementation plan

---

## Discovery Findings

### Gaps & Blind Spots

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No specification for filter state persistence across page refreshes | Medium | Low | Use URL query params to persist filters, search, sort, and pagination state. Users can bookmark filtered views. Consider privacy implications for sharing. |
| 2 | No specification for debounce timing on search input | Low | Low | Story mentions "debounced search" (line 123) but doesn't specify delay. Recommend 300ms based on industry standard. Document in implementation. |
| 3 | No specification for empty search results vs empty wishlist | Low | Low | Empty state should differentiate: "No items match your search" (with clear filters button) vs "No items in wishlist yet" (with Add Item CTA). Current AC line 49 only covers empty wishlist. |
| 4 | No specification for loading states during filter/sort changes | Medium | Low | Should skeleton states show during filter changes or just initial load? Recommend showing skeletons for any data fetch to maintain UX consistency. |
| 5 | No specification for image placeholder design | Low | Low | WishlistCard shows placeholder when `imageUrl` is null (line 109) but doesn't specify what placeholder looks like. Reuse from gallery package or create LEGO-themed placeholder. |
| 6 | No specification for priority indicator exact design | Medium | Low | AC mentions "icon + color" for priority (line 112) but doesn't specify which icon or exact colors. Should align with design system tokens (Sky/Teal palette). |
| 7 | No specification for store badge colors | Low | Low | Store badges are colored per store enum (line 108) but color mapping not specified. Should create consistent color scheme (LEGO=red, Barweer=blue, etc.) and document in design system. |
| 8 | No specification for mobile hover menu behavior | Medium | Medium | AC says "Tap on mobile, hover on desktop" (line 118) but doesn't specify UI pattern. Should use bottom sheet, modal, or context menu on mobile? Recommend bottom sheet for consistency with mobile UX patterns. |
| 9 | No specification for card truncation behavior | Low | Low | Title truncates at 40 chars (line 109) but what about notes, tags, or other long fields? Should establish consistent truncation strategy across all text fields. |
| 10 | No specification for error recovery actions | Medium | Low | Error handling shows messages for 404/403/500 (line 50, lines 156-164) but doesn't specify recovery actions. Should users retry, refresh, or navigate away? Add retry button for 500 errors. |
| 11 | No specification for accessibility announcements timing | Medium | Medium | Story defers comprehensive a11y to WISH-2006 but should specify minimum ARIA for MVP. Loading states need live region announcements. Empty states need proper heading structure. |
| 12 | No specification for keyboard focus management in view toggle | Low | Low | Grid/List view toggle (line 45) should maintain focus on toggle button after switch. Otherwise keyboard users lose context in DOM. |

### Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Optimistic sorting/filtering | High | Medium | Apply filters/sort client-side immediately while background fetch happens. Provides instant feedback. RTK Query supports optimistic updates via cache manipulation. |
| 2 | Prefetch detail pages on card hover | Medium | Low | Use RTK Query `usePrefetch` to load detail data on card hover. Makes detail page load instant when clicked. One-line implementation with existing `useGetWishlistItemQuery`. |
| 3 | Keyboard shortcuts for common actions | High | Medium | Add keyboard shortcuts: "/" for search focus, "1-5" for store tabs, "G" for grid view, "L" for list view. Foundation for WISH-2006 accessibility but basic version adds minimal complexity. |
| 4 | Quick add to collection from gallery | High | Medium | "Add to Collection" quick action on card hover menu (bypasses "Got It" modal flow). For power users who want fast workflows. Requires WISH-2004 purchased endpoint foundation. |
| 5 | Compare mode for side-by-side viewing | Medium | High | Select 2-4 items and view side-by-side comparison table (price, pieces, priority). Useful for deciding between similar sets. Separate story - significant UI work. |
| 6 | Saved filter presets | Medium | Medium | Save common filter combinations (e.g., "High Priority LEGO", "Under $100"). Store in local storage or user preferences. Nice quality-of-life feature for power users. |
| 7 | Gallery layout density control | Low | Low | Add density toggle: Comfortable (default), Compact, Spacious. Changes card padding/spacing via CSS variables. Simple CSS implementation with localStorage persistence. |
| 8 | Batch operations from selection mode | High | High | Select multiple cards and apply batch delete, priority change, or tag addition. Foundation for power user workflows. Requires selection UI (checkboxes). Separate story. |
| 9 | Export filtered results to CSV | Low | Low | Export current filtered view to CSV for budgeting/planning. One-line implementation with existing filtered data. Uses standard browser download API. |
| 10 | Virtual scrolling for large wishlists | Medium | High | Use react-window for virtual scrolling when wishlist exceeds 100+ items. Improves performance but adds complexity. Defer unless performance issues observed in testing. |
| 11 | Gallery statistics in header | Low | Low | Show "42 items, $1,250 total" in gallery header. Motivational feature, good at-a-glance info. Simple aggregation of current filtered data (no new endpoint needed). |
| 12 | Smart sorting algorithms | Medium | Medium | "Best Value" (price per piece), "Expiring Soon" (oldest release dates), "Hidden Gems" (low priority, high piece count). Fun discovery features that encourage engagement. |
| 13 | Inline quick edit for priority | Medium | Low | Click priority indicator to open dropdown and change priority without navigating to edit page. Faster workflow for common operation. Requires PATCH endpoint from WISH-2003. |
| 14 | Card flip animation to show back with notes | Low | Medium | CSS flip animation on card click to reveal notes/tags on back. Delightful interaction but may conflict with detail navigation pattern. Consider as alternative to hover preview. |
| 15 | Gallery themes (dark mode, LEGO theme variants) | Low | Medium | Different color schemes for gallery. Requires design system work. Defer to global theming story - should be consistent across all apps. |

---

## Worker Token Summary

- **Input**: ~56k tokens (files read)
  - WISH-2001.md v2 with PM fixes (12k)
  - ELAB-WISH-2001.md initial analysis (6k)
  - stories.index.md (6k)
  - api-layer.md architecture (3k)
  - elab-analyst.agent.md instructions (2k)
  - wishlist routes.ts backend implementation (2k)
  - wishlist-gallery-api.ts RTK Query (1k)
  - wishlist.http existing tests (3k)
  - CLAUDE.md project guidelines (5k)
  - Various bash commands and verification (16k)
- **Output**: ~2.5k tokens (ANALYSIS.md)
- **Total**: ~58.5k tokens
