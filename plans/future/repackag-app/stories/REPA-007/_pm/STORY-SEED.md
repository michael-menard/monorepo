---
generated: "2026-02-10"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: REPA-007

## Reality Context

### Baseline Status
- Loaded: No
- Date: N/A
- Gaps: No baseline reality file found in plans/baselines/. Proceeding with codebase scanning only.

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
- Unknown (no baseline reality available)
- Risk: May conflict with any active wishlist/inspiration gallery work

### Constraints to Respect
- @repo/gallery already has dnd-kit dependencies (6.3.1, ^10.0.0, 3.2.2)
- Both apps use identical dnd-kit patterns (PointerSensor, TouchSensor, closestCenter, rectSortingStrategy)
- Both apps implement undo/redo flow with 5-second window
- Both apps use framer-motion for animations

---

## Retrieved Context

### Related Endpoints
- None - This is a frontend-only component story

### Related Components

**@repo/gallery existing exports:**
- GalleryGrid - Used for responsive grid layout
- GalleryCard, GalleryCardSkeleton - Base card components
- GalleryFilterBar, GallerySearch, GallerySort - Filter/sort UI
- GalleryLightbox, GalleryEmptyState, GallerySkeleton - Supporting components
- Hooks: useInfiniteScroll, useLightbox, useGalleryState, useViewMode, useMultiSort

**Wishlist Gallery drag components (to consolidate):**
- DraggableWishlistGallery (726 LOC) - Main draggable gallery container
- SortableWishlistCard - Individual sortable card wrapper
- WishlistDragPreview - Drag overlay preview component
- useKeyboardShortcuts - Keyboard action shortcuts (A, G, Delete, Enter)
- useRovingTabIndex (362 LOC) - Arrow key navigation with roving tabindex
- useAnnouncer (wishlist version) - Screen reader announcements

**Inspiration Gallery drag components (to consolidate):**
- DraggableInspirationGallery (643 LOC) - Main draggable gallery container
- SortableInspirationCard - Individual sortable card wrapper
- InspirationDragPreview - Drag overlay preview component
- useAnnouncer (153 LOC, inspiration version) - Screen reader announcements

**Estimated elimination**: ~1,369 LOC from main implementations + duplicated hooks

### Reuse Candidates

**@dnd-kit patterns from both apps:**
```typescript
// Common sensor configuration
useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 5 } })

// Common DndContext configuration
closestCenter // collision detection
rectSortingStrategy // sortable strategy
autoScroll: { enabled: true, threshold: { x: 0.2, y: 0.1 }, acceleration: 10 }
```

**Undo/Redo flow (identical in both apps):**
- UndoContext state management with originalOrder, originalItems, timeoutId
- 5-second undo window with toast UI
- Rollback on API failure with retry button
- Optimistic updates + pessimistic rollback

**Keyboard navigation patterns:**
- useRovingTabIndex for arrow key navigation (2D grid)
- useAnnouncer for screen reader announcements (aria-live regions)
- Keyboard shortcuts (A, G, Delete, Enter keys)
- Focus management with itemRefs

**Packages to leverage:**
- @dnd-kit/core (already in @repo/gallery)
- @dnd-kit/sortable (already in @repo/gallery)
- @dnd-kit/utilities (already in @repo/gallery)
- framer-motion (already in @repo/gallery)
- sonner for toast UI (from app-component-library)

---

## Knowledge Context

### Lessons Learned
LESSONS-LEARNED.md is deprecated per KNOW-043. No lessons loaded via kb_search.

### Blockers to Avoid (from past stories)
- None identified (no lessons loaded)

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Not applicable (frontend-only story) |
| ADR-005 | Testing Strategy | E2E tests in Dev Phase required |
| ADR-006 | E2E Tests Required in Dev Phase | At least one happy-path E2E test per story during dev implementation |

**Relevant to REPA-007:**
- ADR-005 & ADR-006: E2E tests required during implementation, not deferred to UAT
- Must use live resources (no MSW mocking) for E2E tests
- Keyboard navigation and accessibility must be E2E testable

### Patterns to Follow
- **Zod-first types** (per CLAUDE.md): All data structures use Zod schemas, infer TypeScript types
- **Named exports** (per CLAUDE.md): No barrel files, no default exports
- **Component directory structure** (per CLAUDE.md): index.tsx, __tests__/, __types__/, utils/
- **DI pattern for core functions** (from STORY-007): Dependency injection for testability
- **Discriminated union result types** (from STORY-007): `{ success: true, data } | { success: false, error }`
- **Write tests alongside implementation** (from STORY-016): Don't defer tests to fix phase

### Patterns to Avoid
- **Deferred test writing** (STORY-016 lesson): Caused 141-test fix phase
- **Unused imports accumulation** (STORY-016, WRKF-1020, WRKF-1021): Run lint after each file
- **Reading full serverless.yml** (token optimization): Not applicable to this story

---

## Conflict Analysis

No conflicts detected.

**Note:** Without baseline reality, cannot verify if this story conflicts with active work on wishlist or inspiration galleries. Recommend checking with team before implementation.

---

## Story Seed

### Title
Add SortableGallery Component to @repo/gallery

### Description

**Context:**
Both app-wishlist-gallery (726 LOC) and app-inspiration-gallery (643 LOC) implement nearly identical drag-and-drop reordering with dnd-kit. The implementations share:
- PointerSensor + TouchSensor configuration (8px threshold, 300ms delay)
- DndContext with closestCenter collision detection
- SortableContext with rectSortingStrategy
- Undo/redo flow with 5-second window and toast UI
- Keyboard navigation with useRovingTabIndex
- Screen reader support with useAnnouncer
- Optimistic updates with rollback on error

This duplication violates DRY principles and makes bug fixes/improvements require changes in both apps.

**Problem:**
- ~1,369 LOC of duplicated drag-and-drop logic across two apps
- useRovingTabIndex (362 LOC) and useAnnouncer (153 LOC) are app-local, not shared
- Future gallery apps (sets, albums) would need to duplicate this again
- Bug fixes require synchronizing changes across multiple components

**Solution Direction:**
Extract common drag-and-drop patterns into a shared SortableGallery component in @repo/gallery with:
1. Configurable sensor thresholds (default: PointerSensor 8px, TouchSensor 300ms/5px)
2. onReorder callback for API persistence (caller handles RTK Query mutation)
3. Built-in undo/redo flow with configurable timeout (default: 5 seconds)
4. Grid/list layout support via layout prop (reuse GalleryGrid)
5. Keyboard reordering via arrow keys (extract useRovingTabIndex to @repo/gallery/hooks)
6. Accessibility support via aria-live announcements (extract useAnnouncer to @repo/accessibility)
7. DragOverlay slot for custom drag previews
8. Error handling with rollback and retry options

This eliminates ~1,000 LOC from wishlist/inspiration apps while providing reusable patterns for future galleries.

### Initial Acceptance Criteria

**Component API:**
- [ ] AC-1: SortableGallery accepts `items: T[]` generic prop with `id: string` constraint
- [ ] AC-2: SortableGallery accepts `onReorder: (items: T[]) => Promise<void>` callback
- [ ] AC-3: SortableGallery accepts `renderItem: (item: T, index: number) => ReactNode` render prop
- [ ] AC-4: SortableGallery accepts optional `isDraggingEnabled: boolean` (default: true)
- [ ] AC-5: SortableGallery accepts optional `layout: 'grid' | 'list'` (default: 'grid')
- [ ] AC-6: SortableGallery accepts optional `renderDragOverlay: (item: T | null) => ReactNode`

**Drag-and-Drop Behavior:**
- [ ] AC-7: PointerSensor activates at 8px threshold (configurable via sensorConfig prop)
- [ ] AC-8: TouchSensor activates at 300ms delay, 5px tolerance (configurable)
- [ ] AC-9: Uses closestCenter collision detection
- [ ] AC-10: Uses rectSortingStrategy for grid layouts
- [ ] AC-11: Auto-scroll enabled with 20%/10% threshold, 10px/ms acceleration
- [ ] AC-12: Optimistic local reorder immediately on drag end
- [ ] AC-13: Calls onReorder callback with reordered items array

**Undo/Redo Flow:**
- [ ] AC-14: Shows success toast with "Undo" button after successful reorder
- [ ] AC-15: Undo button calls onReorder with original order
- [ ] AC-16: Toast auto-dismisses after 5 seconds (configurable via undoTimeout prop)
- [ ] AC-17: New drag cancels previous undo window
- [ ] AC-18: Undo button disabled while undo is in progress

**Error Handling:**
- [ ] AC-19: Rolls back to original order if onReorder throws error
- [ ] AC-20: Shows error toast with "Retry" button on failure
- [ ] AC-21: Retry button re-calls onReorder with pending payload
- [ ] AC-22: Accepts optional `onError: (error: unknown) => void` callback

**Keyboard Navigation:**
- [ ] AC-23: Arrow keys navigate between items (extract useRovingTabIndex to @repo/gallery/hooks)
- [ ] AC-24: Home/End keys jump to first/last item
- [ ] AC-25: Single Tab stop into gallery (roving tabindex pattern)
- [ ] AC-26: Arrow key navigation wraps horizontally (configurable)

**Accessibility:**
- [ ] AC-27: ARIA live region announces drag start, drag end, drop
- [ ] AC-28: ARIA live region announces undo/redo actions
- [ ] AC-29: Extract useAnnouncer to @repo/accessibility
- [ ] AC-30: role="list" on container, role="listitem" on cards
- [ ] AC-31: Cards have aria-label with position info (e.g., "Item 3 of 10")

**Layout Support:**
- [ ] AC-32: layout="grid" uses GalleryGrid with configurable columns
- [ ] AC-33: layout="list" uses vertical stacking with full width
- [ ] AC-34: Framer Motion animations on reorder (layout prop)

### Non-Goals
- **Backend API changes**: Caller handles RTK Query mutations and API integration
- **Multi-select drag**: Single-item drag only (not needed per index entry)
- **Drag between galleries**: Single gallery reordering only
- **Custom sensors**: PointerSensor and TouchSensor only (covers 99% of use cases)
- **Drag handles**: Cards are fully draggable (apps can add custom drag handles via renderItem)
- **Optimistic update strategies**: Caller decides optimistic vs pessimistic updates
- **Toast UI customization**: Uses sonner defaults (apps can override via CSS)
- **Keyboard shortcuts beyond navigation**: Apps handle domain-specific shortcuts (A, G, Delete keys)

### Reuse Plan

**Components:**
- GalleryGrid (existing) - for grid layout mode
- Button (from @repo/app-component-library) - for Undo/Retry buttons
- toast (sonner via @repo/app-component-library) - for success/error toasts

**Patterns:**
- DndContext + SortableContext from @dnd-kit/core, @dnd-kit/sortable
- arrayMove from @dnd-kit/sortable for reordering
- Framer Motion layout animations for smooth transitions
- Zod schemas for prop validation (per CLAUDE.md)

**Packages:**
- @dnd-kit/core (already in @repo/gallery package.json)
- @dnd-kit/sortable (already in @repo/gallery package.json)
- @dnd-kit/utilities (already in @repo/gallery package.json)
- framer-motion (already in @repo/gallery package.json)
- zod (already in @repo/gallery package.json)

**Extracted Hooks:**
- useRovingTabIndex (362 LOC) → @repo/gallery/hooks/useRovingTabIndex
- useAnnouncer (153 LOC) → @repo/accessibility/hooks/useAnnouncer

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- **E2E testing required** (ADR-005, ADR-006): Must write at least one happy-path E2E test during dev phase
- **Keyboard navigation E2E**: Test arrow keys, Home, End, Tab navigation with Playwright
- **Accessibility testing**: Use axe-core for ARIA compliance, test screen reader announcements
- **Multi-browser testing**: Drag-and-drop behavior can vary (Chrome, Firefox, Safari)
- **Touch device testing**: TouchSensor requires mobile/tablet simulation
- **Test coverage target**: 80%+ for core reordering logic, undo flow, keyboard navigation
- **Reuse test patterns**: Reference DraggableWishlistGallery.__tests__ for test structure
- **Mock patterns**: RTK Query mutations, toast library, window.ResizeObserver

### For UI/UX Advisor
- **API surface complexity**: 15+ props (items, onReorder, renderItem, layout, sensorConfig, etc.)
  - Recommendation: Provide sensible defaults, document common patterns in Storybook
- **Generic item type**: `items: T[]` requires TypeScript generic - may confuse beginners
  - Recommendation: Provide typed wrapper examples (e.g., `SortableWishlistGallery = SortableGallery<WishlistItem>`)
- **Render prop pattern**: `renderItem` vs component composition
  - Recommendation: Render prop is more flexible for this use case (allows custom card logic)
- **Undo toast position**: Currently bottom-right in both apps
  - Recommendation: Make position configurable (default: bottom-right)
- **Error handling UX**: Rollback + retry vs other strategies
  - Recommendation: Document error handling patterns in Storybook examples
- **Drag handle flexibility**: Full-card drag vs dedicated handle
  - Recommendation: Let renderItem provide custom handle via SortableContext useSortable hook

### For Dev Feasibility
- **Generic TypeScript complexity**: `SortableGallery<T extends { id: string }>` requires advanced TypeScript
  - Risk: Generic constraints may not cover all use cases (e.g., uuid vs string id)
  - Mitigation: Use `{ id: string }` as minimal constraint, document extension patterns
- **Sensor configuration flexibility**: 8px threshold works for both apps, but may not cover all cases
  - Risk: Over-engineering sensor config leads to API bloat
  - Mitigation: Provide sensorConfig prop but default to tested values
- **Undo state management**: useRef for undo context vs useState
  - Decision: Use useRef (avoids re-renders on undo state changes)
- **Toast library coupling**: Depends on sonner (already in @repo/app-component-library)
  - Risk: If apps switch toast libraries, SortableGallery breaks
  - Mitigation: Accept optional toastAdapter prop for custom toast implementations
- **useRovingTabIndex extraction**: 362 LOC hook with ResizeObserver, grid detection
  - Complexity: Detects columns dynamically if not provided (layout-dependent)
  - Recommendation: Keep in @repo/gallery/hooks (gallery-specific use case)
- **useAnnouncer extraction**: 153 LOC hook for aria-live regions
  - Complexity: Simple enough for @repo/accessibility
  - Recommendation: Extract to @repo/accessibility/hooks (reusable beyond galleries)
- **Framer Motion animations**: layout prop on motion.div
  - Risk: Performance issues with large galleries (>100 items)
  - Mitigation: Document performance considerations, provide disableAnimations prop
- **RTK Query integration**: Caller handles mutations (onReorder callback)
  - Risk: API design may not cover all mutation patterns (e.g., bulk reorder, undo via mutation)
  - Mitigation: Document common patterns (optimistic updates, error handling)

**Implementation sizing warning**: Story index notes "5 SP with many features"
- 34 acceptance criteria across component API, drag behavior, undo flow, keyboard nav, accessibility, layout
- Extract 2 hooks (useRovingTabIndex 362 LOC, useAnnouncer 153 LOC)
- Create 1 main component (~600 LOC based on existing implementations)
- Write comprehensive tests (E2E + unit, likely ~400+ LOC)
- Storybook examples for common patterns (~200 LOC)
- **Total estimated LOC**: ~1,700 LOC new code + documentation

**Recommendation**: Consider splitting into 2 stories:
1. REPA-007a: SortableGallery Core (drag-and-drop, undo, basic keyboard nav) - 3 SP
2. REPA-007b: Advanced Features (custom sensors, layout modes, full a11y) - 2 SP
