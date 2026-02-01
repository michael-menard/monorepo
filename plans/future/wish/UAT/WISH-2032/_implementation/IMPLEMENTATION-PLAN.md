# Implementation Plan - WISH-2032: Optimistic UI for Form Submission

## Scope Surface
- backend/API: no
- frontend/UI: yes
- infra/config: no
- notes: All changes are frontend-only, using existing RTK Query mutation

## Acceptance Criteria Checklist
- [ ] AC1: On form submit, immediately show success toast "Item added to wishlist"
- [ ] AC2: Navigate to gallery immediately (before API response)
- [ ] AC3: Add temporary item to RTK Query cache with optimistic ID
- [ ] AC4: When API succeeds, replace temporary item with real item
- [ ] AC5: When API fails, rollback: remove temp item, show error toast, return to form
- [ ] AC6: Error toast includes "Retry" button to resubmit form
- [ ] AC7: Form state is preserved on rollback
- [ ] AC8: Cache invalidation triggers gallery refetch on success

## Files To Touch (Expected)
1. `packages/core/api-client/src/rtk/wishlist-gallery-api.ts` - Add onQueryStarted optimistic update
2. `apps/web/app-wishlist-gallery/src/pages/AddItemPage.tsx` - Update handleSubmit for optimistic flow
3. `apps/web/app-wishlist-gallery/src/components/WishlistForm/index.tsx` - Add callback for form data preservation

## Reuse Targets
- `@repo/app-component-library` - showSuccessToast, showErrorToast, Button
- `packages/core/api-client/src/rtk/wishlist-gallery-api.ts` - existing mutation pattern from reorderWishlist
- `apps/web/app-wishlist-gallery/src/hooks/useLocalStorage.ts` - for form state persistence

## Architecture Notes (Ports & Adapters)
- Core logic: Optimistic update in RTK Query endpoint (adapter layer)
- UI components: AddItemPage handles navigation and toast coordination
- Form state: WishlistForm component already manages state internally
- No new packages or modules needed - extends existing patterns

## Step-by-Step Plan (Small Steps)

### Step 1: Add optimistic update to addWishlistItem mutation
- **Objective**: Implement onQueryStarted hook for optimistic cache update
- **Files**: `packages/core/api-client/src/rtk/wishlist-gallery-api.ts`
- **Verification**: TypeScript compiles, no lint errors

### Step 2: Update AddItemPage for optimistic navigation
- **Objective**: Navigate immediately, handle success/error with toasts
- **Files**: `apps/web/app-wishlist-gallery/src/pages/AddItemPage.tsx`
- **Verification**: TypeScript compiles, manual test shows toast and navigation

### Step 3: Add form state preservation on error
- **Objective**: Pass form data back to form on rollback for retry
- **Files**: `apps/web/app-wishlist-gallery/src/pages/AddItemPage.tsx`
- **Verification**: After error, form retains data user entered

### Step 4: Add retry button to error toast
- **Objective**: Error toast has actionable retry button
- **Files**: `apps/web/app-wishlist-gallery/src/pages/AddItemPage.tsx`
- **Verification**: Click retry resubmits the form

### Step 5: Write unit tests for optimistic behavior
- **Objective**: Test optimistic update success and rollback scenarios
- **Files**: `packages/core/api-client/src/rtk/__tests__/wishlist-gallery-api.test.ts` (if exists), or `apps/web/app-wishlist-gallery/src/pages/__tests__/AddItemPage.test.tsx`
- **Verification**: Tests pass

### Step 6: Run full verification suite
- **Objective**: All tests pass, type check, lint
- **Files**: N/A (run commands)
- **Verification**: `pnpm check-types`, `pnpm lint`, `pnpm test` all pass

## Test Plan
- Commands to run:
  - `pnpm check-types --filter @repo/api-client --filter app-wishlist-gallery`
  - `pnpm lint --filter @repo/api-client --filter app-wishlist-gallery`
  - `pnpm test --filter @repo/api-client --filter app-wishlist-gallery`
- Playwright: If UI impacted, run existing E2E tests
- .http files: Not applicable (no API changes)

## Stop Conditions / Blockers
None identified. All requirements are clear and implementation follows established patterns.

## Architectural Decisions
No new architectural decisions required. This implementation follows the existing WISH-2005 optimistic update pattern already approved and implemented for reorder functionality.

## Worker Token Summary
- Input: ~15,000 tokens (agent files + story + codebase files)
- Output: ~1,500 tokens (IMPLEMENTATION-PLAN.md)
