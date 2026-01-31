---
doc_type: story
title: "SETS-MVP-003: Extended Got It Flow"
story_id: SETS-MVP-003
story_prefix: SETS-MVP
status: draft
phase: 2
created_at: "2026-01-30T12:00:00-07:00"
updated_at: "2026-01-30T12:00:00-07:00"
depends_on: [SETS-MVP-001, WISH-2004]
estimated_points: 3
---

# SETS-MVP-003: Extended Got It Flow

## Goal

Extend the existing "Got it" modal to capture purchase details and update the item's status to 'owned' instead of creating a separate Set record.

## Context

The current "Got it" flow (WISH-2004) was designed to create a new Set record and delete the wishlist item. With the unified model, we simply update the existing record's status and add purchase details.

## Feature

Add a purchase details step to the "Got it" modal that captures price paid, purchase date, and initial build status, then updates the item to `status = 'owned'`.

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

### UX Polish
- [ ] AC11: Success toast: "Added to your collection!"
- [ ] AC12: Toast includes "View in Collection" link
- [ ] AC13: Item disappears from wishlist view after purchase
- [ ] AC14: If user is on wishlist page, item animates out

### Undo Support
- [ ] AC15: Toast includes "Undo" action (5 second window)
- [ ] AC16: Undo reverts status to 'wishlist' and clears purchase fields
- [ ] AC17: `PATCH /api/wishlist/:id/unpurchase` endpoint for undo

### Form Validation
- [ ] AC18: Price fields accept valid decimals only (0.00 - 999999.99)
- [ ] AC19: Purchase date cannot be in the future
- [ ] AC20: Form is keyboard accessible (tab order, enter to submit)

## Technical Details

### Component Structure

```
apps/web/app-wishlist-gallery/
  src/
    components/
      GotItModal/
        index.tsx                    # Existing modal
        PurchaseDetailsStep/         # NEW step component
          index.tsx
          __tests__/
            PurchaseDetailsStep.test.tsx
```

### API Endpoint

```typescript
// PATCH /api/wishlist/:id/purchase
// Request body: MarkAsPurchasedSchema
// Response: UserSetSchema (updated item)

// PATCH /api/wishlist/:id/unpurchase (for undo)
// Request body: none
// Response: UserSetSchema (reverted item)
```

### State Update

```typescript
// Before (WISH-2004 approach - atomic create+delete)
await db.transaction(async (tx) => {
  await tx.insert(sets).values({ ...item, ...purchaseDetails })
  await tx.delete(wishlistItems).where(eq(id, itemId))
})

// After (unified model - simple update)
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
  .where(eq(id, itemId))
```

## Risk Notes

- WISH-2004 may need refactoring if already implemented with separate tables
- Undo window (5s) requires client-side timer management

## Dependencies

- SETS-MVP-001: Unified Schema Extension (status and purchase fields must exist)
- WISH-2004: Modals & Transitions (existing "Got it" modal infrastructure)

## Migration Notes

If WISH-2004 was already implemented with separate tables approach:
1. Update endpoint to use unified model
2. Remove Sets table creation logic
3. Keep modal UI, add purchase details step

## Out of Scope

- Keeping item on wishlist after purchase ("want another copy") - future enhancement
- Quantity > 1 in single purchase - future enhancement

## Definition of Done

- [ ] Purchase details step added to "Got it" modal
- [ ] API endpoint updates item status correctly
- [ ] Undo functionality works within 5s window
- [ ] All tests pass
- [ ] Code review completed
