# WISH-2005d: Haptic feedback on mobile drag

**Status:** backlog
**Depends On:** WISH-2005a
**Follow-up From:** WISH-2005a QA Elaboration
**Phase:** 4 - UX Polish
**Complexity:** Small
**Effort:** 1-2 points
**Priority:** Medium (mobile UX polish)

## Summary

Mobile vibration feedback during drag-and-drop operations using the Vibration API to provide tactile confirmation on drag start, during drag, and on drop for iOS and Android users.

## User Story

As a mobile user reordering my wishlist items via drag-and-drop, I want to feel haptic feedback when I start dragging, during the drag operation, and when I drop the item so that I have tactile confirmation of my actions.

## Scope

- Vibration feedback on drag start (short pulse)
- Optional subtle vibration during drag (when crossing item boundaries)
- Vibration feedback on drop (success pattern)
- Vibration feedback on cancel (different pattern)
- Feature detection and graceful fallback for unsupported devices

## Acceptance Criteria

### Core Haptic Feedback (4 ACs)

1. **AC-1: Vibration on drag start**
   - When user begins dragging a WishlistCard on mobile, trigger a short vibration pulse (50ms)
   - Vibration provides immediate tactile confirmation that drag has initiated
   - Uses `navigator.vibrate(50)` or equivalent

2. **AC-2: Vibration on successful drop**
   - When user drops the item in a valid position, trigger a success vibration pattern
   - Pattern: two short pulses (30ms vibrate, 50ms pause, 30ms vibrate)
   - Uses `navigator.vibrate([30, 50, 30])`

3. **AC-3: Vibration on drag cancel**
   - When user cancels the drag (Escape key, drop outside valid area), trigger a distinct pattern
   - Pattern: single longer pulse (100ms)
   - Uses `navigator.vibrate(100)`

4. **AC-4: Vibration on item boundary crossing**
   - When dragged item crosses over another item boundary, trigger subtle pulse (20ms)
   - Helps user feel position changes during reordering
   - Rate-limited to max once per 150ms to prevent excessive vibration

### Feature Detection & Fallback (2 ACs)

5. **AC-5: Vibration API feature detection**
   - Check for `navigator.vibrate` support before attempting to use
   - If not supported, haptic features are silently disabled (no errors)
   - Feature detection runs once on component mount

6. **AC-6: User preference respect**
   - If device is in silent/vibrate-off mode, haptic feedback is automatically suppressed by the API
   - No additional handling required (API handles this gracefully)

### Accessibility & Performance (2 ACs)

7. **AC-7: No interference with drag operation**
   - Haptic feedback must not block or delay the drag operation
   - Vibration calls are fire-and-forget (non-blocking)

8. **AC-8: Reduced motion preference**
   - If `prefers-reduced-motion` is enabled, disable boundary-crossing vibrations (AC-4)
   - Keep start/drop/cancel vibrations as they serve as accessibility aids

## Technical Notes

### Vibration API Usage

```typescript
// Utility hook: useHapticFeedback
export function useHapticFeedback() {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  const vibrate = useCallback((pattern: number | number[]) => {
    if (isSupported) {
      navigator.vibrate(pattern)
    }
  }, [isSupported])

  return {
    onDragStart: () => vibrate(50),
    onDrop: () => vibrate([30, 50, 30]),
    onCancel: () => vibrate(100),
    onBoundaryCross: () => !prefersReducedMotion && vibrate(20),
    isSupported,
  }
}
```

### File Location

New hook: `apps/web/app-wishlist-gallery/src/hooks/useHapticFeedback.ts`

### Integration Points

- Integrates with WISH-2005a drag-and-drop implementation
- Called from DnDContext event handlers (onDragStart, onDragEnd, onDragOver)
- Uses same event callbacks already established in drag-and-drop flow

### Browser Support

| Platform | Support |
|----------|---------|
| Android Chrome | Full support |
| Android Firefox | Full support |
| iOS Safari | Partial (some versions) |
| Desktop browsers | Generally not supported (ignored gracefully) |

## Out of Scope

- Drag preview thumbnail (covered by WISH-2005c)
- Drop zone indicators (covered by WISH-2005e)
- Spring physics animations (covered by WISH-2005f)
- Custom vibration patterns configurable by user
- Haptic intensity settings

## Dependencies

- WISH-2005a: Core drag-and-drop must be implemented first (provides DnDContext, event handlers)

## Test Plan

### Unit Tests

1. useHapticFeedback hook returns correct functions
2. Feature detection correctly identifies supported/unsupported browsers
3. Vibration patterns match specification (50ms, [30,50,30], 100ms, 20ms)
4. Reduced motion preference disables boundary-crossing vibrations
5. Hook does not throw on unsupported browsers

### Integration Tests

1. Drag start triggers vibration on supported mobile devices
2. Drop triggers success vibration pattern
3. Cancel triggers cancel vibration pattern
4. Boundary crossing triggers subtle vibration (with rate limiting)
5. Desktop browsers do not throw errors (graceful fallback)

### Manual Testing

1. Test on Android device (Chrome) - verify all vibration patterns
2. Test on iOS device (Safari) - verify graceful degradation if unsupported
3. Test with device in silent mode - verify no errors
4. Test with prefers-reduced-motion enabled - verify boundary vibrations disabled

## Source

Follow-up from QA Elaboration of WISH-2005a (Enhancement Opportunity #2)

**Original Finding:** Use Vibration API for tactile feedback on drag start/drop for mobile users.

**Impact:** Medium (improves mobile UX)
**Effort:** Small (1-2 points)
