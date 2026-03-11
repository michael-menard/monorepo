# Elaboration Report - REPA-009

**Date**: 2026-02-10
**Verdict**: CONDITIONAL PASS
**Mode**: Autonomous

## Summary

REPA-009 (Enhance GalleryCard with Selection & Drag) passed elaboration with conditions. All 4 open design decisions were auto-resolved using documented recommendations. No MVP-critical gaps found. 16 non-blocking enhancements logged for future work.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches index exactly |
| 2 | Internal Consistency | PASS | — | Goals/Non-goals aligned, ACs match scope |
| 3 | Reuse-First | PASS | — | Consolidates duplicates into @repo/gallery |
| 4 | Ports & Adapters | N/A | — | Frontend-only story |
| 5 | Local Testability | PASS | — | Vitest + Storybook coverage |
| 6 | Decision Completeness | CONDITIONAL | Medium | 4 design decisions auto-resolved |
| 7 | Risk Disclosure | PASS | — | REPA-007 dependency disclosed |
| 8 | Story Sizing | PASS | — | 11 ACs, 5-8 hours, no split needed |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | Position Conflict Resolution | Medium | Fixed positions: checkbox=top-left, drag=top-right | RESOLVED |
| 2 | Actions Overlay Breaking Change | Medium | Remove built-in actions overlay, use hoverOverlay | RESOLVED |
| 3 | Mobile Hover Overlay Behavior | Medium | Always visible on mobile via md: breakpoint | RESOLVED |
| 4 | renderDragHandle MVP Scope | Low | Include in MVP as optional/advanced prop | RESOLVED |
| 5 | REPA-007 Timeline Dependency | Medium | Monitor; split to 009a/009b if >1 week delay | ACKNOWLEDGED |

## Design Decisions Made (Autonomous)

| # | Decision | Confidence | Breaking? |
|---|----------|------------|-----------|
| 1 | Fixed positions when both selection+drag enabled | High | No |
| 2 | Remove actions overlay, replace with hoverOverlay | High | Yes (3 components) |
| 3 | Mobile: always visible, Desktop: hover-visible | High | No |
| 4 | renderDragHandle included as optional prop | Medium | No |

## Discovery Findings

### Gaps Identified

| # | Finding | Decision | Notes |
|---|---------|----------|-------|
| 1 | renderDragHandle over-engineering | Resolved (Design Decision #4) | Keep as optional prop |
| 2 | No runtime Zod error handling | KB-logged | Non-blocking edge case |
| 3 | No checkbox animation | KB-logged | UX polish for future |
| 4 | Drag handle always in DOM | KB-logged | Minimal performance impact |
| 5 | No bulk select shortcut | KB-logged | Requires parent gallery context |
| 6 | No drag preview feedback | KB-logged | Handled by REPA-007 |
| 7 | Position props ignored when both enabled | Resolved (Design Decision #1) | Fixed positions |

### Enhancement Opportunities

| # | Finding | Impact | Effort | Decision |
|---|---------|--------|--------|----------|
| 1 | Multi-select drag-and-drop | High | High | KB-logged (REPA-010) |
| 2 | Undo/redo for reordering | Medium | Medium | KB-logged |
| 3 | Keyboard reordering | Medium | High | KB-logged (WCAG) |
| 4 | Custom checkbox styles | Low | Medium | KB-logged |
| 5 | Batch actions toolbar | High | Medium | KB-logged (REPA-010+) |
| 6 | Selection count badge | Low | Low | KB-logged (quick win) |
| 7 | Hover overlay delay | Low | Low | KB-logged |
| 8-15 | Various polish items | Low-Medium | Low-High | KB-logged |

### Follow-up Stories Suggested

None (autonomous mode does not create follow-ups).

### Items Marked Out-of-Scope

None (autonomous mode does not mark items out-of-scope).

### KB Entries Deferred

16 entries written to `DEFERRED-KB-WRITES.yaml` (KB unavailable at elaboration time).

## Proceed to Implementation?

**YES** - story may proceed to implementation.

**Conditions**:
- Monitor REPA-007 progress at start time
- If REPA-007 >1 week from completion, split to REPA-009a (UI) + REPA-009b (integration)
- Breaking change (actions overlay removal) noted for CHANGELOG
