# Implementation Plan - WISH-2015: Sort Mode Persistence (localStorage)

## Scope Surface

- **backend/API**: no
- **frontend/UI**: yes
- **infra/config**: no
- **notes**: Frontend-only localStorage persistence for wishlist sort mode

## Acceptance Criteria Checklist

- [ ] AC1: Sort mode saved to localStorage on user selection (key: `app.wishlist.sortMode`)
- [ ] AC2: Sort mode restored from localStorage on page load (before first API call)
- [ ] AC3: localStorage cleared on logout (integration with existing flow)
- [ ] AC4: Invalid localStorage values handled gracefully (Zod validation, fallback)
- [ ] AC5: localStorage quota exceeded handled gracefully (try-catch, logger warning)
- [ ] AC6: Private/incognito mode compatibility (graceful fallback)
- [ ] AC7: Sort dropdown reflects persisted value on page load (no flash)
- [ ] AC8: Sort mode persists across page refreshes
- [ ] AC9: Sort mode persists across navigation
- [ ] AC10: Multiple tabs respect shared localStorage
- [ ] AC11: Unit tests for localStorage hook (5+ tests)
- [ ] AC12: Component tests verify persistence logic (4+ tests)
- [ ] AC13: Playwright E2E test (deferred to QA phase)
- [ ] AC14: Screen reader announces current sort mode on restoration

## Files To Touch (Expected)

### Create
1. `apps/web/app-wishlist-gallery/src/hooks/useLocalStorage.ts`
2. `apps/web/app-wishlist-gallery/src/hooks/useWishlistSortPersistence.ts`
3. `apps/web/app-wishlist-gallery/src/hooks/__tests__/useLocalStorage.test.ts`
4. `apps/web/app-wishlist-gallery/src/hooks/__tests__/useWishlistSortPersistence.test.ts`

### Modify
5. `apps/web/app-wishlist-gallery/src/pages/main-page.tsx`

## Reuse Targets

### Existing Patterns
- `packages/core/gallery/src/utils/view-mode-storage.ts` - localStorage access pattern with try-catch
- `packages/core/gallery/src/hooks/useViewMode.ts` - Hook pattern with localStorage initialization
- `packages/core/gallery/src/__tests__/view-mode.test.ts` - Test pattern for localStorage hooks

### Existing Schemas
- `packages/core/api-client/src/schemas/wishlist.ts` - `WishlistQueryParamsSchema.shape.sort` for validation

### Existing Components
- `@repo/app-component-library` - No new UI components needed
- `FilterProvider` from `@repo/gallery` - Context for filter state

## Architecture Notes (Ports & Adapters)

### Adapter Layer (Infrastructure)
- `useLocalStorage.ts` - Generic browser localStorage adapter
  - Abstracts localStorage API behind React hook
  - Handles browser compatibility and errors
  - SSR-safe with window check

### Domain Logic
- `useWishlistSortPersistence.ts` - Wishlist-specific persistence logic
  - Uses `useLocalStorage` adapter
  - Validates sort mode against Zod schema
  - Manages fallback behavior

### UI Layer
- `main-page.tsx` - Consumes `useWishlistSortPersistence`
  - Updates FilterProvider initial filters
  - Screen reader announcement on restoration

### Boundaries Protected
- No direct localStorage access in UI components
- Validation logic centralized in domain hook
- Error handling isolated in adapter

## Step-by-Step Plan (Small Steps)

### Step 1: Create useLocalStorage hook
**Objective**: Generic reusable localStorage hook with error handling
**Files**: `apps/web/app-wishlist-gallery/src/hooks/useLocalStorage.ts`
**Verification**: Type check passes

### Step 2: Create useLocalStorage tests
**Objective**: Unit tests for localStorage hook (5+ tests)
**Files**: `apps/web/app-wishlist-gallery/src/hooks/__tests__/useLocalStorage.test.ts`
**Verification**: Tests pass

### Step 3: Create useWishlistSortPersistence hook
**Objective**: Wishlist-specific hook using useLocalStorage with Zod validation
**Files**: `apps/web/app-wishlist-gallery/src/hooks/useWishlistSortPersistence.ts`
**Verification**: Type check passes

### Step 4: Create useWishlistSortPersistence tests
**Objective**: Unit tests for wishlist persistence hook (4+ tests)
**Files**: `apps/web/app-wishlist-gallery/src/hooks/__tests__/useWishlistSortPersistence.test.ts`
**Verification**: Tests pass

### Step 5: Integrate hooks into main-page.tsx
**Objective**: Use persistence hook to initialize FilterProvider with restored sort
**Files**: `apps/web/app-wishlist-gallery/src/pages/main-page.tsx`
**Verification**: Type check passes

### Step 6: Add screen reader announcement
**Objective**: Announce restored sort mode to screen readers (AC14)
**Files**: `apps/web/app-wishlist-gallery/src/pages/main-page.tsx`
**Verification**: Type check passes

### Step 7: Run full verification suite
**Objective**: All quality gates pass
**Files**: All modified files
**Verification**: `pnpm check-types`, `pnpm lint`, `pnpm test`

## Test Plan

### Commands to Run
```bash
# Unit tests
pnpm test --filter app-wishlist-gallery

# Type check
pnpm check-types --filter app-wishlist-gallery

# Lint
pnpm lint --filter app-wishlist-gallery
```

### Unit Test Coverage
- `useLocalStorage.test.ts`: 5+ tests (save, retrieve, missing key, invalid JSON, quota exceeded)
- `useWishlistSortPersistence.test.ts`: 4+ tests (load from storage, save on change, invalid fallback, missing fallback)

### Playwright (Deferred to QA Phase)
- E2E test for persistence flow (AC13)

## Stop Conditions / Blockers

None identified. All decisions made in story definition.

## Architectural Decisions

No new architectural decisions required. Following existing patterns from:
- `packages/core/gallery/src/utils/view-mode-storage.ts`
- `packages/core/gallery/src/hooks/useViewMode.ts`

## Worker Token Summary

- Input: ~8000 tokens (story file, main-page.tsx, schemas, existing patterns)
- Output: ~2000 tokens (IMPLEMENTATION-PLAN.md)
