# Elaboration Analysis - REPA-007

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

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | dnd-kit/sortable version discrepancy | Low | package.json shows "@dnd-kit/sortable": "10.0.0" (exact) but seed references "^10.0.0" (caret). Verify compatibility with latest 10.x before implementation. |
| 2 | Large AC count (34) for single story | Medium | 34 ACs with hook extraction creates risk of scope creep. Recommend splitting (see below) OR strictly enforce scope boundaries during dev. |
| 3 | No LOC verification for extracted hooks | Low | Story claims useRovingTabIndex is 362 LOC and useAnnouncer is 153 LOC, verified via wc -l. Actual: 362 and 153 lines respectively. No issue, just confirming. |

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

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

**Reasoning**:
- All 8 audit checks pass or have minor issues
- Story is well-elaborated with comprehensive PM artifacts
- Core user journey is clear and achievable
- Dependencies already installed (@dnd-kit, framer-motion, zod)
- Existing implementations (726 LOC + 643 LOC) provide proven patterns
- Test plan is thorough with ADR-006 compliance (E2E required)

**Condition**: Story size is at upper limit (34 ACs, 5 SP). Either:
1. Split into REPA-007a + REPA-007b (recommended), OR
2. Proceed as-is with strict scope enforcement and accept 3 review cycles

**No MVP-critical blockers identified.**

---

## MVP-Critical Gaps

None - core journey is complete.

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

---

## Worker Token Summary

- Input: ~65,000 tokens (files read: story, PM artifacts, package.json, agent instructions, CLAUDE.md)
- Output: ~2,500 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
