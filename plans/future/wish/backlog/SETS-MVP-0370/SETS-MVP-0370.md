---
doc_type: story
title: "SETS-MVP-0370: Build Status Analytics"
story_id: SETS-MVP-0370
story_prefix: SETS-MVP
status: backlog
phase: 2
created_at: "2026-01-31T16:00:00-07:00"
updated_at: "2026-01-31T16:00:00-07:00"
depends_on: [SETS-MVP-004]
follow_up_from: SETS-MVP-004
estimated_points: 3
---

# SETS-MVP-0370: Build Status Analytics

## Follow-up Context

**Parent Story:** SETS-MVP-004 (Build Status Toggle)
**Source:** QA Discovery Notes - Follow-up Stories Suggested
**Original Finding:** "Build status analytics (collection completion percentage)"
**Category:** Enhancement Opportunity
**Impact:** Medium - Provides valuable insights into collection progress
**Effort:** Medium - Requires aggregation logic and visualization components

## Context

After implementing the build status toggle (SETS-MVP-004), users can mark their owned items as "Built" or "In Pieces". This follow-up story adds analytics to help users understand their collection progress at a glance - how many sets they've built vs. how many are still waiting to be assembled.

This enhances the collection view by providing meaningful statistics that motivate users to build more sets and track their accomplishments over time.

## Goal

Display collection-level analytics showing the percentage of owned items that have been built, with visual progress indicators and filtering capabilities to help users understand and explore their build status distribution.

## Non-goals

- Individual set build history or timeline (deferred to SETS-MVP-006)
- Comparison with other users' collections
- Build time tracking or estimates
- Photo galleries of built sets
- Build instructions or guides
- Batch operations on filtered results (deferred to SETS-MVP-005)

## Scope

### Endpoints/Surfaces

**Frontend:**
- Collection view page: `apps/web/app-wishlist-gallery/src/pages/CollectionView/`
- Stats card component: `apps/web/app-wishlist-gallery/src/components/CollectionStatsCard/`
- Filter controls: `apps/web/app-wishlist-gallery/src/components/CollectionFilters/`

**Backend:**
- Collection aggregation endpoint: `GET /api/wishlist/collection/stats`
- Collection filter endpoint: `GET /api/wishlist/collection?buildStatus=built|in_pieces`

### Packages/Apps Affected

- `apps/web/app-wishlist-gallery` - Collection view UI and stats display
- `apps/api/lego-api/domains/wishlist` - Stats calculation and filtering
- `packages/core/app-component-library` - Reusable stats card and progress components

## Acceptance Criteria

### Collection Stats Calculation (Backend)

- [ ] AC1: Create `getCollectionStats(userId: string)` service method in `applications/services.ts`
- [ ] AC2: Stats method calculates total owned items, total built items, total in_pieces items
- [ ] AC3: Stats method returns percentage built as decimal (0.00 - 1.00) with 2 decimal precision
- [ ] AC4: Stats calculation only includes items with `status = 'owned'`
- [ ] AC5: Stats calculation excludes wishlist items (`status = 'wanted'`)

### Stats API Endpoint

- [ ] AC6: `GET /api/wishlist/collection/stats` returns stats object: `{ totalOwned, totalBuilt, totalInPieces, percentageBuilt }`
- [ ] AC7: Endpoint validates user authentication via userId from auth token
- [ ] AC8: Endpoint returns 200 with stats or 401 if not authenticated
- [ ] AC9: Stats endpoint uses thin adapter pattern (route calls service method, no business logic in route)

### Collection Stats Card (Frontend)

- [ ] AC10: CollectionStatsCard component renders on collection view page
- [ ] AC11: Stats card displays total owned count: "X Sets in Collection"
- [ ] AC12: Stats card displays built count: "Y Built"
- [ ] AC13: Stats card displays in_pieces count: "Z In Pieces"
- [ ] AC14: Stats card displays completion percentage: "XX% Complete"

### Visual Progress Indicator

- [ ] AC15: Stats card includes visual progress bar or pie chart showing built vs in_pieces ratio
- [ ] AC16: Progress bar uses success color (green/teal) for built portion
- [ ] AC17: Progress bar uses neutral color (gray) for in_pieces portion
- [ ] AC18: Visual indicator is accessible (includes ARIA labels and descriptions)

### Build Status Filter

- [ ] AC19: Collection view includes filter dropdown with options: "All", "Built Only", "In Pieces Only"
- [ ] AC20: Filter dropdown updates URL query param: `?buildStatus=built|in_pieces`
- [ ] AC21: Backend filters collection query based on `buildStatus` param
- [ ] AC22: Filter state persists across page refreshes (reads from URL on mount)
- [ ] AC23: Filter shows item count for each option: "Built Only (Y)", "In Pieces Only (Z)"

### Empty States

- [ ] AC24: If no owned items exist, show empty state: "No items in collection yet"
- [ ] AC25: If all items are built, show celebration message: "All sets built! 100% Complete"
- [ ] AC26: If no built items exist, show encouragement: "Start building your first set!"

### Data Fetching & Caching

- [ ] AC27: Stats data fetched via React Query with `useCollectionStats()` hook
- [ ] AC28: Stats query refetches when build status toggle is used
- [ ] AC29: Stats query uses staleTime of 60 seconds (stats don't need real-time updates)

### Accessibility

- [ ] AC30: Stats card has semantic HTML structure (proper headings, landmarks)
- [ ] AC31: Progress bar has ARIA attributes: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- [ ] AC32: Filter dropdown is keyboard accessible (arrow keys, enter to select)
- [ ] AC33: Screen reader announces percentage and counts correctly

### Testing

- [ ] AC34: Create `.http` test file with scenarios: fetch stats for user with mixed collection, fetch stats for user with no owned items, fetch stats for user with all built items
- [ ] AC35: Frontend component tests for CollectionStatsCard with various stat combinations
- [ ] AC36: Frontend filter tests verify URL param updates and persistence

## Reuse Plan

### From Parent Story (SETS-MVP-004)

- Build status data model (`buildStatus` field in database schema)
- Build status toggle component and API endpoint
- Optimistic update patterns for build status changes

### From Existing Codebase

- React Query for data fetching and caching
- Collection view page structure and layout
- Card component patterns from `@repo/app-component-library`
- Filter component patterns (if existing)
- Progress bar or chart components from shadcn/ui or app-component-library

## Architecture Notes

### Stats Calculation Performance

- Stats calculation should use SQL aggregation (COUNT with GROUP BY) for efficiency
- Consider adding database index on `(userId, status, buildStatus)` columns for fast stats queries
- Stats query should be separate from main collection query (different caching strategies)

### Frontend State Management

- Stats data managed independently from collection items list
- Filter state stored in URL query params for shareability and persistence
- React Query handles cache invalidation when build status changes

### Visual Design

- Stats card should be prominent but not overwhelming (consider placement at top of collection view)
- Progress bar should be clear and visually distinct (avoid clutter)
- Filter controls should be intuitive and discoverable

## Test Plan

### Happy Path

1. User has collection with mix of built and in_pieces items
2. Stats card displays correct counts and percentage
3. Progress bar visualizes correct ratio
4. Filter shows correct item counts in dropdown
5. Selecting "Built Only" shows only built items
6. Selecting "In Pieces Only" shows only unbuilt items
7. Toggling build status updates stats in real-time

### Error Cases

1. User has no owned items - show appropriate empty state
2. User has no built items - show 0% complete with encouragement message
3. User has all items built - show 100% complete with celebration
4. API error fetching stats - show error message with retry option

### Edge Cases

1. User with exactly 1 owned item (percentage is either 0% or 100%)
2. User with very large collection (performance of stats calculation)
3. Filter URL param with invalid value (default to "All")
4. Stats update race condition (toggle while stats query is in-flight)
5. User switches between "All" and filtered views rapidly

## Risks / Edge Cases

### Performance Risks

- Stats calculation may be slow for users with very large collections (100+ items)
- Consider caching stats server-side if performance becomes an issue
- Stats query should use database aggregation, not in-memory calculation

### UX Risks

- Stats card may feel redundant if user has very small collection (e.g., 2 items)
- Filter controls may clutter UI if collection view is already dense
- Consider progressive disclosure (show stats card only if user has 5+ owned items)

### Data Consistency

- Stats may briefly be out of sync after build status toggle if React Query cache hasn't invalidated
- Ensure optimistic updates in toggle component trigger stats query refetch

## Open Questions

_All questions resolved during story creation._

- ~~Should stats card be always visible or collapsed by default?~~ → Always visible if user has owned items
- ~~Should we show percentage as integer (75%) or decimal (75.3%)?~~ → Integer is sufficient for MVP (75%)
- ~~Should filter be dropdown or toggle buttons?~~ → Dropdown for consistency with other filters in app

## Definition of Done

- [ ] Stats calculation service method implemented with database aggregation
- [ ] Stats API endpoint returns correct data for all scenarios
- [ ] CollectionStatsCard component displays all required metrics
- [ ] Visual progress bar or chart renders correctly
- [ ] Build status filter works with URL persistence
- [ ] Empty states display appropriately
- [ ] All acceptance criteria met (36 ACs)
- [ ] Backend .http tests pass
- [ ] Frontend component tests pass
- [ ] Code review completed
- [ ] Accessibility verified (screen reader, keyboard)

---

**Story Status:** backlog
**Ready for Elaboration:** Yes
**Blocking Issues:** None (depends on SETS-MVP-004 completion)
