---
id: REPA-009
title: "Enhance GalleryCard with Selection & Drag Handle Support"
epic: repackag-app
status: ready-to-work
priority: P2
story_points: 5
experiment_variant: control
depends_on: [REPA-007]
created: 2026-02-10
updated: 2026-02-10
tags: [frontend, component-library, gallery, refactor]
surfaces: [frontend]
---

# REPA-009: Enhance GalleryCard with Selection & Drag Handle Support

## Context

**Current State**:
GalleryCard is the base gallery component in @repo/gallery (315 LOC), providing a generic card with image, title, subtitle, metadata, and actions slots. However, domain-specific cards like InspirationCard and AlbumCard (220 and 227 LOC respectively) do NOT use GalleryCard. Instead, they wrap @repo/app-component-library's Card with custom implementations that include selection mode (checkbox overlay) and hover overlays.

Similarly, SortableInspirationCard and SortableWishlistCard (~80 LOC each) wrap domain cards with useSortable from dnd-kit and add drag handles with GripVertical icons.

**Problem**:
This duplication creates:
- Inconsistent selection UI across gallery apps
- Duplicate checkbox overlay logic (InspirationCard, AlbumCard)
- Duplicate drag handle logic (SortableInspirationCard, SortableWishlistCard)
- InspirationCard and AlbumCard cannot leverage GalleryCard's image handling, accessibility, or interactive states

GalleryCard lacks native support for:
1. Selection mode (selectable, selected, onSelect, selectionPosition props)
2. Drag handles (draggable, dragHandlePosition props)
3. Hover overlays (hoverOverlay prop for custom content)

This forces domain cards to either bypass GalleryCard entirely (InspirationCard, AlbumCard) or wrap it with additional div containers (WishlistCard) or sortable wrappers (SortableInspirationCard, SortableWishlistCard).

**Reality Grounding**:
- GalleryCard already exists with image, title, subtitle, metadata, actions slots
- InspirationCard and AlbumCard have working selection mode (selectionMode, isSelected, onSelect)
- SortableInspirationCard and SortableWishlistCard have working drag handles (GripVertical icon, 44x44px touch target)
- REPA-007 (SortableGallery) is in-progress and will provide drag-and-drop infrastructure
- REPA-008 keyboard hooks (useRovingTabIndex, useAnnouncer) are completed and available

---

## Goal

Enhance GalleryCard to natively support selection mode, drag handles, and hover overlays, enabling InspirationCard and AlbumCard to use GalleryCard instead of custom Card implementations. This consolidates selection, drag, and hover overlay patterns into a single base component, eliminating ~300 LOC of duplicated code across apps.

**Success Criteria**:
- GalleryCard supports selection mode (checkbox overlay at top-left)
- GalleryCard supports drag handles (button with GripVertical at top-right)
- GalleryCard supports custom hover overlay content
- InspirationCard refactored to use GalleryCard (eliminates ~100 LOC)
- AlbumCard refactored to use GalleryCard (eliminates ~100 LOC)
- All existing tests pass post-refactor
- Minimum 45% test coverage maintained

---

## Non-Goals

**Eliminate SortableInspirationCard/SortableWishlistCard wrappers**: This story focuses on GalleryCard enhancements. Eliminating sortable wrappers will be handled in REPA-010 (Refactor app-inspiration-gallery to Use @repo/gallery) after REPA-007 (SortableGallery) is complete.

**Multi-select state management**: GalleryCard provides the UI (checkbox overlay, onSelect callback). Parent components (galleries, pages) manage multi-select state. No built-in state management in GalleryCard.

**Drag-and-drop coordination**: GalleryCard provides the drag handle UI and exposes listeners/attributes. Parent components (SortableGallery from REPA-007) manage drag-and-drop coordination via DndContext and useSortable.

**WishlistCard refactoring**: WishlistCard already uses GalleryCard. This story does not change WishlistCard (no selection mode in wishlist app currently).

**SetCard or InstructionCard refactoring**: Out of scope. Future work in REPA-010+ stories.

**Backend API changes**: Frontend-only story. No API or database changes.

---

## Scope

### Packages Modified

**Core Package**:
- `@repo/gallery` (GalleryCard enhancement)

**App Packages**:
- `app-inspiration-gallery` (InspirationCard and AlbumCard refactors)

### Components Changed

**Enhanced**:
- `packages/core/gallery/src/components/GalleryCard.tsx` (~200 LOC added)

**Refactored**:
- `apps/web/app-inspiration-gallery/src/components/InspirationCard/index.tsx` (~100 LOC removed)
- `apps/web/app-inspiration-gallery/src/components/AlbumCard/index.tsx` (~100 LOC removed)

**Test Files**:
- `packages/core/gallery/src/components/__tests__/GalleryCard.test.tsx` (~150 LOC added)
- `apps/web/app-inspiration-gallery/src/components/InspirationCard/__tests__/InspirationCard.test.tsx` (regression tests)
- `apps/web/app-inspiration-gallery/src/components/AlbumCard/__tests__/AlbumCard.test.tsx` (regression tests)

### Endpoints Touched

None (frontend-only)

### Database Changes

None

### Infrastructure Changes

None

---

## Acceptance Criteria

### AC-1: Selection Mode Props

**Status**: [ ] Not Started

**Description**: GalleryCard accepts selection mode props for checkbox overlay rendering.

**Validation**:
- [ ] GalleryCard accepts `selectable: boolean` (default: false)
- [ ] GalleryCard accepts `selected: boolean` (default: false)
- [ ] GalleryCard accepts `onSelect: (selected: boolean) => void` callback
- [ ] GalleryCard accepts `selectionPosition: 'top-left' | 'top-right'` (default: 'top-left')
- [ ] Zod schema `GalleryCardPropsSchema` updated to include new props
- [ ] TypeScript types inferred from Zod schema (no interface definitions)

**Test Coverage**:
- Unit test: Render GalleryCard with `selectable=true`, verify prop accepted
- Unit test: Verify Zod schema validates selection props correctly
- Unit test: Verify invalid selectionPosition value fails validation

### AC-2: Selection Checkbox Overlay

**Status**: [ ] Not Started

**Description**: When selectable=true, render checkbox overlay at selectionPosition.

**Validation**:
- [ ] When `selectable=true`, render checkbox overlay at selectionPosition
- [ ] Checkbox is 24x24px (h-6 w-6) with rounded-full border-2
- [ ] Selected state: border-primary bg-primary text-primary-foreground with Check icon
- [ ] Unselected state: border-white bg-black/40 text-white (no icon)
- [ ] Checkbox overlay is absolute positioned at top-2 left-2 (or right-2 if selectionPosition='top-right')
- [ ] Checkbox overlay has z-10 to appear above image

**Test Coverage**:
- Unit test: Render with `selectable=true`, verify checkbox renders
- Unit test: Verify checkbox at top-left when `selectionPosition='top-left'`
- Unit test: Verify checkbox at top-right when `selectionPosition='top-right'`
- Unit test: Verify selected state shows Check icon
- Unit test: Verify unselected state has no Check icon
- Snapshot test: Capture selected and unselected states

### AC-3: Selection Click Behavior

**Status**: [ ] Not Started

**Description**: Clicking card in selection mode calls onSelect callback.

**Validation**:
- [ ] When `selectable=true` and `onClick` is undefined, clicking card calls `onSelect(!selected)`
- [ ] When `selectable=true` and `onClick` is defined, clicking card calls `onClick` (not `onSelect`)
- [ ] Keyboard activation (Enter/Space) follows same behavior as click
- [ ] Clicking checkbox directly calls `onSelect(!selected)` and stops propagation

**Test Coverage**:
- Unit test: Click card with `selectable=true`, verify `onSelect` called with `true`
- Unit test: Click card with `selectable=true` and `onClick`, verify `onClick` called, `onSelect` not called
- Unit test: Press Enter key on focused card, verify `onSelect` called
- Unit test: Press Space key on focused card, verify `onSelect` called
- Unit test: Click checkbox directly, verify `onSelect` called and event propagation stopped

### AC-4: Drag Handle Props

**Status**: [ ] Not Started

**Description**: GalleryCard accepts drag handle props for drag-and-drop UI.

**Validation**:
- [ ] GalleryCard accepts `draggable: boolean` (default: false)
- [ ] GalleryCard accepts `dragHandlePosition: 'top-left' | 'top-right'` (default: 'top-right')
- [ ] GalleryCard accepts `renderDragHandle: (listeners, attributes) => ReactNode` render prop (optional)
- [ ] Zod schema updated to include new props

**Test Coverage**:
- Unit test: Render GalleryCard with `draggable=true`, verify prop accepted
- Unit test: Verify Zod schema validates drag handle props correctly

### AC-5: Drag Handle Rendering

**Status**: [ ] Not Started

**Description**: When draggable=true, render drag handle button at dragHandlePosition.

**Validation**:
- [ ] When `draggable=true`, render drag handle button at dragHandlePosition
- [ ] Default drag handle: GripVertical icon, 44x44px touch target (h-11 w-11)
- [ ] Drag handle is absolute positioned at top-2 right-2 (or left-2 if dragHandlePosition='top-left')
- [ ] Drag handle has z-10 to appear above image
- [ ] Drag handle has opacity-0 group-hover:opacity-100 transition on desktop (>=768px)
- [ ] Drag handle always visible on mobile (<768px): uses md:opacity-0 md:group-hover:opacity-100
- [ ] Drag handle has cursor-grab active:cursor-grabbing
- [ ] If `renderDragHandle` is provided, use custom render function instead of default

**Test Coverage**:
- Unit test: Render with `draggable=true`, verify drag handle renders
- Unit test: Verify drag handle at top-right when `dragHandlePosition='top-right'`
- Unit test: Verify drag handle is 44x44px (measure actual size with getBoundingClientRect)
- Unit test: Verify custom `renderDragHandle` used when provided
- Snapshot test: Capture default drag handle state

### AC-6: Drag Handle Accessibility

**Status**: [ ] Not Started

**Description**: Drag handle meets WCAG 2.5.5 touch target size and has proper ARIA labels.

**Validation**:
- [ ] Drag handle button has `aria-label: "Drag to reorder {title}"` (dynamic title)
- [ ] Drag handle button accepts `{...listeners}` `{...attributes}` from useSortable
- [ ] Drag handle button has `touch-none` class (WCAG 2.5.5: prevent scroll interference)
- [ ] Drag handle touch target is minimum 44x44px (verified via getBoundingClientRect)

**Test Coverage**:
- Unit test: Verify drag handle has `aria-label` with card title
- Unit test: Verify drag handle accepts listeners and attributes props
- Unit test: Measure drag handle size, assert >= 44x44px
- Accessibility test: Run axe-core on card with drag handle, verify no violations

### AC-7: Hover Overlay Prop

**Status**: [ ] Not Started

**Description**: GalleryCard accepts hoverOverlay prop for custom hover content.

**Validation**:
- [ ] GalleryCard accepts `hoverOverlay: ReactNode` (optional)
- [ ] When `hoverOverlay` is provided, render it in absolute inset-0 container
- [ ] Hover overlay container has `bg-gradient-to-t from-black/60 via-transparent to-transparent`
- [ ] Hover overlay container has `opacity-0 group-hover:opacity-100 transition-opacity duration-200`
- [ ] Hover overlay container has z-10 to appear above image but below selection/drag overlays

**Test Coverage**:
- Unit test: Render with `hoverOverlay={<div>Custom Content</div>}`, verify content renders
- Unit test: Verify hover overlay has gradient classes
- Unit test: Verify hover overlay has opacity transition classes
- Snapshot test: Capture hover overlay state

### AC-8: Simplify InspirationCard

**Status**: [ ] Not Started

**Description**: Refactor InspirationCard to wrap GalleryCard instead of Card.

**Validation**:
- [ ] Refactor InspirationCard to wrap GalleryCard instead of Card
- [ ] Use GalleryCard's `selectable`, `selected`, `onSelect`, `selectionPosition` props
- [ ] Use GalleryCard's `hoverOverlay` prop for title, badges, tags
- [ ] Remove duplicate image container, checkbox overlay, hover overlay logic
- [ ] Maintain existing InspirationCard API (props remain the same)
- [ ] All existing InspirationCard tests pass

**Test Coverage**:
- Regression test: All existing InspirationCard tests pass
- Integration test: Render InspirationCard with selection mode, verify checkbox renders
- Integration test: Render InspirationCard, verify hover overlay contains title/badges
- Snapshot test: Compare before/after refactor (should match visually)

### AC-9: Simplify AlbumCard

**Status**: [ ] Not Started

**Description**: Refactor AlbumCard to wrap GalleryCard instead of Card.

**Validation**:
- [ ] Refactor AlbumCard to wrap GalleryCard instead of Card
- [ ] Use GalleryCard's `selectable`, `selected`, `onSelect`, `selectionPosition` props
- [ ] Use GalleryCard's `hoverOverlay` prop for title, description, badges
- [ ] Remove duplicate image container, checkbox overlay, hover overlay logic
- [ ] Maintain stacked card effect (move to wrapper div outside GalleryCard)
- [ ] Maintain existing AlbumCard API (props remain the same)
- [ ] All existing AlbumCard tests pass

**Test Coverage**:
- Regression test: All existing AlbumCard tests pass
- Integration test: Render AlbumCard with selection mode, verify checkbox renders
- Integration test: Verify stacked card effect preserved
- Snapshot test: Compare before/after refactor (should match visually)

### AC-10: Test Coverage

**Status**: [ ] Not Started

**Description**: Maintain minimum 45% overall test coverage with comprehensive GalleryCard tests.

**Validation**:
- [ ] GalleryCard.test.tsx updated with tests for selectable, selected, onSelect
- [ ] GalleryCard.test.tsx updated with tests for draggable, dragHandlePosition, renderDragHandle
- [ ] GalleryCard.test.tsx updated with tests for hoverOverlay
- [ ] InspirationCard.test.tsx updated to verify GalleryCard integration
- [ ] AlbumCard.test.tsx updated to verify GalleryCard integration
- [ ] Minimum 45% overall test coverage maintained
- [ ] Target 80%+ coverage for GalleryCard.tsx (critical shared component)

**Test Coverage**:
- Coverage report: Overall project >= 45%
- Coverage report: GalleryCard.tsx >= 80%
- All tests pass: `pnpm test packages/core/gallery`
- All tests pass: `pnpm test apps/web/app-inspiration-gallery`

### AC-11: Documentation

**Status**: [ ] Not Started

**Description**: Update GalleryCard documentation with usage examples.

**Validation**:
- [ ] GalleryCard TSDoc updated with examples for selection mode
- [ ] GalleryCard TSDoc updated with examples for drag handles
- [ ] GalleryCard TSDoc updated with examples for hover overlay
- [ ] Update `packages/core/gallery/README.md` with new GalleryCard features

**Test Coverage**:
- Manual review: TSDoc examples are accurate and runnable
- Manual review: README.md reflects new API

---

## Reuse Plan

### Components to Reuse

**From @repo/gallery**:
- GalleryCard (enhance with selection, drag, hover overlay support)

**From @repo/app-component-library**:
- Card (keep for non-gallery use cases)
- Button (for custom drag handle if needed)
- Check icon from lucide-react (selection checkbox)
- GripVertical icon from lucide-react (drag handle)

**From @repo/accessibility**:
- focusRingClasses (focus styling for checkbox and drag handle)

**From @dnd-kit/sortable**:
- useSortable hook (parent components manage drag-and-drop, pass listeners/attributes to GalleryCard)

### Utilities to Reuse

**From @repo/app-component-library**:
- cn (className merging utility)

**From @repo/accessibility**:
- useRovingTabIndex (keyboard navigation between cards, optional integration)
- useAnnouncer (screen reader announcements for selection changes, optional integration)

### Patterns to Follow

**Selection Mode Pattern** (from InspirationCard/AlbumCard):
- Props: `selectionMode`, `isSelected`, `onSelect`
- Checkbox overlay at top-left
- Click behavior: call `onSelect` when `selectable=true`

**Drag Handle Pattern** (from SortableInspirationCard/SortableWishlistCard):
- GripVertical icon with 44x44px touch target
- Positioned at top-right
- Hover-visible on desktop, always visible on mobile
- Accepts `listeners` and `attributes` from useSortable

**Hover Overlay Pattern** (from InspirationCard/AlbumCard):
- Gradient overlay: `bg-gradient-to-t from-black/60 via-transparent to-transparent`
- Opacity transition: `opacity-0 group-hover:opacity-100 transition-opacity duration-200`

---

## Architecture Notes

### Component Structure

**GalleryCard Enhancements**:
```typescript
// New props
interface GalleryCardProps {
  // ... existing props (image, title, subtitle, metadata, onClick, etc.)

  // Selection mode
  selectable?: boolean
  selected?: boolean
  onSelect?: (selected: boolean) => void
  selectionPosition?: 'top-left' | 'top-right'

  // Drag handle
  draggable?: boolean
  dragHandlePosition?: 'top-left' | 'top-right'
  renderDragHandle?: (listeners: any, attributes: any) => React.ReactNode

  // Hover overlay
  hoverOverlay?: React.ReactNode
}

// Zod schema (REQUIRED per CLAUDE.md)
const GalleryCardPropsSchema = z.object({
  // ... existing props
  selectable: z.boolean().optional(),
  selected: z.boolean().optional(),
  onSelect: z.function().args(z.boolean()).returns(z.void()).optional(),
  selectionPosition: z.enum(['top-left', 'top-right']).optional(),
  draggable: z.boolean().optional(),
  dragHandlePosition: z.enum(['top-left', 'top-right']).optional(),
  renderDragHandle: z.function().optional(),
  hoverOverlay: z.custom<React.ReactNode>().optional(),
})

type GalleryCardProps = z.infer<typeof GalleryCardPropsSchema>
```

**InspirationCard Refactor**:
```typescript
// Before: Custom Card wrapper (~220 LOC)
export function InspirationCard({ image, title, selectionMode, isSelected, onSelect, ... }) {
  return (
    <Card>
      {/* Custom image container */}
      {/* Custom checkbox overlay */}
      {/* Custom hover overlay */}
    </Card>
  )
}

// After: GalleryCard wrapper (~120 LOC)
export function InspirationCard({ image, title, selectionMode, isSelected, onSelect, ... }) {
  return (
    <GalleryCard
      image={image}
      title={title}
      selectable={selectionMode}
      selected={isSelected}
      onSelect={onSelect}
      hoverOverlay={
        <div>
          {/* Title, badges, tags */}
        </div>
      }
    />
  )
}
```

### Z-Index Layering

**Stack Order** (bottom to top):
1. Image container: z-0 (default)
2. Hover overlay: z-10 (behind interactive overlays)
3. Selection checkbox: z-10 (same layer as hover, positioned separately at top-left)
4. Drag handle: z-10 (same layer as hover, positioned separately at top-right)

**No Conflicts Expected**: All overlays at z-10 use absolute positioning at different corners. No overlap.

### Position Conflict Resolution

**Design Decision** (from UIUX-NOTES.md):
When both `selectable=true` and `draggable=true`:
- Selection checkbox ALWAYS renders at top-left
- Drag handle ALWAYS renders at top-right
- `selectionPosition` and `dragHandlePosition` props are IGNORED in this case
- This prevents overlay collisions and simplifies implementation

**Rationale**: Most gallery apps use selection OR drag, not both simultaneously. Fixed positions eliminate edge case complexity.

### Breaking Changes

**Actions Overlay Removal** (from DEV-FEASIBILITY.md):
- REMOVE existing actions overlay from GalleryCard (breaking change)
- Consumers must now use `hoverOverlay` prop to provide actions content
- Migration: InspirationCard and AlbumCard will manage their own action buttons within `hoverOverlay`
- Impact: Low (only 3 components currently use GalleryCard: WishlistCard, InspirationCard?, SetCard?)

---

## Infrastructure Notes

None (frontend-only story)

---

## HTTP Contract Plan

None (frontend-only story)

---

## Seed Requirements

None (no backend data seeding needed)

---

## Test Plan

See: `plans/future/repackag-app/backlog/REPA-009/_pm/TEST-PLAN.md`

**Summary**:
- **Happy Path**: Selection mode rendering, click behavior, drag handle rendering, hover overlay rendering, InspirationCard/AlbumCard refactors
- **Error Cases**: Missing required props, invalid positions, conflicting props
- **Edge Cases**: Selection with onClick handler, keyboard activation, custom drag handle, mobile visibility, z-index layering, long titles
- **Coverage Target**: 45% overall, 80%+ for GalleryCard.tsx
- **Evidence**: Unit tests, integration tests, snapshot tests, Storybook stories

---

## UI/UX Notes

See: `plans/future/repackag-app/backlog/REPA-009/_pm/UIUX-NOTES.md`

**MVP-Critical Requirements**:
- Use token-only colors (border-primary, bg-primary, text-primary-foreground for selected checkbox)
- Use `_primitives` imports for all shadcn components
- 44x44px minimum touch target for drag handle (WCAG 2.5.5)
- aria-label on drag handle: "Drag to reorder {title}"
- aria-selected on card when selectable=true
- Focus indicators using focusRingClasses from @repo/accessibility

**Design Decisions Required**:
1. Confirm fixed positions (checkbox=top-left, drag=top-right) or allow position props?
2. Confirm removal of built-in actions overlay in favor of hoverOverlay slot?
3. Confirm mobile hover overlay always visible (not tap-to-reveal)?

**Responsive Behavior**:
- Mobile (<768px): Drag handle always visible, selection checkbox same size
- Desktop (>=768px): Drag handle hover-visible, hover overlay on hover

---

## Reality Baseline

### Existing Code

**GalleryCard** (`packages/core/gallery/src/components/GalleryCard.tsx`):
- Current: 315 LOC
- Props: image, title, subtitle, metadata, actions, onClick, href, selected, loading, className
- Image container with aspect ratio support (4/3, 16/9, 1/1, auto)
- Actions overlay (top-right, opacity-0 on hover) - TO BE REMOVED
- Interactive states (hover, focus-visible, selected)
- Accessibility: role="button", aria-label, aria-selected, keyboard handlers (Enter/Space)
- NO selection mode, drag handle, or hover overlay support

**InspirationCard** (`apps/web/app-inspiration-gallery/src/components/InspirationCard/index.tsx`):
- Current: 220 LOC
- Wraps Card (not GalleryCard) with custom implementation
- Has selection mode: selectionMode prop, isSelected prop, onSelect callback
- Selection checkbox overlay (top-left, absolute positioned)
- Hover overlay with gradient (from-black/60 via-transparent to-transparent)
- Top actions (source link, more menu) in hover overlay
- Bottom info in hover overlay (title, badges, tags)

**AlbumCard** (`apps/web/app-inspiration-gallery/src/components/AlbumCard/index.tsx`):
- Current: 227 LOC
- Wraps Card (not GalleryCard) with custom implementation
- Has selection mode: selectionMode prop, isSelected prop, onSelect callback
- Selection checkbox overlay (top-left, absolute positioned)
- Stacked card effect (visual depth with pseudo-elements)
- Item count badge (bottom-right, always visible)
- Hover overlay with gradient and folder icon

**SortableInspirationCard** (`apps/web/app-inspiration-gallery/src/components/SortableInspirationCard/index.tsx`):
- Current: ~80 LOC
- Wraps InspirationCard with useSortable from dnd-kit
- Drag handle with GripVertical icon (absolute positioned, top-right)
- Drag handle has 44x44px touch target for WCAG 2.5.5 compliance
- Visible on hover (desktop) or always visible (mobile)

**SortableWishlistCard** (`apps/web/app-wishlist-gallery/src/components/SortableWishlistCard/index.tsx`):
- Current: ~80 LOC
- Wraps WishlistCard with useSortable from dnd-kit
- Drag handle with GripVertical icon (similar to SortableInspirationCard)

### Dependencies

**REPA-007** (SortableGallery):
- Status: In-progress (from index)
- Blocks: Integration testing of drag handles
- Mitigation: Proceed with GalleryCard UI enhancements, defer SortableGallery integration to REPA-010

**REPA-008** (Gallery Keyboard Hooks):
- Status: In-progress (from index)
- Impact: useRovingTabIndex and useAnnouncer available for optional use
- No blocker for REPA-009

### Constraints

**Code Style** (from CLAUDE.md):
- MUST use Zod schemas for all type definitions (no TypeScript interfaces)
- MUST use named exports (no default exports)
- MUST maintain test coverage at 45% minimum
- MUST use @repo/ui for all UI components (Button, Card, etc.)
- MUST use @repo/logger for logging (never console.log)

**Component Architecture**:
- GalleryCard is a generic base component (aspect ratios, image handling, title/subtitle/metadata slots)
- Domain cards (InspirationCard, AlbumCard, WishlistCard) wrap or extend GalleryCard with domain-specific logic
- Sortable variants (SortableInspirationCard, SortableWishlistCard) wrap domain cards with useSortable from dnd-kit

**Protected Features**:
- Existing GalleryCard API must remain compatible (image, title, subtitle, metadata, onClick, href, selected, loading props)
- Existing domain card implementations (InspirationCard, AlbumCard, WishlistCard) must continue working post-refactor
- SortableGallery component interface from REPA-007 (when complete)

---

## Predictions

**Generated**: 2026-02-10T22:30:00Z
**Model**: haiku (heuristics-only mode, WKFL-006 patterns unavailable)
**Confidence**: medium

### Split Risk

**Probability**: 0.6 (60%)

**Factors**:
- 11 Acceptance Criteria (high count)
- Frontend + component refactors (medium complexity)
- Depends on REPA-007 (external dependency risk)
- ~200 LOC additions + ~200 LOC deletions (moderate size)

**Interpretation**: Moderate risk of splitting if REPA-007 delays or if InspirationCard/AlbumCard refactors encounter unexpected complexity.

**Mitigation**: If REPA-007 delays, split into REPA-009a (GalleryCard UI enhancements only) and REPA-009b (integration with SortableGallery).

### Review Cycles

**Predicted**: 2 cycles

**Factors**:
- UI/UX design decisions needed (position conflicts, actions overlay removal)
- Breaking changes (actions overlay removal requires approval)
- Accessibility compliance (WCAG 2.5.5 touch target verification)
- Refactor risk (InspirationCard/AlbumCard regression testing)

**Interpretation**: First review likely to surface questions on design decisions and breaking changes. Second review to verify refactor quality and accessibility compliance.

### Token Estimate

**Predicted**: 180,000 tokens

**Basis**: Heuristics-only (no similar stories in KB)
- 11 ACs, frontend + component refactors → high-medium complexity
- Fallback global default: 150,000 tokens
- Complexity boost: +30,000 tokens (refactors, accessibility testing, design decisions)

**Interpretation**: Conservative estimate. Actual may be lower if refactors are straightforward, higher if REPA-007 integration issues arise.

### Similar Stories

None found (KB search returned no high-similarity stories with outcome data).

**Fallback Used**: Global default estimates + heuristics.

---

## Open Questions

1. **Position Conflict**: Confirm fixed positions (checkbox=top-left, drag=top-right) or allow `selectionPosition` / `dragHandlePosition` props? (Recommendation: Fixed positions for MVP simplicity)

2. **Actions Overlay**: Confirm removal of built-in actions overlay in favor of `hoverOverlay` slot? (Recommendation: Remove for cleaner API)

3. **Mobile Hover Overlay**: Always visible or tap-to-reveal on mobile? (Recommendation: Always visible)

4. **renderDragHandle Prop**: Is custom drag handle rendering a MVP requirement or future work? (Recommendation: Defer to future if not needed by current consumers)

5. **REPA-007 Timeline**: When will SortableGallery be complete? If >1 week, should REPA-009 split into UI-only and integration phases?

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-10_

### MVP Gaps Resolved

None - core journey is complete. All 11 ACs cover the MVP scope.

### Design Decisions Resolved

| # | Question | Decision |
|---|----------|----------|
| 1 | Position conflict (checkbox + drag) | Fixed positions: checkbox=top-left, drag=top-right |
| 2 | Actions overlay removal | Remove built-in, use hoverOverlay slot (breaking change) |
| 3 | Mobile hover overlay | Always visible on mobile, hover-visible on desktop |
| 4 | renderDragHandle scope | Include in MVP as optional/advanced prop |

### Non-Blocking Items (Deferred to KB)

| # | Finding | Category |
|---|---------|----------|
| 1 | No runtime Zod error handling | edge-case |
| 2 | No checkbox animation | ux-polish |
| 3 | Drag handle always in DOM | performance |
| 4 | No bulk select shortcut | accessibility |
| 5 | No drag preview feedback | ux-polish |
| 6-16 | Various polish and enhancement opportunities | mixed |

### Summary
- ACs added: 0
- Design decisions resolved: 4
- KB entries deferred: 16
- Mode: autonomous
- Verdict: CONDITIONAL PASS
