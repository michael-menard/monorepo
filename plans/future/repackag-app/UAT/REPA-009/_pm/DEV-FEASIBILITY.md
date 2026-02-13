# Dev Feasibility: REPA-009

## Feasibility Summary

**Feasible for MVP**: Yes
**Confidence**: High
**Why**: GalleryCard is a well-established component (315 LOC) with clear extension points. Selection and drag handle patterns exist in current implementations (InspirationCard, SortableWishlistCard). Refactoring InspirationCard and AlbumCard to use GalleryCard is straightforward code consolidation with no new architectural patterns needed.

---

## Likely Change Surface (Core Only)

### Components Modified

**Primary Enhancement**:
- `packages/core/gallery/src/components/GalleryCard.tsx` (~200 LOC added)
  - Add selection mode props and checkbox overlay rendering
  - Add drag handle props and button rendering
  - Add hoverOverlay prop and container rendering
  - Update Zod schema for new props

**Refactors** (code reduction):
- `apps/web/app-inspiration-gallery/src/components/InspirationCard/index.tsx` (~100 LOC removed)
  - Remove custom image container logic
  - Remove custom checkbox overlay logic
  - Remove custom hover overlay logic
  - Wrap GalleryCard with domain-specific metadata

- `apps/web/app-inspiration-gallery/src/components/AlbumCard/index.tsx` (~100 LOC removed)
  - Remove custom image container logic
  - Remove custom checkbox overlay logic
  - Remove custom hover overlay logic
  - Preserve stacked card effect outside GalleryCard

**Test Files**:
- `packages/core/gallery/src/components/__tests__/GalleryCard.test.tsx` (~150 LOC added)
- `apps/web/app-inspiration-gallery/src/components/InspirationCard/__tests__/InspirationCard.test.tsx` (regression tests)
- `apps/web/app-inspiration-gallery/src/components/AlbumCard/__tests__/AlbumCard.test.tsx` (regression tests)

### Type Definitions

**New Zod Schemas**:
- `packages/core/gallery/src/components/GalleryCard/__types__/index.ts`
  - Extend GalleryCardPropsSchema with selection props
  - Extend GalleryCardPropsSchema with drag handle props
  - Add SelectionPositionSchema: z.enum(['top-left', 'top-right'])
  - Add DragHandlePositionSchema: z.enum(['top-left', 'top-right'])

**No breaking changes to existing props**.

### Packages Touched

**Core Changes**:
- `@repo/gallery` (GalleryCard enhancement)

**App Changes**:
- `app-inspiration-gallery` (InspirationCard and AlbumCard refactors)

**No backend or infrastructure changes**.

---

## MVP-Critical Risks

### Risk 1: REPA-007 (SortableGallery) Dependency

**Why it blocks MVP**: REPA-009 depends on REPA-007 completing. If SortableGallery is not complete, integration testing for drag handles cannot be validated. However, GalleryCard enhancements (UI only) can proceed independently.

**Required Mitigation**:
- Split REPA-009 into two phases if REPA-007 delayed:
  - REPA-009a: GalleryCard selection + drag handle UI (no SortableGallery integration)
  - REPA-009b: SortableGallery integration testing (after REPA-007 complete)
- Alternative: Proceed with REPA-009 in full, mock SortableGallery in tests, defer integration validation to REPA-010

**Decision needed**: Confirm REPA-007 completion timeline. If > 1 week away, split REPA-009.

### Risk 2: dnd-kit Listener Forwarding Pattern

**Why it blocks MVP**: Drag handle must accept listeners and attributes from dnd-kit's useSortable hook. If pattern is incorrect, drag-and-drop will not work.

**Required Mitigation**:
- Review existing SortableInspirationCard and SortableWishlistCard implementations for listener forwarding pattern
- Test drag handle with mock useSortable (or wait for REPA-007)
- Document expected usage in GalleryCard TSDoc

**Code Pattern** (from existing sortable cards):
```typescript
// In SortableGalleryCard (consumer)
const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })

return (
  <GalleryCard
    draggable={true}
    renderDragHandle={(dragListeners, dragAttributes) => (
      <button {...dragListeners} {...dragAttributes}>
        <GripVertical />
      </button>
    )}
  />
)
```

**Validation**: Unit test that renderDragHandle receives listeners and attributes props.

### Risk 3: InspirationCard/AlbumCard Regression

**Why it blocks MVP**: If refactored InspirationCard or AlbumCard break existing functionality, inspiration gallery becomes unusable.

**Required Mitigation**:
- Run ALL existing InspirationCard and AlbumCard tests before refactor (baseline)
- Add snapshot tests for both components before refactor
- After refactor, verify all tests still pass
- Manual QA: Load inspiration gallery in dev, verify selection mode works
- Manual QA: Verify album grid layout and stacked card effect preserved

**Quality Gate**: 100% of existing tests must pass post-refactor. No visual regressions in Storybook.

---

## Missing Requirements for MVP

### Requirement 1: Checkbox and Drag Handle Position Strategy

**Current Gap**: Seed describes selectionPosition and dragHandlePosition props, but does not specify behavior when both are enabled and both target the same position (e.g., top-right).

**Concrete Decision Text PM Must Include**:
```
**Position Conflict Resolution**:
When both selectable=true and draggable=true:
- Selection checkbox ALWAYS renders at top-left
- Drag handle ALWAYS renders at top-right
- selectionPosition and dragHandlePosition props are IGNORED
- This prevents overlay collisions and simplifies implementation
```

**Blocking?**: Yes - without this decision, implementation may introduce visual bugs.

### Requirement 2: Actions Overlay Fate

**Current Gap**: GalleryCard currently has built-in actions overlay (top-right, opacity-0 on hover). Seed introduces hoverOverlay prop but does not specify what happens to existing actions overlay.

**Concrete Decision Text PM Must Include**:
```
**Actions Overlay Deprecation**:
- REMOVE existing actions overlay from GalleryCard (breaking change)
- Consumers must now use hoverOverlay prop to provide actions content
- Migration: InspirationCard and AlbumCard will manage their own action buttons within hoverOverlay
- Rationale: Cleaner API, no z-index conflicts, more flexible
```

**Blocking?**: Yes - breaking change requires explicit PM approval.

### Requirement 3: Mobile Hover Overlay Behavior

**Current Gap**: Hover overlay uses opacity-0 group-hover:opacity-100, which does not work on mobile (no hover). Behavior on mobile is undefined.

**Concrete Decision Text PM Must Include**:
```
**Mobile Hover Overlay**:
- On mobile (<768px): Hover overlay ALWAYS VISIBLE (no opacity-0)
- On desktop (>=768px): Hover overlay visible on hover only
- Implementation: Use md:opacity-0 md:group-hover:opacity-100 classes
- Rationale: Matches existing mobile patterns, ensures content always accessible
```

**Blocking?**: Yes - mobile users cannot access hover overlay content without this.

---

## MVP Evidence Expectations

### Unit Test Coverage

**Minimum Coverage**: 45% overall (project standard)
**Target for GalleryCard**: 80%+ (critical shared component)

**Required Test Scenarios**:
1. Selection checkbox renders at correct position (top-left)
2. Selection checkbox shows Check icon when selected=true
3. Click card calls onSelect when selectable=true
4. Keyboard activation (Enter/Space) calls onSelect
5. Drag handle renders at correct position (top-right)
6. Drag handle has correct aria-label
7. Drag handle has 44x44px touch target (measure actual size)
8. renderDragHandle prop forwards listeners and attributes
9. hoverOverlay content renders inside gradient container
10. All existing InspirationCard tests pass post-refactor
11. All existing AlbumCard tests pass post-refactor

**Evidence**: Coverage report showing 80%+ for GalleryCard.tsx, 45%+ overall.

### Integration Test

**Scenario**: Render InspirationCard with selection mode, verify it uses GalleryCard.

**Assertions**:
- InspirationCard renders GalleryCard as child
- Selection checkbox from GalleryCard is visible
- Hover overlay contains title, badges, tags
- No duplicate image containers

**Evidence**: Test passes, snapshot matches expected DOM.

### Manual QA Checklist

**Before Merge**:
- [ ] Load app-inspiration-gallery in dev mode
- [ ] Enable selection mode (if toggle exists in UI)
- [ ] Select 3 cards, verify checkboxes appear
- [ ] Hover over card, verify hover overlay with title/badges appears
- [ ] Load Storybook, view GalleryCard stories (selection, drag, hover states)
- [ ] Verify no console errors or warnings

**Evidence**: Screenshots of working selection mode and hover overlay.

---

## Implementation Complexity Estimate

### GalleryCard Enhancement (~200 LOC)

**Selection Mode** (~80 LOC):
- Props: selectable, selected, onSelect, selectionPosition
- Checkbox overlay JSX (~30 LOC)
- Click handler logic (~20 LOC)
- Keyboard handler logic (~10 LOC)
- Zod schema updates (~10 LOC)
- TSDoc examples (~10 LOC)

**Drag Handle** (~70 LOC):
- Props: draggable, dragHandlePosition, renderDragHandle
- Drag handle button JSX (~30 LOC)
- Default drag handle rendering (~20 LOC)
- Zod schema updates (~10 LOC)
- TSDoc examples (~10 LOC)

**Hover Overlay** (~50 LOC):
- Prop: hoverOverlay
- Hover overlay container JSX (~30 LOC)
- Zod schema updates (~10 LOC)
- TSDoc examples (~10 LOC)

**Total**: ~200 LOC added to GalleryCard.tsx

### InspirationCard Refactor (~100 LOC removed)

**Removed Logic**:
- Custom image container (~30 LOC)
- Custom checkbox overlay (~30 LOC)
- Custom hover overlay with gradient (~30 LOC)
- Duplicate event handlers (~10 LOC)

**Added Logic**:
- GalleryCard wrapper with props (~20 LOC)
- hoverOverlay content composition (~20 LOC)

**Net**: ~60 LOC removed (220 LOC → 160 LOC)

### AlbumCard Refactor (~100 LOC removed)

**Removed Logic**:
- Custom image container (~30 LOC)
- Custom checkbox overlay (~30 LOC)
- Custom hover overlay (~30 LOC)

**Added Logic**:
- GalleryCard wrapper with props (~20 LOC)
- Stacked card effect wrapper (~10 LOC, moved outside GalleryCard)

**Net**: ~70 LOC removed (227 LOC → 157 LOC)

### Test Code (~150 LOC added)

**GalleryCard Tests**:
- Selection mode tests (~50 LOC)
- Drag handle tests (~50 LOC)
- Hover overlay tests (~30 LOC)
- Snapshot tests (~20 LOC)

**Total**: ~150 LOC added to __tests__

### Grand Total

**Code Added**: ~200 LOC (GalleryCard) + ~150 LOC (tests) = ~350 LOC
**Code Removed**: ~130 LOC (InspirationCard + AlbumCard)
**Net Change**: +220 LOC

**Estimated Effort**: 5-8 hours (1-2 days)
- GalleryCard enhancement: 3-4 hours
- InspirationCard refactor: 1 hour
- AlbumCard refactor: 1 hour
- Testing: 1-2 hours
- Manual QA + Storybook: 1 hour

---

## Technical Debt Considerations

### Removed Debt (Good)

**Duplicate Checkbox Logic**: InspirationCard and AlbumCard both had identical checkbox overlay implementations (~30 LOC each). Now consolidated in GalleryCard.

**Duplicate Hover Overlay Logic**: InspirationCard and AlbumCard both had custom hover gradients (~30 LOC each). Now unified in GalleryCard hoverOverlay prop.

**Duplicate Drag Handle Logic**: SortableInspirationCard and SortableWishlistCard both had drag handle buttons (~20 LOC each). Can now use GalleryCard draggable prop.

**Total Debt Removed**: ~160 LOC of duplicated code eliminated.

### Introduced Debt (Acceptable)

**GalleryCard Complexity**: GalleryCard grows from 315 LOC to ~515 LOC. Still manageable (<600 LOC). Complexity justified by eliminating duplicates across 4 components.

**Breaking Change**: Removing actions overlay from GalleryCard is a breaking change. However, only 3 components use GalleryCard currently (WishlistCard, InstructionCard?, SetCard?). Migration effort is low.

---

## Dependency Verification

### REPA-007 (SortableGallery) Status

**Current Status**: In-progress (from index)
**Blocks**: Integration testing of drag handles
**Mitigation**: Proceed with GalleryCard UI enhancements, defer SortableGallery integration to REPA-010 or split to REPA-009b

**Decision Point**: If REPA-007 is >1 week from completion, split REPA-009 into UI-only phase (009a) and integration phase (009b).

### REPA-008 (Gallery Keyboard Hooks) Status

**Current Status**: In-progress (from index)
**Impact**: useRovingTabIndex and useAnnouncer available for use
**No blocker**: REPA-009 can proceed. Optionally integrate useRovingTabIndex for keyboard navigation between cards with selection mode.

### dnd-kit Package

**Required**: @dnd-kit/sortable already in dependencies (used by existing sortable cards)
**No new dependency**: REPA-009 does not add new packages

---

## Architecture Alignment

### Ports/Adapters Pattern

**Not Applicable**: Frontend-only story, no backend ports/adapters.

### Reuse-First Principle

**Compliant**: GalleryCard is the shared base component. Refactoring InspirationCard and AlbumCard to use it follows reuse-first.

**Alternative Considered**: Create separate SelectableCard and DraggableCard components. Rejected because it duplicates GalleryCard's image handling, aspect ratio logic, and interactive states.

### Package Boundaries

**Compliant**: GalleryCard lives in @repo/gallery (shared package). Domain cards (InspirationCard, AlbumCard) live in app-specific directories. Clear separation of concerns.

---

## Future Work Candidates (Non-MVP)

**Tracked in FUTURE-RISKS.md** (not blocking):
1. SortableInspirationCard and SortableWishlistCard wrapper elimination (tracked for REPA-010)
2. renderDragHandle prop implementation (defer if not needed by current consumers)
3. Multi-select state management in SortableGallery (defer to REPA-010)
4. Custom drag preview for multi-select (tracked in FUTURE-UIUX.md)
5. Keyboard reordering via drag handle (tracked for REPA-010 + SortableGallery)

---

## Quality Gates

**Before Implementation Start**:
- [ ] PM confirms position conflict resolution strategy (Decision 1)
- [ ] PM confirms actions overlay removal (Decision 2)
- [ ] PM confirms mobile hover overlay behavior (Decision 3)
- [ ] REPA-007 status confirmed (split REPA-009 if needed)

**Before PR Submission**:
- [ ] All unit tests pass
- [ ] Coverage report shows 80%+ for GalleryCard.tsx
- [ ] All existing InspirationCard tests pass
- [ ] All existing AlbumCard tests pass
- [ ] Snapshot tests match expected DOM
- [ ] Manual QA checklist completed
- [ ] No console errors or warnings
- [ ] Storybook stories added for new props

**Before Merge**:
- [ ] Code review approved
- [ ] No visual regressions in Storybook
- [ ] Integration tests pass (if REPA-007 complete)
