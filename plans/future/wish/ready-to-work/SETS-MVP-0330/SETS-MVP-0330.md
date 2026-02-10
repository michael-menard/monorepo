---
doc_type: story
title: "SETS-MVP-0330: Undo Support for Purchase Actions"
story_id: SETS-MVP-0330
story_prefix: SETS-MVP
status: ready-to-work
split_from: SETS-MVP-003
split_part: 3 of 4
phase: 2
created_at: "2026-01-31T15:30:00-07:00"
updated_at: "2026-02-09T21:45:00-07:00"
depends_on: [SETS-MVP-0310]
estimated_points: 1
experiment_variant: control
---

# SETS-MVP-0330: Undo Support for Purchase Actions

## Split Context

This story is part of a split from SETS-MVP-003.
- **Original Story:** SETS-MVP-003 (Extended Got It Flow)
- **Split Reason:** Story was too large (20 ACs across 4 independent feature areas) with critical architecture violations and blocking dependencies
- **This Part:** 3 of 4 (Undo support for purchase operations)
- **Dependency:** Depends on SETS-MVP-0310 (Status Update Flow - currently in UAT)

## Context

**Current State:**
Users who accidentally mark items as purchased or change their mind immediately after completing the purchase flow have no recovery mechanism. The current implementation (SETS-MVP-0310) provides a success toast notification but requires manual navigation to the collection view to revert the status change.

**Reference Pattern:**
The BuildStatusToggle component (SETS-MVP-004) demonstrates a working undo pattern using Sonner's action button feature with a 5-second window. This pattern has been validated in production and provides the foundation for this feature.

**Problem:**
Accidental purchase actions create friction and potential frustration. Users must manually:
1. Navigate to their collection view
2. Find the mistakenly marked item
3. Click to open details or edit modal
4. Change status back to 'wishlist'

This is especially problematic for mobile users who may misclick on small touch targets, and creates unnecessary cognitive load during what should be a smooth purchase experience.

## Goal

Allow users to quickly undo accidental purchase actions within a 5-second window, reverting the item status back to 'wishlist' and clearing all purchase-related fields, directly from the success toast notification.

## Non-goals

- Extended undo window beyond 5 seconds (future enhancement: 24-hour undo history)
- Undo history or undo stack (single-action undo only for MVP)
- Redo functionality
- Undo for other operations (delete, edit, build status changes)
- Server-side time window enforcement (client-side timer sufficient for MVP)
- Item re-ordering preservation after undo (acceptable UX trade-off for MVP)

## Scope

**Frontend Changes:**
- Extend GotItModal success toast to include "Undo" action button
- Add RTK Query mutation hook for unpurchase endpoint
- Implement button disable state after first click
- Provide success/error feedback for undo operation

**Backend Changes:**
- Create `PATCH /api/v2/wishlist/:id/unpurchase` endpoint
- Implement `revertPurchase(userId, itemId)` service method
- Ensure idempotent operation (safe to call on already-wishlist items)
- Validate ownership before allowing undo

**Database Changes:**
- No schema changes (uses existing fields)
- Atomic update to clear purchase fields and revert status

## Acceptance Criteria

### Frontend (Toast Integration)
- [ ] AC1: GotItModal success toast includes "Undo" action button
- [ ] AC2: Undo button is visible for 5-second toast duration
- [ ] AC3: Clicking "Undo" calls new unpurchase endpoint via RTK Query
- [ ] AC4: Success feedback shown after successful undo ("Purchase reverted")
- [ ] AC5: Error feedback shown if undo fails ("Undo failed, please try again")
- [ ] AC6: Undo button disabled after first click (prevent double-submit)
- [ ] AC7: Toast persists if user closes GotItModal during undo window

### Backend (Unpurchase Endpoint)
- [ ] AC8: `PATCH /api/v2/wishlist/:id/unpurchase` endpoint created
- [ ] AC9: Route delegates to `wishlistService.revertPurchase(userId, itemId)` service method
- [ ] AC10: Service method validates ownership (returns 403 if userId mismatch)
- [ ] AC11: Service method updates status to 'wishlist'
- [ ] AC12: Service method clears purchase fields (purchaseDate, purchasePrice, purchaseTax, purchaseShipping)
- [ ] AC13: Service method clears buildStatus (set to null)
- [ ] AC14: Service method sets statusChangedAt to current timestamp
- [ ] AC15: Returns updated WishlistItem with status='wishlist' and cleared fields
- [ ] AC16: Endpoint is idempotent (calling on wishlist item returns success with no-op)

### Testing
- [ ] AC17: Unit test for toast undo action integration in GotItModal
- [ ] AC18: Backend service test for revertPurchase() method (ownership, field clearing, idempotency)
- [ ] AC19: E2E test for happy path (purchase → undo within 5s → verify wishlist status)
- [ ] AC20: E2E test for timeout scenario (undo button disappears after 5s)
- [ ] AC21: E2E test for ownership validation (can't undo other user's purchase)
- [ ] AC22: E2E test for double-click prevention (button disables after first click)

## Reuse Plan

### Existing Components
- **GotItModal** (`/apps/web/app-wishlist-gallery/src/components/GotItModal/`)
  - Location: Line 178-182 shows current success toast implementation
  - Reuse: Extend existing toast.success() call with action property

- **BuildStatusToggle** (Reference Pattern)
  - Location: `/apps/web/app-wishlist-gallery/src/components/BuildStatusToggle/index.tsx` lines 114-123
  - Reuse: Copy toast action pattern implementation

### Shared Packages
- `@repo/app-component-library/notifications/sonner.tsx` - Toast system with action button support
- `@repo/api-client` - RTK Query mutation hook for unpurchase endpoint
- `@repo/api-core` - Result type (`ok`, `err`) for service layer error handling
- `@repo/logger` - Backend logging for undo operations

### Existing Patterns
- **Toast Action Pattern** (from BuildStatusToggle lines 114-123):
  ```typescript
  toast.success("Message", {
    description: itemTitle,
    duration: 5000,
    action: {
      label: "Undo",
      onClick: () => { /* call undo endpoint */ }
    }
  })
  ```
- **Service Layer Pattern** (from wishlistService.updateItemStatus):
  - Ownership validation via userId
  - Discriminated union Result types
  - Atomic database update

- **Auth Middleware** (existing ownership validation):
  - Reuse `c.get('userId')` pattern from routes.ts

### New Components
- RTK Query mutation: `useUnpurchaseItemMutation()`
- Service method: `wishlistService.revertPurchase(userId, itemId)`
- Route handler: `PATCH /:id/unpurchase` in wishlist routes

## Architecture Notes

### Component Structure

```
apps/web/app-wishlist-gallery/
  src/
    components/
      GotItModal/
        index.tsx                    # Extend success toast (line 178-182)
    hooks/
      # No new hooks needed - use existing RTK Query pattern
```

### API Endpoint (Ports & Adapters)

**Route Handler** (`apps/api/lego-api/domains/wishlist/routes.ts`):
```typescript
router.patch('/:id/unpurchase', async (c) => {
  const userId = c.get('userId')
  const itemId = c.req.param('id')

  const result = await wishlistService.revertPurchase(userId, itemId)

  if (result.error) {
    if (result.error.type === 'not_found' || result.error.type === 'forbidden') {
      return c.json({ error: result.error.message }, 404)
    }
    return c.json({ error: result.error.message }, 500)
  }

  return c.json(result.data)
})
```

**Service Layer** (`apps/api/lego-api/domains/wishlist/application/services.ts`):
```typescript
export async function revertPurchase(
  userId: string,
  itemId: string
): Promise<Result<WishlistItem, WishlistError>> {
  // 1. Validate ownership
  const item = await db.query.userSets.findFirst({
    where: eq(userSets.id, itemId)
  })

  if (!item) {
    return err({ type: 'not_found', message: 'Item not found' })
  }

  if (item.userId !== userId) {
    return err({ type: 'forbidden', message: 'Not authorized to modify this item' })
  }

  // 2. Idempotency check - already wishlist is success (no-op)
  if (item.status === 'wishlist') {
    return ok(item)
  }

  // 3. Revert to wishlist and clear purchase fields
  const updated = await db.update(userSets)
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
    .returning()

  return ok(updated[0])
}
```

### Frontend Integration

**RTK Query Mutation** (add to wishlist API slice):
```typescript
// In @repo/api-client or app-specific API slice
unpurchaseItem: builder.mutation<WishlistItem, string>({
  query: (itemId) => ({
    url: `/api/v2/wishlist/${itemId}/unpurchase`,
    method: 'PATCH',
  }),
  invalidatesTags: (result, error, itemId) => [
    { type: 'WishlistItem', id: itemId },
    { type: 'WishlistItem', id: 'LIST' },
  ],
}),
```

**GotItModal Integration** (update success toast at line 178-182):
```typescript
import { useUnpurchaseItemMutation } from '@repo/api-client'

function GotItModal({ itemId, itemTitle, onClose }) {
  const [unpurchaseItem] = useUnpurchaseItemMutation()
  const [undoClicked, setUndoClicked] = useState(false)

  const handlePurchaseSuccess = () => {
    toast.success("Added to your collection!", {
      description: itemTitle,
      duration: 5000,
      action: {
        label: "Undo",
        onClick: async () => {
          if (undoClicked) return // Prevent double-click
          setUndoClicked(true)

          try {
            await unpurchaseItem(itemId).unwrap()
            toast.success("Purchase reverted", {
              description: "Item returned to wishlist"
            })
          } catch (error) {
            toast.error("Undo failed, please try again")
          } finally {
            setUndoClicked(false)
          }
        }
      }
    })
  }
}
```

## Test Plan

### Unit Tests

**Frontend** (`GotItModal.test.tsx`):
```typescript
describe('GotItModal - Undo Support', () => {
  it('should show undo action in success toast', () => {
    // AC1: Toast includes "Undo" action button
  })

  it('should call unpurchase endpoint when undo clicked', () => {
    // AC3: Clicking "Undo" calls endpoint
  })

  it('should show success feedback after undo', () => {
    // AC4: Success feedback shown
  })

  it('should show error feedback on undo failure', () => {
    // AC5: Error feedback shown
  })

  it('should disable undo button after first click', () => {
    // AC6: Prevent double-submit
  })
})
```

**Backend Service Tests** (`wishlist.service.test.ts`):
```typescript
describe('wishlistService.revertPurchase', () => {
  it('should revert status to wishlist and clear purchase fields', async () => {
    // AC11-AC15: Status update, field clearing, timestamp
  })

  it('should validate ownership and reject unauthorized users', async () => {
    // AC10: Ownership validation returns 403
  })

  it('should be idempotent (no-op on already-wishlist item)', async () => {
    // AC16: Calling on wishlist item succeeds
  })

  it('should return updated item with cleared fields', async () => {
    // AC15: Returns WishlistItem with status='wishlist'
  })
})
```

### E2E Tests (Playwright)

**Scenario 1: Happy Path** (AC19):
```typescript
test('user can undo purchase within 5 seconds', async ({ page }) => {
  // 1. Navigate to wishlist item
  // 2. Click "Got It" button
  // 3. Fill in purchase details (optional)
  // 4. Submit purchase form
  // 5. Verify success toast appears with "Undo" button
  // 6. Click "Undo" within 5 seconds
  // 7. Verify "Purchase reverted" feedback
  // 8. Verify item status is back to 'wishlist' (check list view)
  // 9. Verify purchase fields are cleared (check item details)
})
```

**Scenario 2: Timeout** (AC20):
```typescript
test('undo button disappears after 5 seconds', async ({ page }) => {
  // 1. Complete purchase flow
  // 2. Verify success toast appears
  // 3. Wait 6 seconds
  // 4. Verify toast has auto-dismissed
  // 5. Verify no undo button available
})
```

**Scenario 3: Ownership Validation** (AC21):
```typescript
test('user cannot undo another user purchase', async ({ page }) => {
  // 1. User A purchases item (via API or UI)
  // 2. User B attempts to call unpurchase endpoint for User A's item
  // 3. Verify 403 Forbidden response
  // 4. Verify item remains in 'owned' status
})
```

**Scenario 4: Double-Click Prevention** (AC22):
```typescript
test('undo button disables after first click', async ({ page }) => {
  // 1. Complete purchase flow
  // 2. Rapidly click "Undo" button multiple times
  // 3. Verify only one unpurchase request is sent
  // 4. Verify button is disabled after first click
  // 5. Verify no error feedback from duplicate attempts
})
```

**Scenario 5: Toast Persistence** (AC7):
```typescript
test('toast persists when modal is closed', async ({ page }) => {
  // 1. Complete purchase flow
  // 2. Verify success toast appears
  // 3. Close GotItModal (click outside or close button)
  // 4. Verify toast remains visible (global toast system)
  // 5. Click "Undo" from persistent toast
  // 6. Verify undo succeeds
})
```

**Scenario 6: Race Conditions**:
```typescript
test('undo works if user navigates during toast window', async ({ page }) => {
  // 1. Complete purchase flow
  // 2. Immediately navigate to different page
  // 3. Verify toast persists across navigation (or document behavior)
  // 4. If toast persists, verify undo still works
  // Note: If toast doesn't persist, document as known limitation
})
```

### Integration Tests

**Cache Invalidation**:
```typescript
test('RTK Query invalidates correct cache tags after undo', () => {
  // Verify both item detail and list queries are invalidated
  // Ensure UI updates reflect wishlist status without manual refetch
})
```

**Optimistic Updates** (if applicable):
```typescript
test('optimistic updates revert correctly on undo', () => {
  // If purchase flow uses optimistic updates
  // Verify undo properly reverts optimistic state
  // Verify no UI flicker during revert
})
```

## Risks / Edge Cases

### Critical Risks

1. **Undo window timing precision**
   - **Risk:** Client-side timer may not be exactly 5 seconds
   - **Mitigation:** Use Sonner toast duration (5000ms) as the timer - already validated and consistent
   - **Decision:** Server does NOT enforce time window - if client sends undo request, honor it (acceptable security trade-off for MVP)

2. **Race condition: User closes modal/navigates away**
   - **Risk:** User may lose access to undo button if toast doesn't persist
   - **Mitigation Option 1:** Toast should persist across modal close (global toast system - verify Sonner behavior)
   - **Mitigation Option 2:** Document that undo is lost on navigation (acceptable UX trade-off)
   - **Testing:** E2E test to verify actual behavior and document

3. **Multiple undo clicks**
   - **Risk:** User rapidly clicks "Undo" multiple times, causing duplicate requests
   - **Frontend Mitigation:** Disable undo button after first click (AC6)
   - **Backend Mitigation:** Idempotent endpoint (calling unpurchase on wishlist item is safe no-op - AC16)

4. **RTK Query cache invalidation**
   - **Risk:** UI doesn't update after undo, showing stale 'owned' status
   - **Mitigation:** Invalidate both item detail and list cache tags
   - **Testing:** Integration test to verify cache invalidation behavior

### Medium-Priority Risks

5. **Item re-appears in wrong position**
   - **Risk:** After undo, item may appear at bottom of list instead of original position
   - **Current Approach:** Accept bottom-of-list behavior (simple, no sort order tracking needed)
   - **Future Enhancement:** Persist original sort order or use statusChangedAt for re-sort
   - **UX Impact:** Low - users understand the item moved back to wishlist

6. **Toast auto-dismiss race**
   - **Risk:** Toast dismisses before user can click undo
   - **Mitigation:** 5-second duration is standard Sonner default - already validated
   - **Testing:** Manual interaction testing on various devices (especially mobile)

7. **Optimistic updates interaction**
   - **Risk:** If purchase flow uses optimistic updates, undo may cause UI flicker
   - **Option 1:** Disable optimistic updates for purchase flow
   - **Option 2:** Handle undo in optimistic update system (more complex)
   - **Decision:** Verify current optimistic update behavior, choose simplest approach

### Edge Cases

8. **User expects longer undo window**
   - **UX Impact:** 5 seconds may feel short to some users
   - **Mitigation:** Clear messaging ("available for 5 seconds")
   - **Future Enhancement:** Extended undo history (24-hour window in collection view)
   - **Analytics:** Track how often undo is used to validate need for longer window

9. **Undo after toast disappears**
   - **User Expectation:** May expect undo button to still be available
   - **Current Behavior:** Undo lost after 5 seconds (design decision)
   - **Mitigation:** Future enhancement - undo history in collection view

10. **Server-side time validation (if added later)**
    - **Risk:** Clock skew between client and server could cause undo to fail
    - **Current Decision:** No server-side time validation for MVP
    - **Future:** If added, use generous buffer (e.g., 10 seconds server-side for 5-second client window)

### Low-Priority Risks

11. **Multiple simultaneous undos** (edge case)
    - **Scenario:** User has multiple browser tabs, purchases in tab A, undos in tab B
    - **Behavior:** First undo succeeds, second tab's undo is no-op (idempotent)
    - **Impact:** Minimal - acceptable behavior

12. **Undo chain** (explicitly non-goal)
    - **User Expectation:** May expect to undo the undo (redo)
    - **Current Scope:** Single-action undo only
    - **Future:** Could show "Redo" button in undo success toast

## Definition of Done

- [ ] "Undo" action added to GotItModal success toast
- [ ] Undo action visible for 5-second window (toast duration)
- [ ] `PATCH /api/v2/wishlist/:id/unpurchase` endpoint implemented
- [ ] Service layer method `revertPurchase(userId, itemId)` implemented
- [ ] Endpoint validates ownership and returns 403 for unauthorized users
- [ ] Endpoint reverts status to 'wishlist' and clears all purchase fields
- [ ] Endpoint is idempotent (safe to call on wishlist items)
- [ ] RTK Query mutation hook created and integrated
- [ ] Button disable state prevents double-submission
- [ ] Success and error feedback messages implemented
- [ ] All unit tests pass (frontend and backend)
- [ ] All integration tests pass (cache invalidation, service layer)
- [ ] All E2E tests pass (happy path, timeout, ownership, double-click, persistence)
- [ ] Code review completed
- [ ] No regression in purchase flow (SETS-MVP-0310)
- [ ] Manual testing on mobile devices (touch target validation)

---

## Implementation Notes

### Undo Mechanism Decision (Client-Side Timer)

**Selected Approach: Option 1 - Client-side timer**
- Toast duration = undo window (5 seconds)
- No server-side time validation
- Simpler implementation (fewer moving parts)
- Trade-off: User could manually call unpurchase endpoint after window closes via API (acceptable risk for MVP)

**Why not Option 2 (Server-side expiry)?**
- More complex implementation
- Requires accurate clocks (clock skew issues between client/server)
- Adds unnecessary code complexity for MVP
- Can be added later if security concern arises

**Justification:**
- BuildStatusToggle uses same pattern successfully
- Security risk is low (user can only undo their own items due to ownership validation)
- Worst case: User undos after 5 seconds via manual API call - still valid user action
- Simpler code = fewer bugs = faster delivery

### Service Layer Requirements

Per `api-layer.md` Ports & Adapters pattern:
- Route handler delegates to service layer (thin controller)
- Business logic lives in `application/services.ts`
- Service method signature: `revertPurchase(userId: string, itemId: string): Promise<Result<WishlistItem, WishlistError>>`
- Use discriminated union Result types from `@repo/api-core`

### Toast System Integration

**If SETS-MVP-0320 implemented first:**
- Extend existing success toast with undo action
- Ensure no conflicts in toast configuration

**If implementing simultaneously:**
- Coordinate with SETS-MVP-0320 implementer on toast structure
- Both features are additive (can coexist in same toast)

**If implementing standalone:**
- Add undo action to current basic success toast
- Verify Sonner action button styling

### Idempotency Design

**Backend idempotency guarantee:**
- Calling unpurchase on item with status='wishlist' returns success (no-op)
- No error thrown for "already wishlist" state
- This prevents errors from:
  - User clicking undo multiple times (double-click)
  - User clicking undo in multiple browser tabs
  - Race conditions between frontend state and backend state

**Implementation pattern:**
```typescript
// Check if already wishlist - early return with success
if (item.status === 'wishlist') {
  return ok(item) // No-op, but success response
}
```

### Database Transaction Considerations

**Current approach: Simple UPDATE (sufficient)**
- Single-table update is atomic by default in PostgreSQL
- No transaction wrapper needed for this operation
- Fields updated: status, purchaseDate, purchasePrice, purchaseTax, purchaseShipping, buildStatus, statusChangedAt

**When would transaction be needed?**
- Multi-table updates (not applicable here)
- Complex business logic with multiple operations
- Compensating actions in other systems

### RTK Query Cache Strategy

**Invalidation tags:**
- `{ type: 'WishlistItem', id: itemId }` - Specific item detail
- `{ type: 'WishlistItem', id: 'LIST' }` - List view (if item will re-appear)

**Alternative: Optimistic update**
- Could implement optimistic update for immediate UI feedback
- Trade-off: More complexity, potential for UI flicker on error
- Recommendation: Start with invalidation (simpler), add optimistic update if needed

### Reference Implementation (BuildStatusToggle)

Located at: `/apps/web/app-wishlist-gallery/src/components/BuildStatusToggle/index.tsx` lines 114-123

**Key patterns to copy:**
1. Toast action structure: `action: { label: "Undo", onClick: ... }`
2. Duration: 5000ms
3. No server-side time validation
4. Idempotent endpoint behavior

**Differences for this story:**
- BuildStatusToggle: Updates build status
- This story: Reverts purchase (status + clears multiple fields)
- Same pattern, different service method

---

## Reality Baseline

**Dependency Status:**
- SETS-MVP-0310 (Purchase Flow): In UAT - sufficient for implementation (can start backend work)
- SETS-MVP-0320 (Success Toast Navigation): Backlog - features are complementary (no conflict)

**Related Features:**
- GotItModal: Implemented in `/apps/web/app-wishlist-gallery/src/components/GotItModal/` (line 178-182 for toast)
- BuildStatusToggle: Reference pattern at `/apps/web/app-wishlist-gallery/src/components/BuildStatusToggle/` (lines 114-123)
- Sonner Toast: Implemented in `@repo/app-component-library/notifications/sonner.tsx` with action button support
- Purchase Endpoint: `/apps/api/lego-api/domains/wishlist/routes.ts` PATCH `/:id/purchase` (lines 520-552)

**Existing Patterns:**
- Service layer: `wishlistService.updateItemStatus()` provides ownership validation pattern
- RTK Query: Existing mutation hooks in API client provide integration pattern
- Auth middleware: `c.get('userId')` pattern for user context

**Constraints:**
- Must follow Ports & Adapters pattern (business logic in services.ts)
- Must use Zod schemas for types (no TypeScript interfaces)
- Must use @repo/logger (no console.log)
- Must use discriminated union Result types from @repo/api-core

**Protected Features (Non-Goals):**
- Extended undo window (24+ hours) - deferred to future
- Undo history/stack - single-action undo only
- Redo functionality - not in scope
- Server-side time window enforcement - client-side timer sufficient

**Test Coverage Requirements:**
- Minimum: 45% global coverage
- All new code must have tests
- E2E tests required for user-facing flows (purchase → undo)
- Backend service tests required for business logic

---

## Predictions (Advisory)

**Story Metrics:**
- Estimated Complexity: Low-Medium (undo mechanism, toast integration, new endpoint)
- Estimated Hours: 5-7 hours
  - Backend: 1-2 hours (simple service method + route)
  - Frontend: 1-2 hours (toast config + RTK mutation)
  - Testing: 2-3 hours (E2E timing scenarios require manual testing)

**Split Risk:** Low
- Story is well-scoped (single feature: undo purchase)
- Clear boundaries (toast action + backend endpoint)
- No complex dependencies beyond SETS-MVP-0310

**Review Cycles:** 1-2
- Straightforward implementation (reference pattern exists)
- Well-documented test scenarios
- Clear acceptance criteria

**QA Gate Pass Probability:** High (85%)
- Simple feature with proven pattern
- Comprehensive test coverage
- Dependency (SETS-MVP-0310) in UAT provides stable foundation

**Token Estimates:**
- Planning: ~2,000 tokens
- Implementation: ~8,000 tokens (backend + frontend + tests)
- Review: ~1,500 tokens
- Total: ~12,000 tokens

**Risk Factors:**
- Medium: E2E timing tests may require manual validation
- Low: Toast persistence behavior across navigation (may need documentation vs code fix)
- Low: Cache invalidation complexity (standard RTK Query pattern)

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-09_

### MVP Gaps Resolved

None - all critical user journey steps have acceptance criteria and test coverage.

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | Resolution |
|---|---------|----------|------------|
| 1 | Item re-ordering after undo | edge-case | KB-logged: Item may appear at bottom of list. Acceptable UX trade-off for MVP. |
| 2 | No visual countdown for 5-second window | ux-polish | KB-logged: Users rely on toast auto-dismiss. Consider progress bar if analytics show missed attempts. |
| 3 | Toast persistence across navigation | edge-case | KB-logged: E2E test AC7 assumes toast persists. Verify actual Sonner behavior; document if undo lost on navigation. |
| 4 | No undo notification after 5s window | ux-polish | KB-logged: After toast dismisses, user must manually revert. Consider collection view banner (24h window). |
| 5 | No server-side time validation | edge-case | KB-logged: Acceptable risk for MVP - User can only undo own items. Add server-side expiry if abuse detected. |
| 6 | Extended undo window (24+ hours) | future-work | KB-logged: High-impact future enhancement. Track undo usage analytics to validate need. |
| 7 | Redo functionality | enhancement | KB-logged: After undo, show 'Redo' action in undo success toast - completes undo/redo pattern. |
| 8 | Undo history/stack | future-work | KB-logged: Defer to v2 - Requires state management, UI for history list, complex undo chain logic. |
| 9 | Optimistic UI updates for undo | performance | KB-logged: Quick win - Immediately update UI while backend processes. Standard RTK Query pattern. |
| 10 | Analytics tracking: undo usage | observability | KB-logged: Quick win - Track: undo_clicked, undo_succeeded, undo_timeout events. |

### Summary

- **Verdict**: PASS
- **ACs added**: 0 (all 22 original ACs retained)
- **KB entries created**: 10 (non-blocking enhancements for future iterations)
- **Mode**: autonomous
- **Audit checks passed**: 8/8
- **MVP-critical gaps**: 0

**Story Status**: Ready for implementation with clear architecture, proven reference patterns, and comprehensive test scenarios.
