# Elaboration Report - WISH-2005a

**Date**: 2026-01-28
**Verdict**: CONDITIONAL PASS

## Summary

WISH-2005a (Drag-and-drop reordering with dnd-kit) passes elaboration with all core functionality scoped and documented. Eight audit checks pass. One low-complexity design decision added during interactive review: auto-scroll during drag operations as a required acceptance criterion. All other identified gaps (cross-page reordering, undo history, animations, etc.) move to follow-up stories.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md. Frontend-only with no new endpoints. Backend `/reorder` endpoint confirmed exists. |
| 2 | Internal Consistency | PASS | — | Goals, non-goals, and ACs are consistent. No contradictions found between sections. |
| 3 | Reuse-First | PASS | — | Story correctly identifies and reuses: dnd-kit from @repo/gallery, WishlistCard component, RTK Query patterns, Toast primitives, backend reorder endpoint. No unnecessary new packages. |
| 4 | Ports & Adapters | PASS | — | Backend already implements hexagonal architecture with service layer and route adapter. Frontend components are pure presentation layer. No business logic in UI. |
| 5 | Local Testability | PASS | — | Story specifies HTTP test file, unit tests (100% coverage requirement), and Playwright E2E tests for all interaction modes. Backend tests already exist. |
| 6 | Decision Completeness | PASS | — | All design decisions documented: sensor configuration, cache strategy, pagination constraints. No blocking TBDs. Optimistic updates explicitly deferred to WISH-2005b. |
| 7 | Risk Disclosure | PASS | — | All MVP-critical risks documented with mitigation strategies. Pagination context mismatch, cache strategy, touch/scroll conflicts, ARIA compliance, race conditions all addressed. |
| 8 | Story Sizing | PASS | — | 29 ACs with clear boundaries (up from 28, added auto-scroll). Large complexity justified (5 points). Frontend-only scope keeps it manageable. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | DraggableTableHeader pattern reference incomplete | Low | Pattern verified at `/packages/core/gallery/src/components/DraggableTableHeader.tsx` | RESOLVED |
| 2 | WishlistCard location ambiguity | Low | Location in `apps/web/app-wishlist-gallery/src/components/WishlistCard/`. Confirmed as app-specific, not moved to shared package for MVP. | RESOLVED |
| 3 | RTK Query mutation simplified approach clarification | Medium | Rollback mechanism uses local dnd-kit state + manual cache update (no optimistic cache). Implementation details confirmed during interactive review. | RESOLVED |

## Split Recommendation

**Not applicable** - Story is appropriately sized for a single implementation cycle.

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Cross-page reordering | out-of-scope | Pagination boundary constraint sufficient for MVP. Cross-page fetching deferred to future story. |
| 2 | Multi-select drag | out-of-scope | Bulk operations deferred. Single-item drag focus for MVP clarity. |
| 3 | Undo history beyond single | out-of-scope | Single-level undo only (via rollback on error). Full undo history deferred to WISH-2005b. |
| 4 | Mobile drag handles on demand | out-of-scope | Drag handles always visible on mobile for MVP. Conditional visibility deferred. |
| 5 | Concurrent conflict resolution | out-of-scope | Single-user session focus. Conflict resolution for concurrent edits deferred to WISH-2008/advanced. |
| 6 | Animation customization | out-of-scope | Fixed transition timings (300ms). User customization deferred. |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Drag preview thumbnail | follow-up-story | Create WISH-2005c for enhanced visual feedback with item preview during drag. |
| 2 | Haptic feedback mobile | follow-up-story | Create WISH-2005d for vibration API on mobile drag operations (Android/iOS). |
| 3 | Smart drop zones | follow-up-story | Create WISH-2005e for visual drop zone highlighting and validation (visual region expansion). |
| 4 | Keyboard shortcuts | out-of-scope | Global shortcuts (A=add, G=gallery, Delete=delete) deferred to WISH-2006 accessibility phase. |
| 5 | Advanced screen reader | out-of-scope | Beyond ARIA live regions. Full screen reader testing with NVDA/VoiceOver deferred to WISH-2006. |
| 6 | Drag handle visibility prefs | out-of-scope | User preferences for handle visibility deferred to WISH-2006/settings. |
| 7 | Auto-scroll during drag | add-as-ac | **ADDED AS AC 29** - Required for MVP. Enable auto-scroll when dragging near viewport edges (250px threshold, 2px/ms scroll rate). |
| 8 | Spring physics animations | follow-up-story | Create WISH-2005f for spring-based drop animations (more natural feel than linear transitions). |
| 9 | Reorder analytics | follow-up-story | Create WISH-2005g for analytics integration with @repo/gallery tracking events. |
| 10 | Batch reorder optimization | out-of-scope | Optimizations for large payloads (100+ items) deferred to performance tuning phase. |

### Follow-up Stories Suggested

During user review, 5 follow-up stories identified for creation:

1. **WISH-2005c: Drag preview thumbnail**
   - Visual feedback: Item preview thumbnail in DragOverlay
   - Dependency: WISH-2005a (MVP)
   - Effort: Small (1-2 points)
   - Priority: Medium (nice-to-have UX enhancement)

2. **WISH-2005d: Haptic feedback on mobile drag**
   - Mobile vibration feedback on drag start, during drag, on drop
   - Uses Vibration API (iOS/Android)
   - Dependency: WISH-2005a (MVP)
   - Effort: Small (1-2 points)
   - Priority: Medium (mobile UX polish)

3. **WISH-2005e: Smart drop zones with validation**
   - Visual drop zone highlighting
   - Constraint validation (e.g., no reorder to paid position if unpurchased)
   - Dependency: WISH-2005a (MVP)
   - Effort: Medium (2-3 points)
   - Priority: Low (advanced feature)

4. **WISH-2005f: Spring physics animations**
   - Replace linear Framer Motion transitions with spring-based animations
   - More natural drop feedback
   - Dependency: WISH-2005a (MVP)
   - Effort: Small (1-2 points)
   - Priority: Low (polish)

5. **WISH-2005g: Reorder analytics integration**
   - Track reorder events via @repo/gallery analytics
   - Metrics: reorder frequency, patterns, performance
   - Dependency: WISH-2005a (MVP)
   - Effort: Small (1-2 points)
   - Priority: Low (analytics/insights)

### Items Marked Out-of-Scope

- **Cross-page reordering**: Pagination boundary constraint sufficient for MVP. Future story handles large lists.
- **Multi-select reordering**: Single-item focus for MVP clarity. Bulk operations deferred.
- **Undo history**: Only single-level error rollback in MVP. Full undo deferred to WISH-2005b.
- **Mobile drag handles on demand**: Handles always visible on mobile for MVP. Conditional visibility deferred.
- **Concurrent conflict resolution**: Single-user focus. Multi-user conflicts deferred to security/advanced phase.
- **Animation customization**: Fixed 300ms transitions. User customization deferred.
- **Keyboard shortcuts**: Global shortcuts deferred to WISH-2006 accessibility phase.
- **Advanced screen reader support**: Beyond ARIA live regions. Full testing deferred to WISH-2006.
- **Drag handle visibility preferences**: User settings deferred to WISH-2006/settings.
- **Batch reorder optimization**: Large payload optimizations deferred to performance phase.

## Proceed to Implementation?

**YES** - Story may proceed with the following conditions:

1. Add AC 29 (auto-scroll during drag) to acceptance criteria list in WISH-2005a.md
2. Update AC numbering from 28 to 29 total
3. Create follow-up stories WISH-2005c through WISH-2005g in `plans/future/wish/backlog/` with proper dependencies
4. Move story from `elaboration/WISH-2005a/` to `ready-to-work/WISH-2005a/`
5. Update `stories.index.md` to reflect new status and suggest follow-up stories

**Implementation Ready**: All design decisions made. Reuse patterns confirmed. No blocking dependencies. Backend endpoint exists and tested.

---

## Summary of Changes Made During Elaboration

### New Acceptance Criterion Added

**AC 29: Auto-scroll during drag (Viewport Edge Detection)**

- [ ] **AC 29:** When dragging item near viewport edges (top/bottom 250px zones), viewport automatically scrolls at 2px/ms rate
- [ ] Scrolling pauses when drag item moves away from edge zone
- [ ] Works on desktop and mobile (touch drag)
- [ ] Does not interfere with DnD collision detection
- [ ] Enabled by dnd-kit's auto-scroll utilities

**Rationale**: Required for MVP to handle paginated lists gracefully. Without auto-scroll, users cannot reorder items on smaller screens or when list is partially visible. This is a high-value, low-risk feature that dnd-kit provides natively.

### Design Decisions Confirmed

1. **Simplified error handling**: Use local dnd-kit state for visual feedback, rollback via `setSortOrder(originalOrder)` on API error
2. **Cache strategy**: No optimistic updates (deferred to WISH-2005b). Items already visually moved by dnd-kit.
3. **Pagination boundary**: Constrain SortableContext to currentPageItems only. Show info toast for cross-page attempts.
4. **Sensor configuration**: PointerSensor (8px), TouchSensor (300ms delay), KeyboardSensor (arrow keys)
5. **Animation timing**: 300ms drop animation (perceived as instant)
6. **Accessibility**: ARIA live regions, keyboard navigation, focus return

---

## Quality Gate Checklist

- [x] All 8 audit items pass
- [x] 3 issues found and resolved
- [x] No split required (story properly sized)
- [x] 29 acceptance criteria defined (clear and testable)
- [x] Risk mitigation documented for all MVP-critical risks
- [x] Reuse-first approach followed (dnd-kit, WishlistCard, RTK patterns)
- [x] Backend endpoint confirmed (no changes needed)
- [x] 5 follow-up stories identified with priorities and effort estimates
- [x] All user decisions documented and justified

**Quality Gate**: PASS - Proceed to Implementation

---

## Completion Time

- **Analysis**: 35 minutes (ANALYSIS.md created by worker)
- **Interactive Review**: 15 minutes (user decisions captured, follow-up stories discussed)
- **Final Report**: 10 minutes (this document)

**Total Elaboration Phase**: ~60 minutes

---

*Generated by: elab-completion-leader agent*
*Date: 2026-01-28*
*Verdict Confirmation: CONDITIONAL PASS*
