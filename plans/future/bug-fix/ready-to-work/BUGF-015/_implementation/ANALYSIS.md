# Elaboration Analysis - BUGF-015

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Scope matches stories.index.md: 24 untested components in main-app, no backend changes, test coverage story only |
| 2 | Internal Consistency | PASS | — | Goals align with acceptance criteria, non-goals clearly exclude E2E testing and component refactoring, reuse plan consistent with test patterns |
| 3 | Reuse-First | PASS | — | Story reuses 53 existing test files' patterns, existing MSW handlers, existing test utilities from `src/test/` - no new test infrastructure created |
| 4 | Ports & Adapters | PASS | — | Frontend testing only, no API endpoints involved. Tests follow established separation: mock API layer with MSW, test component behavior independently |
| 5 | Local Testability | PASS | — | All tests runnable locally with `pnpm test --filter main-app`, coverage report generated, no E2E dependencies (E2E deferred to BUGF-030 per ADR-006) |
| 6 | Decision Completeness | PASS | — | Timer testing pattern specified (vi.useFakeTimers), coverage thresholds defined per component type, test execution order clarified (isolated, parallel-safe) |
| 7 | Risk Disclosure | PASS | — | 5 risks documented: coverage target challenge (medium), timer testing (medium), React.lazy mocking (high confidence - patterns exist), large scope split risk (medium), context provider pattern (high confidence) |
| 8 | Story Sizing | CONDITIONAL PASS | Medium | 24 components is large (15-22 hours), but story includes phased approach and split strategy: admin+upload first (MVP-critical), defer layout+pages if needed. Story is implementable but monitor Phase 1-2 completion time |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Coverage Threshold Ambiguity | Low | Story states "minimum 45% global coverage" but current main-app coverage is ~36-40%. Adding 24 component tests may not reach 45% if existing coverage is low. Story should clarify whether 45% is hard blocker or aspirational target, and whether additional tests beyond 24 components are in scope if 45% is not reached. |
| 2 | LoadingPage Test Contradiction | Informational | Story says LoadingPage "already has test file (false positive from analysis)" but scope excludes it from 24 components. Codebase scan confirms LoadingPage.test.tsx exists at `/Users/michaelmenard/Development/monorepo/apps/web/main-app/src/routes/__tests__/LoadingPage.test.tsx`. Non-blocking - story correctly excludes this component. |

## Split Recommendation

**NOT REQUIRED** - Story sizing is large but manageable with phased approach already included in story:

**If Split Becomes Necessary During Implementation:**

| Split | Scope | AC Allocation | Dependency | Points |
|-------|-------|---------------|------------|--------|
| BUGF-015-A | Admin + Upload Components (Security Critical) | AC-1 (Admin), AC-2 (Upload), AC-7 (Test Quality), AC-8 (Coverage Metrics) | None | 3 |
| BUGF-015-B | Modules + Forms + Navigation + Pages | AC-3 (Modules), AC-4 (Forms), AC-5 (Navigation/Layout), AC-6 (Pages), AC-7, AC-8 | Depends on BUGF-015-A passing | 2 |

**Split Trigger:** If Phase 1-2 (Admin + Upload) takes more than 12 hours, split story. Phase 1-2 represents ~50% of effort but ~70% of MVP value (security critical and recently modified components).

## Preliminary Verdict

**CONDITIONAL PASS**

**Rationale:**
- All 8 audit checks pass or conditionally pass
- 1 low-severity issue (coverage threshold ambiguity) - clarify expectations in story
- Large scope (24 components) but phased approach with split strategy mitigates risk
- All test infrastructure exists, patterns established, dependencies available
- All 24 components verified to exist in codebase (including SessionProvider at `/Users/michaelmenard/Development/monorepo/apps/web/main-app/src/components/Uploader/SessionProvider/index.tsx`)
- No MVP-blocking issues identified

**Action Required Before Implementation:**
1. Clarify 45% coverage threshold: hard blocker or aspirational? (Issue #1)
2. Confirm phasing strategy with PM: is Phase 1-2 sufficient for story completion if time constrained?
3. Monitor Phase 1-2 completion time to determine if story split is needed (trigger: >12 hours)

---

## MVP-Critical Gaps

**None - core journey is complete**

All acceptance criteria are well-defined for MVP test coverage:
- AC-1 through AC-6 cover all 24 components with specific test requirements
- AC-7 defines test quality standards (semantic queries, BDD structure, accessibility)
- AC-8 defines coverage metrics and CI requirements

No gaps block the core testing journey. Story is ready for implementation after addressing the 2 low-severity issues above.

---

## Worker Token Summary

- Input: ~67,000 tokens (story file, PM artifacts, agent instructions, codebase scans)
- Output: ~3,500 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
- Codebase Files Scanned: 8 (AdminModule.tsx, TagInput.tsx, setup.ts, BlockUserDialog.test.tsx, NavigationProvider.test.tsx, stories.index.md, Uploader component paths, test file counts)
