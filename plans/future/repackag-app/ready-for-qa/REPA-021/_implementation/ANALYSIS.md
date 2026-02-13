# Elaboration Analysis - REPA-021

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md exactly. No extra endpoints or infrastructure introduced. |
| 2 | Internal Consistency | PASS | — | Goals align with Non-goals. AC matches scope. Test plan matches AC. No contradictions found. |
| 3 | Reuse-First | PASS | — | Story reuses existing `Skeleton` primitive from library. Uses `Button`, `cn()`, and other library utilities. No new packages created unnecessarily. |
| 4 | Ports & Adapters | PASS | — | Frontend-only consolidation. No API layer involvement. Component architecture properly separated (presentation logic in components). |
| 5 | Local Testability | PASS | — | Unit tests specified in AC-7 (Vitest). E2E tests specified in AC-8 (Playwright with real services per ADR-006). Both are concrete and executable. |
| 6 | Decision Completeness | CONDITIONAL | Medium | AC-9 acknowledges Storybook may not be configured. Investigation confirms Storybook dependencies exist but no `.storybook` directory or stories found. Decision made: mark AC-9 non-blocking. One minor gap: EmptyDashboard preset messaging differs slightly between apps (see Issue #1). |
| 7 | Risk Disclosure | PASS | — | Story clearly states no API, DB, or infrastructure changes. Migration strategy outlined in Architecture Notes with 3-phase approach. Import resolution and test migration risks documented in Dev Feasibility Notes. |
| 8 | Story Sizing | PASS | — | 3 SP is appropriate. Story touches 3 packages (app-component-library, main-app, app-dashboard). Creates ~7 new files, modifies ~8 files, deletes ~8 files. 9 ACs with clear boundaries. No split indicators: Backend work (none), Frontend-only, no multiple independent features. Test scenarios are focused and straightforward. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | EmptyDashboard messaging inconsistency | Low | Story assumes byte-for-byte identical components (line 48: "Both implementations are byte-for-byte identical"). Reality check confirms this is true. However, AC-3 specifies exact wording that should be verified against actual implementations. Current implementations use "Welcome to LEGO MOC Instructions!" but AC-3 specifies "Your Dashboard is Empty". Recommendation: Use actual implementation wording ("Welcome to LEGO MOC Instructions!") as it's more user-friendly, or explicitly call out this design decision in story. |
| 2 | Missing Zod schema constraint documentation | Low | AC-1, AC-2, AC-3 specify Zod schemas must be created, but story doesn't document whether schemas should enforce runtime validation or are purely for type inference. Recommendation: Add note that schemas are primarily for type inference (components are internal to library, validation at consumption points is app responsibility). |
| 3 | EmptyState action prop ambiguity | Medium | AC-2 states action prop supports both `onClick` and `href` variants, but doesn't specify whether both can be provided simultaneously or if one takes precedence. Architecture Notes pseudocode (lines 471-479) shows `href` takes precedence but this isn't documented in AC. Recommendation: Add to AC-2 that `href` takes precedence if both provided, or make them mutually exclusive via Zod schema (`.refine()`). |
| 4 | Package.json modifications unclear | Low | AC-5 and AC-6 mention package.json modifications "if dev dependencies needed" (lines 121, 147). Story doesn't clarify what dev dependencies might be needed. Investigation shows all dependencies already exist. Recommendation: Remove this clause or clarify it's a defensive check for missing dependencies. |
| 5 | Test file migration strategy incomplete | Medium | AC-5 and AC-6 state "All tests moved to library package (assertions preserved)" but don't specify whether tests should be consolidated (deduplicated) or kept as separate test suites. Recommendation: Explicitly state tests should be consolidated into single test files with all unique assertions preserved. |

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

**Rationale**: Story is well-structured with clear scope, comprehensive ACs, and proper reuse strategy. All major audit checks pass. Issues found are low-to-medium severity and non-blocking for MVP. Primary concerns are around minor ambiguities in component prop APIs and test migration strategy. Story can proceed to implementation with the following fixes:

1. Clarify EmptyDashboard title wording (Issue #1) - use existing wording or explicitly document change
2. Document `href` precedence over `onClick` in EmptyState action prop (Issue #3)
3. Clarify test consolidation strategy (Issue #5) - recommend single deduplicated test files

All other issues are documentation polish and can be addressed during implementation.

---

## MVP-Critical Gaps

**Analysis**: After thorough review of the story against the audit checklist and codebase reality, NO MVP-critical gaps were found that block the core user journey.

The story's core user journey is: "Developer imports consolidated skeleton/empty state components from library and uses them in dashboard apps without errors, achieving identical visual/functional behavior."

All elements needed for this journey are present:
- Component specifications are complete (AC-1, AC-2, AC-3)
- Export strategy is defined (AC-4)
- Migration path is clear (AC-5, AC-6)
- Test coverage is specified (AC-7, AC-8)
- Storybook is appropriately marked non-blocking (AC-9)

**Issues #1-5 above are quality/clarity improvements, not blockers.**

None - core journey is complete.

---

## Worker Token Summary

- Input: ~42,324 tokens (files read: REPA-021.md, stories.index.md, PLAN.exec.md, PLAN.meta.md, agent instructions, 4 component files, 2 test files, skeleton.tsx, index.ts, package.json, button.tsx primitives)
- Output: ~2,100 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
