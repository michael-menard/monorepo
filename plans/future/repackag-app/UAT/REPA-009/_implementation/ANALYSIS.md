# Elaboration Analysis - REPA-009

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches index exactly. GalleryCard enhancement + InspirationCard/AlbumCard refactors. No extra features. |
| 2 | Internal Consistency | PASS | — | Goals/Non-goals aligned. ACs match scope. Decisions documented in _pm files. |
| 3 | Reuse-First | PASS | — | Story consolidates duplicates into @repo/gallery. Uses @repo/app-component-library, @repo/accessibility. No new one-off utilities. |
| 4 | Ports & Adapters | N/A | — | Frontend-only story. No API endpoints, no backend changes. |
| 5 | Local Testability | PASS | — | Comprehensive test plan with Vitest unit tests, integration tests, snapshot tests. Storybook stories for manual QA. |
| 6 | Decision Completeness | CONDITIONAL | Medium | 3 open questions documented (position conflicts, actions overlay, mobile hover). Blocking decisions made in DEV-FEASIBILITY.md but require PM confirmation. |
| 7 | Risk Disclosure | PASS | — | REPA-007 dependency disclosed. Refactor regression risk documented with mitigation. dnd-kit integration risk acknowledged. |
| 8 | Story Sizing | PASS | — | 11 ACs, frontend-only, ~200 LOC added/130 removed. Estimated 5-8 hours. Within single story bounds. No split needed. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Open Question: Position Conflict Resolution | Medium | PM must confirm fixed positions (checkbox=top-left, drag=top-right) or allow position props. Recommendation documented in DEV-FEASIBILITY.md. |
| 2 | Open Question: Actions Overlay Breaking Change | Medium | PM must approve removal of built-in actions overlay from GalleryCard. Breaking change requires explicit sign-off. Migration documented. |
| 3 | Open Question: Mobile Hover Overlay Behavior | Medium | PM must confirm always-visible vs tap-to-reveal on mobile. Recommendation: always visible via md: breakpoint classes. |
| 4 | Open Question: renderDragHandle MVP Scope | Low | PM should confirm if custom drag handle rendering is MVP-required or future work. Story includes prop in AC-4 but no consumers identified. |
| 5 | REPA-007 Timeline Dependency | Medium | Drag handle integration testing depends on SortableGallery completion. If delayed >1 week, recommend split into REPA-009a (UI only) + REPA-009b (integration). |

## Split Recommendation

**Not Recommended for MVP Scope**

The story has 11 ACs but they are cohesive and sequential. Estimated effort is 5-8 hours (1-2 days), which fits a single story. However, **conditional split** may be warranted based on REPA-007 timeline:

| Split | Scope | AC Allocation | Dependency |
|-------|-------|---------------|------------|
| REPA-009a | GalleryCard enhancements (UI only) | AC-1 through AC-7, AC-10, AC-11 | None |
| REPA-009b | Domain card refactors + SortableGallery integration | AC-8, AC-9 | Depends on REPA-007, REPA-009a |

**Split Trigger**: If REPA-007 is >1 week from completion at REPA-009 start time.

**Alternative**: Proceed with full REPA-009, mock SortableGallery in tests, validate drag handle integration in REPA-010.

## Preliminary Verdict

**CONDITIONAL PASS**

**Reasoning**:
- Core story is well-structured with clear scope, comprehensive test plan, and proper reuse-first approach
- 3 MVP-critical design decisions documented in DEV-FEASIBILITY.md but require PM confirmation before implementation
- REPA-007 dependency introduces scheduling risk but has documented mitigation (split or defer integration)
- No architectural concerns, no missing requirements beyond open questions

**Conditions for Implementation Start**:
1. PM confirms position conflict resolution strategy (Issue #1)
2. PM approves actions overlay removal (Issue #2)
3. PM confirms mobile hover overlay behavior (Issue #3)
4. REPA-007 completion timeline assessed (Issue #5)

**Verdict**: CONDITIONAL PASS

---

## MVP-Critical Gaps

None - core journey is complete.

**Analysis**:
The story provides a complete user journey for selection and drag-and-drop modes in gallery cards:
1. User can select cards via checkbox overlay (ACs 1-3)
2. User can drag cards via drag handle (ACs 4-6)
3. User can view hover overlays with custom content (AC-7)
4. Existing cards (InspirationCard, AlbumCard) maintain API compatibility (ACs 8-9)
5. Comprehensive test coverage ensures quality (AC-10)
6. Documentation supports adoption (AC-11)

The open questions (Issues #1-4) are **implementation details, not scope gaps**. They require design decisions but do not block the core user journey. The story provides recommendations for each decision, enabling PM to approve and unblock.

**Dependency Risk**: REPA-007 (SortableGallery) is a dependency for drag handle integration testing, but this does not block MVP delivery of GalleryCard enhancements. The story can deliver value independently (selection mode works without SortableGallery). Integration validation can be deferred to REPA-010 if needed.

---

## Worker Token Summary

- Input: ~54,000 tokens (files read: REPA-009.md, stories.index.md, PLAN.exec.md, PLAN.meta.md, GalleryCard.tsx, InspirationCard/index.tsx, AlbumCard/index.tsx, TEST-PLAN.md, UIUX-NOTES.md, DEV-FEASIBILITY.md, elab-analyst.agent.md, types/index.ts)
- Output: ~3,000 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
