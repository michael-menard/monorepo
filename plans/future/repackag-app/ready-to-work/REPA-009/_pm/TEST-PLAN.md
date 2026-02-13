# Test Plan: REPA-009

## Scope Summary

**Endpoints touched**: None (frontend-only)
**UI touched**: Yes
**Data/storage touched**: No

**Components Modified**:
- `packages/core/gallery/src/components/GalleryCard.tsx` (enhancement)
- `apps/web/app-inspiration-gallery/src/components/InspirationCard/index.tsx` (refactor)
- `apps/web/app-inspiration-gallery/src/components/AlbumCard/index.tsx` (refactor)

**Test Artifacts**:
- Unit tests for GalleryCard component
- Integration tests for InspirationCard and AlbumCard refactors
- Visual regression tests for card states

---

## Happy Path Tests

### Test 1: Selection Mode Rendering

**Setup**:
- Render GalleryCard with selectable=true, selected=false, selectionPosition='top-left'

**Action**:
- Inspect rendered DOM

**Expected**:
- Checkbox overlay renders at top-left position (top-2 left-2)
- Checkbox is 24x24px (h-6 w-6) with rounded-full border-2
- Unselected state: border-white bg-black/40 text-white (no Check icon)

**Evidence**:
- Screenshot of rendered component
- DOM assertion: `.absolute.top-2.left-2` exists
- Style assertion: checkbox has border-white bg-black/40 classes

### Test 2: Selection Click Behavior

**Setup**:
- Render GalleryCard with selectable=true, selected=false, onSelect callback

**Action**:
- Click on card body (not checkbox)

**Expected**:
- onSelect callback called with `true`
- Component re-renders with selected=true
- Checkbox shows Check icon with border-primary bg-primary

**Evidence**:
- Jest spy assertion: `expect(onSelectMock).toHaveBeenCalledWith(true)`
- DOM assertion: Check icon rendered
- Style assertion: checkbox has border-primary bg-primary classes

### Test 3: Drag Handle Rendering

**Setup**:
- Render GalleryCard with draggable=true, dragHandlePosition='top-right'

**Action**:
- Inspect rendered DOM

**Expected**:
- Drag handle button renders at top-right position (top-2 right-2)
- Button is 44x44px (h-11 w-11) with GripVertical icon
- Button has opacity-0 group-hover:opacity-100 classes
- Button has aria-label: "Drag to reorder {title}"

**Evidence**:
- DOM assertion: `button[aria-label="Drag to reorder Test Card"]` exists at `.absolute.top-2.right-2`
- Style assertion: h-11 w-11 classes present
- Icon assertion: GripVertical SVG rendered

### Test 4: Hover Overlay Rendering

**Setup**:
- Render GalleryCard with hoverOverlay={<div>Custom Content</div>}

**Action**:
- Inspect rendered DOM

**Expected**:
- Hover overlay container renders with absolute inset-0
- Container has bg-gradient-to-t from-black/60 via-transparent to-transparent
- Container has opacity-0 group-hover:opacity-100 transition-opacity
- Custom content rendered inside container

**Evidence**:
- DOM assertion: hover overlay container exists
- Content assertion: "Custom Content" text present
- Style assertion: gradient and opacity classes present

### Test 5: InspirationCard Refactor Maintains API

**Setup**:
- Render InspirationCard with selectionMode=true, isSelected=false

**Action**:
- Verify component renders without errors

**Expected**:
- InspirationCard wraps GalleryCard
- Selection checkbox renders at top-left
- Hover overlay contains title, badges, tags
- All existing props work (image, title, metadata, onClick)

**Evidence**:
- Component renders without warnings
- Snapshot test matches expected DOM structure
- All existing InspirationCard tests pass

### Test 6: AlbumCard Refactor Maintains API

**Setup**:
- Render AlbumCard with selectionMode=true, isSelected=false

**Action**:
- Verify component renders without errors

**Expected**:
- AlbumCard wraps GalleryCard
- Selection checkbox renders at top-left
- Stacked card effect preserved (pseudo-elements outside GalleryCard)
- Item count badge renders at bottom-right
- All existing props work (image, title, itemCount, onClick)

**Evidence**:
- Component renders without warnings
- Snapshot test shows stacked card effect
- All existing AlbumCard tests pass

---

## Error Cases

### Error 1: Missing Required Props

**Setup**:
- Render GalleryCard with selectable=true but no onSelect callback

**Action**:
- Attempt to click card

**Expected**:
- No error thrown (graceful degradation)
- onClick handler not called if undefined

**Evidence**:
- No console errors
- Component renders normally

### Error 2: Invalid Selection Position

**Setup**:
- Render GalleryCard with selectionPosition='invalid' (TypeScript should catch, but test runtime)

**Action**:
- Inspect rendered DOM

**Expected**:
- Falls back to default 'top-left' position

**Evidence**:
- Checkbox renders at top-left position

### Error 3: Conflicting Props (selectable + draggable)

**Setup**:
- Render GalleryCard with selectable=true, draggable=true, both at top-right

**Action**:
- Inspect rendered DOM

**Expected**:
- Both overlays render without z-index conflicts
- Drag handle at top-right, selection checkbox at top-left (forced)

**Evidence**:
- Both overlays visible
- No layout overlap

---

## Edge Cases

### Edge 1: Selection with onClick Handler

**Setup**:
- Render GalleryCard with selectable=true, onClick handler, onSelect handler

**Action**:
- Click card body

**Expected**:
- onClick called (takes precedence in selection mode)
- onSelect NOT called

**Evidence**:
- Jest spy: onClick called, onSelect not called

### Edge 2: Keyboard Activation (Enter/Space)

**Setup**:
- Render GalleryCard with selectable=true, selected=false

**Action**:
- Focus card, press Enter key

**Expected**:
- onSelect called with `true`
- Same behavior for Space key

**Evidence**:
- Jest spy: onSelect called on Enter
- Jest spy: onSelect called on Space

### Edge 3: Custom Drag Handle via renderDragHandle

**Setup**:
- Render GalleryCard with draggable=true, renderDragHandle={(listeners, attributes) => <button {...listeners} {...attributes}>Custom</button>}

**Action**:
- Inspect rendered DOM

**Expected**:
- Custom drag handle renders instead of default GripVertical
- listeners and attributes forwarded correctly

**Evidence**:
- DOM assertion: "Custom" button exists
- No default GripVertical icon rendered

### Edge 4: Mobile Drag Handle Visibility

**Setup**:
- Render GalleryCard with draggable=true on mobile viewport (< 768px)

**Action**:
- Inspect drag handle visibility

**Expected**:
- Drag handle always visible on mobile (not hover-only)
- Uses md:opacity-0 md:group-hover:opacity-100 classes

**Evidence**:
- Style assertion: md: prefix on hover classes
- Visual regression screenshot at mobile viewport

### Edge 5: Hover Overlay z-index Layering

**Setup**:
- Render GalleryCard with hoverOverlay, selectable=true, draggable=true

**Action**:
- Hover over card, inspect z-index stack

**Expected**:
- Image: z-0 (default)
- Hover overlay: z-10
- Selection checkbox: z-10 (same layer, no conflict)
- Drag handle: z-10 (same layer, no conflict)

**Evidence**:
- DOM inspection: all overlays visible
- No element hidden by z-index

### Edge 6: Long Title Accessibility in Drag Handle

**Setup**:
- Render GalleryCard with draggable=true, title with 100+ characters

**Action**:
- Inspect drag handle aria-label

**Expected**:
- aria-label includes full title (screen readers can read it)
- No truncation in aria-label

**Evidence**:
- DOM assertion: aria-label contains full title text

---

## Required Tooling Evidence

### Frontend (Vitest + React Testing Library)

**Unit Tests**:
- GalleryCard.test.tsx: Test all selection props (selectable, selected, onSelect, selectionPosition)
- GalleryCard.test.tsx: Test all drag props (draggable, dragHandlePosition, renderDragHandle)
- GalleryCard.test.tsx: Test hoverOverlay prop
- GalleryCard.test.tsx: Test keyboard activation (Enter/Space) for selection
- InspirationCard.test.tsx: Regression tests for refactored component
- AlbumCard.test.tsx: Regression tests for refactored component

**Integration Tests**:
- Render InspirationCard with selection mode and verify checkbox overlay
- Render AlbumCard with selection mode and verify stacked card effect
- Verify dnd-kit integration (if REPA-007 complete): drag handle listeners forwarded

**Required Assertions**:
- Component renders without warnings
- Props correctly applied to DOM elements
- Event handlers called with expected arguments
- Accessibility attributes present (aria-label, role)
- Style classes applied correctly
- Snapshot tests for visual regression

**Coverage Target**:
- Maintain 45% overall test coverage minimum
- Aim for 80%+ coverage on GalleryCard.tsx (critical shared component)

### Visual Regression (Playwright or Storybook)

**Storybook Stories** (recommended):
- GalleryCard with selection mode (unselected)
- GalleryCard with selection mode (selected)
- GalleryCard with drag handle
- GalleryCard with hover overlay
- GalleryCard with all features combined
- InspirationCard before/after refactor (comparison)
- AlbumCard before/after refactor (comparison)

**Chromatic or Percy** (optional):
- Baseline screenshots for all Storybook stories
- Visual diff on PR

---

## Risks to Call Out

### Risk 1: REPA-007 Dependency

**Description**: REPA-009 depends on REPA-007 (SortableGallery) completing. If SortableGallery does not support selection mode or drag handle customization, this story may need to add those features or defer integration.

**Mitigation**: Coordinate with REPA-007 implementation. If blockers arise, split REPA-009 into:
- REPA-009a: GalleryCard enhancements only (selection + drag handle UI)
- REPA-009b: SortableGallery integration (after REPA-007 complete)

### Risk 2: InspirationCard/AlbumCard Refactor Regression

**Description**: Refactoring InspirationCard and AlbumCard to use GalleryCard may introduce subtle layout or behavior changes. Existing tests may not catch visual regressions.

**Mitigation**: Add snapshot tests for both components before refactor. Compare before/after snapshots. Consider Storybook + Chromatic for visual regression detection.

### Risk 3: dnd-kit Integration Testing

**Description**: Testing drag-and-drop behavior with dnd-kit requires mock DndContext. Without proper mocking, drag handle tests may fail.

**Mitigation**: Create test utility wrapper for DndContext. Follow dnd-kit testing patterns from existing SortableInspirationCard/SortableWishlistCard tests.

### Risk 4: Mobile Touch Target Compliance

**Description**: Drag handle must meet WCAG 2.5.5 (44x44px minimum touch target). Test must verify actual rendered size, not just class names.

**Mitigation**: Use getComputedStyle or getBoundingClientRect in tests to verify actual dimensions, not just class assertions.

---

## Test Execution Order

1. Unit tests for GalleryCard enhancements (ACs 1-7)
2. Integration tests for InspirationCard refactor (AC-8)
3. Integration tests for AlbumCard refactor (AC-9)
4. Snapshot tests for visual regression
5. Storybook stories for manual QA
6. Coverage report (verify 45% minimum)

**Estimated Test Time**: 15-20 minutes (unit + integration)

**Test Artifacts to Capture**:
- Coverage report (text summary)
- Screenshot of Storybook stories (selection, drag, hover states)
- Test output log (all tests passing)
