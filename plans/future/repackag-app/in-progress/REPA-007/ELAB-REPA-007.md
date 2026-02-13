# Elaboration Report - REPA-007

**Date**: 2026-02-10
**Verdict**: CONDITIONAL PASS

## Summary

REPA-007 is well-elaborated with a clear scope to create a reusable SortableGallery component in @repo/gallery. All 34 acceptance criteria are MVP-complete with no blocking gaps. The story is conditionally approved pending a decision on whether to implement as a single 5 SP story or split into two smaller stories.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Scope matches stories.index.md exactly. Creating SortableGallery component in @repo/gallery, extracting hooks. No scope creep detected. |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, Decisions, and ACs are aligned. Undo flow, keyboard nav, and accessibility all internally consistent. |
| 3 | Reuse-First | PASS | — | Excellent reuse plan: GalleryGrid (existing), Button/toast from @repo/app-component-library, dnd-kit already installed. Extracting shared hooks (useRovingTabIndex, useAnnouncer) to packages. |
| 4 | Ports & Adapters | PASS | — | No API endpoints. Component is transport-agnostic - caller handles persistence via onReorder callback. Good separation of concerns. |
| 5 | Local Testability | PASS | — | Comprehensive test plan with Vitest unit tests, Playwright E2E (per ADR-006), and axe-core accessibility tests. Test patterns from existing implementations available. |
| 6 | Decision Completeness | PASS | — | No blocking TBDs. Sensor config defaults documented (8px, 300ms/5px). Undo timeout (5s), error toast persistence, all specified. |
| 7 | Risk Disclosure | PASS | — | MVP-critical risks identified (generic constraints, state management, ResizeObserver, Framer Motion perf). All have mitigations. No hidden dependencies. |
| 8 | Story Sizing | CONDITIONAL | Medium | 34 ACs, 5 SP, ~1,700 LOC estimated. **Recommendation: Consider split** into REPA-007a (core drag/undo, 3 SP) + REPA-007b (advanced features, 2 SP). See split recommendation below. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | dnd-kit/sortable version discrepancy | Low | package.json shows "@dnd-kit/sortable": "10.0.0" (exact) but seed references "^10.0.0" (caret). Verify compatibility with latest 10.x before implementation. | Resolved - implementation note added |
| 2 | Large AC count (34) for single story | Medium | 34 ACs with hook extraction creates risk of scope creep. Recommend splitting (see below) OR strictly enforce scope boundaries during dev. | Resolved - split recommendation documented |
| 3 | No LOC verification for extracted hooks | Low | Story claims useRovingTabIndex is 362 LOC and useAnnouncer is 153 LOC, verified via wc -l. Actual: 362 and 153 lines respectively. No issue, just confirming. | Resolved - verified |

## Split Recommendation

**Split Risk**: 0.7 (high) - Story has many features bundled together.

**Recommendation**: Split into two stories for cleaner implementation and review cycles.

| Split | Scope | AC Allocation | Dependency | Estimated SP |
|-------|-------|---------------|------------|--------------|
| REPA-007a: SortableGallery Core | Core drag-and-drop, undo flow, error handling, grid layout only, basic ARIA | AC-1 to AC-13 (API), AC-14 to AC-22 (Undo/Error), AC-27, AC-30, AC-31 (Basic A11y), AC-32 (Grid only) | None | 3 SP (~1,000 LOC) |
| REPA-007b: Advanced Features | Hook extraction (useRovingTabIndex, useAnnouncer), full keyboard nav, list layout, animations | AC-23 to AC-26 (Keyboard), AC-28 to AC-29 (Hook extraction), AC-33 to AC-34 (List/Animations) | Depends on REPA-007a | 2 SP (~700 LOC) |

**Rationale for split**:
- REPA-007a delivers core user journey (drag-and-drop with undo) - independently testable and usable
- REPA-007b adds polish (keyboard nav, animations, extracted hooks) - can be deferred if schedule tight
- Reduces review complexity: 3 cycles → 2 cycles (1-2 per split)
- Aligns with dev feasibility recommendation in DEV-FEASIBILITY.md

**Alternative**: Keep as single 5 SP story if team capacity allows. Strong scope discipline required.

## Discovery Findings

### MVP Gaps Identified

None - core user journey is complete and MVP-critical.

**Core user journey**: User drags gallery item, sees optimistic reorder, receives success toast with Undo button, can undo to restore original order, sees error toast with Retry if API fails.

**All journey steps covered**:
- ✅ Drag initiation (AC-7, AC-8: sensor config)
- ✅ Drag behavior (AC-9 to AC-11: collision, strategy, auto-scroll)
- ✅ Drop and reorder (AC-12, AC-13: optimistic update, onReorder callback)
- ✅ Success feedback (AC-14: toast with Undo button)
- ✅ Undo flow (AC-15 to AC-18: restore order, timeout, disable during undo)
- ✅ Error handling (AC-19 to AC-22: rollback, retry, error callback)
- ✅ Accessibility baseline (AC-27, AC-30, AC-31: ARIA live, semantic markup, labels)

**Note**: Keyboard navigation (AC-23 to AC-26) is MVP-critical per accessibility requirements. If split is chosen, move these to REPA-007a (not 007b).

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

- **MVP-critical ACs**: 34 - All implementable
- **No blocking gaps**: Core user journey completely specified
- **No new ACs added**: Existing coverage is complete
- **KB entries to create**: 27 non-blocking items documented for future work
- **Split recommended but not required**: Team can implement as single 5 SP story or split into REPA-007a + REPA-007b

## Proceed to Implementation?

**YES - story may proceed to ready-to-work**

CONDITIONAL PASS verdict indicates:
- All core functionality is defined and implementable
- No MVP-critical blockers exist
- Story is ready for development with decision on implementation approach (split vs. single story)
- Team should review split recommendation and adjust if schedule/capacity constraints exist
