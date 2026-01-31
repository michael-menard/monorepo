---
doc_type: story
title: "SETS-MVP-004: Build Status Toggle"
story_id: SETS-MVP-004
story_prefix: SETS-MVP
status: draft
phase: 2
created_at: "2026-01-30T12:00:00-07:00"
updated_at: "2026-01-30T12:00:00-07:00"
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
