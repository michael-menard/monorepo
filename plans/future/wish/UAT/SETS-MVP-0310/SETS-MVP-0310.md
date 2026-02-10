---
doc_type: story
title: "SETS-MVP-0310: Status Update Flow"
story_id: SETS-MVP-0310
story_prefix: SETS-MVP
status: uat
split_from: SETS-MVP-003
split_part: 1 of 4
phase: 2
created_at: "2026-01-31T15:30:00-07:00"
updated_at: "2026-02-08T21:00:00-07:00"
depends_on: [SETS-MVP-001]
estimated_points: 2
---

# SETS-MVP-0310: Status Update Flow

## Split Context

This story is part of a split from SETS-MVP-003.
- **Original Story:** SETS-MVP-003 (Extended Got It Flow)
- **Split Reason:** Story was too large (20 ACs across 4 independent feature areas) with critical architecture violations and blocking dependencies
- **This Part:** 1 of 4 (Core status update flow)
- **Dependency:** Blocking on SETS-MVP-001 (Unified Schema Extension)

## Context

The existing "Got it" flow (WISH-2004) was designed to create a new Set record and delete the wishlist item. With the unified model from SETS-MVP-001, we now have a single `user_sets` table where items can transition between statuses ('wishlist' → 'owned'). This story implements the core purchase flow using status updates instead of record creation/deletion.

This is the foundational split that delivers the MVP value: allowing users to mark items as owned. The other splits (UX polish, undo support, form validation) build upon this core functionality.

## Goal

Enable users to mark wishlist items as owned while capturing purchase details (price, tax, shipping, purchase date, build status) using the unified model status update approach.

## Non-goals

- Undo functionality (covered in SETS-MVP-0330)
- Success toast and animations (covered in SETS-MVP-0320)
- Advanced form validation (covered in SETS-MVP-0340)
- Keeping item on wishlist after purchase ("want another copy")
- Quantity > 1 in single purchase

## Scope

Extend the existing "Got it" modal with a purchase details step and implement a PATCH endpoint to update item status to 'owned' with purchase metadata. The modal flow adds a second step after the confirmation that captures optional purchase details, then calls the backend to update the item's status.

## Acceptance Criteria

### Modal Flow
- [ ] AC1: "Got it" button opens confirmation step (existing)
- [ ] AC2: After confirmation, shows purchase details form (NEW)
- [ ] AC3: Purchase details form includes:
  - Purchase date (defaults to today)
  - Price paid (optional, pre-filled with retail price if available)
  - Tax (optional)
  - Shipping (optional)
  - Build status: "In Pieces" (default) or "Built"
- [ ] AC4: "Skip" button saves with minimal data (status='owned', buildStatus='in_pieces', purchaseDate=today)
- [ ] AC5: "Save" button validates and saves all entered data
- [ ] AC6: Form shows calculated total (price + tax + shipping) if values entered

### API Changes
- [ ] AC7: `PATCH /api/wishlist/:id/purchase` endpoint accepts purchase details
- [ ] AC8: Endpoint updates: status='owned', statusChangedAt=now(), plus purchase fields
- [ ] AC9: Endpoint validates ownership (existing auth middleware)
- [ ] AC10: Returns updated item with new status

## Reuse Plan

### Existing Components
- `GotItModal` component (from WISH-2004) - extend with new purchase details step
- Auth middleware for ownership validation
- Existing modal infrastructure and transitions

### Shared Packages
- `@repo/ui` - Form components (Input, Select, Button)
- `@repo/logger` - Backend logging
- Zod schemas from unified model (via SETS-MVP-001)

### New Components
- `PurchaseDetailsStep` - New step component for the modal
  - Location: `apps/web/app-wishlist-gallery/src/components/GotItModal/PurchaseDetailsStep/`
  - Reuses form primitives from `@repo/ui`

## Architecture Notes

### Component Structure

```
apps/web/app-wishlist-gallery/
  src/
    components/
      GotItModal/
        index.tsx                    # Existing modal (extend with new step)
        PurchaseDetailsStep/         # NEW step component
          index.tsx
          __tests__/
            PurchaseDetailsStep.test.tsx
```

### API Endpoint (Ports & Adapters)

```typescript
// apps/api/lego-api/domains/wishlist/routes.ts
router.patch('/:id/purchase', async (req, res) => {
  const result = await wishlistService.markAsPurchased(
    req.userId,
    req.params.id,
    req.body
  )
  res.json(result)
})

// apps/api/lego-api/domains/wishlist/application/services.ts
export async function markAsPurchased(
  userId: string,
  itemId: string,
  purchaseDetails: PurchaseDetailsInput
): Promise<UserSet> {
  // Business logic:
  // 1. Validate ownership via userId
  // 2. Update status to 'owned'
  // 3. Set statusChangedAt to now()
  // 4. Apply purchase details (date, price, tax, shipping, buildStatus)
  // 5. Return updated item
}
```

### State Update Approach

```typescript
// Unified model approach (SETS-MVP-001)
await db.update(userSets)
  .set({
    status: 'owned',
    purchaseDate,
    purchasePrice,
    purchaseTax,
    purchaseShipping,
    buildStatus: 'in_pieces',
    statusChangedAt: new Date(),
  })
  .where(eq(userSets.id, itemId))
```

## Test Plan

### Unit Tests
- `PurchaseDetailsStep.test.tsx`:
  - Renders form with all fields
  - Pre-fills purchase date with today
  - Pre-fills price with retail price if available
  - Calculates total correctly (price + tax + shipping)
  - "Skip" button calls onSave with minimal data
  - "Save" button calls onSave with entered data

### Integration Tests
- Backend service tests:
  - `markAsPurchased()` updates status to 'owned'
  - Sets statusChangedAt to current timestamp
  - Applies purchase details correctly
  - Validates ownership (rejects if userId mismatch)

### E2E Tests (Playwright)
- Happy path: User clicks "Got it", fills purchase details, item status updates
- Skip path: User clicks "Got it", clicks "Skip", item status updates with minimal data
- Ownership validation: User cannot mark another user's item as purchased

## Risks / Edge Cases

### Critical Risks
1. **SETS-MVP-001 Dependency**: Story CANNOT proceed if schema fields don't exist
   - Mitigation: Verify SETS-MVP-001 implementation status before starting work
   - Required fields: status, purchaseDate, buildStatus, purchasePrice, purchaseTax, purchaseShipping, statusChangedAt

2. **WISH-2004 Migration**: Existing endpoint is `POST :id/purchased` (create Set + delete wishlist)
   - Decision needed: Replace existing endpoint OR run parallel with feature flag?
   - Mitigation: Clarify migration strategy before implementation

3. **Service Layer Specification**: Must follow Ports & Adapters pattern
   - Mitigation: Add service method `markAsPurchased(userId, itemId, input)` in application/services.ts
   - Business logic must NOT live in route handlers

### Edge Cases
- User has no retail price available: Form shows empty price field
- User enters price without tax/shipping: Total = price only
- User enters tax/shipping without price: Total calculation may be confusing (clarify UX)
- Build status enum case mismatch: Story shows "In Pieces" vs "Built" but schema uses 'in_pieces' | 'built'
  - Mitigation: UI displays proper case, form submission converts to snake_case

## Definition of Done

- [ ] Purchase details step added to "Got it" modal
- [ ] PATCH /api/wishlist/:id/purchase endpoint implemented
- [ ] Service layer method `markAsPurchased()` implemented
- [ ] Endpoint updates item status to 'owned' with purchase fields
- [ ] Ownership validation works correctly
- [ ] All tests pass (unit, integration, E2E)
- [ ] Code review completed
- [ ] No regression in existing "Got it" flow

---

## Implementation Notes

### Prerequisites
1. Verify SETS-MVP-001 schema fields exist:
   - status enum includes 'owned'
   - purchaseDate, purchasePrice, purchaseTax, purchaseShipping columns exist
   - buildStatus enum ('in_pieces' | 'built') exists
   - statusChangedAt timestamp column exists

2. Clarify WISH-2004 migration strategy:
   - Will we deprecate POST :id/purchased?
   - Run both endpoints in parallel with feature flag?
   - Document migration path

### Service Layer Requirements
Per api-layer.md Ports & Adapters pattern:
- Route handler delegates to service layer
- Business logic lives in `application/services.ts`
- Service method signature: `markAsPurchased(userId, itemId, input): Promise<UserSet>`

### Modal Extension
- Add new step to existing GotItModal component
- Step order: Confirmation → Purchase Details → (Close on success)
- Form state management: React useState or form library
- Validation: Basic client-side (detailed validation in SETS-MVP-0340)

---

## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on 2026-02-01_

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Endpoint naming inconsistency | Add as AC (AC11) | Story title "Status Update Flow" but endpoint is `/purchase`. Need clarification: is this a status transition endpoint (/status or /transition) or purchase-specific (/purchase)? |
| 2 | Service method conflict | Add as AC (AC12) | Service already has `markAsPurchased()` from WISH-2004 with different behavior. Must specify: replace existing, rename, or use feature flag? |
| 3 | WISH-2004 migration strategy undefined | Add as AC (AC13) | Story mentions "clarify migration strategy" but provides no decision criteria. Must document: deprecation timeline, feature flag approach, backward compatibility requirements. |
| 4 | SETS-MVP-001 dependency not verified | Add as AC (AC14) | Story blocked on SETS-MVP-001 (ready-to-work, NOT implemented). Must verify schema has: status='owned' enum, purchaseDate, buildStatus, purchasePrice, purchaseTax, purchaseShipping, statusChangedAt. |
| 5 | Missing consumer impact analysis | Add as AC (AC15) | Existing `POST :id/purchased` has consumers (GotItModal). Must document migration: how to transition GotItModal from POST to PATCH during rollout? |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 6 | Incomplete architecture alignment | Add as AC (AC16) | Verify: schema supports status='owned' enum? Unified model includes status state machine? Document schema gaps. |
| 7 | Form UX edge case unresolved | Add as AC (AC17) | Story notes "User enters tax/shipping without price: Total calculation may be confusing". Clarify total calculation logic and UI feedback. |

### Follow-up Stories Suggested

- [x] WISH-2004 endpoint deprecation and migration timeline (post-SETS-MVP-0310) → SETS-MVP-0380
- [x] Consumer notification strategy for API transition → SETS-MVP-0400
- [ ] Form validation edge case documentation (SETS-MVP-0340 will cover advanced validation)

### Items Marked Out-of-Scope

- Undo functionality: SETS-MVP-0330
- Success toast and animations: SETS-MVP-0320
- Advanced form validation: SETS-MVP-0340
- Quantity > 1 in single purchase: Future iteration
- Keeping item on wishlist after purchase: Future iteration
