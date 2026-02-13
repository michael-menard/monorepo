# Elaboration Report - REPA-021

**Date**: 2026-02-10
**Verdict**: PASS

## Summary

Story REPA-021 consolidates duplicate skeleton and empty state components from main-app and app-dashboard into @repo/app-component-library. All audit checks pass with zero MVP-critical gaps. Story is ready for implementation with clear, unambiguous requirements.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md exactly. No extra endpoints or infrastructure introduced. |
| 2 | Internal Consistency | PASS | — | Goals align with Non-goals. AC matches scope. Test plan matches AC. No contradictions found. |
| 3 | Reuse-First | PASS | — | Story reuses existing `Skeleton` primitive from library. Uses `Button`, `cn()`, and other library utilities. No new packages created unnecessarily. |
| 4 | Ports & Adapters | PASS | — | Frontend-only consolidation. No API layer involvement. Component architecture properly separated (presentation logic in components). |
| 5 | Local Testability | PASS | — | Unit tests specified in AC-7 (Vitest). E2E tests specified in AC-8 (Playwright with real services per ADR-006). Both are concrete and executable. |
| 6 | Decision Completeness | PASS | — | All ambiguities resolved via AC-2 and AC-7 clarifications. Storybook appropriately marked non-blocking. |
| 7 | Risk Disclosure | PASS | — | Story clearly states no API, DB, or infrastructure changes. Migration strategy outlined in Architecture Notes with 3-phase approach. Import resolution and test migration risks documented in Dev Feasibility Notes. |
| 8 | Story Sizing | PASS | — | 3 SP is appropriate. Story touches 3 packages (app-component-library, main-app, app-dashboard). Creates ~7 new files, modifies ~8 files, deletes ~8 files. 9 ACs with clear boundaries. No split indicators: Backend work (none), Frontend-only, no multiple independent features. Test scenarios are focused and straightforward. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | EmptyDashboard messaging inconsistency | Low | Verify actual implementation wording during implementation, update AC-3 if needed | Documented as implementation note |
| 2 | Missing Zod schema constraint documentation | Low | Zod schemas are primarily for type inference (components are internal to library, validation at consumption points is app responsibility) | Documented as implementation note |
| 3 | EmptyState action prop ambiguity | Medium | Added explicit precedence rule to AC-2: "If both onClick and href are provided, href takes precedence" | **RESOLVED - AC-2 Updated** |
| 4 | Package.json modifications unclear | Low | All dependencies already exist, clause is defensive and can be ignored | Documented as implementation note |
| 5 | Test file migration strategy incomplete | Medium | Added explicit strategy to AC-7: "Merge duplicate tests from both apps into single test files, preserving all unique assertions" | **RESOLVED - AC-7 Updated** |

## Discovery Findings

### Gaps Identified

| # | Finding | Decision | Notes |
|---|---------|----------|-------|
| 1 | EmptyDashboard messaging inconsistency | Implementation note | Story assumes byte-for-byte identical components. Actual wording may differ. Use existing implementation wording ("Welcome to LEGO MOC Instructions!" vs AC-3's "Your Dashboard is Empty"). |
| 2 | Missing Zod schema constraint documentation | Implementation note | Schemas are primarily for type inference (components are internal, validation is consumer responsibility). |
| 4 | Package.json modifications unclear | Implementation note | All dependencies already exist. No package installs needed. |

### Enhancement Opportunities

17 non-blocking findings logged to Knowledge Base for post-MVP consideration:

#### High-Priority (Sprint N+1)
- **Storybook Setup** (Enhancement #1): High impact for entire library, ~6 hours effort
- **Screen Reader Announcements** (Gap #1): Medium impact, low effort (~1 hour)
- **Visual Regression Tooling** (Gap #6): Medium impact, ~4 hours effort
- **Comprehensive WCAG Audit** (Enhancement #14): High impact, ~6 hours effort

#### Medium-Priority (Sprint N+2)
- EmptyState illustration support
- DashboardSkeleton partial loading states
- Dark mode theming verification
- EmptyState custom icon props support
- EmptyState multiple CTA actions support
- Test coverage threshold validation

#### Low-Priority (Sprint N+3+)
- Generic preset factory pattern
- EmptyState bottom content slot
- DashboardSkeleton animation customization
- Internationalization support
- Performance optimization for large grids

### Follow-up Stories Suggested

None - all scope is contained within REPA-021.

### Items Marked Out-of-Scope

None explicitly marked out-of-scope in autonomous mode.

### Clarifications to Acceptance Criteria

#### AC-2: Generic EmptyState Component

**Updated**: Added explicit action precedence rule
- If both `onClick` and `href` are provided, `href` takes precedence (Link rendered over Button)
- This eliminates implementation ambiguity and matches Architecture Notes pseudocode

#### AC-7: Test Coverage in Library

**Updated**: Added explicit test consolidation strategy
- Merge duplicate tests from both apps into single test files
- Preserve all unique assertions and remove duplicates
- Line coverage measured via Vitest (clarified from abstract "coverage" requirement)
- All original test assertions preserved from both duplicate test files

## Proceed to Implementation?

**YES** - Story may proceed to implementation.

### Implementation Readiness Checklist

✅ Story scope clearly defined
✅ All 9 ACs are testable and concrete
✅ Reuse strategy leverages existing primitives
✅ Migration path is safe (3-phase approach documented)
✅ No API, database, or infrastructure changes required
✅ No conflicting work detected (REPA-012/013 are auth-focused)
✅ All dependencies already available in codebase
✅ Zero MVP-critical gaps remaining

### Implementation Phases

**Phase 1: Add to Library**
1. Create `empty-states.tsx` with `EmptyState` and `EmptyDashboard`
2. Update `skeleton.tsx` with `DashboardSkeleton`
3. Add Zod schemas for all components
4. Export from `index.ts`

**Phase 2: Add Tests**
1. Consolidate duplicate tests from main-app and app-dashboard
2. Create `DashboardSkeleton.test.tsx` in library
3. Create `empty-states.test.tsx` in library
4. Verify ≥80% line coverage via Vitest

**Phase 3: Migrate Apps (Parallel)**
1. Update imports in main-app and app-dashboard
2. Verify builds succeed
3. Run E2E tests
4. Delete old component files

**Phase 4: Storybook (If Configured)**
1. If `.storybook/` exists: Add stories
2. If not: Document as "pending Storybook setup" and defer to future work

---

## Context Notes

**Story Type**: Tech Debt / Consolidation
**Priority**: P2
**Story Points**: 3
**Epic**: repackag-app

**Created**: 2026-02-10
**Elaboration Complete**: 2026-02-10
**Status Update**: ready-to-work

**Elaboration Mode**: Autonomous
**Verdict Sources**:
- ANALYSIS.md (8 audit checks)
- AUTONOMOUS-DECISION-SUMMARY.md (verdict + implementation guidance)
- DECISIONS.yaml (2 AC clarifications, 17 KB entries)

