# Implementation Plan - WISH-2001

## Summary

WISH-2001 Gallery MVP is largely implemented. This plan covers the remaining work to complete the story acceptance criteria.

## Current State Assessment

### Already Implemented

| Component | Location | Status |
|-----------|----------|--------|
| Backend routes | `apps/api/lego-api/domains/wishlist/routes.ts` | Complete |
| RTK Query hooks | `packages/core/api-client/src/rtk/wishlist-gallery-api.ts` | Complete |
| Wishlist schemas | `packages/core/api-client/src/schemas/wishlist.ts` | Complete |
| WishlistCard component | `apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx` | Complete |
| MainPage | `apps/web/app-wishlist-gallery/src/pages/main-page.tsx` | Complete |
| Module routing | `apps/web/app-wishlist-gallery/src/Module.tsx` | Complete |
| WishlistCard tests | `apps/web/app-wishlist-gallery/src/components/WishlistCard/__tests__/WishlistCard.test.tsx` | Complete |

### Remaining Work

| Task | Status | Notes |
|------|--------|-------|
| Backend verification .http file | Not Started | AC requires `__http__/wishlist-gallery-mvp.http` |
| MainPage tests (grid view) | Skipped | Need to unskip and fix |
| MainPage tests (datatable view) | Skipped | Need to unskip and fix |

## Implementation Tasks

### Task 1: Create Backend Verification HTTP File

**File**: `__http__/wishlist-gallery-mvp.http`

**Purpose**: Verify backend endpoints work correctly per AC requirements.

**Content Requirements**:
1. GET `/api/wishlist` - List items (basic)
2. GET `/api/wishlist?search=term` - Search items
3. GET `/api/wishlist?store=LEGO` - Filter by store
4. GET `/api/wishlist?sort=price&order=asc` - Sort items
5. GET `/api/wishlist?page=1&limit=10` - Pagination
6. GET `/api/wishlist/:id` - Get single item
7. GET `/api/wishlist/:id` - 404 for non-existent
8. GET `/api/wishlist/:id` - 403 for forbidden access

**Estimated Effort**: Low

### Task 2: Verify and Fix MainPage Tests

**Files**:
- `apps/web/app-wishlist-gallery/src/pages/__tests__/main-page.grid.test.tsx`
- `apps/web/app-wishlist-gallery/src/pages/__tests__/main-page.datatable.test.tsx`

**Current State**: Tests are skipped due to complex TooltipProvider and RTK query mocking

**Action Required**:
1. Analyze test failures
2. Update mocks for TooltipProvider compatibility
3. Ensure tests verify key AC items:
   - Store filter tabs render
   - Search input works
   - Sort dropdown works
   - Grid/List view toggle works
   - Pagination renders
   - Empty state renders
   - Loading skeleton renders

**Estimated Effort**: Medium (mocking complexity)

### Task 3: Run Full Verification

**Commands**:
```bash
pnpm check-types --filter=app-wishlist-gallery
pnpm lint --filter=app-wishlist-gallery
pnpm test --filter=app-wishlist-gallery
```

**Success Criteria**:
- No type errors
- No lint errors
- All tests pass

## Acceptance Criteria Mapping

| AC | Task | Status |
|----|------|--------|
| Backend verification .http file | Task 1 | Not Started |
| WishlistCard renders fields | Already Complete | Done |
| Store filter tabs | Already Complete | Done |
| Search input (debounced) | Already Complete | Done |
| Sort dropdown | Already Complete | Done |
| Grid/List view toggle | Already Complete | Done |
| Mobile-responsive layout | Already Complete | Done |
| Loading skeleton states | Already Complete | Done |
| Empty state with CTA | Already Complete | Done |
| Error handling (404/403/500) | Already Complete | Done |
| Pagination controls | Already Complete | Done |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Test mocking complexity | Can skip problematic tests if blocking, document as tech debt |
| TooltipProvider issues | Consider removing tooltip dependency from tests |

## Dependencies

None - all dependencies (backend, RTK Query, @repo/gallery) are already implemented.

## Plan Validation

- [x] Plan covers all remaining ACs
- [x] Tasks are independently testable
- [x] No architectural decisions required
- [x] Reuses existing components from @repo/gallery
- [x] Follows project conventions (Zod schemas, @repo/ui imports)
