---
id: REPA-007
title: "Add SortableGallery Component to @repo/gallery"
status: ready-to-work
priority: P2
story_points: 5
epic: repackag-app
created_at: "2026-02-10"
elaborated_at: "2026-02-10"
elab_completion_date: "2026-02-10"
experiment_variant: control
predictions:
  split_risk: 0.7
  review_cycles: 3
  token_estimate: 180000
  confidence: low
  similar_stories: []
  generated_at: "2026-02-10T00:00:00Z"
  model: haiku
  wkfl_version: "007-v1"
---

# REPA-007: Add SortableGallery Component to @repo/gallery

## Context

Both app-wishlist-gallery (726 LOC) and app-inspiration-gallery (643 LOC) implement nearly identical drag-and-drop reordering with dnd-kit. The implementations share:

- **Common sensor configuration**: PointerSensor (8px activation threshold) + TouchSensor (300ms delay, 5px tolerance)
- **DndContext setup**: closestCenter collision detection, rectSortingStrategy for grid layouts
- **Undo/redo flow**: 5-second undo window with toast UI, optimistic updates with rollback on error
- **Keyboard navigation**: useRovingTabIndex (362 LOC) for arrow key navigation with roving tabindex pattern
- **Screen reader support**: useAnnouncer (153 LOC) for aria-live announcements
- **Auto-scroll**: Enabled with 20%/10% threshold, 10px/ms acceleration

This duplication violates DRY principles and makes bug fixes/improvements require synchronizing changes across both apps. Future gallery apps (sets, albums) would need to duplicate this logic again.

**Problem**:
- ~1,369 LOC of duplicated drag-and-drop logic across two apps
- useRovingTabIndex (362 LOC) and useAnnouncer (153 LOC) are app-local, not shared
- Future gallery apps would need to duplicate this implementation
- Bug fixes require changing code in multiple locations

**Solution Direction**:
Extract common drag-and-drop patterns into a shared SortableGallery component in @repo/gallery. The component will provide:
1. Configurable sensor thresholds with proven defaults (PointerSensor 8px, TouchSensor 300ms/5px)
2. onReorder callback for API persistence (caller handles RTK Query mutation)
3. Built-in undo/redo flow with configurable timeout (default: 5 seconds)
4. Grid/list layout support via layout prop (reuses GalleryGrid)
5. Keyboard reordering via arrow keys (extract useRovingTabIndex to @repo/gallery/hooks)
6. Accessibility support via aria-live announcements (extract useAnnouncer to @repo/accessibility)
7. DragOverlay slot for custom drag previews
8. Error handling with rollback and retry options

This eliminates ~1,000 LOC from wishlist/inspiration apps while providing reusable patterns for future galleries.

**Reality Baseline**:
- @repo/gallery already has dnd-kit dependencies installed (6.3.1, ^10.0.0, 3.2.2)
- No baseline reality file found in plans/baselines/ - proceeding with codebase scanning only
- Warning: Without baseline reality, this story relies entirely on codebase evidence and may not capture in-progress work or active stories

**Related Work**:
- REPA-008: Add Gallery Keyboard Hooks (will use extracted useRovingTabIndex)
- REPA-009: Enhance GalleryCard with Selection & Drag (depends on REPA-007)
- REPA-010: Refactor app-inspiration-gallery to Use @repo/gallery (depends on REPA-007, REPA-008, REPA-009)

---

## Goal

Create a generic, reusable SortableGallery component in @repo/gallery that consolidates drag-and-drop reordering patterns from app-wishlist-gallery and app-inspiration-gallery, eliminating ~1,000 LOC of duplicated code and providing a foundation for future gallery implementations.

---

## Non-Goals

**Backend API changes**: Caller handles RTK Query mutations and API integration via onReorder callback. SortableGallery is presentation-layer only.

**Multi-select drag**: Single-item drag only. Multi-select drag adds significant complexity and is not required per index entry. Can be added in future iteration if needed (see FUTURE-RISKS.md Risk 3).

**Drag between galleries**: Single gallery reordering only. Cross-gallery drag requires shared DndContext and complex state management. Out of scope (see FUTURE-RISKS.md Risk 4).

**Custom sensors**: PointerSensor and TouchSensor only. These cover 99% of use cases. Alternative sensors (SwipeSensor, PinchSensor) are not needed per existing implementations.

**Drag handles**: Cards are fully draggable by default. Apps can implement custom drag handles via renderItem if needed (documented in Storybook, no API changes required).

**Optimistic update strategies**: Component performs optimistic local reorder, but caller decides when/how to call onReorder. Apps control optimistic vs pessimistic update patterns.

**Toast UI customization**: Uses sonner defaults from @repo/app-component-library. Custom toast rendering is out of scope for MVP (see FUTURE-UIUX.md Enhancement 2).

**Keyboard shortcuts beyond navigation**: Apps handle domain-specific shortcuts (A for add, G for go to, Delete key). SortableGallery only handles arrow keys, Home, End, Tab for navigation.

**Virtual scrolling**: Not needed for galleries <100 items. Virtual scrolling integration with dnd-kit is complex and deferred to future work (see FUTURE-RISKS.md Risk 1).

**Protected features** (from seed):
- @repo/gallery package structure and existing exports
- @repo/accessibility package structure
- dnd-kit dependency versions (6.3.1, ^10.0.0, 3.2.2)
- Existing GalleryGrid, GalleryCard, and other @repo/gallery components

---

## Scope

### Packages Touched

**@repo/gallery** (primary):
- New component: `packages/core/gallery/src/components/SortableGallery/`
  - `index.tsx` - Main component (~600 LOC)
  - `__tests__/` - Test suite (~400 LOC)
  - `__types__/` - Zod schemas for props
  - `utils/` - Helper functions (sensor config, arrayMove wrapper)
- New hook: `packages/core/gallery/src/hooks/useRovingTabIndex.ts` (extracted from app-wishlist-gallery, 362 LOC)
- Update: `packages/core/gallery/src/index.ts` - Add exports
- No new dependencies (dnd-kit, framer-motion, zod already installed)

**@repo/accessibility** (secondary):
- New hook: `packages/core/accessibility/src/hooks/useAnnouncer.ts` (extracted from app-inspiration-gallery, 153 LOC)
- Update: `packages/core/accessibility/src/index.ts` - Add export
- No new dependencies

**Apps** (deletions - out of scope for REPA-007, covered by REPA-009, REPA-010):
- app-wishlist-gallery: DraggableWishlistGallery (~726 LOC to delete)
- app-inspiration-gallery: DraggableInspirationGallery (~643 LOC to delete)

**Total LOC**:
- New: ~1,700 LOC (component + hooks + tests + docs)
- Deleted (in future stories): ~1,369 LOC
- Net change: +331 LOC (but eliminates future duplication)

### Endpoints Touched

None - This is a frontend-only component story.

### UI Surfaces Touched

**New component**: SortableGallery in @repo/gallery

**Component API** (TypeScript generic):
```typescript
interface SortableGalleryProps<T extends { id: string }> {
  // Required
  items: T[]
  onReorder: (items: T[]) => Promise<void>
  renderItem: (item: T, index: number) => ReactNode

  // Optional
  isDraggingEnabled?: boolean // default: true
  layout?: 'grid' | 'list' // default: 'grid'
  renderDragOverlay?: (item: T | null) => ReactNode
  sensorConfig?: SensorConfig // default: tested values
  undoTimeout?: number // default: 5000ms
  onError?: (error: unknown) => void
}
```

**Integration points**:
- GalleryGrid (existing) for grid layout
- Button (from @repo/app-component-library) for Undo/Retry
- toast (sonner via @repo/app-component-library) for notifications
- Framer Motion for layout animations

---

## Acceptance Criteria

### Component API

- [ ] **AC-1**: SortableGallery accepts `items: T[]` generic prop with `id: string` constraint
- [ ] **AC-2**: SortableGallery accepts `onReorder: (items: T[]) => Promise<void>` callback
- [ ] **AC-3**: SortableGallery accepts `renderItem: (item: T, index: number) => ReactNode` render prop
- [ ] **AC-4**: SortableGallery accepts optional `isDraggingEnabled: boolean` (default: true)
- [ ] **AC-5**: SortableGallery accepts optional `layout: 'grid' | 'list'` (default: 'grid')
- [ ] **AC-6**: SortableGallery accepts optional `renderDragOverlay: (item: T | null) => ReactNode`

### Drag-and-Drop Behavior

- [ ] **AC-7**: PointerSensor activates at 8px threshold (configurable via sensorConfig prop)
- [ ] **AC-8**: TouchSensor activates at 300ms delay, 5px tolerance (configurable)
- [ ] **AC-9**: Uses closestCenter collision detection
- [ ] **AC-10**: Uses rectSortingStrategy for grid layouts
- [ ] **AC-11**: Auto-scroll enabled with 20%/10% threshold, 10px/ms acceleration
- [ ] **AC-12**: Optimistic local reorder immediately on drag end
- [ ] **AC-13**: Calls onReorder callback with reordered items array

### Undo/Redo Flow

- [ ] **AC-14**: Shows success toast with "Undo" button after successful reorder
- [ ] **AC-15**: Undo button calls onReorder with original order
- [ ] **AC-16**: Toast auto-dismisses after 5 seconds (configurable via undoTimeout prop)
- [ ] **AC-17**: New drag cancels previous undo window
- [ ] **AC-18**: Undo button disabled while undo is in progress

### Error Handling

- [ ] **AC-19**: Rolls back to original order if onReorder throws error
- [ ] **AC-20**: Shows error toast with "Retry" button on failure
- [ ] **AC-21**: Retry button re-calls onReorder with pending payload
- [ ] **AC-22**: Accepts optional `onError: (error: unknown) => void` callback

### Keyboard Navigation

- [ ] **AC-23**: Arrow keys navigate between items (extract useRovingTabIndex to @repo/gallery/hooks)
- [ ] **AC-24**: Home/End keys jump to first/last item
- [ ] **AC-25**: Single Tab stop into gallery (roving tabindex pattern)
- [ ] **AC-26**: Arrow key navigation wraps horizontally (configurable)

### Accessibility

- [ ] **AC-27**: ARIA live region announces drag start, drag end, drop
- [ ] **AC-28**: ARIA live region announces undo/redo actions
- [ ] **AC-29**: Extract useAnnouncer to @repo/accessibility
- [ ] **AC-30**: role="list" on container, role="listitem" on cards
- [ ] **AC-31**: Cards have aria-label with position info (e.g., "Item 3 of 10")

### Layout Support

- [ ] **AC-32**: layout="grid" uses GalleryGrid with configurable columns
- [ ] **AC-33**: layout="list" uses vertical stacking with full width
- [ ] **AC-34**: Framer Motion animations on reorder (layout prop)

---

## Reuse Plan

### Components to Reuse

**From @repo/gallery**:
- `GalleryGrid` - Responsive grid layout container (already exists)

**From @repo/app-component-library**:
- `Button` - Undo/Retry buttons in toasts
- `toast` (sonner) - Success/error notifications

**Render props** (caller provides):
- `renderItem` - Card rendering (e.g., WishlistCard, InspirationCard)
- `renderDragOverlay` - Custom drag preview (optional)

### Patterns to Reuse

**From dnd-kit**:
- DndContext + SortableContext setup
- useSensor (PointerSensor, TouchSensor)
- arrayMove for reordering
- DragOverlay for drag preview

**From Framer Motion**:
- layout prop for smooth reorder animations
- AnimatePresence for enter/exit transitions (optional)

**From existing implementations**:
- Sensor configuration (8px PointerSensor, 300ms TouchSensor)
- Auto-scroll settings (20%/10% threshold, 10px/ms acceleration)
- Undo flow pattern (5-second timeout, toast with action button)

### Packages Already Installed

**In @repo/gallery package.json** (no new dependencies needed):
- @dnd-kit/core: 6.3.1
- @dnd-kit/sortable: ^10.0.0
- @dnd-kit/utilities: 3.2.2
- framer-motion: (version already installed)
- zod: (version already installed)

**In @repo/app-component-library** (for Button and toast):
- sonner: (version already installed)

### Hooks to Extract

**useRovingTabIndex** (362 LOC from app-wishlist-gallery):
- Implements roving tabindex pattern for keyboard navigation
- Uses ResizeObserver to detect grid column changes
- Handles arrow keys, Home, End navigation
- Destination: `packages/core/gallery/src/hooks/useRovingTabIndex.ts`

**useAnnouncer** (153 LOC from app-inspiration-gallery):
- Creates aria-live region for screen reader announcements
- Queues announcements to avoid overlap
- Clears announcements after 5 seconds
- Destination: `packages/core/accessibility/src/hooks/useAnnouncer.ts`

---

## Architecture Notes

### TypeScript Generics

**Component signature**:
```typescript
export function SortableGallery<T extends { id: string }>(
  props: SortableGalleryProps<T>
): ReactNode
```

**Type safety**:
- Generic constraint `T extends { id: string }` ensures items have unique ID
- renderItem callback receives correctly typed item: `(item: T, index: number) => ReactNode`
- onReorder callback receives correctly typed array: `(items: T[]) => Promise<void>`

**Zod schema**:
```typescript
import { z } from 'zod'

// Base item schema (runtime validation)
const SortableItemSchema = z.object({
  id: z.string().min(1),
})

// Props schema (prop validation)
const SortableGalleryPropsSchema = z.object({
  items: z.array(SortableItemSchema).min(0),
  onReorder: z.function().args(z.array(z.any())).returns(z.promise(z.void())),
  renderItem: z.function().args(z.any(), z.number()).returns(z.any()),
  isDraggingEnabled: z.boolean().optional().default(true),
  layout: z.enum(['grid', 'list']).optional().default('grid'),
  renderDragOverlay: z.function().args(z.any().nullable()).returns(z.any()).optional(),
  // ... additional props
})

type SortableGalleryProps<T> = z.infer<typeof SortableGalleryPropsSchema> & {
  items: T[]
  onReorder: (items: T[]) => Promise<void>
  renderItem: (item: T, index: number) => ReactNode
  renderDragOverlay?: (item: T | null) => ReactNode
}
```

### State Management

**Local state**:
- `items` (controlled by parent, reordered locally on drag end)
- `activeId` (currently dragged item ID, for DragOverlay)
- `undoContext` (ref or state, contains original order and timeout ID)

**Undo state** (using useRef to avoid re-renders):
```typescript
const undoContextRef = useRef<{
  originalOrder: T[]
  originalItems: T[]
  timeoutId: NodeJS.Timeout | null
}>({
  originalOrder: [],
  originalItems: [],
  timeoutId: null,
})
```

**Alternative** (useState if ref causes stale closures):
```typescript
const [undoContext, setUndoContext] = useState<UndoContext>({
  originalOrder: [],
  originalItems: [],
  timeoutId: null,
})
```

**Decision**: Use useRef for MVP (matches existing implementations). If stale closure bugs occur, switch to useState.

### DndContext Configuration

```typescript
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
  autoScroll={{
    enabled: true,
    threshold: { x: 0.2, y: 0.1 },
    acceleration: 10,
  }}
>
  <SortableContext
    items={items.map(item => item.id)}
    strategy={layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
  >
    {/* Render items */}
  </SortableContext>
  <DragOverlay>
    {activeId && renderDragOverlay ? renderDragOverlay(activeItem) : null}
  </DragOverlay>
</DndContext>
```

### Sensor Configuration

```typescript
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: sensorConfig?.pointerThreshold ?? 8, // 8px default
    },
  }),
  useSensor(TouchSensor, {
    activationConstraint: {
      delay: sensorConfig?.touchDelay ?? 300, // 300ms default
      tolerance: sensorConfig?.touchTolerance ?? 5, // 5px default
    },
  })
)
```

### Component Structure

```
SortableGallery/
  index.tsx                  # Main component
  __tests__/
    SortableGallery.test.tsx          # Rendering, props
    SortableGallery.drag.test.tsx     # Drag-and-drop logic
    SortableGallery.undo.test.tsx     # Undo flow
    SortableGallery.keyboard.test.tsx # Keyboard navigation
    SortableGallery.a11y.test.tsx     # Accessibility
  __types__/
    index.ts                 # Zod schemas, TypeScript types
  utils/
    sensor-config.ts         # Sensor defaults
    reorder.ts               # arrayMove wrapper
    index.ts                 # Utility exports
```

### Accessibility Implementation

**ARIA live region**:
```typescript
const { announce } = useAnnouncer()

const handleDragEnd = (event) => {
  // ... reorder logic
  announce(`Item moved from position ${oldIndex + 1} to position ${newIndex + 1}`)
}

const handleUndo = () => {
  // ... undo logic
  announce('Undo successful. Order restored.')
}
```

**Semantic markup**:
```tsx
<div role="list" aria-label="Sortable gallery">
  {items.map((item, index) => (
    <div
      key={item.id}
      role="listitem"
      aria-label={`${item.name}, position ${index + 1} of ${items.length}`}
    >
      {renderItem(item, index)}
    </div>
  ))}
</div>
```

**Roving tabindex**:
```typescript
const { itemRefs, focusedIndex, handleKeyDown } = useRovingTabIndex({
  itemCount: items.length,
  columns: layout === 'grid' ? undefined : 1, // Auto-detect for grid
  wrap: true,
})

<div
  ref={itemRefs[index]}
  tabIndex={focusedIndex === index ? 0 : -1}
  onKeyDown={handleKeyDown}
>
```

---

## Infrastructure Notes

**No infrastructure changes required** - This is a frontend library component story.

**CI/CD considerations**:
- Vitest tests run in monorepo CI pipeline (no changes needed)
- Playwright E2E test can run in Storybook (no separate deployment needed)
- Storybook build includes new SortableGallery examples

**Build dependencies**:
- pnpm build in @repo/gallery
- pnpm build in @repo/accessibility (for useAnnouncer)
- Type checking across dependent packages

---

## HTTP Contract Plan

Not applicable - This is a frontend-only component story with no API changes.

**Caller responsibility**:
- Apps handle RTK Query mutations for persisting reorder
- onReorder callback receives reordered items array
- Apps decide optimistic vs pessimistic update strategy

**Example integration** (app-wishlist-gallery):
```typescript
const [reorderWishlist] = useReorderWishlistMutation()

<SortableGallery
  items={wishlistItems}
  onReorder={async (reorderedItems) => {
    const itemIds = reorderedItems.map(item => item.id)
    await reorderWishlist({ itemIds }).unwrap()
  }}
  renderItem={(item) => <WishlistCard item={item} />}
/>
```

---

## Test Plan

See detailed test plan in `_pm/TEST-PLAN.md`.

### Scope Summary

- **Endpoints**: None (frontend-only)
- **UI**: SortableGallery component, drag overlays, toast notifications, grid/list layouts
- **Data/storage**: No (component delegates persistence via onReorder callback)

### Test Coverage Target

**80%+ for core logic**:
- Drag-and-drop reordering
- Undo/redo flow
- Error handling and rollback
- Keyboard navigation
- Accessibility (ARIA attributes, announcements)

### Happy Path Tests

1. **Basic drag-and-drop reorder**: Drag item from position A to position B, verify onReorder called with correct payload
2. **Undo flow**: Click Undo button, verify items return to original order
3. **Grid layout mode**: Verify grid CSS classes, multi-row drag behavior
4. **List layout mode**: Verify vertical stacking, full-width cards
5. **Keyboard navigation**: Arrow keys, Home/End, Tab navigation

### Error Cases

1. **onReorder throws error**: Verify rollback, error toast with Retry button
2. **onReorder rejects Promise**: Verify rollback, retry functionality
3. **Invalid item array**: Verify Zod validation error or console warning
4. **onReorder not provided**: Verify local reorder, console warning

### Edge Cases

1. **Single item gallery**: Verify no reorder, no toast
2. **Empty gallery**: Verify no crash, no drag activation
3. **Large gallery (100 items)**: Verify auto-scroll, performance monitoring
4. **Rapid consecutive drags**: Verify toast cancellation, no race conditions
5. **Touch device drag**: Verify TouchSensor activation (300ms delay)
6. **Disabled dragging**: Verify drag does not activate, keyboard nav works
7. **Undo timeout expiration**: Verify toast auto-dismisses after 5 seconds

### Required Tooling

**Vitest** (unit/integration):
- Component rendering, prop validation
- Drag logic, undo flow, keyboard navigation
- Mocks: sonner toast, window.ResizeObserver, Framer Motion

**Playwright** (E2E):
- At least 1 happy-path test per ADR-006
- Drag and drop in Storybook story
- Undo button click and rollback

**axe-core** (accessibility):
- Zero violations scan
- ARIA attribute validation

**Manual testing**:
- Screen reader testing (NVDA or VoiceOver)
- Multi-browser testing (Chrome, Firefox, Safari)

### Estimated Test LOC

~400 LOC (unit + E2E + accessibility tests)

---

## UI/UX Notes

See detailed UI/UX notes in `_pm/UIUX-NOTES.md` (MVP-critical) and `_pm/FUTURE-UIUX.md` (post-MVP enhancements).

### Verdict

**PASS-WITH-NOTES** - Core journey implementable and usable. API surface is complex (15+ props) but provides sensible defaults. Accessibility requirements are MVP-critical and included in ACs.

### MVP Component Architecture

**Primary component**: SortableGallery (wraps dnd-kit)

**Supporting components**:
- GalleryGrid (existing, for grid layout)
- Button (existing, for Undo/Retry buttons)
- toast (sonner, for notifications)

**Render props** (caller provides):
- renderItem - Card rendering
- renderDragOverlay - Drag preview (optional)

### MVP Accessibility (Blocking)

**ARIA requirements** (AC-27, AC-28, AC-30, AC-31):
- role="list" on container, role="listitem" on cards
- aria-label with position info ("Item 3 of 10")
- ARIA live region for announcements (drag, undo, error)

**Keyboard navigation** (AC-23, AC-24, AC-25):
- Arrow keys navigate between items
- Home/End jump to first/last
- Single Tab stop (roving tabindex pattern)

**Screen reader support**:
- useAnnouncer hook for aria-live announcements
- Tested with NVDA, JAWS, VoiceOver

**Lighthouse target**: 100 (no violations)

### MVP Design System Rules

**Token-only colors** (hard gate):
- All colors use Tailwind token classes (e.g., `bg-sky-500`, `border-teal-600`)
- No hardcoded hex/rgb values

**_primitives pattern**:
- SortableGallery does not use shadcn primitives directly
- Caller's renderItem must follow _primitives pattern

**Typography and spacing**:
- Toast text: `text-sm`, `font-medium` for buttons
- Grid gap: Default `gap-4` (from GalleryGrid)
- List gap: `space-y-2` for vertical stacking

### API Surface Complexity

**Concern**: 15+ props may overwhelm developers.

**Mitigation**:
- Sensible defaults for all optional props
- Storybook stories demonstrate common patterns:
  1. Basic Grid - Minimal props
  2. List Layout - layout="list"
  3. Custom Drag Overlay - renderDragOverlay
  4. Error Handling - onReorder rejection flow
- TypeScript IntelliSense with JSDoc comments

### Generic Item Type

**Concern**: `items: T[]` requires TypeScript generic knowledge.

**Mitigation**:
- Provide typed wrapper examples in Storybook:

```typescript
// Example: Typed wrapper for wishlist items
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

### Undo Toast Position

**Default**: Bottom-right (matches existing implementations)

**MVP**: Not configurable (hardcoded via sonner defaults)

**Future**: Add toastPosition prop (see FUTURE-UIUX.md)

### Error Handling UX

**Strategy**: Rollback + retry

**Flow**:
1. User drags item
2. Optimistic local reorder
3. onReorder throws error
4. Items roll back to original order
5. Error toast: "Reorder failed. [Retry]"
6. User clicks Retry → re-calls onReorder

**Storybook example**: Demonstrates error flow with mock onReorder that throws

---

## Reality Baseline

**Baseline status**:
- **Loaded**: No
- **Date**: N/A
- **Gaps**: No baseline reality file found in plans/baselines/. Proceeding with codebase scanning only.

**Warning**: Without baseline reality, this seed relies entirely on codebase evidence and may not capture in-progress work or active stories.

### Relevant Existing Features

| Feature | Location | Status |
|---------|----------|--------|
| @repo/gallery package | packages/core/gallery | Active - Already has dnd-kit installed (6.3.1) |
| DraggableWishlistGallery | apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery | Active - 726 LOC drag-and-drop implementation |
| DraggableInspirationGallery | apps/web/app-inspiration-gallery/src/components/DraggableInspirationGallery | Active - 643 LOC drag-and-drop implementation |
| useRovingTabIndex hook | apps/web/app-wishlist-gallery/src/hooks | Active - 362 LOC keyboard navigation |
| useAnnouncer hook | apps/web/app-inspiration-gallery/src/hooks | Active - 153 LOC screen reader support |
| SortableWishlistCard | apps/web/app-wishlist-gallery/src/components | Active - Used with @dnd-kit/sortable |
| SortableInspirationCard | apps/web/app-inspiration-gallery/src/components | Active - Used with @dnd-kit/sortable |

### Active In-Progress Work

Unknown (no baseline reality available)

**Risk**: May conflict with any active wishlist/inspiration gallery work. Recommend checking with team before implementation.

### Constraints to Respect

**Dependencies**:
- @repo/gallery already has dnd-kit dependencies (6.3.1, ^10.0.0, 3.2.2)
- Both apps use identical dnd-kit patterns (PointerSensor, TouchSensor, closestCenter, rectSortingStrategy)
- Both apps implement undo/redo flow with 5-second window
- Both apps use framer-motion for animations

**Package boundaries**:
- @repo/gallery is a shared component library
- @repo/accessibility is a separate package for accessibility utilities
- No circular dependencies between packages

**Architecture patterns**:
- Zod-first types (per CLAUDE.md)
- Named exports (per CLAUDE.md)
- Component directory structure (index.tsx, __tests__/, __types__/, utils/)

### Conflicts Detected

No conflicts detected.

**Note**: Without baseline reality, cannot verify if this story conflicts with active work on wishlist or inspiration galleries. Recommend checking with team before implementation.

---

## Dev Feasibility Notes

See detailed feasibility review in `_pm/DEV-FEASIBILITY.md` (MVP-critical) and `_pm/FUTURE-RISKS.md` (post-MVP concerns).

### Feasibility Summary

**Feasible for MVP**: Yes

**Confidence**: High

**Why**:
- All required dependencies already exist in @repo/gallery package.json
- Both wishlist and inspiration apps have proven implementations (~1,369 LOC to consolidate)
- No backend changes required (frontend-only component)
- TypeScript generic pattern is well-understood
- Test patterns already established

### Likely Change Surface (Core Only)

**Packages modified**:
- @repo/gallery (primary): New SortableGallery component, useRovingTabIndex hook
- @repo/accessibility (secondary): useAnnouncer hook
- Apps (deletions in future stories): DraggableWishlistGallery, DraggableInspirationGallery

**Estimated LOC**:
- New: ~1,700 LOC (component + hooks + tests + docs)
- Deleted (in REPA-009, REPA-010): ~1,369 LOC
- Net change: +331 LOC

**Endpoints**: None (frontend-only)

**Deploy touchpoints**:
- pnpm build in CI (all packages must compile)
- Type checking across monorepo
- Test suite in CI (Vitest + Playwright)

### MVP-Critical Risks

**Risk 1**: Generic TypeScript constraint inflexibility
- **Mitigation**: Use `T extends { id: string | number }` to cover both string and numeric IDs

**Risk 2**: Undo state management with useRef causing stale closures
- **Mitigation**: Use useState if ref causes bugs, accept minor re-render cost

**Risk 3**: Toast library coupling to sonner
- **Mitigation**: Accept coupling for MVP (both apps use sonner), document dependency

**Risk 4**: ResizeObserver polyfill for useRovingTabIndex
- **Mitigation**: Provide fallback columns prop, polyfill in tests, document browser compatibility

**Risk 5**: Framer Motion performance with large galleries
- **Mitigation**: Provide disableAnimations prop, document performance thresholds

**No blocking risks identified for core user journey.**

### Missing Requirements

**Requirement 1**: dnd-kit sensor configuration values
- **Decision**: Use defaults from existing apps (8px PointerSensor, 300ms TouchSensor, 20%/10% auto-scroll)

**Requirement 2**: Undo timeout cancellation behavior
- **Decision**: New drag immediately dismisses previous toast and clears undo context

**Requirement 3**: Error toast duration
- **Decision**: Error toast persists until user clicks Retry or dismisses manually

### Implementation Sizing

**Estimated LOC breakdown**:
- SortableGallery component: ~600 LOC
- useRovingTabIndex: 362 LOC (extracted)
- useAnnouncer: 153 LOC (extracted)
- Tests: ~400 LOC
- Documentation: ~200 LOC
- **Total**: ~1,715 LOC

**Story points justification**:
- 5 SP for 34 ACs, hook extraction, generic TypeScript, comprehensive tests
- Alternative: Split into REPA-007a (3 SP core) + REPA-007b (2 SP advanced features)

**Recommendation**: Implement as single 5 SP story unless schedule is constrained.

### Implementation Strategy

**Phase 1**: Core component (Days 1-2)
- SortableGallery skeleton, dnd-kit integration, basic drag-and-drop

**Phase 2**: Undo flow (Day 3)
- Undo state management, sonner integration, error handling

**Phase 3**: Keyboard navigation (Day 4)
- Extract useRovingTabIndex, useAnnouncer, integrate into component

**Phase 4**: Layouts and accessibility (Day 5)
- Grid/list layouts, ARIA attributes, axe-core testing

**Phase 5**: E2E and documentation (Day 6)
- Playwright test, Storybook stories, README

**Phase 6**: App migration (Days 7-8)
- Refactor wishlist/inspiration apps (or defer to REPA-009, REPA-010)

**Total estimate**: 8 developer-days (aligns with 5 SP if 1 SP ≈ 1.6 days)

---

## Risk Predictions

See `_pm/RISK-PREDICTIONS.yaml` for detailed calculation.

**Split risk**: 0.7 (high)
- 34 ACs with hook extraction from multiple apps creates significant scope
- Recommendation: Consider splitting into REPA-007a (core) + REPA-007b (advanced features)

**Review cycles**: 3 (expected)
- Generic TypeScript complexity (type refinements)
- Accessibility requirements (screen reader testing, ARIA validation)
- Hook extraction (coordination, testing)

**Token estimate**: 180,000 tokens
- Above-average due to large AC count and comprehensive test plan
- Range: 160K-200K tokens likely

**Confidence**: Low
- No similar stories in repackag-app epic (new epic)
- WKFL-006 patterns unavailable (heuristics-only mode)
- Will improve after first similar story completes

---

## Completion Criteria

**Story is DONE when**:

1. ✅ SortableGallery component implemented with all 34 ACs passing
2. ✅ Test coverage ≥80% for core logic (drag, undo, keyboard, accessibility)
3. ✅ At least 1 Playwright E2E test passing (per ADR-006)
4. ✅ useRovingTabIndex extracted to @repo/gallery/hooks
5. ✅ useAnnouncer extracted to @repo/accessibility/hooks
6. ✅ Storybook stories demonstrate common patterns (Basic Grid, List Layout, Error Handling, Custom Overlay)
7. ✅ All quality gates pass (TypeScript compilation, ESLint, Vitest, Playwright)
8. ✅ Code review approved by 1+ reviewers
9. ✅ README with API documentation and usage examples
10. ✅ axe-core accessibility scan with 0 violations

**Evidence artifacts**:
- PR with passing CI checks
- Playwright video recording of E2E test
- Storybook deployed with new component examples
- Test coverage report showing ≥80% coverage
- Screenshots of drag-and-drop in action

**Out of scope for REPA-007** (covered by REPA-009, REPA-010):
- Migrating app-wishlist-gallery to use SortableGallery
- Migrating app-inspiration-gallery to use SortableGallery
- Deleting DraggableWishlistGallery and DraggableInspirationGallery

---

## Notes

**Seed generation**:
- Generated: 2026-02-10
- Baseline used: None (no baseline reality file found)
- Lessons loaded: False (LESSONS-LEARNED.md deprecated per KNOW-043)
- ADRs loaded: True (ADR-001, ADR-005, ADR-006)
- Conflicts found: 0
- Blocking conflicts: 0

**Experiment assignment**:
- Variant: control
- Reason: No active experiments in experiments.yaml

**Dependencies**:
- REPA-008: Add Gallery Keyboard Hooks (will use extracted useRovingTabIndex)
- REPA-009: Enhance GalleryCard with Selection & Drag (depends on REPA-007)
- REPA-010: Refactor app-inspiration-gallery to Use @repo/gallery (depends on REPA-007, REPA-008, REPA-009)

**Related documents**:
- Test Plan: `_pm/TEST-PLAN.md`
- UI/UX Notes: `_pm/UIUX-NOTES.md` (MVP-critical)
- Future UI/UX: `_pm/FUTURE-UIUX.md` (post-MVP enhancements)
- Dev Feasibility: `_pm/DEV-FEASIBILITY.md` (MVP-critical)
- Future Risks: `_pm/FUTURE-RISKS.md` (post-MVP concerns)
- Risk Predictions: `_pm/RISK-PREDICTIONS.yaml`
- Story Seed: `_pm/STORY-SEED.md`

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-10_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| — | Core user journey fully specified | All 34 ACs cover MVP requirements | None (no gaps) |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | Impact | Notes |
|---|---------|----------|--------|-------|
| 1 | Virtual scrolling not supported | Limitation | Medium | Galleries with 1000+ items will have performance issues. Defer to Q2 2026. |
| 2 | Single toast library coupling (sonner only) | Limitation | Low | Apps with different toast libraries cannot use component. Add optional toastAdapter prop in Q1 2026. |
| 3 | No multi-select drag support | Enhancement | Low | Power users must drag items one-by-one. Defer to Q3 2026 based on user feedback. |
| 4 | No cross-gallery drag support | Enhancement | Low | Cannot reorganize items across categories. Defer to Q4 2026. Requires shared DndContext. |
| 5 | Touch gesture conflicts not addressed | Edge Case | Low | TouchSensor 300ms delay may conflict with swipe/pinch gestures. Make delay configurable in Q2 2026. |
| 6 | SSR compatibility not tested | Enhancement | Medium | May have issues with Next.js SSR. Test in Q1 2026 before Next.js adoption. |
| 7 | Keyboard drag-and-drop (ARIA best practices) | Enhancement | High | Space/Enter to grab, arrows to move. Current keyboard nav is focus only. Target Q2 2026. |
| 8 | Reduced motion support (prefers-reduced-motion) | Enhancement | Medium | Respect user animation preferences. WCAG 2.1 AAA criterion. |
| 9 | Configurable toast position | Enhancement | Low | Current bottom-right hardcoded. Add toastPosition prop. |
| 10 | Custom toast components | Enhancement | Medium | Allow renderSuccessToast and renderErrorToast props. Target Q1 2026. |
| 11 | Drag handle flexibility | Enhancement | Low | Document pattern in Storybook. No API changes needed. |
| 12 | Multi-level undo/redo (history stack) | Enhancement | Low | Cmd+Z/Cmd+Shift+Z support. Power user feature, defer to Q3 2026. |
| 13 | Auto-scroll to dropped item | Enhancement | Low | Use scrollIntoView after drop. Quick win. |
| 14 | Built-in drag preview variants | Enhancement | Low | Ghost, solid, multi-item preview variants. Design system extension. |
| 15 | Drop zone indicators (visual lines/boxes) | Enhancement | Low | Clearer drop target feedback. Use dnd-kit drop indicator APIs. |
| 16 | Haptic feedback for mobile | Enhancement | Low | Vibration API on touch drag start/drop. Nice-to-have tactile feedback. |
| 17 | Grid column customization | Enhancement | Low | Custom responsive column config. Quick enhancement. |
| 18 | Item spacing customization | Enhancement | Low | Configurable gap values. Quick enhancement. |
| 19 | Empty state slot | Enhancement | Low | renderEmptyState prop for custom empty UI. |
| 20 | Loading state with skeletons | Enhancement | Low | isLoading prop with skeletonCount. |
| 21 | Custom animation presets | Enhancement | Low | animationPreset prop (spring, fade, slide). Design system extension. |
| 22 | Dark mode styles | Enhancement | Low | Built-in dark: utilities for drag overlay, indicators. |
| 23 | Storybook playground | Enhancement | Low | Interactive playground with all props configurable. |
| 24 | Performance benchmarking | Enhancement | Medium | Establish baselines for 10, 50, 100, 500, 1000 items. Target Q2 2026. |
| 25 | Migration guide for existing apps | Enhancement | High | Document DraggableWishlistGallery/DraggableInspirationGallery migration. Critical for REPA-009, REPA-010. Write in Q1 2026. |
| 26 | Error handling best practices guide | Enhancement | Medium | Storybook examples for common error scenarios. Write in Q1 2026. |
| 27 | TypeScript generic wrapper examples | Enhancement | Medium | Boilerplate for typed wrappers. Document in Q1 2026. |

### Summary

- **ACs added**: 0 (all 34 existing ACs are MVP-complete)
- **KB entries created**: 27 non-blocking items documented for future work
- **Mode**: autonomous
- **Verdict**: CONDITIONAL PASS - Ready for implementation with split recommendation noted
