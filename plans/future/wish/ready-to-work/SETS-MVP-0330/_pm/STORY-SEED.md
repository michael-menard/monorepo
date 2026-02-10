---
generated: "2026-02-09"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: SETS-MVP-0330

## Reality Context

### Baseline Status
- Loaded: No (no active baseline found)
- Date: N/A
- Gaps: Working without baseline reality context - relying on codebase scanning and dependency story analysis

### Relevant Existing Features
| Feature | Status | Location | Relevance |
|---------|--------|----------|-----------|
| Purchase Flow (SETS-MVP-0310) | UAT | `/apps/web/app-wishlist-gallery/src/components/GotItModal/` | Core dependency - provides modal and PATCH endpoint |
| Build Status Toggle Undo | Implemented | `/apps/web/app-wishlist-gallery/src/components/BuildStatusToggle/` | Reference pattern for toast undo implementation |
| Toast System (Sonner) | Implemented | `@repo/app-component-library/notifications/sonner.tsx` | Toast infrastructure with action button support |
| Purchase Endpoint | Implemented | `/apps/api/lego-api/domains/wishlist/routes.ts` PATCH `/:id/purchase` | Endpoint to update item status to 'owned' |

### Active In-Progress Work
| Story | Status | Potential Overlap | Mitigation |
|-------|--------|-------------------|------------|
| SETS-MVP-0310 | UAT | Shares GotItModal component | Extends existing success toast - minimal conflict |
| SETS-MVP-0320 | Backlog | Both modify success toast behavior | SETS-MVP-0320 adds navigation link, SETS-MVP-0330 adds undo - complementary features |

### Constraints to Respect
1. **Dependency on SETS-MVP-0310**: Core purchase flow must be complete and in UAT before undo can be implemented
2. **Toast Duration Standard**: Default toast duration is 5000ms (5 seconds) - aligns with undo window requirement
3. **Service Layer Architecture**: Must follow Ports & Adapters pattern with business logic in `application/services.ts`
4. **Zod-First Types**: All type definitions must use Zod schemas with `z.infer<>`
5. **No Barrel Files**: Direct imports from source files required per project guidelines

---

## Retrieved Context

### Related Endpoints

**Existing:**
- `PATCH /api/v2/wishlist/:id/purchase` - Updates item status to 'owned' with purchase details (SETS-MVP-0310)
  - Route: `/apps/api/lego-api/domains/wishlist/routes.ts` (line 520-552)
  - Service: `wishlistService.updateItemStatus()` in `/apps/api/lego-api/domains/wishlist/application/services.ts` (line 393+)

**New (Required for Undo):**
- `PATCH /api/v2/wishlist/:id/unpurchase` - Reverts status back to 'wishlist' and clears purchase fields
  - Service method: `revertPurchase(userId, itemId)` (to be created)

### Related Components

**GotItModal** (`/apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx`)
- Current implementation shows success toast at line 178-182
- Uses `toast.success()` from Sonner with 5000ms duration
- Toast includes description with item title
- **Extension point**: Add `action` property to toast config for undo button

**BuildStatusToggle** (`/apps/web/app-wishlist-gallery/src/components/BuildStatusToggle/index.tsx`)
- **Reference implementation** for undo pattern (lines 114-123)
- Uses `action: { label: 'Undo', onClick: ... }` in toast config
- Demonstrates client-side timer (5000ms duration) without server-side validation
- Pattern to follow for undo implementation

### Reuse Candidates

**Toast System**
- `toast.success()` from Sonner supports `action` parameter with `{ label: string, onClick: () => void }`
- Default duration is 5000ms (configured in `@repo/app-component-library/notifications/sonner.tsx`)
- Action button styling handled via Sonner classNames configuration

**Auth Middleware**
- Existing ownership validation in routes (used by all endpoints)
- Reuse pattern: `c.get('userId')` for user context

**Service Layer Pattern**
- Follow `updateItemStatus()` as reference for `revertPurchase()` implementation
- Same ownership check → update → return pattern

**Zod Schemas**
- No new input schema needed (undo takes no body parameters)
- Response uses existing `WishlistItem` schema from `@repo/api-client/schemas/wishlist`

---

## Knowledge Context

### Lessons Learned

**No lessons loaded** - Knowledge base query not performed (baseline-less mode).

### Blockers to Avoid (from past stories)

Based on codebase patterns and dependency analysis:
- **Don't** add server-side time validation for undo window - adds complexity and clock skew issues
- **Don't** create separate undo state tracking - use existing item status field
- **Don't** build custom toast action system - Sonner already supports action buttons

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Frontend: `/api/v2/wishlist/:id/unpurchase`, Backend route: `/:id/unpurchase` |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks |

### Patterns to Follow

1. **Client-Side Timer Approach** (from BuildStatusToggle AC18-20)
   - Toast duration = undo window (5000ms)
   - No server-side time enforcement
   - Simpler implementation, acceptable security trade-off for MVP

2. **Idempotent Endpoint Design**
   - Calling unpurchase on already-wishlist item should succeed (no-op)
   - Prevents errors from double-clicks or race conditions

3. **Discriminated Union Result Types** (from service layer)
   - Return `Result<WishlistItem, WishlistError>` from service methods
   - Use `ok()` and `err()` from `@repo/api-core`

4. **Toast Action Pattern** (from BuildStatusToggle)
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

### Patterns to Avoid

1. **Don't** use separate undo history/stack - single-action undo only
2. **Don't** add server-side expiry validation - client-side timer sufficient for MVP
3. **Don't** make undo a GET request - use PATCH for state mutation
4. **Don't** create new modal for undo confirmation - use inline toast action

---

## Conflict Analysis

**No conflicts detected.**

This story:
- Extends existing GotItModal success toast (non-destructive addition)
- Adds new backend endpoint (no route conflicts)
- Depends on SETS-MVP-0310 which is in UAT (dependency satisfied)
- Complements SETS-MVP-0320 (if implemented together, features are additive)

---

## Story Seed

### Title
SETS-MVP-0330: Undo Support for Purchase Actions

### Description

**Context:**
Users may accidentally mark items as purchased or change their mind immediately after completing the purchase flow. The current implementation (SETS-MVP-0310) provides a success toast notification but no recovery mechanism within a short time window.

The BuildStatusToggle component (SETS-MVP-004) demonstrates a working undo pattern using Sonner's action button feature with a 5-second window, providing a proven reference implementation for this feature.

**Problem:**
Accidental purchase actions require users to manually navigate to their collection and update the item status back to 'wishlist', creating friction and potential frustration. This is especially problematic for mobile users who may misclick on small touch targets.

**Solution:**
Add an "Undo" action button to the existing success toast (from SETS-MVP-0310) that appears for 5 seconds. Clicking "Undo" triggers a new `PATCH /api/v2/wishlist/:id/unpurchase` endpoint that reverts the item's status back to 'wishlist' and clears all purchase-related fields (purchaseDate, purchasePrice, purchaseTax, purchaseShipping, buildStatus).

The implementation follows the proven pattern from BuildStatusToggle:
- Client-side timer managed by toast duration (5000ms)
- No server-side time window enforcement
- Idempotent endpoint design (safe to call multiple times)
- Inline action button in success toast (no additional modals)

### Initial Acceptance Criteria

**Frontend (Toast Integration)**
- [ ] AC1: GotItModal success toast includes "Undo" action button
- [ ] AC2: Undo button is visible for 5-second toast duration
- [ ] AC3: Clicking "Undo" calls new unpurchase endpoint
- [ ] AC4: Success feedback shown after successful undo ("Purchase reverted")
- [ ] AC5: Error feedback shown if undo fails ("Undo failed, please try again")
- [ ] AC6: Undo button disabled after first click (prevent double-submit)

**Backend (Unpurchase Endpoint)**
- [ ] AC7: `PATCH /api/v2/wishlist/:id/unpurchase` endpoint created
- [ ] AC8: Route delegates to `wishlistService.revertPurchase(userId, itemId)` service method
- [ ] AC9: Service method validates ownership (403 if userId mismatch)
- [ ] AC10: Service method updates status to 'wishlist'
- [ ] AC11: Service method clears purchase fields (purchaseDate, purchasePrice, purchaseTax, purchaseShipping)
- [ ] AC12: Service method clears buildStatus (set to null or default)
- [ ] AC13: Service method sets statusChangedAt to current timestamp
- [ ] AC14: Returns updated WishlistItem with status='wishlist'
- [ ] AC15: Endpoint is idempotent (calling on wishlist item is no-op success)

**Testing**
- [ ] AC16: Unit test for toast undo action integration
- [ ] AC17: Backend service test for revertPurchase() method
- [ ] AC18: E2E test for happy path (purchase → undo → verify wishlist)
- [ ] AC19: E2E test for timeout scenario (undo button disappears after 5s)
- [ ] AC20: E2E test for ownership validation (can't undo other user's purchase)

### Non-Goals

- Extended undo window beyond 5 seconds (future enhancement)
- Undo history or undo stack (single-action undo only)
- Redo functionality
- Undo for other operations (delete, edit, status changes besides purchase)
- Server-side time window enforcement (client-side timer sufficient for MVP)
- Item re-ordering after undo (item may move to bottom of list - acceptable for MVP)

### Reuse Plan

**Components:**
- GotItModal (`/apps/web/app-wishlist-gallery/src/components/GotItModal/`) - extend success toast
- BuildStatusToggle pattern for toast action implementation reference

**Packages:**
- `@repo/app-component-library` - Sonner toast with action button support
- `@repo/api-client` - RTK Query mutation for unpurchase endpoint
- `@repo/api-core` - Result type (`ok`, `err`) for service layer
- `@repo/logger` - Backend logging

**Patterns:**
- Ports & Adapters service layer pattern from existing wishlist service
- Client-side timer approach (5-second toast duration = undo window)
- Idempotent endpoint design
- Discriminated union Result types

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Critical Test Scenarios:**
1. **Race Condition Testing**: User closes modal/navigates away during undo window
   - Recommendation: Toast should persist across modal close (verify global toast system behavior)
   - Alternative: Document that undo is lost on navigation (acceptable UX trade-off)

2. **Double-Click Prevention**: User rapidly clicks "Undo" multiple times
   - Test button disable state after first click
   - Verify backend idempotency (calling unpurchase on wishlist item succeeds as no-op)

3. **Optimistic Update Handling**: If RTK Query uses optimistic updates for purchase flow
   - Test undo behavior with optimistic cache updates
   - Verify UI doesn't flicker during undo revert

4. **Toast Persistence**: Verify toast remains visible if user:
   - Closes GotItModal
   - Navigates to different page
   - Switches tabs

**Test Data Considerations:**
- Create test items with various purchase detail combinations (some with all fields, some minimal)
- Test with items at different positions in list (verify sort order after undo)
- Test with both valid and expired undo windows (manual timing tests)

### For UI/UX Advisor

**UX Considerations:**
1. **Undo Button Visibility**: 5-second window may feel short to users
   - Recommend: Clear visual countdown or progress indicator (future enhancement)
   - Current: Standard Sonner toast duration behavior (acceptable for MVP)

2. **Item Re-appearance Position**: After undo, item may be at bottom of list
   - Recommendation: Document behavior, consider sort-order preservation in future
   - Alternative: Accept bottom-of-list behavior for MVP simplicity

3. **Success Message Clarity**: "Purchase reverted" vs "Item returned to wishlist"
   - Recommend A/B testing for clearer messaging
   - Consider user mental model (undo = time travel vs explicit status change)

4. **Undo Chain**: What happens if user clicks "Undo" and then wants to undo the undo?
   - Current design: Not supported (single-action undo)
   - Future: Could show "Redo" button in undo success toast

5. **Mobile Touch Targets**: Ensure undo button has sufficient tap target size
   - Sonner default action button styling should be validated on mobile devices
   - Consider touch target size testing (minimum 44x44px)

### For Dev Feasibility

**Implementation Priorities:**
1. **Start with Backend**: Implement unpurchase endpoint first
   - Easier to test in isolation
   - Frontend can use temporary console.log until endpoint ready

2. **Service Layer First**: Implement `revertPurchase()` method
   - Reuse ownership validation pattern from `updateItemStatus()`
   - Test idempotency with unit tests before route integration

3. **Frontend Integration**: Extend GotItModal toast last
   - Reference BuildStatusToggle implementation (lines 114-123)
   - Use existing RTK Query pattern for mutation hook

**Technical Risks:**
1. **Toast Lifecycle**: Verify toast doesn't auto-dismiss before user can click undo
   - Mitigation: 5-second duration is standard Sonner default (already validated)
   - Test: Manual interaction testing needed

2. **State Synchronization**: RTK Query cache invalidation after undo
   - Need to invalidate both item detail and list queries
   - Consider optimistic update vs refetch strategy

3. **Database Transaction**: Ensure status revert is atomic
   - Current implementation uses simple UPDATE query (atomic by default)
   - No transaction needed for single-table update

**Dependencies:**
- SETS-MVP-0310 must be in production (currently in UAT - acceptable for implementation)
- BuildStatusToggle implementation provides reference pattern (already in main)
- No new package dependencies required

**Estimated Complexity:**
- **Backend**: Low (1-2 hours) - simple service method + route handler
- **Frontend**: Low (1-2 hours) - toast config change + RTK mutation hook
- **Testing**: Medium (2-3 hours) - E2E timing scenarios require manual testing
- **Total**: 5-7 hours (aligns with 1-point estimate in story file)
