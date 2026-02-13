# Future UI/UX Enhancements: REPA-009

## UX Polish Opportunities

### Checkbox Animation

**Enhancement**: Add subtle check icon animation when selecting cards.

**Implementation**:
- Use Framer Motion for check icon entrance
- Variants: scale from 0.8 to 1.0, fade in
- Duration: 150ms with spring transition

**Value**: Provides visual feedback for selection action, feels more polished.

### Drag Handle Icon Swap

**Enhancement**: Change drag handle icon from GripVertical to GripHorizontal based on drag direction.

**Implementation**:
- Detect drag direction in SortableGallery
- Pass dragDirection prop to GalleryCard
- Render GripHorizontal for horizontal drags, GripVertical for vertical

**Value**: Better affordance for drag direction.

### Hover Overlay Content Transition

**Enhancement**: Stagger reveal of hover overlay content (title, badges, tags).

**Implementation**:
- Use Framer Motion stagger children
- Title appears first, then badges/tags with 50ms delay
- Fade + slide-up animation

**Value**: More dynamic hover interaction, draws attention to content hierarchy.

### Multi-Select Keyboard Shortcuts

**Enhancement**: Add keyboard shortcuts for select all, deselect all, invert selection.

**Implementation**:
- Ctrl+A / Cmd+A: Select all cards
- Ctrl+D / Cmd+D: Deselect all cards
- Ctrl+I / Cmd+I: Invert selection

**Value**: Power user efficiency for bulk operations.

### Drag Preview Customization

**Enhancement**: Allow custom drag preview (e.g., show count badge when dragging multiple selected cards).

**Implementation**:
- Add dragPreview render prop to GalleryCard
- Render custom preview in DragOverlay from dnd-kit
- Show count badge like "3 items" when dragging multiple

**Value**: Better feedback for multi-select + drag workflows.

### Hover Overlay Delay

**Enhancement**: Add configurable delay before showing hover overlay (prevent accidental reveals).

**Implementation**:
- Add hoverDelay prop (default: 0ms, optional: 200ms)
- Use setTimeout to delay opacity transition
- Clear timeout on mouse leave

**Value**: Reduces visual noise when quickly scanning gallery.

---

## Accessibility Enhancements

### High Contrast Mode Support

**Enhancement**: Ensure selection checkbox and drag handle visible in Windows High Contrast Mode.

**Implementation**:
- Add forced-colors:border-solid to checkbox border
- Add forced-colors:bg-ButtonFace to drag handle background
- Test in Windows HCM

**Value**: Compliance with WCAG AAA, better usability for low vision users.

### Screen Reader Announcements for Selection

**Enhancement**: Use live region to announce selection count changes.

**Implementation**:
- Add aria-live="polite" region to gallery container
- Update text: "{count} items selected" on selection change
- Use useAnnouncer from @repo/accessibility

**Value**: Better screen reader UX for multi-select workflows.

### Focus Trap in Selection Mode

**Enhancement**: When selection mode active, trap focus within gallery (prevent tabbing outside).

**Implementation**:
- Use focus-trap-react or custom focus management
- Tab from last card returns to first card
- Escape key exits selection mode

**Value**: Better keyboard navigation for selection workflows.

### Drag Handle Keyboard Instructions

**Enhancement**: Provide keyboard instructions for reordering when drag handle focused.

**Implementation**:
- Add aria-describedby on drag handle
- Reference instructions element: "Press space to pick up, arrow keys to move, space to drop"
- Instructions hidden visually, read by screen readers

**Value**: Clear guidance for keyboard-only drag-and-drop.

### Reduced Motion Support

**Enhancement**: Respect prefers-reduced-motion for all transitions.

**Implementation**:
- Use motion-safe: prefix for opacity/transform transitions
- Instant transitions when prefers-reduced-motion: reduce
- Test with system accessibility settings

**Value**: Compliance with WCAG 2.3.3, better UX for vestibular disorders.

---

## UI Improvements

### Checkbox Shape Variants

**Enhancement**: Allow square or circular checkbox shapes.

**Implementation**:
- Add checkboxShape prop: 'circle' | 'square'
- Apply rounded-full for circle, rounded-md for square

**Value**: Design flexibility for different gallery aesthetics.

### Drag Handle Size Variants

**Enhancement**: Allow small, medium, large drag handle sizes.

**Implementation**:
- Add dragHandleSize prop: 'sm' | 'md' | 'lg'
- Map to h-8 w-8, h-11 w-11, h-14 w-14

**Value**: Design flexibility for different card sizes.

### Hover Overlay Gradient Customization

**Enhancement**: Allow custom gradient directions and colors.

**Implementation**:
- Add hoverOverlayGradient prop: 'top' | 'bottom' | 'left' | 'right' | 'radial'
- Support custom gradient classes

**Value**: Design flexibility for different content layouts.

### Selection Indicator Animation

**Enhancement**: Pulse animation on checkbox when selection mode activated.

**Implementation**:
- Add animate-pulse class when selectionMode changes from false to true
- Remove after 1 second

**Value**: Draws attention to selection affordance when mode activated.

### Drag Handle Badge

**Enhancement**: Show badge on drag handle indicating card position in list.

**Implementation**:
- Add showDragPosition prop
- Render position number (e.g., "3") in small badge on drag handle

**Value**: Useful for ordered lists (e.g., ranked wishlists).

---

## Design System Extensions

### GalleryCard Variants

**Enhancement**: Add preset variants for common gallery types.

**Implementation**:
- variant="grid" | "list" | "masonry" | "compact"
- Each variant applies preset sizes, spacing, aspect ratios

**Value**: Faster gallery development with preset styles.

### Theme-Specific Selection Colors

**Enhancement**: Allow theme-specific checkbox colors (not just primary).

**Implementation**:
- Add selectionColor prop: 'primary' | 'secondary' | 'accent'
- Map to respective token colors

**Value**: Better integration with app-specific themes.

### Dark Mode Optimization

**Enhancement**: Ensure hover overlay gradients work well in dark mode.

**Implementation**:
- Adjust gradient opacity in dark mode: from-black/40 instead of from-black/60
- Test contrast in both light and dark themes

**Value**: Better visual hierarchy in dark mode.

---

## Responsive Refinements

### Tablet-Specific Behavior

**Enhancement**: Add tablet breakpoint (768px-1024px) for hover overlay behavior.

**Implementation**:
- Use lg: breakpoint for desktop-only hover
- Tablet: Tap to reveal hover overlay (toggle)

**Value**: Better UX for iPad and tablet users (no hover, but not mobile).

### Card Size Adaptation

**Enhancement**: Scale checkbox and drag handle sizes based on card size.

**Implementation**:
- Detect card container size (ResizeObserver)
- Scale overlays proportionally (e.g., smaller checkbox on small cards)

**Value**: Better visual balance on responsive grids.

### Grid Gap Compensation

**Enhancement**: Adjust overlay positions based on grid gap.

**Implementation**:
- Read grid gap from parent container
- Adjust top-2 left-2 positions proportionally

**Value**: Consistent visual spacing in different grid layouts.

---

## Performance Optimizations

### Virtual Scrolling Support

**Enhancement**: Ensure GalleryCard works efficiently in virtual scroll containers.

**Implementation**:
- Use React.memo on GalleryCard
- Optimize re-renders (only re-render when props change)
- Test with react-window or react-virtual

**Value**: Better performance for large galleries (1000+ cards).

### Lazy Load Hover Overlay

**Enhancement**: Defer hover overlay rendering until first hover.

**Implementation**:
- Add showOverlay state, set to true on first mouseenter
- Avoid rendering hover overlay DOM until needed

**Value**: Faster initial render for galleries with many cards.

---

## Testing Enhancements

### Storybook Interaction Tests

**Enhancement**: Add Storybook interaction tests for all card states.

**Implementation**:
- Use @storybook/test-runner
- Test selection toggle, drag handle focus, hover overlay reveal
- Run in CI

**Value**: Catch UI regressions before merge.

### Visual Regression Baseline

**Enhancement**: Establish Chromatic/Percy baselines for all card variants.

**Implementation**:
- Create Storybook stories for all prop combinations
- Take baseline screenshots
- Run visual diff on every PR

**Value**: Automated visual regression detection.

---

## Future Work Candidates

**Not MVP, tracked for later**:

1. Multi-select + drag workflow (drag multiple selected cards as group)
2. Checkbox position animation when switching from top-left to top-right
3. Drag handle icon rotation during drag
4. Hover overlay blur backdrop (backdrop-blur-md)
5. Selection sound effect (opt-in for audio feedback)
6. Haptic feedback on mobile (Vibration API)
7. Keyboard shortcuts overlay (show available shortcuts on Cmd+K)
8. Undo/redo for selection state (tracked in SortableGallery)
