---
generated: "2026-02-10"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: REPA-009

## Reality Context

### Baseline Status
- Loaded: No
- Date: N/A
- Gaps: No baseline reality file exists in plans/baselines/. This story relies entirely on codebase scanning and the stories index for context.

### Relevant Existing Features

| Feature | Location | Status |
|---------|----------|--------|
| GalleryCard base component | packages/core/gallery/src/components/GalleryCard.tsx | Completed (315 LOC) |
| InspirationCard | apps/web/app-inspiration-gallery/src/components/InspirationCard/index.tsx | Completed (220 LOC) |
| AlbumCard | apps/web/app-inspiration-gallery/src/components/AlbumCard/index.tsx | Completed (227 LOC) |
| WishlistCard | apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx | Completed (309 LOC) |
| SortableGallery | packages/core/gallery/src/components/SortableGallery/index.tsx | In-progress (REPA-007, 600 LOC) |
| useRovingTabIndex | packages/core/gallery/src/hooks/useRovingTabIndex.ts | Completed (REPA-008) |
| useAnnouncer | packages/core/accessibility/src/hooks/useAnnouncer.tsx | Completed (REPA-008) |
| useKeyboardShortcuts | packages/core/gallery/src/hooks/useKeyboardShortcuts.ts | Completed (REPA-008) |
| SortableInspirationCard | apps/web/app-inspiration-gallery/src/components/SortableInspirationCard/index.tsx | Completed (~80 LOC, wraps with useSortable) |
| SortableWishlistCard | apps/web/app-wishlist-gallery/src/components/SortableWishlistCard/index.tsx | Completed (~80 LOC, wraps with useSortable) |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| REPA-007: Add SortableGallery Component | In-progress | **HIGH** - REPA-009 depends on REPA-007 completing. SortableGallery needs selection and drag handle support. |
| REPA-008: Add Gallery Keyboard Hooks | In-progress | LOW - Already extracted useRovingTabIndex and useAnnouncer. No overlap. |
| REPA-004: Migrate Image Processing | In-progress | NONE - Different domain (upload vs gallery). |
| REPA-012: Create @repo/auth-hooks Package | In-progress | NONE - Different domain (auth vs gallery). |
| REPA-013: Create @repo/auth-utils Package | In-progress | NONE - Different domain (auth vs gallery). |
| REPA-019: Add Error Mapping to @repo/api-client | In-progress | NONE - Different domain (API client vs gallery). |

### Constraints to Respect

**Dependencies**:
- MUST wait for REPA-007 (SortableGallery) to complete before starting REPA-009
- SHOULD leverage REPA-008 keyboard hooks (useRovingTabIndex, useAnnouncer) in enhanced GalleryCard

**Code Style** (from CLAUDE.md):
- MUST use Zod schemas for all type definitions (no TypeScript interfaces)
- MUST use named exports (no default exports)
- MUST maintain test coverage at 45% minimum
- MUST use @repo/ui for all UI components (Button, Card, etc.)
- MUST use @repo/logger for logging (never console.log)

**Component Architecture** (from existing patterns):
- GalleryCard is a generic base component (aspect ratios, image handling, title/subtitle/metadata slots)
- Domain cards (InspirationCard, AlbumCard, WishlistCard) wrap or extend GalleryCard with domain-specific logic
- Sortable variants (SortableInspirationCard, SortableWishlistCard) wrap domain cards with useSortable from dnd-kit

**Protected Features**:
- Existing GalleryCard API (image, title, subtitle, metadata, actions, onClick, href, selected, loading props)
- Existing domain card implementations (InspirationCard, AlbumCard, WishlistCard) must continue working
- SortableGallery component interface from REPA-007

---

## Retrieved Context

### Related Components

**Base Gallery Card** (`packages/core/gallery/src/components/GalleryCard.tsx`):
- Current props: image, title, subtitle, metadata, actions, onClick, href, selected, loading, className
- Image container with aspect ratio support (4/3, 16/9, 1/1, auto)
- Actions overlay (top-right, opacity-0 on hover)
- Interactive states (hover, focus-visible, selected)
- Accessibility: role="button", aria-label, aria-selected, keyboard handlers (Enter/Space)
- NO selection mode support (no checkbox overlay)
- NO drag handle support
- NO hover overlay prop (uses fixed gradient for actions)

**InspirationCard** (`apps/web/app-inspiration-gallery/src/components/InspirationCard/index.tsx`):
- Wraps Card (not GalleryCard) with custom implementation
- Has selection mode: selectionMode prop, isSelected prop, onSelect callback
- Selection checkbox overlay (top-left, absolute positioned)
- Hover overlay with gradient (from-black/60 via-transparent to-transparent)
- Top actions (source link, more menu) in hover overlay
- Bottom info in hover overlay (title, badges, tags)
- Does NOT use GalleryCard (custom implementation)

**AlbumCard** (`apps/web/app-inspiration-gallery/src/components/AlbumCard/index.tsx`):
- Wraps Card (not GalleryCard) with custom implementation
- Has selection mode: selectionMode prop, isSelected prop, onSelect callback
- Selection checkbox overlay (top-left, absolute positioned)
- Stacked card effect (visual depth with pseudo-elements)
- Item count badge (bottom-right, always visible)
- Hover overlay with gradient and folder icon
- Does NOT use GalleryCard (custom implementation)

**WishlistCard** (`apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx`):
- DOES use GalleryCard (wraps it with domain-specific metadata)
- NO selection mode support (no selectionMode or isSelected props)
- Uses GalleryCard's metadata slot for store badge, price, piece count, priority, build status, action buttons
- Wraps GalleryCard in a div for keyboard navigation (ref, role, tabIndex, aria-label, onClick, onKeyDown)
- Uses focusRingClasses from @repo/accessibility for focus styling

**SortableInspirationCard/SortableWishlistCard**:
- Both wrap domain cards with useSortable from dnd-kit
- Add drag handle with GripVertical icon (absolute positioned, top-right or top-left)
- Drag handle has touch target 44x44px for WCAG 2.5.5 compliance
- Visible on hover (desktop) or always visible (mobile)
- Apply transform and transition from useSortable for drag animations
- Set opacity during drag (0.5 for dragged item)

### Reuse Candidates

**Components**:
- GalleryCard (base component, needs enhancement for selection and drag)
- Card from @repo/app-component-library (used by InspirationCard and AlbumCard)
- Button from @repo/app-component-library (used in actions)
- AppBadge from @repo/app-component-library (used by WishlistCard)

**Hooks**:
- useRovingTabIndex from @repo/gallery (keyboard navigation)
- useAnnouncer from @repo/accessibility (screen reader announcements)
- useSortable from @dnd-kit/sortable (drag-and-drop behavior)

**Icons** (from lucide-react):
- GripVertical (drag handle)
- Check (selection checkmark)
- ExternalLink, MoreVertical, Folder, FolderOpen, Link2, Puzzle, Star, Trash2 (various actions/badges)

**Utilities**:
- focusRingClasses from @repo/accessibility (focus styling)
- cn from @repo/app-component-library (className merging)

### Patterns from Existing Cards

**Selection Mode Pattern** (InspirationCard, AlbumCard):
```tsx
// Props
selectionMode: boolean
isSelected: boolean
onSelect?: (selected: boolean) => void

// Click behavior
const handleClick = () => {
  if (selectionMode && onSelect) {
    onSelect(!isSelected)
  } else if (onClick) {
    onClick()
  }
}

// Checkbox overlay (top-left)
{selectionMode && (
  <div className="absolute top-2 left-2 z-10">
    <div className={cn(
      'flex h-6 w-6 items-center justify-center rounded-full border-2',
      isSelected
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-white bg-black/40 text-white'
    )}>
      {isSelected && <Check className="h-4 w-4" />}
    </div>
  </div>
)}
```

**Drag Handle Pattern** (SortableInspirationCard, SortableWishlistCard):
```tsx
// useSortable hook
const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
  id: item.id,
  disabled: !isDraggingEnabled,
})

// Drag handle (top-right or top-left)
<button
  {...listeners}
  {...attributes}
  className={cn(
    'absolute top-2 right-2 z-10',
    'flex h-11 w-11 items-center justify-center rounded-md',
    'bg-background/80 backdrop-blur-sm border border-border',
    'cursor-grab active:cursor-grabbing',
    'opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100',
    'transition-opacity duration-200',
    'touch-none' // WCAG 2.5.5: 44x44px target
  )}
  aria-label={`Drag to reorder ${title}`}
>
  <GripVertical className="h-5 w-5 text-muted-foreground" />
</button>
```

**Hover Overlay Pattern** (InspirationCard, AlbumCard):
```tsx
<div className={cn(
  'absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent',
  'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
)}>
  {/* Content goes here (title, badges, etc.) */}
</div>
```

---

## Knowledge Context

### Lessons Learned

No lessons learned database queried (no baseline reality file). Relying on codebase patterns and index notes.

### Blockers to Avoid (from past stories)

- **API path mismatch**: Not applicable (frontend-only story)
- **Reading full serverless.yml**: Not applicable (no backend changes)
- **Duplicate code across apps**: This story ELIMINATES duplicates by enhancing GalleryCard

### Architecture Decisions (ADRs)

No ADR-LOG.md found in plans/future/repackag-app/. Relying on project-level CLAUDE.md conventions.

### Patterns to Follow

**From CLAUDE.md**:
1. Use Zod schemas for all type definitions (z.infer for TypeScript types)
2. Named exports only (no default exports)
3. Component directory structure: index.tsx, __tests__/, __types__/, utils/
4. Import UI components from @repo/ui (Button, Card, etc.)
5. Never use console.log (use @repo/logger)
6. Minimum 45% test coverage

**From existing GalleryCard**:
1. Generic base component with slots (metadata, actions)
2. Image container with aspect ratio support
3. Interactive states (hover, focus-visible, selected)
4. Accessibility-first (ARIA labels, keyboard handlers)

**From existing domain cards**:
1. Wrap or extend GalleryCard with domain-specific logic
2. Selection mode is opt-in (selectionMode prop)
3. Drag-and-drop is opt-in (via Sortable wrapper)

### Patterns to Avoid

1. Creating barrel files (index.ts re-exports) - PROHIBITED by CLAUDE.md
2. Using console.log - PROHIBITED by CLAUDE.md
3. Using TypeScript interfaces without Zod schemas - PROHIBITED by CLAUDE.md
4. Importing shadcn components from individual paths - PROHIBITED by CLAUDE.md
5. Duplicating logic across domain cards (this story eliminates that)

---

## Conflict Analysis

### Conflict: REPA-007 Dependency
- **Severity**: warning
- **Description**: REPA-009 depends on REPA-007 (SortableGallery) completing. SortableGallery currently does not expose selection mode or drag handle customization. If REPA-007 completes without these features, REPA-009 will need to add them to SortableGallery or handle them separately in the cards.
- **Resolution Hint**: Coordinate with REPA-007 implementation to ensure SortableGallery supports:
  1. Selection mode (multi-select state management)
  2. Drag handle customization (dragHandlePosition prop)
  3. Hover overlay customization (hoverOverlay slot)

  OR accept that REPA-009 will focus on GalleryCard enhancements only, and selection/drag handle features will be added to SortableGallery in a separate story (REPA-009b).

---

## Story Seed

### Title
Enhance GalleryCard with Selection & Drag Handle Support

### Description

**Context**:
GalleryCard is the base gallery component in @repo/gallery (315 LOC), providing a generic card with image, title, subtitle, metadata, and actions slots. However, domain-specific cards like InspirationCard and AlbumCard (220 and 227 LOC respectively) do NOT use GalleryCard. Instead, they wrap @repo/app-component-library's Card with custom implementations that include selection mode (checkbox overlay) and hover overlays.

Similarly, SortableInspirationCard and SortableWishlistCard (~80 LOC each) wrap domain cards with useSortable from dnd-kit and add drag handles with GripVertical icons.

This duplication creates:
- Inconsistent selection UI across gallery apps
- Duplicate checkbox overlay logic (InspirationCard, AlbumCard)
- Duplicate drag handle logic (SortableInspirationCard, SortableWishlistCard)
- InspirationCard and AlbumCard cannot leverage GalleryCard's image handling, accessibility, or interactive states

**Problem**:
GalleryCard lacks native support for:
1. Selection mode (selectable, selected, onSelect, selectionPosition props)
2. Drag handles (draggable, dragHandlePosition props)
3. Hover overlays (hoverOverlay prop for custom content)

This forces domain cards to either bypass GalleryCard entirely (InspirationCard, AlbumCard) or wrap it with additional div containers (WishlistCard) or sortable wrappers (SortableInspirationCard, SortableWishlistCard).

**Proposed Solution**:
Enhance GalleryCard to natively support:
1. **Selection mode**: Add optional selectable, selected, onSelect, selectionPosition ('top-left' | 'top-right') props. When selectable=true, render a checkbox overlay at selectionPosition. Clicking the card in selection mode calls onSelect(!selected).
2. **Drag handles**: Add optional draggable, dragHandlePosition ('top-left' | 'top-right') props. When draggable=true, render a drag handle button with GripVertical icon at dragHandlePosition. Expose drag handle listeners via renderDragHandle render prop for dnd-kit integration.
3. **Hover overlay**: Add optional hoverOverlay prop (ReactNode) to inject custom content into the image hover overlay. This allows domain cards to add custom hover content (title, badges, tags) without duplicating the gradient overlay logic.

Once GalleryCard supports these features:
- Simplify InspirationCard to use GalleryCard instead of Card (eliminate ~100 LOC of duplicate image/overlay logic)
- Simplify AlbumCard to use GalleryCard instead of Card (eliminate ~100 LOC of duplicate image/overlay logic)
- Eliminate SortableInspirationCard and SortableWishlistCard wrappers (move drag handle into GalleryCard)

This consolidates selection, drag, and hover overlay patterns into a single base component, eliminating ~300 LOC of duplicated code across apps.

**Reality Grounding**:
- GalleryCard already exists with image, title, subtitle, metadata, actions slots
- InspirationCard and AlbumCard have working selection mode (selectionMode, isSelected, onSelect)
- SortableInspirationCard and SortableWishlistCard have working drag handles (GripVertical icon, 44x44px touch target)
- REPA-007 (SortableGallery) is in-progress and will provide drag-and-drop infrastructure
- REPA-008 keyboard hooks (useRovingTabIndex, useAnnouncer) are completed and available

### Initial Acceptance Criteria

**AC-1: Selection Mode Props**
- [ ] GalleryCard accepts selectable: boolean (default: false)
- [ ] GalleryCard accepts selected: boolean (default: false)
- [ ] GalleryCard accepts onSelect: (selected: boolean) => void callback
- [ ] GalleryCard accepts selectionPosition: 'top-left' | 'top-right' (default: 'top-left')
- [ ] Zod schema GalleryCardPropsSchema updated to include new props

**AC-2: Selection Checkbox Overlay**
- [ ] When selectable=true, render checkbox overlay at selectionPosition
- [ ] Checkbox is 24x24px (h-6 w-6) with rounded-full border-2
- [ ] Selected state: border-primary bg-primary text-primary-foreground with Check icon
- [ ] Unselected state: border-white bg-black/40 text-white (no icon)
- [ ] Checkbox overlay is absolute positioned at top-2 left-2 (or right-2 if selectionPosition='top-right')
- [ ] Checkbox overlay has z-10 to appear above image

**AC-3: Selection Click Behavior**
- [ ] When selectable=true and onClick is undefined, clicking card calls onSelect(!selected)
- [ ] When selectable=true and onClick is defined, clicking card calls onClick (not onSelect)
- [ ] Keyboard activation (Enter/Space) follows same behavior as click
- [ ] Clicking checkbox directly calls onSelect(!selected) and stops propagation

**AC-4: Drag Handle Props**
- [ ] GalleryCard accepts draggable: boolean (default: false)
- [ ] GalleryCard accepts dragHandlePosition: 'top-left' | 'top-right' (default: 'top-right')
- [ ] GalleryCard accepts renderDragHandle: (listeners, attributes) => ReactNode render prop
- [ ] Zod schema updated to include new props

**AC-5: Drag Handle Rendering**
- [ ] When draggable=true, render drag handle button at dragHandlePosition
- [ ] Default drag handle: GripVertical icon, 44x44px touch target (h-11 w-11)
- [ ] Drag handle is absolute positioned at top-2 right-2 (or left-2 if dragHandlePosition='top-left')
- [ ] Drag handle has z-10 to appear above image
- [ ] Drag handle has opacity-0 group-hover:opacity-100 transition (desktop) or always visible (mobile)
- [ ] Drag handle has cursor-grab active:cursor-grabbing
- [ ] If renderDragHandle is provided, use custom render function instead of default

**AC-6: Drag Handle Accessibility**
- [ ] Drag handle button has aria-label: "Drag to reorder {title}"
- [ ] Drag handle button accepts {...listeners} {...attributes} from useSortable
- [ ] Drag handle button has touch-none class (WCAG 2.5.5: prevent scroll interference)

**AC-7: Hover Overlay Prop**
- [ ] GalleryCard accepts hoverOverlay: ReactNode (optional)
- [ ] When hoverOverlay is provided, render it in absolute inset-0 container
- [ ] Hover overlay container has bg-gradient-to-t from-black/60 via-transparent to-transparent
- [ ] Hover overlay container has opacity-0 group-hover:opacity-100 transition-opacity duration-200
- [ ] Hover overlay container has z-10 to appear above image but below selection/drag overlays

**AC-8: Simplify InspirationCard**
- [ ] Refactor InspirationCard to wrap GalleryCard instead of Card
- [ ] Use GalleryCard's selectable, selected, onSelect, selectionPosition props
- [ ] Use GalleryCard's hoverOverlay prop for title, badges, tags
- [ ] Remove duplicate image container, checkbox overlay, hover overlay logic
- [ ] Maintain existing InspirationCard API (props remain the same)
- [ ] All existing InspirationCard tests pass

**AC-9: Simplify AlbumCard**
- [ ] Refactor AlbumCard to wrap GalleryCard instead of Card
- [ ] Use GalleryCard's selectable, selected, onSelect, selectionPosition props
- [ ] Use GalleryCard's hoverOverlay prop for title, description, badges
- [ ] Remove duplicate image container, checkbox overlay, hover overlay logic
- [ ] Maintain stacked card effect (move to wrapper div outside GalleryCard)
- [ ] Maintain existing AlbumCard API (props remain the same)
- [ ] All existing AlbumCard tests pass

**AC-10: Test Coverage**
- [ ] GalleryCard.test.tsx updated with tests for selectable, selected, onSelect
- [ ] GalleryCard.test.tsx updated with tests for draggable, dragHandlePosition, renderDragHandle
- [ ] GalleryCard.test.tsx updated with tests for hoverOverlay
- [ ] InspirationCard.test.tsx updated to verify GalleryCard integration
- [ ] AlbumCard.test.tsx updated to verify GalleryCard integration
- [ ] Minimum 45% overall test coverage maintained

**AC-11: Documentation**
- [ ] GalleryCard TSDoc updated with examples for selection mode
- [ ] GalleryCard TSDoc updated with examples for drag handles
- [ ] GalleryCard TSDoc updated with examples for hover overlay
- [ ] Update packages/core/gallery/README.md with new GalleryCard features

### Non-Goals

**Eliminate SortableInspirationCard/SortableWishlistCard wrappers**: This story focuses on GalleryCard enhancements. Eliminating sortable wrappers will be handled in REPA-010 (Refactor app-inspiration-gallery to Use @repo/gallery) after REPA-007 (SortableGallery) is complete.

**Multi-select state management**: GalleryCard provides the UI (checkbox overlay, onSelect callback). Parent components (galleries, pages) manage multi-select state. No built-in state management in GalleryCard.

**Drag-and-drop coordination**: GalleryCard provides the drag handle UI and exposes listeners/attributes. Parent components (SortableGallery from REPA-007) manage drag-and-drop coordination via DndContext and useSortable.

**WishlistCard refactoring**: WishlistCard already uses GalleryCard. This story does not change WishlistCard (no selection mode in wishlist app currently).

**SetCard or InstructionCard refactoring**: Out of scope. Future work in REPA-010+ stories.

**Backend API changes**: Frontend-only story. No API or database changes.

### Reuse Plan

**Components**:
- GalleryCard (enhance with selection, drag, hover overlay support)
- Card from @repo/app-component-library (keep for non-gallery use cases)
- Button from @repo/app-component-library (use in drag handle if needed)
- Check icon from lucide-react (selection checkbox)
- GripVertical icon from lucide-react (drag handle)

**Hooks**:
- useSortable from @dnd-kit/sortable (parent components manage drag-and-drop)
- useRovingTabIndex from @repo/gallery (keyboard navigation)
- useAnnouncer from @repo/accessibility (screen reader announcements)

**Utilities**:
- focusRingClasses from @repo/accessibility (focus styling)
- cn from @repo/app-component-library (className merging)

**Patterns**:
- Selection mode pattern from InspirationCard/AlbumCard (selectionMode, isSelected, onSelect)
- Drag handle pattern from SortableInspirationCard/SortableWishlistCard (GripVertical, 44x44px, hover/always visible)
- Hover overlay pattern from InspirationCard/AlbumCard (gradient, opacity transition)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- Verify selection checkbox renders at correct position (top-left vs top-right)
- Verify drag handle renders at correct position (top-left vs top-right)
- Verify selection click behavior (selectable=true with onClick vs without onClick)
- Verify keyboard activation (Enter/Space) for selection mode
- Verify hover overlay content renders inside gradient overlay
- Verify InspirationCard and AlbumCard refactors maintain existing behavior (regression testing)
- Verify WCAG 2.5.5 compliance (44x44px touch target for drag handle)
- Consider visual regression tests for GalleryCard states (selected, draggable, hover overlay)

### For UI/UX Advisor
- Design review: Selection checkbox position (top-left vs top-right)
- Design review: Drag handle position (top-left vs top-right)
- Design review: Drag handle visibility (hover vs always visible on mobile)
- Design review: Hover overlay gradient (from-black/60 via-transparent to-transparent)
- Design review: z-index layering (image < hover overlay < selection/drag overlays)
- Accessibility review: ARIA labels for drag handle ("Drag to reorder {title}")
- Accessibility review: Focus indicators for selection checkbox and drag handle
- Consider: Should drag handle and selection checkbox coexist? If so, which position for each?

### For Dev Feasibility
- Review REPA-007 (SortableGallery) implementation to ensure compatibility with GalleryCard enhancements
- Consider: Should drag handle listeners/attributes be passed via renderDragHandle or directly via props?
- Consider: Should hoverOverlay replace actions overlay or coexist with it?
- Verify dnd-kit integration: useSortable listeners/attributes can be forwarded to GalleryCard drag handle
- Plan migration path for InspirationCard and AlbumCard (refactor in place or create new components?)
- Estimate: ~200 LOC for GalleryCard enhancements, ~100 LOC deleted from InspirationCard, ~100 LOC deleted from AlbumCard
- Risk: If REPA-007 does not support selection mode in SortableGallery, this story may need to add that feature
