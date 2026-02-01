---
doc_type: story
title: "SETS-MVP-0330: Undo Support"
story_id: SETS-MVP-0330
story_prefix: SETS-MVP
status: backlog
split_from: SETS-MVP-003
split_part: 3 of 4
phase: 2
created_at: "2026-01-31T15:30:00-07:00"
updated_at: "2026-01-31T15:30:00-07:00"
depends_on: [SETS-MVP-0310]
estimated_points: 1
---

# SETS-MVP-0330: Undo Support

## Split Context

This story is part of a split from SETS-MVP-003.
- **Original Story:** SETS-MVP-003 (Extended Got It Flow)
- **Split Reason:** Story was too large (20 ACs across 4 independent feature areas) with critical architecture violations and blocking dependencies
- **This Part:** 3 of 4 (Undo support for purchase operations)
- **Dependency:** Depends on SETS-MVP-0310 (Status Update Flow)

## Context

Users may accidentally mark items as purchased or change their mind immediately after. This story adds a 5-second undo window in the success toast that allows users to quickly revert the purchase action and restore the item to wishlist status.

This is a quality-of-life feature that prevents frustration from accidental clicks and builds user confidence in the purchase flow by providing a safety net.

## Goal

Allow users to quickly undo accidental purchase actions within a 5-second window, reverting the item status back to 'wishlist' and clearing purchase details.

## Non-goals

- Extended undo window (e.g., 24 hours) - future enhancement
- Undo history or undo stack - simple single-action undo only
- Redo functionality
- Undo for other operations (delete, edit, etc.)

## Scope

Add an "Undo" action button to the success toast (from SETS-MVP-0320) that appears for 5 seconds. Clicking "Undo" triggers a PATCH endpoint to revert the item's status back to 'wishlist' and clears all purchase-related fields. Client-side timer manages the 5-second window.

## Acceptance Criteria

### Undo Action
- [ ] AC15: Toast includes "Undo" action (5 second window)
- [ ] AC16: Undo reverts status to 'wishlist' and clears purchase fields
- [ ] AC17: `PATCH /api/wishlist/:id/unpurchase` endpoint for undo

## Reuse Plan

### Existing Components
- Success toast (from SETS-MVP-0320)
- Toast action button system
- Existing auth middleware for ownership validation

### Shared Packages
- `@repo/ui` - Toast component with action buttons
- `@repo/logger` - Backend logging
- Zod schemas from unified model (via SETS-MVP-001)

### New Components
- Timer hook for 5-second window management (or use toast duration)
- Unpurchase endpoint in wishlist domain

## Architecture Notes

### Component Structure

```
apps/web/app-wishlist-gallery/
  src/
    components/
      GotItModal/
        index.tsx                    # Add undo action to toast
    hooks/
      useUndo.ts                     # Optional: hook for undo timer management
```

### API Endpoint (Ports & Adapters)

```typescript
// apps/api/lego-api/domains/wishlist/routes.ts
router.patch('/:id/unpurchase', async (req, res) => {
  const result = await wishlistService.revertPurchase(
    req.userId,
    req.params.id
  )
  res.json(result)
})

// apps/api/lego-api/domains/wishlist/application/services.ts
export async function revertPurchase(
  userId: string,
  itemId: string
): Promise<UserSet> {
  // Business logic:
  // 1. Validate ownership via userId
  // 2. Update status to 'wishlist'
  // 3. Clear purchase fields (purchaseDate, purchasePrice, purchaseTax, purchaseShipping)
  // 4. Set statusChangedAt to now()
  // 5. Return updated item
}
```

### Undo State Revert

```typescript
// Revert purchase - clear all purchase fields
await db.update(userSets)
  .set({
    status: 'wishlist',
    purchaseDate: null,
    purchasePrice: null,
    purchaseTax: null,
    purchaseShipping: null,
    buildStatus: null,
    statusChangedAt: new Date(),
  })
  .where(eq(userSets.id, itemId))
```

### Toast Implementation

```typescript
// Add undo action to success toast
toast.success("Added to your collection!", {
  action: {
    label: "Undo",
    onClick: async () => {
      await unpurchaseItem(itemId)
      toast.success("Purchase reverted")
    }
  },
  duration: 5000  // 5-second window
})
```

## Test Plan

### Unit Tests
- `GotItModal.test.tsx` updates:
  - Toast includes "Undo" action
  - Undo action is available for 5 seconds
  - Clicking "Undo" calls unpurchase endpoint
  - Success feedback after undo

### Integration Tests
- Backend service tests:
  - `revertPurchase()` updates status to 'wishlist'
  - Clears all purchase fields (purchaseDate, purchasePrice, purchaseTax, purchaseShipping)
  - Sets statusChangedAt to current timestamp
  - Validates ownership (rejects if userId mismatch)

### E2E Tests (Playwright)
- Happy path: User purchases item, clicks "Undo" within 5 seconds, item reverts
- Timeout: User purchases item, waits >5 seconds, undo button disappears
- Ownership validation: User cannot undo another user's purchase

## Risks / Edge Cases

### Critical Risks
1. **Undo window timing**: Client-side timer may not be precise
   - Mitigation: Use toast duration (5000ms) as the timer
   - Server should NOT enforce time window - if client sends undo request, honor it

2. **Race condition**: User closes modal/navigates away during undo window
   - Mitigation: Toast should persist across modal close (global toast system)
   - Alternative: Accept that undo is lost if user navigates away

3. **Multiple undo clicks**: User rapidly clicks "Undo" multiple times
   - Mitigation: Disable undo button after first click
   - Backend should be idempotent (calling unpurchase on already-wishlist item is safe)

### Edge Cases
1. **Undo after toast disappears**: User may expect longer window
   - Mitigation: Clear messaging that undo is available for 5 seconds
   - Future enhancement: Extended undo history (24h)

2. **Item re-appears in wrong position**: After undo, item may be at bottom of list
   - Mitigation: Re-sort list by original order (if order is persisted)
   - Alternative: Accept that item moves to bottom (simple approach)

3. **Optimistic updates**: If using optimistic UI, undo may cause UI flicker
   - Mitigation: Disable optimistic updates for purchase flow
   - Or: Handle undo in optimistic update system

### Low-Priority Risks
- User confusion if undo window is too short (UX testing needed)
- Server-side expiry vs client-side timer mismatch (if we add server validation later)

## Definition of Done

- [ ] "Undo" action added to success toast
- [ ] Undo action available for 5-second window
- [ ] PATCH /api/wishlist/:id/unpurchase endpoint implemented
- [ ] Service layer method `revertPurchase()` implemented
- [ ] Endpoint reverts status to 'wishlist' and clears purchase fields
- [ ] All tests pass (unit, integration, E2E)
- [ ] Code review completed
- [ ] No regression in purchase flow

---

## Implementation Notes

### Undo Mechanism Decision
Original story deferred undo implementation detail to technical design. Options:

**Option 1: Client-side timer (RECOMMENDED)**
- Toast duration = undo window (5 seconds)
- No server-side time validation
- Simpler implementation
- Trade-off: User could manually call unpurchase endpoint after window closes (acceptable risk)

**Option 2: Server-side expiry**
- Backend checks `statusChangedAt` timestamp
- Reject unpurchase if >5 seconds elapsed
- More complex, requires accurate clocks
- Trade-off: Clock skew issues, more code complexity

Recommendation: Option 1 (client-side timer) for MVP. Add server-side validation later if needed.

### Service Layer Requirements
Per api-layer.md Ports & Adapters pattern:
- Route handler delegates to service layer
- Business logic lives in `application/services.ts`
- Service method signature: `revertPurchase(userId, itemId): Promise<UserSet>`

### Toast System Integration
- If SETS-MVP-0320 implemented first: Extend existing success toast with undo action
- If implementing simultaneously: Coordinate toast implementation

### Idempotency
Backend should be idempotent:
- Calling unpurchase on an item with status='wishlist' should succeed (no-op)
- This prevents errors if user clicks undo multiple times or if item was already reverted
