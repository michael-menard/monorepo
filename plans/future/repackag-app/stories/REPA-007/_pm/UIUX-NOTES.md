# UI/UX Notes: REPA-007 (MVP-Critical)

**Story**: Add SortableGallery Component to @repo/gallery

---

## Verdict

**PASS-WITH-NOTES**

Core user journey (drag-and-drop gallery reordering) is implementable and usable with the specified API. API surface is complex (15+ props) but provides sensible defaults. Accessibility requirements are MVP-critical and included in acceptance criteria. Polish and advanced features documented separately in FUTURE-UIUX.md.

---

## MVP Component Architecture

### Core Components Required

**Primary component**:
- `SortableGallery` - Main wrapper component with drag-and-drop logic
  - Location: `packages/core/gallery/src/components/SortableGallery/`
  - Wraps @dnd-kit/core DndContext and @dnd-kit/sortable SortableContext
  - Manages undo/redo state, toast notifications, and keyboard navigation

**Supporting components from existing packages**:
- `GalleryGrid` (from @repo/gallery) - Grid layout container
- `Button` (from @repo/app-component-library) - Undo/Retry buttons in toasts
- Toast notifications (sonner via @repo/app-component-library) - Success/error feedback

**Render props** (caller responsibility):
- `renderItem: (item: T, index: number) => ReactNode` - Card rendering
- `renderDragOverlay?: (item: T | null) => ReactNode` - Custom drag preview

### Reuse Targets

**Existing @repo/gallery components**:
- `GalleryGrid` - Already handles responsive column layout, reuse for grid mode
- No other gallery components needed (caller provides cards via renderItem)

**shadcn primitives** (via @repo/app-component-library):
- Not directly used in SortableGallery itself
- Caller's `renderItem` implementation should use `_primitives` for card UI

**Patterns to extract**:
- `useRovingTabIndex` (362 LOC from app-wishlist-gallery) → `@repo/gallery/hooks/`
- `useAnnouncer` (153 LOC from app-inspiration-gallery) → `@repo/accessibility/hooks/`

---

## MVP Accessibility (Blocking Only)

### Critical ARIA Requirements

**AC-27, AC-28**: ARIA live region for announcements
- `role="status"` or `aria-live="polite"` region for non-intrusive announcements
- Announces: "Item moved from position X to position Y" on drop
- Announces: "Undo successful" or "Redo successful" on undo/redo
- Announces: "Reorder failed" on error

**AC-30**: Semantic list markup
- Container: `role="list"` (if not using native `<ul>`)
- Items: `role="listitem"` (if not using native `<li>`)

**AC-31**: Position information in aria-label
- Each card: `aria-label="Item name, position X of Y"`
- Updates dynamically after reorder

### MVP Keyboard Navigation

**AC-23, AC-24**: Arrow key navigation
- Arrow keys move focus between items
- Home/End jump to first/last item
- Single Tab stop into gallery (roving tabindex pattern via useRovingTabIndex)

**AC-25**: Roving tabindex pattern
- Only one item has `tabindex="0"` at a time (currently focused)
- All other items have `tabindex="-1"`
- Focus management via useRovingTabIndex hook

**AC-26**: Configurable wrapping
- Horizontal wrapping: Right arrow on last item in row wraps to first item in next row
- Configurable via prop (default: wrap enabled)

### Screen Reader Support

**useAnnouncer hook** (extracted to @repo/accessibility):
- Creates aria-live region on mount
- Queues announcements to avoid overlap
- Clears announcements after 5 seconds
- Tested with NVDA, JAWS, VoiceOver

### Minimum Lighthouse Accessibility Score

**Target**: 100 (no violations)

**Critical checks**:
- ARIA attributes valid and used correctly
- Color contrast ratios meet WCAG AA (4.5:1 for text)
- Keyboard focus visible on all interactive elements
- No duplicate IDs
- All interactive elements have accessible names

---

## MVP Design System Rules

### Token-Only Colors (Hard Gate)

**Rule**: All colors must use Tailwind token classes. No hardcoded hex/rgb values.

**Examples**:
- ✅ `bg-sky-500`, `text-teal-600`, `border-gray-300`
- ❌ `bg-[#0EA5E9]`, `style={{ color: '#0891b2' }}`

**Enforcement**:
- ESLint rule: `no-hardcoded-colors` (if implemented)
- Code review checkpoint

**SortableGallery-specific colors**:
- Drag overlay: Use `bg-white/90 dark:bg-gray-900/90` (semi-transparent)
- Drop indicator: `border-sky-500` (LEGO-inspired theme)
- Focus ring: `ring-sky-500` (default from design system)

### _primitives Import Requirement

**Rule**: UI primitives must be imported from `@repo/app-component-library/_primitives`, not direct shadcn imports.

**SortableGallery exceptions**:
- SortableGallery itself does not use shadcn primitives directly
- Caller's `renderItem` implementation must follow this rule
- Undo/Retry buttons in toasts use `Button` from @repo/app-component-library (which wraps _primitives)

**Example** (caller code):
```tsx
import { Card } from '@repo/app-component-library/_primitives/card'
import { SortableGallery } from '@repo/gallery'

function MyGallery() {
  return (
    <SortableGallery
      items={items}
      renderItem={(item) => (
        <Card>{item.name}</Card>
      )}
    />
  )
}
```

### Typography and Spacing

**Typography**: Use Tailwind text classes (`text-sm`, `text-base`, `font-medium`)
- Toast text: `text-sm` for body, `font-medium` for button labels

**Spacing**: Use Tailwind spacing scale (`p-4`, `m-2`, `gap-4`)
- Grid gap: Default to `gap-4` (reuse GalleryGrid default)
- List gap: `space-y-2` for vertical stacking
- Toast padding: Follow sonner defaults

---

## MVP Playwright Evidence

### Core Journey Demonstration

**Scenario**: User reorders gallery items via drag-and-drop

**Steps**:
1. Navigate to gallery with SortableGallery component
2. Identify item at position 3 (`data-testid="gallery-item-2"`)
3. Drag item 3 to position 1
4. Verify item 3 is now first in visual order
5. Verify success toast appears with "Undo" button
6. Click "Undo" button
7. Verify items return to original order
8. Verify toast updates to "Order restored"

**Assertions**:
- `await expect(firstItem).toContainText('Item 3')` after drag
- `await expect(toast).toBeVisible()` after drag
- `await expect(firstItem).toContainText('Item 1')` after undo

**Accessibility checks**:
- Run axe-core scan after reorder: `expect(violations).toEqual([])`
- Verify ARIA live region contains announcement: `await expect(liveRegion).toContainText('Item moved')`

**Video recording**: Optional, but recommended for demo purposes

---

## Additional MVP Notes

### API Surface Complexity

**Concern**: 15+ props may overwhelm developers (per seed recommendations).

**Mitigation**:
- Provide sensible defaults for all optional props:
  - `isDraggingEnabled={true}` (default)
  - `layout="grid"` (default)
  - `undoTimeout={5000}` (5 seconds, default)
  - `sensorConfig` uses tested values (8px PointerSensor, 300ms TouchSensor)
- Document common patterns in Storybook with live examples
- Provide TypeScript IntelliSense documentation for all props

**Storybook stories** (MVP):
1. Basic Grid - Minimal props, happy path
2. List Layout - `layout="list"` example
3. Custom Drag Overlay - `renderDragOverlay` example
4. Error Handling - `onReorder` rejection flow

### Generic Item Type

**Concern**: `items: T[]` requires TypeScript generic, may confuse beginners (per seed).

**Mitigation**:
- Provide typed wrapper examples in Storybook documentation:

```tsx
// Example: Typed wrapper for wishlist items
import { SortableGallery } from '@repo/gallery'
import { WishlistItem } from './types'

type SortableWishlistGalleryProps = Omit<
  SortableGalleryProps<WishlistItem>,
  'renderItem'
> & {
  renderItem?: SortableGalleryProps<WishlistItem>['renderItem']
}

export function SortableWishlistGallery(props: SortableWishlistGalleryProps) {
  return <SortableGallery<WishlistItem> {...props} />
}
```

- Document in Storybook "Typed Wrappers" section
- Provide boilerplate generator (future enhancement, not MVP)

### Render Prop Pattern

**Decision**: Use `renderItem` render prop (not component composition) per seed recommendation.

**Rationale**:
- More flexible for custom card logic (hover states, selection checkboxes, etc.)
- Avoids prop drilling through SortableGallery
- Standard pattern in React ecosystem (React Table, React Window, etc.)

**Example**:
```tsx
<SortableGallery
  items={wishlistItems}
  renderItem={(item, index) => (
    <WishlistCard
      item={item}
      index={index}
      isSelected={selectedIds.includes(item.id)}
      onSelect={() => handleSelect(item.id)}
    />
  )}
/>
```

### Undo Toast Position

**Default**: Bottom-right (matches existing wishlist and inspiration implementations)

**MVP**: Not configurable (hardcoded bottom-right)

**Future**: Add `toastPosition` prop (see FUTURE-UIUX.md)

**Implementation**: Use sonner defaults (bottom-right unless overridden globally)

### Error Handling UX

**Strategy**: Rollback + retry (per seed recommendations)

**Flow**:
1. User drags item
2. Optimistic local reorder
3. onReorder callback throws error
4. Items roll back to original order
5. Error toast appears: "Reorder failed. [Retry]"
6. User clicks Retry → re-calls onReorder with same payload
7. Success toast on retry success

**Alternative strategies** (non-MVP):
- Undo via API mutation (requires backend support)
- Retry with exponential backoff
- Bulk undo (undo multiple actions at once)

**Documentation**: Storybook example demonstrates error flow

---

## Blocker Assessment

**No MVP blockers identified.**

All core journey requirements are achievable with specified API and dependencies. Accessibility requirements are well-defined and testable. Design system compliance is straightforward (token colors, _primitives pattern).

**Recommendation**: Proceed with implementation. Address polish items in FUTURE-UIUX.md post-MVP.
