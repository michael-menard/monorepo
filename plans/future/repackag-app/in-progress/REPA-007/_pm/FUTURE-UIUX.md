# Future UI/UX Enhancements: REPA-007

**Story**: Add SortableGallery Component to @repo/gallery

**Status**: Post-MVP enhancements, not blocking initial implementation

---

## UX Polish Opportunities

### 1. Configurable Toast Position
**Current**: Bottom-right (hardcoded via sonner defaults)

**Enhancement**: Add `toastPosition` prop
```tsx
type ToastPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

<SortableGallery
  toastPosition="top-right"
  {...props}
/>
```

**Value**: Allows apps to match their existing toast patterns (e.g., dashboard may use top-right)

**Effort**: Low (sonner supports position prop)

---

### 2. Custom Toast Components
**Current**: Default sonner toast with hardcoded text

**Enhancement**: Allow custom toast render functions
```tsx
<SortableGallery
  renderSuccessToast={(undoCallback) => (
    <CustomToast
      message="Gallery reordered!"
      action={<Button onClick={undoCallback}>Undo</Button>}
    />
  )}
  renderErrorToast={(retryCallback, error) => (
    <CustomErrorToast error={error} onRetry={retryCallback} />
  )}
/>
```

**Value**: Branded toast UI, custom error messaging, analytics tracking

**Effort**: Medium (requires refactoring toast logic)

---

### 3. Drag Handle Flexibility
**Current**: Full-card drag (entire card is draggable)

**Enhancement**: Support dedicated drag handles
```tsx
<SortableGallery
  renderItem={(item) => (
    <Card>
      <DragHandle /> {/* Only this area triggers drag */}
      <CardContent>{item.name}</CardContent>
    </Card>
  )}
/>
```

**Implementation**: Caller uses `useSortable` hook from @dnd-kit/sortable to apply listeners to specific element

**Value**: Prevents accidental drags when clicking buttons/links in cards

**Effort**: Low (document pattern in Storybook, no API changes needed)

---

### 4. Multi-Select Drag
**Current**: Single-item drag only

**Enhancement**: Drag multiple selected items at once
```tsx
<SortableGallery
  selectedIds={['item-1', 'item-3', 'item-5']}
  onReorder={(items) => { /* All selected items move together */ }}
/>
```

**Value**: Power user workflow (reorder multiple items in one action)

**Effort**: High (requires complex state management, drag preview for multiple items)

**Note**: Out of scope per seed non-goals, but valuable for future

---

### 5. Drag Between Galleries
**Current**: Single gallery reordering only

**Enhancement**: Drag items from one gallery to another
```tsx
<DndContext>
  <SortableGallery id="gallery-1" items={items1} />
  <SortableGallery id="gallery-2" items={items2} />
</DndContext>
```

**Value**: Organize items across categories (e.g., wishlist → album)

**Effort**: High (requires shared DndContext, inter-gallery communication)

**Note**: Out of scope per seed non-goals

---

### 6. Undo History Stack
**Current**: Single-level undo (last action only)

**Enhancement**: Multi-level undo/redo
```tsx
<SortableGallery
  undoHistorySize={10} // Remember last 10 actions
  onUndoStackChange={(stack) => console.log(stack.length)}
/>
```

**Value**: Undo multiple consecutive reorders

**Effort**: High (requires history state management, UI for undo stack)

---

### 7. Smooth Scroll to Dropped Item
**Current**: Item drops in place, no scroll adjustment

**Enhancement**: Auto-scroll viewport to show dropped item
```tsx
<SortableGallery
  scrollToDroppedItem={true}
  scrollBehavior="smooth"
/>
```

**Value**: Better UX when dropping items far from viewport

**Effort**: Low (use `scrollIntoView` after drop)

---

### 8. Drag Preview Variants
**Current**: Single drag overlay (customizable via renderDragOverlay)

**Enhancement**: Built-in preview variants
```tsx
<SortableGallery
  dragPreviewVariant="ghost" // ghost, solid, multi-item
  dragPreviewOpacity={0.7}
/>
```

**Value**: Common drag preview patterns without custom implementation

**Effort**: Medium (create built-in preview components)

---

### 9. Drop Zone Indicators
**Current**: Items shift to show drop position

**Enhancement**: Visual drop zone lines/boxes
```tsx
<SortableGallery
  showDropIndicator={true}
  dropIndicatorColor="border-teal-500"
/>
```

**Value**: Clearer visual feedback for drop target

**Effort**: Low (add drop indicator styles via dnd-kit APIs)

---

### 10. Haptic Feedback (Mobile)
**Current**: No haptic feedback

**Enhancement**: Vibration on touch drag start/end
```tsx
<SortableGallery
  enableHapticFeedback={true} // Vibrate on drag start/drop
/>
```

**Value**: Tactile feedback for mobile users

**Effort**: Low (use Vibration API on touch events)

---

## Accessibility Enhancements

### 1. Keyboard Drag-and-Drop (ARIA Authoring Practices)
**Current**: Arrow keys navigate, mouse/touch drag only

**Enhancement**: Space/Enter to "grab" item, arrows to move, Space/Enter to "drop"
```
Flow:
1. Focus item with Tab or arrows
2. Press Space to enter "drag mode"
3. Press arrows to move item up/down/left/right
4. Press Space to drop
5. Press Escape to cancel drag
```

**Value**: Full keyboard equivalence for drag-and-drop (WCAG 2.1 Level AA)

**Effort**: High (requires custom keyboard drag state machine)

**Reference**: ARIA Authoring Practices Guide - Sortable Listbox

---

### 2. Screen Reader Drag Mode Announcements
**Current**: Announces final result ("Item moved from X to Y")

**Enhancement**: Announce intermediate state during keyboard drag
```
"Drag mode activated. Item 3. Use arrow keys to move. Current position: 3 of 10."
"Moved to position 4 of 10."
"Moved to position 5 of 10."
"Drag mode deactivated. Item dropped at position 5 of 10."
```

**Value**: Better spatial awareness for screen reader users

**Effort**: Medium (extend useAnnouncer with drag mode state)

---

### 3. Reduced Motion Support
**Current**: Framer Motion animations always active

**Enhancement**: Respect `prefers-reduced-motion` media query
```tsx
<SortableGallery
  respectReducedMotion={true} // Disable animations if user preference set
/>
```

**Implementation**: Use `window.matchMedia('(prefers-reduced-motion: reduce)')`

**Value**: WCAG 2.1 Success Criterion 2.3.3 (AAA)

**Effort**: Low (conditional Framer Motion props)

---

### 4. Focus Visible Styling
**Current**: Default focus ring (ring-sky-500)

**Enhancement**: High-contrast focus indicator
```tsx
<SortableGallery
  focusRingWidth={3} // Thicker ring for low vision users
  focusRingColor="ring-black dark:ring-white"
/>
```

**Value**: Better visibility for low vision users

**Effort**: Low (Tailwind utility classes)

---

### 5. ARIA Live Politeness Level
**Current**: `aria-live="polite"` (default)

**Enhancement**: Configurable politeness
```tsx
<SortableGallery
  announcementPoliteness="assertive" // For critical updates
/>
```

**Value**: Control interruption level for screen readers

**Effort**: Low (pass prop to useAnnouncer)

---

## UI Improvements

### 1. Grid Column Customization
**Current**: GalleryGrid uses responsive defaults (1/2/3/4 columns)

**Enhancement**: Allow custom column configuration
```tsx
<SortableGallery
  layout="grid"
  gridColumns={{ sm: 2, md: 3, lg: 4, xl: 6 }}
/>
```

**Value**: Fine-grained control over responsive layout

**Effort**: Low (pass through to GalleryGrid)

---

### 2. Item Spacing Customization
**Current**: Default gap-4 between items

**Enhancement**: Configurable spacing
```tsx
<SortableGallery
  itemSpacing="gap-2" // or "gap-6", "gap-8"
/>
```

**Value**: Match app-specific design requirements

**Effort**: Low (Tailwind utility class)

---

### 3. Empty State Slot
**Current**: No built-in empty state

**Enhancement**: Render custom empty state
```tsx
<SortableGallery
  items={[]}
  renderEmptyState={() => (
    <EmptyState
      icon={<GalleryIcon />}
      title="No items yet"
      action={<Button>Add Item</Button>}
    />
  )}
/>
```

**Value**: Better UX for empty galleries

**Effort**: Low (conditional render)

---

### 4. Loading State
**Current**: No built-in loading state

**Enhancement**: Skeleton loader during initial load
```tsx
<SortableGallery
  isLoading={true}
  skeletonCount={6}
  renderSkeleton={() => <GalleryCardSkeleton />}
/>
```

**Value**: Better perceived performance

**Effort**: Low (conditional render with skeleton components)

---

### 5. Transition Animations
**Current**: Framer Motion layout animations (default)

**Enhancement**: Custom animation presets
```tsx
<SortableGallery
  animationPreset="spring" // spring, fade, slide
  animationDuration={200}
/>
```

**Value**: Match app-specific animation style

**Effort**: Medium (Framer Motion configuration)

---

### 6. Drag Cursor Customization
**Current**: Default browser drag cursor

**Enhancement**: Custom cursor during drag
```tsx
<SortableGallery
  dragCursor="grabbing"
  hoverCursor="grab"
/>
```

**Value**: Visual consistency with app design

**Effort**: Low (CSS cursor property)

---

## Design System Extensions

### 1. Dark Mode Support
**Current**: Relies on Tailwind dark: utilities in renderItem

**Enhancement**: Built-in dark mode styles for drag overlay, indicators
```tsx
<SortableGallery
  darkMode="auto" // auto, light, dark
/>
```

**Implementation**: Use dark: utilities in component styles

**Value**: Seamless dark mode integration

**Effort**: Low (Tailwind dark mode classes)

---

### 2. Theme Variants
**Current**: Single theme (LEGO-inspired sky/teal)

**Enhancement**: Alternative color schemes
```tsx
<SortableGallery
  theme="teal" // sky, teal, purple, custom
/>
```

**Value**: Brand customization

**Effort**: Medium (design system extension)

---

### 3. Storybook Playground
**Current**: Static Storybook examples

**Enhancement**: Interactive playground with all props configurable
```tsx
// In Storybook
export const Playground = {
  args: { /* All props with controls */ },
}
```

**Value**: Developer exploration and prototyping

**Effort**: Low (Storybook controls configuration)

---

## Performance Optimizations

### 1. Virtual Scrolling
**Current**: Renders all items in DOM

**Enhancement**: Virtualize large lists (100+ items)
```tsx
<SortableGallery
  virtualized={true}
  itemHeight={200}
  overscan={3}
/>
```

**Implementation**: Integrate react-virtual or react-window

**Value**: Handle thousands of items without performance degradation

**Effort**: High (complex integration with dnd-kit)

---

### 2. Debounced onReorder
**Current**: Calls onReorder immediately on drop

**Enhancement**: Debounce rapid consecutive reorders
```tsx
<SortableGallery
  debounceReorder={500} // Wait 500ms before persisting
/>
```

**Value**: Reduce API calls during rapid reordering

**Effort**: Low (lodash debounce or custom hook)

---

### 3. Memoization for Large Item Lists
**Current**: Rerenders all items on state change

**Enhancement**: Memoize renderItem output
```tsx
const renderItem = useCallback((item) => (
  <MemoizedCard item={item} />
), [])
```

**Documentation**: Storybook example demonstrates memoization pattern

**Value**: Reduce render cost for large galleries

**Effort**: Low (documentation, not API change)

---

## Summary

**Total enhancements**: 28 post-MVP improvements across UX polish, accessibility, UI, design system, and performance.

**Priority recommendations**:
1. **High**: Keyboard drag-and-drop (accessibility), Reduced motion support (WCAG)
2. **Medium**: Custom toast components (extensibility), Drag handle flexibility (UX)
3. **Low**: Theme variants (nice-to-have), Virtual scrolling (only if large galleries are common)

**Effort distribution**:
- Low effort: 18 enhancements (mostly prop additions, documentation)
- Medium effort: 7 enhancements (refactoring, new components)
- High effort: 3 enhancements (complex features like multi-select, virtual scrolling)

**Recommendation**: Implement low-effort accessibility enhancements (reduced motion, focus styling) in MVP if time permits. Defer all other enhancements to iterative releases post-MVP.
