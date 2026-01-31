# Future UI/UX Enhancements: WISH-2005a

## UX Polish Opportunities

### 1. Animated Reorder Transitions

**Enhancement:** Add spring physics to item movements during reorder
- Use Framer Motion's `layout` prop for automatic FLIP animations
- Add subtle scale effect on drop (scale 1.02 → 1.0)
- Stagger animation for multiple items shifting

**Impact:** Delightful, polished feel - but not blocking MVP

### 2. Drag Preview with Item Metadata

**Enhancement:** Show richer preview during drag (not just ghost card)
- Include item image, title, and store badge
- Semi-transparent background with blur effect
- Larger size (1.1x scale) for better visibility

**Impact:** Improved visual feedback - nice-to-have

### 3. Drop Zone Visual Indicators

**Enhancement:** Show clear drop zones with animated borders
- Highlight valid drop positions with animated dashed border
- Invalid drop zones show red tint
- Snap-to-grid effect as item approaches drop zone

**Impact:** Clearer affordance - polish feature

### 4. Multi-Select Reordering

**Enhancement:** Select multiple items and reorder as a group
- Checkbox mode to select items
- Drag group of items together
- Show count badge on drag preview: "3 items"

**Impact:** Power user feature - defer to later phase

### 5. Reorder Undo with History Stack

**Enhancement:** Full undo/redo stack for multiple reorders
- Track last 10 reorder operations
- Undo button in toast (5-second window)
- Redo button in app header
- Keyboard shortcuts: Cmd+Z / Cmd+Shift+Z

**Impact:** Power user feature - covered in WISH-2005b

### 6. Haptic Feedback on Mobile

**Enhancement:** Vibration feedback on drag start/drop
- Short vibration (50ms) on drag start
- Double vibration (50ms + 50ms) on successful drop
- Error vibration pattern (200ms) on failed reorder

**Impact:** Mobile UX polish - low priority

### 7. Reorder Mode Toggle

**Enhancement:** Dedicated "reorder mode" for cross-page reordering
- Toggle button to enter reorder mode
- Fetch all items (with loading state)
- Virtualize list for performance
- Exit reorder mode to return to normal pagination

**Impact:** Solves pagination constraint - defer to future story

---

## Accessibility Enhancements

### 1. Advanced Screen Reader Support

**Enhancement:** Richer screen reader announcements
- Announce item details during drag: "LEGO Millennium Falcon, $179.99, priority high, grabbed"
- Announce relative position: "Moved 3 positions down, now 5 of 12"
- Announce drag completion: "Reorder saved successfully"

**Impact:** Better screen reader experience - polish feature

### 2. Visual Focus Indicators

**Enhancement:** High-contrast focus ring during keyboard navigation
- 3px solid focus ring (design token)
- Animated focus ring on drag activation
- Different color for "grabbed" vs "focused" state

**Impact:** Improved keyboard accessibility - nice-to-have

### 3. Reduced Motion Support

**Enhancement:** Respect `prefers-reduced-motion` for animations
- Disable spring animations
- Use instant position changes
- Simpler visual feedback (no scale/opacity effects)

**Impact:** Accessibility compliance - should be in MVP but can be added post-launch

### 4. High Contrast Mode

**Enhancement:** Support Windows High Contrast Mode
- Test with forced-colors media query
- Ensure drag handle is visible
- Test drop zone indicators

**Impact:** Accessibility compliance - lower priority

---

## UI Improvements

### 1. Drag Handle Design Variants

**Enhancement:** Offer multiple drag handle styles
- Horizontal grip (default)
- Vertical grip
- Icon-only (no visual handle)
- "Move" text label option

**Impact:** Customization - not needed for MVP

### 2. Reorder Confirmation Modal

**Enhancement:** Show confirmation for large reorders (10+ items moved)
- Modal: "Move 15 items? This will shift many items in your list."
- Confirm/Cancel buttons
- Checkbox: "Don't ask again"

**Impact:** Safety feature - edge case polish

### 3. Reorder Analytics

**Enhancement:** Track reorder metrics
- Number of reorders per user
- Average items moved per reorder
- Time to complete reorder
- Reorder failure rate

**Impact:** Product insights - non-user-facing

### 4. Reorder Tutorial/Onboarding

**Enhancement:** First-time user tutorial for drag-and-drop
- Tooltip on first visit: "Drag items to reorder your wishlist"
- Interactive demo with sample data
- "Got it" button to dismiss

**Impact:** Onboarding UX - nice-to-have

---

## Responsive Refinements

### 1. Tablet-Optimized Drag

**Enhancement:** Larger touch targets for tablets
- 56x56px drag handles (larger than mobile 44px)
- Wider drop zones
- Landscape mode optimizations

**Impact:** Tablet UX - low priority

### 2. Desktop Power Features

**Enhancement:** Desktop-specific enhancements
- Drag and drop with Alt key for copy (create duplicate at new position)
- Shift+drag to swap positions (no shifting)
- Ctrl+drag to move to top/bottom

**Impact:** Power user features - low priority

### 3. Mobile Gesture Refinements

**Enhancement:** Swipe gestures as alternative to drag
- Swipe right to move item up
- Swipe left to move item down
- Swipe to top/bottom actions

**Impact:** Alternative interaction - edge case

---

## Design System Extensions

### 1. `DraggableCard` Primitive

**Enhancement:** Create reusable draggable card component
- Location: `@repo/app-component-library/_primitives/DraggableCard`
- Props: `onDragEnd`, `isDragging`, `dragHandleProps`
- Used across wishlist, gallery, sets features

**Impact:** Reusability - wait for second use case before creating

### 2. `ReorderableList` HOC

**Enhancement:** Higher-order component for any list reordering
- Location: `@repo/app-component-library/lists/ReorderableList`
- Props: `items`, `onReorder`, `renderItem`
- Handles all dnd-kit setup internally

**Impact:** Reusability - premature abstraction

### 3. Drag Handle Icon Variants

**Enhancement:** Add drag handle icons to design tokens
- `icon-drag-horizontal` (6 dots, 2x3 grid)
- `icon-drag-vertical` (6 dots, 3x2 grid)
- `icon-drag-minimal` (2 lines)

**Impact:** Design consistency - low priority
