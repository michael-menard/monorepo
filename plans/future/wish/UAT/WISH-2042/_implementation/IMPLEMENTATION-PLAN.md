# Implementation Plan - WISH-2042

## Scope Surface

- **backend/API**: yes
- **frontend/UI**: yes
- **infra/config**: no

**Notes**: Cross-domain feature requiring coordination between Wishlist and Sets services. Backend adds new endpoint with transaction semantics. Frontend adds modal form with RTK Query mutation and undo capability.

---

## Acceptance Criteria Checklist

### Backend
- [ ] AC 2: POST `/api/wishlist/:id/purchased` endpoint creates Set and optionally deletes Wishlist item
- [ ] AC 6: Transaction atomic: create Set first, then delete Wishlist
- [ ] AC 16: Validation with Zod (price >= 0, tax >= 0, shipping >= 0, quantity >= 1, purchaseDate <= today)
- [ ] AC 20: Rollback: If Set creation fails, Wishlist item NOT deleted
- [ ] AC 21: Image copied to Sets S3 key during purchase
- [ ] AC 22: Returns 403 if user doesn't own wishlist item
- [ ] AC 23: Returns 404 if wishlist item doesn't exist

### Frontend
- [ ] AC 4: GotItModal with form: price paid, tax, shipping, quantity, purchase date, "Keep on wishlist" checkbox
- [ ] AC 5: Purchase date defaults to today
- [ ] AC 7b: RTK Query mutation `useMarkAsPurchasedMutation`
- [ ] AC 8b: Success toast "Item added to your collection" with 5-second undo button
- [ ] AC 9b: Undo button restores wishlist item and deletes set item
- [ ] AC 10: Optional "View in Sets" navigation link in toast
- [ ] AC 17: Loading states with progress messages
- [ ] AC 18: Modal keyboard accessible (ESC to cancel, focus trap)
- [ ] AC 19: Toast announced via `role="alert"` for screen readers
- [ ] AC 24: Quantity > 1 offers to re-add surplus items to wishlist

---

## Files To Touch (Expected)

### Backend (New/Modified)

| Action | Path |
|--------|------|
| MODIFY | `apps/api/lego-api/domains/wishlist/types.ts` |
| MODIFY | `apps/api/lego-api/domains/wishlist/ports/index.ts` |
| MODIFY | `apps/api/lego-api/domains/wishlist/adapters/storage.ts` |
| MODIFY | `apps/api/lego-api/domains/wishlist/application/services.ts` |
| MODIFY | `apps/api/lego-api/domains/wishlist/routes.ts` |
| MODIFY | `apps/api/lego-api/domains/wishlist/__tests__/services.test.ts` |
| CREATE | `apps/api/lego-api/domains/wishlist/__tests__/purchase.test.ts` |

### Frontend (New/Modified)

| Action | Path |
|--------|------|
| MODIFY | `packages/core/api-client/src/schemas/wishlist.ts` |
| MODIFY | `packages/core/api-client/src/rtk/wishlist-gallery-api.ts` |
| CREATE | `apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx` |
| CREATE | `apps/web/app-wishlist-gallery/src/components/GotItModal/__tests__/GotItModal.test.tsx` |
| MODIFY | `apps/web/app-wishlist-gallery/src/pages/main-page.tsx` |
| MODIFY | `apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx` |

### Test Files

| Action | Path |
|--------|------|
| CREATE | `__http__/wishlist-purchase.http` |

---

## Reuse Targets

### From Existing Codebase

| Package/Module | Reuse |
|----------------|-------|
| `@repo/api-core` | `Result`, `ok`, `err`, `uploadToS3`, `deleteFromS3` types and S3 operations |
| `@repo/app-component-library` | Modal, Button, Input, Checkbox, DatePicker (if available) |
| Sets domain | `SetsService.createSet()`, `SetsService.deleteSet()` for cross-domain ops |
| Sets types | `CreateSetInput` schema for Set creation |
| Wishlist storage adapter | Pattern for S3 image copying |

### From WISH-2041 (Delete Flow)
- Undo pattern with 5-second window (pending - may need to implement fresh)
- Toast notification structure with action button
- Optimistic update patterns

---

## Architecture Notes (Ports & Adapters)

### Cross-Domain Coordination Strategy

**Approach**: Dependency Injection via Routes

The `markAsPurchased` method in `WishlistService` needs access to `SetsService`. Rather than creating a composition root coupling, we inject `SetsService` at the route level where both services are available.

```
wishlist/routes.ts
  ├── createWishlistService({ wishlistRepo, imageStorage, setsService? })
  └── setsService injected for purchase endpoint only
```

### Transaction Semantics

**Pattern**: Eventual Consistency with Best-Effort Cleanup

1. **Phase 1 (Critical)**: Create Set record (point of no return)
2. **Phase 2 (Optional)**: Copy S3 image (best effort, log warning on failure)
3. **Phase 3 (Optional)**: Delete Wishlist item if requested (best effort, log warning on failure)

**Data Loss Prevention**: Never delete Wishlist before Set creation succeeds.

### Port Additions Needed

1. **WishlistImageStorage**: Add `copyImage(sourceKey, destKey)` method for cross-domain image copying
2. **WishlistServiceDeps**: Add optional `setsService` dependency for purchase flow

### Adapter Patterns

- Image copying uses `@repo/api-core` S3 utilities (GetObjectCommand + PutObjectCommand)
- No direct S3 SDK calls in service layer
- All S3 operations abstracted through ports

---

## Step-by-Step Plan

### Phase 1: Backend Types & Ports (Steps 1-3)

#### Step 1: Add MarkAsPurchasedInput Schema
**Objective**: Define Zod schema for purchase request validation

**Files**:
- `apps/api/lego-api/domains/wishlist/types.ts`

**Changes**:
- Add `MarkAsPurchasedInputSchema` with fields: pricePaid?, tax?, shipping?, quantity, purchaseDate?, keepOnWishlist
- Add validation: pricePaid >= 0, tax >= 0, shipping >= 0, quantity >= 1, purchaseDate <= today
- Export `MarkAsPurchasedInput` type

**Verification**: TypeScript compiles, no errors

---

#### Step 2: Extend WishlistImageStorage Port
**Objective**: Add image copying capability to storage port

**Files**:
- `apps/api/lego-api/domains/wishlist/ports/index.ts`

**Changes**:
- Add `copyImage(sourceKey: string, destKey: string): Promise<Result<{ url: string }, 'COPY_FAILED'>>` to WishlistImageStorage interface

**Verification**: TypeScript compiles, interface exported

---

#### Step 3: Implement Image Copy in Storage Adapter
**Objective**: Implement S3 copy operation

**Files**:
- `apps/api/lego-api/domains/wishlist/adapters/storage.ts`

**Changes**:
- Add `copyImage` method using GetObjectCommand + PutObjectCommand
- Handle case where source doesn't exist (return error)

**Verification**: TypeScript compiles

---

### Phase 2: Backend Service Logic (Steps 4-6)

#### Step 4: Add markAsPurchased Method to WishlistService
**Objective**: Implement core purchase business logic

**Files**:
- `apps/api/lego-api/domains/wishlist/application/services.ts`

**Changes**:
- Update `WishlistServiceDeps` to include optional `setsService` and `setsImageStorage`
- Add `markAsPurchased(userId, itemId, input)` method
- Implement transaction flow:
  1. Fetch and verify wishlist item ownership
  2. Build Set input from wishlist item + purchase data
  3. Call `setsService.createSet(userId, setInput)`
  4. If imageUrl exists, copy image to Sets bucket
  5. If !keepOnWishlist, delete wishlist item (best effort)
  6. Return created Set

**Verification**: TypeScript compiles

---

#### Step 5: Write Backend Unit Tests
**Objective**: Test purchase flow with mocked dependencies

**Files**:
- `apps/api/lego-api/domains/wishlist/__tests__/purchase.test.ts`

**Test Cases**:
- Happy path: Purchase creates Set with correct data
- Happy path: Purchase with keepOnWishlist=false deletes Wishlist item
- Happy path: Purchase with keepOnWishlist=true keeps Wishlist item
- Happy path: Image copied to Sets S3 key
- Transaction: Set creation failure does NOT delete Wishlist item
- Transaction: Wishlist deletion failure logs warning (acceptable)
- Transaction: Image copy failure logs warning (acceptable)
- Validation: Price must be >= 0
- Validation: Tax must be >= 0
- Validation: Shipping must be >= 0
- Validation: Quantity must be >= 1
- Validation: Purchase date must be <= today
- Auth: Returns FORBIDDEN if user doesn't own item
- Auth: Returns NOT_FOUND if item doesn't exist
- Edge: No image on wishlist item (skip S3 copy)

**Verification**: `pnpm test apps/api/lego-api` passes

---

#### Step 6: Add POST /purchased Route
**Objective**: Wire up HTTP endpoint

**Files**:
- `apps/api/lego-api/domains/wishlist/routes.ts`

**Changes**:
- Import Sets service and create for injection
- Add `POST /:id/purchased` route
- Parse body with `MarkAsPurchasedInputSchema`
- Call `wishlistService.markAsPurchased(userId, itemId, validated)`
- Return 201 with new Set, or error responses (400, 403, 404, 500)

**Verification**: `pnpm check-types` passes, route registered

---

### Phase 3: Frontend Schemas & RTK Query (Steps 7-8)

#### Step 7: Add Purchase Types to Frontend Schemas
**Objective**: Define frontend types for purchase flow

**Files**:
- `packages/core/api-client/src/schemas/wishlist.ts`

**Changes**:
- Add `MarkAsPurchasedInputSchema` (frontend version, numbers not strings)
- Add `MarkAsPurchasedResponseSchema` (returns Set)
- Export types

**Verification**: TypeScript compiles

---

#### Step 8: Add RTK Query Mutation
**Objective**: Create `useMarkAsPurchasedMutation` hook

**Files**:
- `packages/core/api-client/src/rtk/wishlist-gallery-api.ts`

**Changes**:
- Add `markAsPurchased` mutation endpoint
- Map to `POST /api/wishlist/:id/purchased`
- Invalidate both Wishlist and Sets cache tags on success
- Add `deleteSet` mutation for undo (or verify Sets API exists)

**Verification**: TypeScript compiles, hooks exported

---

### Phase 4: Frontend Modal Component (Steps 9-11)

#### Step 9: Create GotItModal Component
**Objective**: Build form modal for purchase details

**Files**:
- `apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx`

**Changes**:
- Create modal with form fields:
  - Price Paid (number input, optional)
  - Tax (number input, optional)
  - Shipping (number input, optional)
  - Quantity (number stepper, default 1, min 1)
  - Purchase Date (date input, default today, max today)
  - Keep on Wishlist (checkbox, default unchecked)
- Add form validation with Zod
- Add loading states with progress messages
- Disable close during operation
- Keyboard accessibility: ESC to cancel, focus trap

**Verification**: Component renders without errors

---

#### Step 10: Write Modal Component Tests
**Objective**: Unit test GotItModal

**Files**:
- `apps/web/app-wishlist-gallery/src/components/GotItModal/__tests__/GotItModal.test.tsx`

**Test Cases**:
- Renders with form fields
- Price pre-filled from wishlist item if available
- Purchase date defaults to today
- Quantity defaults to 1
- "Keep on wishlist" defaults to unchecked
- Cancel button closes modal
- Submit triggers mutation with correct data
- Validation errors display inline
- Loading states show progress messages
- Close disabled during loading
- ESC closes modal when not loading
- Focus trapped in modal

**Verification**: `pnpm test apps/web/app-wishlist-gallery` passes

---

#### Step 11: Integrate Modal with WishlistCard
**Objective**: Add "Got It" button and wire up modal

**Files**:
- `apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx`
- `apps/web/app-wishlist-gallery/src/pages/main-page.tsx`

**Changes**:
- Add "Got It" button to WishlistCard (or action menu)
- Add state for selected item and modal open
- Add toast with undo button using Sonner
- Implement undo logic: restore to cache + delete Set
- Add "View in Sets" link in toast

**Verification**: Modal opens from card, submission works

---

### Phase 5: Integration & Verification (Steps 12-14)

#### Step 12: Create .http Test File
**Objective**: Manual endpoint testing

**Files**:
- `__http__/wishlist-purchase.http`

**Requests**:
- POST /api/wishlist/:id/purchased (happy path)
- POST /api/wishlist/:id/purchased (with all optional fields)
- POST /api/wishlist/:id/purchased (keepOnWishlist=true)
- POST /api/wishlist/:id/purchased (validation errors)
- POST /api/wishlist/:id/purchased (404 not found)
- POST /api/wishlist/:id/purchased (403 forbidden)

**Verification**: All requests return expected responses

---

#### Step 13: Run Full Test Suite
**Objective**: Verify all tests pass

**Commands**:
```bash
pnpm check-types
pnpm lint
pnpm test apps/api/lego-api
pnpm test packages/core/api-client
pnpm test apps/web/app-wishlist-gallery
```

**Verification**: All commands exit 0

---

#### Step 14: Manual E2E Verification
**Objective**: Verify full flow works

**Steps**:
1. Start local dev server
2. Navigate to wishlist gallery
3. Click "Got It" on a wishlist item
4. Fill in purchase details
5. Submit form
6. Verify toast appears with undo button
7. Verify item removed from wishlist (if checkbox unchecked)
8. Click "View in Sets" link
9. Verify Set appears in Sets gallery
10. Test undo within 5 seconds

**Verification**: All steps work correctly

---

## Test Plan

### Unit Tests
```bash
pnpm test apps/api/lego-api -- --filter=purchase
pnpm test apps/web/app-wishlist-gallery -- --filter=GotItModal
```

### Integration Tests
```bash
pnpm test apps/api/lego-api
pnpm test packages/core/api-client
pnpm test apps/web/app-wishlist-gallery
```

### Type Checking
```bash
pnpm check-types
```

### Linting
```bash
pnpm lint
```

### Manual API Testing
```bash
# Execute .http file in VS Code REST Client or similar
# File: __http__/wishlist-purchase.http
```

---

## Stop Conditions / Blockers

None identified. All conditional ACs (25-36) from elaboration have been resolved in SCOPE.md.

---

## Architectural Decisions

### Decision 1: Cross-Domain Service Injection

**Question**: How should WishlistService access SetsService for purchase flow?

**Context**: The purchase flow needs to create a Set item, which is owned by the Sets domain.

**Options**:
1. **Inject SetsService into WishlistService deps** - Direct DI
   - Pros: Simple, follows existing pattern
   - Cons: Creates coupling between domains

2. **Create shared PurchaseCoordinator service** - Separate coordination layer
   - Pros: Clean separation, single responsibility
   - Cons: More code, additional abstraction

3. **Use domain events** - Event-driven eventual consistency
   - Pros: Fully decoupled
   - Cons: Complex, overkill for this use case

**Recommendation**: Option 1 (Inject SetsService into WishlistService deps)

This follows the existing pattern in the codebase where services are composed at the route level. The coupling is acceptable because:
- Purchase is a specific cross-domain operation
- The dependency is optional (only needed for purchase)
- It maintains synchronous transaction semantics

**Status**: APPROVED (follows existing codebase patterns)

---

### Decision 2: Image Copy Strategy

**Question**: How should images be copied from Wishlist to Sets S3 bucket?

**Context**: When purchasing, the wishlist image should be available in Sets.

**Options**:
1. **Copy S3 object** - Download and re-upload
   - Pros: Works across buckets, simple
   - Cons: Network overhead

2. **S3 CopyObject API** - Server-side copy
   - Pros: Efficient, no download needed
   - Cons: Requires same bucket or proper cross-bucket permissions

3. **Share image reference** - Point Sets to Wishlist image
   - Pros: No copy needed
   - Cons: Breaks if Wishlist image deleted

**Recommendation**: Option 1 (Download + Re-upload)

This is the simplest approach that works reliably. The GetObject + PutObject pattern is already used in the codebase. Performance is acceptable for single image operations.

**Status**: APPROVED (follows existing patterns, acceptable performance)

---

## Worker Token Summary

- Input: ~12,000 tokens (story files, existing services, types, routes, ports, adapters)
- Output: ~3,500 tokens (IMPLEMENTATION-PLAN.md)
