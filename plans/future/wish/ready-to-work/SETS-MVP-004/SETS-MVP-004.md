---
doc_type: story
title: "SETS-MVP-004: Build Status Toggle"
story_id: SETS-MVP-004
story_prefix: SETS-MVP
status: ready-to-work
phase: 2
created_at: "2026-01-30T12:00:00-07:00"
updated_at: "2026-01-31T15:45:00-07:00"
depends_on: [SETS-MVP-002]
estimated_points: 2
---

# SETS-MVP-004: Build Status Toggle

## Goal

Allow users to toggle the build status of owned items between "In Pieces" and "Built" with optimistic updates and visual feedback.

## Context

Build status tracking is a core collection feature - users want to know which sets they've built vs. which are still in the box. This is a simple toggle with satisfying UX.

## Feature

Toggle component on collection cards and detail view that switches build status with optimistic UI updates, optional celebration animation, and undo support.

## Acceptance Criteria

### Toggle Component
- [ ] AC1: BuildStatusToggle component renders on collection cards
- [ ] AC2: Toggle shows current state: "In Pieces" or "Built"
- [ ] AC3: Toggle uses distinct visual states (icon + label)
- [ ] AC4: Built state: checkmark/complete icon, success color
- [ ] AC5: In Pieces state: box/package icon, neutral color

### Interaction
- [ ] AC6: Single click toggles state immediately (optimistic update)
- [ ] AC7: Keyboard accessible: Enter/Space triggers toggle
- [ ] AC8: Toggle has appropriate ARIA attributes (role="switch", aria-checked)

### API Integration
- [ ] AC9: `PATCH /api/wishlist/:id` accepts `{ buildStatus: 'built' | 'in_pieces' }`
- [ ] AC10: API validates item is `status = 'owned'` before allowing update
- [ ] AC11: Returns 400 if trying to set build status on wishlist item

### Optimistic Updates
- [ ] AC12: UI updates immediately on click (before API response)
- [ ] AC13: On API error, reverts to previous state
- [ ] AC14: Shows error toast on revert: "Couldn't update build status"

### Celebration (Nice-to-have for MVP)
- [ ] AC15: When toggling to "Built", show brief celebration animation
- [ ] AC16: Animation is subtle (confetti burst or checkmark animation)
- [ ] AC17: Animation respects `prefers-reduced-motion`

### Undo Support
- [ ] AC18: Toast appears after toggle: "Marked as Built" / "Marked as In Pieces"
- [ ] AC19: Toast includes "Undo" action
- [ ] AC20: Undo reverts to previous state via same PATCH endpoint

### Backend Service Layer (NEW)
- [ ] AC21: Create `updateBuildStatus(itemId: string, buildStatus: BuildStatus, userId: string)` method in `apps/api/lego-api/domains/wishlist/application/services.ts`
- [ ] AC22: Service method validates that item exists, is owned by user, and has status='owned' before allowing buildStatus update

### Routes & Adapters (NEW)
- [ ] AC23: Add PATCH route handler in `apps/api/lego-api/domains/wishlist/routes.ts` for `/:id` endpoint
- [ ] AC24: Route handler acts as thin adapter: validates request body, calls service.updateBuildStatus, and returns result or error (no business logic in route)

### Error Handling Specification (NEW)
- [ ] AC25: Return error response format: `{ error: 'INVALID_STATUS', message: 'Build status can only be set on owned items' }` with 400 status when buildStatus update attempted on non-owned or wishlist items

### Input Validation & Schema (NEW)
- [ ] AC26: Update `UpdateWishlistItemInputSchema` in types.ts to include optional `buildStatus` field with enum: `'in_pieces' | 'built'`

### Backend Testing (NEW)
- [ ] AC27: Create `.http` test file in `apps/api/lego-api/domains/wishlist/adapters/__tests__/` with scenarios: toggle owned item to 'built', toggle owned item to 'in_pieces', attempt toggle on wishlist item (expect 400 error)

### Optimistic Update Implementation (NEW)
- [ ] AC28: Implement optimistic update using existing React Query `useMutation` pattern with `onMutate` for immediate UI update, `onError` for revert

### Animation & Motion Preferences (NEW)
- [ ] AC29: Celebration animation respects `prefers-reduced-motion` media query: disable animation when user preference is set

### Toast & Feedback Timing (NEW)
- [ ] AC30: Toast duration for success state: 5000ms; error state: 7000ms (allows time to read and click Undo)

### Network & Error Recovery (NEW)
- [ ] AC31: On API error, revert optimistic update immediately; do NOT auto-retry (user can manually retry via UI)

### Concurrent Toggle Prevention (NEW)
- [ ] AC32: Disable toggle button during API request to prevent concurrent updates; re-enable on success or error

## Technical Details

### Component Structure

```
apps/web/app-wishlist-gallery/
  src/
    components/
      BuildStatusToggle/
        index.tsx
        __tests__/
          BuildStatusToggle.test.tsx
      CollectionCard/
        index.tsx              # Includes BuildStatusToggle
```

### Component API

```typescript
interface BuildStatusToggleProps {
  itemId: string
  currentStatus: 'in_pieces' | 'built'
  onToggle?: (newStatus: BuildStatus) => void
  disabled?: boolean
}
```

### Optimistic Update Pattern

```typescript
const handleToggle = async () => {
  const newStatus = currentStatus === 'built' ? 'in_pieces' : 'built'

  // Optimistic update
  setLocalStatus(newStatus)

  try {
    await updateBuildStatus({ id: itemId, buildStatus: newStatus })
    showToast({
      message: newStatus === 'built' ? 'Marked as Built' : 'Marked as In Pieces',
      action: { label: 'Undo', onClick: handleUndo }
    })
  } catch (error) {
    // Revert on failure
    setLocalStatus(currentStatus)
    showToast({ message: "Couldn't update build status", variant: 'error' })
  }
}
```

### Animation (Optional)

```typescript
// Uses Framer Motion for celebration
<AnimatePresence>
  {showCelebration && (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0, opacity: 0 }}
    >
      <ConfettiBurst />
    </motion.div>
  )}
</AnimatePresence>
```

## Risk Notes

- Low complexity: simple toggle with standard patterns
- Celebration animation is nice-to-have, can be deferred

## Dependencies

- SETS-MVP-002: Collection View (toggle appears on collection cards)

## Out of Scope

- Batch update (mark multiple as built)
- Build date tracking
- Build photos/notes

## Definition of Done

- [ ] Toggle component works on collection cards
- [ ] Optimistic updates with error handling
- [ ] Keyboard and screen reader accessible
- [ ] All tests pass
- [ ] Code review completed

## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on 2026-01-31_

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Missing service layer specification | Add as AC | Service method required in `applications/services.ts` to validate ownership and status before allowing buildStatus update (AC21-22) |
| 2 | Missing routes.ts specification | Add as AC | Thin adapter pattern required in routes.ts with proper separation of concerns (AC23-24) |
| 3 | Incomplete error handling specification | Add as AC | Error response format must include error code and message for proper client handling (AC25) |
| 4 | Missing Zod schema update | Add as AC | UpdateWishlistItemInputSchema must be extended to include buildStatus field with proper validation (AC26) |
| 5 | Missing backend tests | Add as AC | .http test file required with core scenarios: success toggle, error cases, validation (AC27) |
| 6 | Optimistic update implementation detail | Add as AC | Pattern specification added to clarify React Query useMutation approach with onMutate and onError callbacks (AC28) |
| 7 | Animation motion preferences handling | Add as AC | Explicit prefers-reduced-motion support required for celebration animation (AC29) |
| 8 | Toast duration specification | Add as AC | Success toast 5000ms, error toast 7000ms to support undo action visibility (AC30) |
| 9 | Network retry strategy | Add as AC | No auto-retry on API error; user performs manual retry; immediate optimistic revert on failure (AC31) |
| 10 | Concurrent toggle prevention | Add as AC | Button must be disabled during API request to prevent race conditions (AC32) |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Keyboard focus management on toggle | Skip | Can be addressed in future accessibility pass; toggle inherits focus handling from parent component |

### Follow-up Stories Suggested

- [x] SETS-MVP-005: Batch build status updates (mark multiple items as built in one action) → SETS-MVP-0350
- [x] SETS-MVP-006: Build history and date tracking (when was item marked built) → SETS-MVP-0360
- [x] SETS-MVP-007: Build status analytics (collection completion percentage) → SETS-MVP-0370

### Items Marked Out-of-Scope

- Batch update (mark multiple as built)
- Build date tracking
- Build photos/notes

---

**Total ACs Updated**: 20 → 32 (12 new ACs added to address architecture gaps)
