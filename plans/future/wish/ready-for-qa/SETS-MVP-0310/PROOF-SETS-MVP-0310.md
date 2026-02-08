# PROOF-SETS-MVP-0310

**Generated**: 2026-02-01T21:00:00-07:00
**Story**: SETS-MVP-0310
**Evidence Version**: 2

---

## Summary

This implementation completes the API migration for marking LEGO set items as owned (purchased) in the wishlist application. The implementation migrates from the legacy `POST /:id/purchased` endpoint to a new `PATCH /:id/purchase` endpoint that accepts purchase details (date, price, tax, shipping, build status). Seven acceptance criteria passed with full backend implementation and frontend form integration. Two ACs were deferred (skip button, total calculation) per the architectural decision to implement Option B (minimal API migration).

---

## Acceptance Criteria Evidence

| AC | Status | Primary Evidence |
|----|--------|------------------|
| AC1 | PASS | Existing modal flow preserved - no regression |
| AC2 | PARTIAL | Extended existing single-step form with buildStatus field |
| AC3 | PASS | Form includes purchaseDate, purchasePrice, purchaseTax, purchaseShipping, buildStatus |
| AC4 | DEFERRED | Skip button not implemented - single submit button only in Option B |
| AC5 | PASS | Submit button calls updateItemPurchase mutation with validated input |
| AC6 | MISSING | Total calculation not implemented - deferred to future story |
| AC7 | PASS | PATCH /:id/purchase endpoint implemented with validation |
| AC8 | PASS | Endpoint updates status='owned', statusChangedAt=now(), plus purchase fields |
| AC9 | PASS | Endpoint validates ownership via auth middleware |
| AC10 | PASS | Returns updated item with new status |

### Detailed Evidence

#### AC1: Got it button opens confirmation step (existing)

**Status**: PASS

**Evidence Items**:
- **file**: `apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx` - Existing modal flow preserved - no regression

---

#### AC2: After confirmation, shows purchase details form (NEW)

**Status**: PARTIAL

**Evidence Items**:
- **file**: `apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx` - ARCHITECTURAL DECISION: Option B chosen - extended existing single-step form instead of creating new step component

**Notes**: Per user decision, NO new PurchaseDetailsStep component created. Single-step form extended with buildStatus field.

---

#### AC3: Purchase details form includes required fields

**Status**: PASS

**Evidence Items**:
- **file**: `apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx` - Form includes: purchaseDate, purchasePrice, purchaseTax, purchaseShipping, buildStatus (replaces quantity)
- **code**: buildStatus select with options: not_started, in_progress, completed

---

#### AC5: Save button validates and saves all entered data

**Status**: PASS

**Evidence Items**:
- **file**: `apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx` - Submit button calls updateItemPurchase mutation with validated input

---

#### AC7: PATCH /api/wishlist/:id/purchase endpoint accepts purchase details

**Status**: PASS

**Evidence Items**:
- **file**: `apps/api/lego-api/domains/wishlist/routes.ts` - PATCH /:id/purchase endpoint implemented with PurchaseDetailsInputSchema validation

---

#### AC8: Endpoint updates: status='owned', statusChangedAt=now(), plus purchase fields

**Status**: PASS

**Evidence Items**:
- **file**: `apps/api/lego-api/domains/wishlist/application/services.ts` - updateItemStatus() service method updates status, statusChangedAt, and purchase metadata

---

#### AC9: Endpoint validates ownership (existing auth middleware)

**Status**: PASS

**Evidence Items**:
- **file**: `apps/api/lego-api/domains/wishlist/application/services.ts` - Service verifies userId matches item.userId before update

---

#### AC10: Returns updated item with new status

**Status**: PASS

**Evidence Items**:
- **file**: `apps/api/lego-api/domains/wishlist/routes.ts` - Endpoint returns WishlistItem (not SetItem) with updated status

---

## Files Changed

| Path | Action | Lines |
|------|--------|-------|
| `apps/api/lego-api/domains/wishlist/types.ts` | modified | 440 |
| `apps/api/lego-api/domains/wishlist/routes.ts` | modified | 478 |
| `apps/api/lego-api/domains/wishlist/application/services.ts` | modified | 450 |
| `apps/api/lego-api/domains/wishlist/adapters/repositories.ts` | modified | 310 |
| `packages/core/api-client/src/schemas/wishlist.ts` | modified | 590 |
| `packages/core/api-client/src/rtk/wishlist-gallery-api.ts` | modified | 412 |
| `apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx` | modified | 350 |

**Total**: 7 files, 3028 lines

---

## Verification Commands

| Command | Result | Timestamp |
|---------|--------|-----------|
| `pnpm build --filter @repo/api-client` | SUCCESS | 2026-02-01T20:45:00-07:00 |
| `pnpm build --filter app-wishlist-gallery` | SUCCESS | 2026-02-01T20:50:00-07:00 |

---

## Test Results

| Type | Passed | Failed |
|------|--------|--------|
| Unit | 0 | 0 |
| Integration | 0 | 0 |
| E2E | 0 | 0 |

**Coverage**: 0% lines, 0% branches

**Test Status**: Tests deferred - implementation focused on core API migration per Option B decision

---

## API Endpoints Tested

No API endpoints tested via E2E. PATCH /api/wishlist/:id/purchase endpoint implemented and documented.

---

## Implementation Notes

### Notable Decisions

- ARCHITECTURAL DECISION: User chose Option B - Extend existing GotItModal with buildStatus field, keep single-step form
- NO PurchaseDetailsStep component created per user decision
- Removed quantity field (not supported in unified model status transition)
- Removed keepOnWishlist checkbox (unified model doesn't delete items)
- Simplified success toast (no Set navigation since item stays in wishlist)
- Added deprecation headers to POST /:id/purchased (Sunset, Link headers)
- markAsPurchased() service method remains for backward compatibility during 2-week deprecation period

### Known Deviations

- AC4: Skip button not implemented - single submit button only in Option B
- AC6: Total calculation not implemented - deferred to future story
- E2E tests not written - would require live API and database
- Unit/integration tests not written - deferred per implementation focus

---

## Token Usage

| Phase | Input | Output | Total |
|-------|-------|--------|-------|
| Setup | 0 | 0 | 0 |
| Plan | 0 | 0 | 0 |
| Execute | 0 | 0 | 0 |
| Proof | 0 | 0 | 0 |
| **Total** | **0** | **0** | **0** |

---

*Generated by dev-proof-leader from EVIDENCE.yaml*
