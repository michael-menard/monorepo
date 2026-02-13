# Future Risks: REPA-009

## Non-MVP Risks

### Risk 1: GalleryCard Component Bloat

**Impact**: GalleryCard grows from 315 LOC to ~515 LOC. If more features are added (e.g., multi-select, custom drag preview, animated transitions), component could exceed 800 LOC and become difficult to maintain.

**Recommended Timeline**: Monitor component size. If it exceeds 600 LOC post-MVP, consider splitting into:
- GalleryCardBase (image handling, aspect ratio, title/subtitle)
- GalleryCardInteractive (selection, drag, hover overlay)
- Compose via React composition or HOC pattern

**Track in**: Q2 2026 tech debt review

### Risk 2: Performance with Large Galleries

**Impact**: Adding selection checkbox, drag handle, and hover overlay to every card in a large gallery (1000+ cards) may increase initial render time and memory usage. Not an MVP blocker, but could degrade UX at scale.

**Recommended Timeline**: After MVP, profile render performance with 1000-card gallery. If >3s initial render, implement:
- React.memo on GalleryCard (prevent unnecessary re-renders)
- Lazy rendering for hover overlay (don't render until first hover)
- Virtual scrolling (react-window or react-virtual)

**Track in**: Performance optimization sprint (post-MVP)

### Risk 3: dnd-kit Version Drift

**Impact**: If dnd-kit major version upgrade changes useSortable API, drag handle integration may break. Not an MVP risk (current version stable), but future upgrade risk.

**Recommended Timeline**: When upgrading dnd-kit (major version), verify:
- listeners and attributes props still forwarded correctly
- Drag handle touch target size preserved
- Drag animations still smooth

**Track in**: Dependency upgrade cycle (quarterly)

### Risk 4: Design System Token Changes

**Impact**: If design tokens (primary, border, background colors) change in future theme updates, selection checkbox and drag handle may lose contrast or accessibility compliance.

**Recommended Timeline**: When updating design tokens, re-run:
- WCAG contrast checker on selection checkbox (selected + unselected states)
- Verify drag handle background has sufficient contrast
- Update color tokens if needed

**Track in**: Design system update process

### Risk 5: Mobile Drag-and-Drop UX

**Impact**: Drag-and-drop on mobile is complex (long-press to initiate, conflict with scroll). dnd-kit supports mobile, but UX may not be ideal. Not an MVP blocker (drag-and-drop is opt-in), but future enhancement opportunity.

**Recommended Timeline**: Post-MVP, conduct user testing on mobile drag-and-drop. If >30% task failure rate, implement:
- Long-press to enter "reorder mode" (clearer affordance)
- Haptic feedback on drag start/drop
- Cancel button to exit reorder mode

**Track in**: UX research sprint (Q2 2026)

### Risk 6: Keyboard Reordering via Drag Handle

**Impact**: WCAG 2.1.1 requires keyboard alternative for drag-and-drop. Current MVP provides drag handle UI, but keyboard reordering is handled by SortableGallery (REPA-007). If SortableGallery does not implement keyboard reordering, feature is incomplete for accessibility.

**Recommended Timeline**: After REPA-007 and REPA-009 merge, verify SortableGallery provides:
- Arrow key reordering (up/down for vertical, left/right for horizontal)
- Space key to pick up / drop card
- Escape key to cancel reordering
- Screen reader announcements for reorder actions (useAnnouncer)

**Track in**: REPA-010 (app-inspiration-gallery refactor to use SortableGallery)

---

## Scope Tightening Suggestions

### Suggestion 1: Defer renderDragHandle Prop

**Rationale**: Seed includes renderDragHandle prop for custom drag handle rendering. However, no current consumer (SortableInspirationCard, SortableWishlistCard) needs custom rendering. Default GripVertical icon is sufficient for MVP.

**Recommendation**: Remove renderDragHandle from MVP scope. Add in future if custom drag handles needed (e.g., different icon, custom styling).

**LOC Savings**: ~30 LOC in GalleryCard, ~20 LOC in tests.

### Suggestion 2: Fixed Positions Only (No Position Props)

**Rationale**: Seed includes selectionPosition and dragHandlePosition props. However, if we enforce fixed positions (checkbox=top-left, drag=top-right), these props are unnecessary complexity.

**Recommendation**: Remove position props from MVP. Always render checkbox at top-left, drag handle at top-right. Simpler API, fewer edge cases.

**LOC Savings**: ~20 LOC in GalleryCard, ~10 LOC in tests.

**Trade-off**: Less flexibility, but no current use case requires non-standard positions.

### Suggestion 3: Defer WishlistCard Integration

**Rationale**: WishlistCard already uses GalleryCard but does not need selection mode (no selection UI in wishlist app currently). Refactoring WishlistCard to use new props is out of scope for REPA-009.

**Recommendation**: Focus REPA-009 on InspirationCard and AlbumCard only. WishlistCard can adopt selection mode in future story if needed.

**LOC Savings**: ~50 LOC in refactor, ~30 LOC in tests.

### Suggestion 4: Defer Storybook Stories

**Rationale**: Storybook stories for new GalleryCard props are valuable for documentation and visual QA, but not strictly required for MVP functionality.

**Recommendation**: Create basic Storybook stories for selection, drag, hover states. Defer comprehensive story coverage (all prop combinations) to future work.

**Time Savings**: ~1 hour (stories + chromatic setup).

---

## Future Requirements

### Requirement 1: Multi-Select State Management

**Description**: GalleryCard provides selection UI (checkbox, onSelect callback), but multi-select state management (tracking which cards are selected, select all, deselect all) is handled by parent components (galleries, pages). This is intentional for MVP, but future work may benefit from a shared useMultiSelect hook.

**Recommendation**: After REPA-009, create useMultiSelect hook in @repo/gallery/hooks:
```typescript
const { selectedIds, toggleSelection, selectAll, deselectAll, isSelected } = useMultiSelect(items)
```

**Value**: Reduces duplicate state management across gallery apps.

**Timeline**: Q2 2026 (after REPA-010 refactors)

### Requirement 2: Selection Persistence

**Description**: Selected cards are not persisted (lost on page refresh). For workflows like "select items, navigate to detail page, return to gallery", selection state should persist.

**Recommendation**: Add optional persistence to useMultiSelect hook:
```typescript
const { selectedIds } = useMultiSelect(items, { persist: 'sessionStorage' })
```

**Value**: Better UX for multi-step workflows.

**Timeline**: Q2 2026 (user feedback driven)

### Requirement 3: Batch Actions on Selected Cards

**Description**: Once multiple cards are selected, users need batch actions (delete, move to album, export, etc.). This is app-specific (not GalleryCard concern), but common enough to warrant a shared pattern.

**Recommendation**: Create BatchActionsBar component in @repo/gallery:
```typescript
<BatchActionsBar selectedCount={selectedIds.length} onDelete={...} onMove={...} />
```

**Value**: Consistent batch action UI across apps.

**Timeline**: Q2 2026 (after multi-select workflows mature)

### Requirement 4: Drag-and-Drop Between Albums

**Description**: Current drag-and-drop is for reordering within a single gallery. Future use case: drag card from one album to another (cross-list drag).

**Recommendation**: Extend SortableGallery to support droppable targets:
```typescript
<SortableGallery droppable={true} onDrop={(item, targetList) => ...} />
```

**Value**: Supports album organization workflows.

**Timeline**: Q3 2026 (requires backend API for album membership)

### Requirement 5: Keyboard Shortcuts Documentation

**Description**: Keyboard shortcuts for selection (Ctrl+A, Cmd+D, arrow keys) are powerful but not discoverable. Users need in-app documentation.

**Recommendation**: Add keyboard shortcuts help overlay (Cmd+K to show):
- List all shortcuts (select all, deselect all, arrow navigation)
- Contextual shortcuts based on current mode (selection mode vs drag mode)

**Value**: Better power user onboarding.

**Timeline**: Q2 2026 (UX enhancement)

---

## Long-Term Evolution

### Phase 1 (MVP - REPA-009)
- GalleryCard selection mode (checkbox overlay)
- GalleryCard drag handle (UI only, dnd-kit integration pending)
- GalleryCard hover overlay (custom content slot)
- InspirationCard and AlbumCard refactored to use GalleryCard

### Phase 2 (Post-MVP - REPA-010)
- SortableGallery integrated with GalleryCard drag handles
- Keyboard reordering via arrow keys
- Multi-select + drag workflows
- Eliminate SortableInspirationCard/SortableWishlistCard wrappers

### Phase 3 (Future)
- useMultiSelect hook with persistence
- BatchActionsBar component
- Cross-list drag-and-drop
- Keyboard shortcuts help overlay
- Mobile drag-and-drop UX improvements

### Phase 4 (Maturity)
- Performance optimizations (virtual scrolling, lazy rendering)
- Accessibility enhancements (high contrast mode, screen reader announcements)
- Design variants (grid, list, masonry, compact)
- Theme-specific selection colors
