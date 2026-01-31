# Implementation Plan - WISH-2004

## Story Summary

WISH-2004 (Modals & Transitions) is a **verification story** for substantially complete implementation. The DeleteConfirmModal, GotItModal, backend endpoints, and RTK Query mutations already exist with 40+ unit tests.

**Gaps to address (AC31-32):**
1. Verify existing HTTP test files are comprehensive
2. Create Playwright E2E tests for delete-flow, purchase-flow, modal-accessibility

---

# Scope Surface

- **backend/API**: yes (HTTP test file verification)
- **frontend/UI**: yes (Playwright E2E tests)
- **infra/config**: no

**Notes**: This is verification work, not new feature implementation.

---

# Acceptance Criteria Checklist

From WISH-2004.md, focusing on verification gaps:

### AC31: HTTP Test Files (from QA Discovery)
- [x] `__http__/wishlist.http` - DELETE /api/wishlist/:id tests exist
- [x] `__http__/wishlist-purchase.http` - POST /api/wishlist/:id/purchased tests exist

### AC32: Playwright E2E Tests (from QA Discovery)
- [ ] `delete-flow.spec.ts` - Modal open, cancel, confirm, loading states
- [ ] `purchase-flow.spec.ts` - Form fill, submit, success toast, navigation
- [ ] `modal-accessibility.spec.ts` - Keyboard navigation, focus management

### Existing ACs (verified by existing unit tests)
- AC1-9: Delete flow - covered by DeleteConfirmModal.test.tsx (17 tests)
- AC10-25: Purchase flow - covered by GotItModal.test.tsx (23 tests)
- AC26-30: Accessibility - covered by unit tests

---

# Files To Touch (Expected)

## Verify (no changes needed)
- `__http__/wishlist.http` - Already has DELETE tests
- `__http__/wishlist-purchase.http` - Already has POST /purchased tests

## Create
- `apps/web/playwright/tests/wishlist/delete-flow.spec.ts`
- `apps/web/playwright/tests/wishlist/purchase-flow.spec.ts`
- `apps/web/playwright/tests/wishlist/modal-accessibility.spec.ts`

## Create (Implementation Logs)
- `_implementation/BACKEND-LOG.md`
- `_implementation/FRONTEND-LOG.md`

---

# Reuse Targets

| Package/Module | Usage |
|----------------|-------|
| `@playwright/test` | E2E test framework |
| Existing Playwright config | `apps/web/playwright/playwright.config.ts` |
| Test data-testid attributes | Already in components (delete-confirm-*, price-paid-input, etc.) |

---

# Architecture Notes (Ports & Adapters)

No architectural changes required. This is verification work.

### Playwright Test Structure

The Playwright tests will use the BDD-style configuration already in place:
- Tests go in `apps/web/playwright/tests/` directory
- Use existing `data-testid` attributes from components
- Follow page object pattern for reusability

### Test Isolation

Each test will:
1. Navigate to wishlist page
2. Perform actions (open modal, fill form, submit)
3. Verify results (toast, navigation, cache invalidation)

---

# Step-by-Step Plan (Small Steps)

## Step 1: Verify HTTP Test Files
**Objective**: Confirm existing HTTP test files cover AC31 requirements
**Files**: `__http__/wishlist.http`, `__http__/wishlist-purchase.http`
**Verification**: Read files, confirm DELETE and POST /purchased tests exist

## Step 2: Create tests directory structure
**Objective**: Create wishlist tests directory for Playwright
**Files**: `apps/web/playwright/tests/wishlist/`
**Verification**: Directory exists

## Step 3: Create delete-flow.spec.ts
**Objective**: E2E tests for delete confirmation modal flow
**Files**: `apps/web/playwright/tests/wishlist/delete-flow.spec.ts`
**Tests**:
- Delete modal opens when delete button clicked
- Cancel button closes modal without deleting
- Confirm button triggers deletion
- Loading state shows during delete
- Item removed from gallery after successful delete
**Verification**: `pnpm playwright test delete-flow.spec.ts` passes

## Step 4: Create purchase-flow.spec.ts
**Objective**: E2E tests for "Got It" modal purchase flow
**Files**: `apps/web/playwright/tests/wishlist/purchase-flow.spec.ts`
**Tests**:
- Got It modal opens with item title
- Price pre-filled from wishlist item
- Form validates price format
- Submit creates set item
- Success toast appears with "View in Sets" button
- Item removed from gallery (when keepOnWishlist=false)
**Verification**: `pnpm playwright test purchase-flow.spec.ts` passes

## Step 5: Create modal-accessibility.spec.ts
**Objective**: E2E tests for modal keyboard accessibility
**Files**: `apps/web/playwright/tests/wishlist/modal-accessibility.spec.ts`
**Tests**:
- ESC key closes DeleteConfirmModal
- ESC key closes GotItModal (when not loading)
- Focus trapped inside modals
- Focus returns to trigger on close
- All form fields have labels
**Verification**: `pnpm playwright test modal-accessibility.spec.ts` passes

## Step 6: Write BACKEND-LOG.md
**Objective**: Document HTTP test file verification
**Files**: `_implementation/BACKEND-LOG.md`
**Verification**: File exists with verification results

## Step 7: Write FRONTEND-LOG.md
**Objective**: Document Playwright E2E test creation
**Files**: `_implementation/FRONTEND-LOG.md`
**Verification**: File exists with test file list

## Step 8: Run full verification
**Objective**: Ensure all tests pass
**Commands**:
- `pnpm check-types` - Type check
- `pnpm lint` - Lint check
- `pnpm test --filter=app-wishlist-gallery` - Unit tests
**Verification**: All commands pass

---

# Test Plan

## Commands to Run

| Command | Purpose |
|---------|---------|
| `pnpm check-types` | Type check all packages |
| `pnpm lint` | Lint all packages |
| `pnpm test --filter=app-wishlist-gallery` | Run wishlist unit tests (40+ tests) |
| `pnpm --filter=playwright test` | Run Playwright E2E tests |

## HTTP Files (Manual Testing)

Existing files to verify:
- `__http__/wishlist.http` - DELETE endpoint tests
- `__http__/wishlist-purchase.http` - POST /purchased endpoint tests

## Playwright Tests (To Create)

| Test File | AC Coverage |
|-----------|-------------|
| `delete-flow.spec.ts` | AC1-9 |
| `purchase-flow.spec.ts` | AC10-25 |
| `modal-accessibility.spec.ts` | AC26-30 |

---

# Stop Conditions / Blockers

None identified. This is verification work with clear scope.

---

# Architectural Decisions

None required. This story creates test artifacts only.

---

## Worker Token Summary

- Input: ~15,000 tokens (story file, agent files, existing tests, HTTP files, component code)
- Output: ~2,500 tokens (IMPLEMENTATION-PLAN.md)
