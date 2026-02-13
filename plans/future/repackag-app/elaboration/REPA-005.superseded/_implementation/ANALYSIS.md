# Elaboration Analysis - REPA-005

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Scope matches stories.index.md: migrate 9 upload components (~1,945 LOC) from apps to @repo/upload/components. No extra endpoints or infra changes. |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, and ACs are consistent. No contradictions found. Local Testing Plan (AC-14, AC-15, AC-16) matches scope. |
| 3 | Reuse-First | PASS | — | All components will use @repo/app-component-library primitives, @repo/upload/hooks (REPA-003), @repo/hooks (REPA-014), and @repo/upload/types (REPA-002). No new one-off utilities planned. |
| 4 | Ports & Adapters | PASS | — | No API endpoints modified. Frontend-only consolidation with clear dependency injection pattern for SessionProvider (auth state passed as props, not Redux imports). |
| 5 | Local Testability | PASS | — | AC-14 requires 80%+ test coverage. AC-16 includes Playwright E2E tests for upload flows, rate limit, and conflict handling. Tests are concrete and executable. |
| 6 | Decision Completeness | CONDITIONAL | Medium | SessionProvider migration (AC-7) has BLOCKING DEPENDENCY on REPA-003. Story acknowledges this with verification step but does not have a concrete fallback if REPA-003 is delayed. Risk of mid-story blocking. |
| 7 | Risk Disclosure | PASS | — | Split risk 0.7 disclosed. REPA-003 dependency risk identified. Component divergence risk documented (requires verification). Auth injection fragility risk noted in Dev Feasibility. No hidden dependencies. |
| 8 | Story Sizing | FAIL | High | Story exceeds "too large" thresholds: **16 ACs** (limit: 8), **9 components** across 2 apps, **~1,945 LOC**, **REPA-003 dependency**, **8 SP**. Meets 4+ indicators for split recommendation. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Story Too Large | High | **SPLIT REQUIRED**: 16 ACs exceed 8-AC limit. Recommend REPA-005a (core Uploader sub-components: AC-1 to AC-6, AC-8 to AC-16) + REPA-005b (SessionProvider: AC-7 only, after REPA-003 completion). |
| 2 | REPA-003 Dependency Blocking Risk | Medium | AC-7 (SessionProvider) cannot proceed until REPA-003 (useUploaderSession hook) is completed. Story status shows REPA-003 as "ready-to-work" (not completed). If REPA-003 is delayed, SessionProvider migration blocks. **Mitigation**: Story already documents split option in Seed Requirements (line 430-435). Recommend making split the DEFAULT plan, not fallback. |
| 3 | Component Divergence Verification Gap | Medium | Seed Requirements (AC line 437-445) require running `diff` on all 7 Uploader sub-components to verify duplication claim. This verification MUST happen BEFORE starting migration to choose canonical implementation. **Required Action**: Add explicit AC for divergence verification OR add to pre-implementation checklist with BLOCKING status. |
| 4 | FileValidationResult Schema Duplication Deferral | Low | AC-10 defers FileValidationResult schema consolidation to REPA-017 (backlog). This is acceptable for MVP but creates technical debt. Both ThumbnailUpload and InstructionsUpload will have identical schemas in __types__/index.ts. **Note**: No fix required for MVP, documented correctly as non-blocking. |
| 5 | Import Path Migration Scope Unclear | Medium | AC-12 and AC-13 require updating "all imports" in main-app and app-instructions-gallery but do not quantify scope. Story mentions "20-30 files per app" in Dev Feasibility but this is not in ACs. **Recommendation**: Add sub-bullet to AC-12/AC-13: "Verify no imports from old paths remain using TypeScript compilation check (`pnpm check-types`)". |

## Split Recommendation

**Split Status**: RECOMMENDED (not just "if needed")

Given the story exceeds multiple "too large" indicators (16 ACs, 9 components, 8 SP, blocking dependency), a split is recommended as the PRIMARY implementation strategy:

| Split | Scope | AC Allocation | Dependency | Story Points | Risk |
|-------|-------|---------------|------------|--------------|------|
| REPA-005a | Core Uploader Sub-Components + Domain-Specific Components | AC-1 to AC-6, AC-8 to AC-16 (15 ACs) | REPA-004 (UAT, non-blocking) | 5 SP | Low - No REPA-003 dependency |
| REPA-005b | SessionProvider Migration | AC-7 only (1 AC) | **REPA-003 (BLOCKING)** | 3 SP | Medium - Requires completed REPA-003 |

**Rationale**:
- REPA-005a can start immediately (8 components, no hook dependency)
- REPA-005b waits for REPA-003 completion (SessionProvider uses useUploaderSession)
- Each split is independently testable and deployable
- Reduces mid-story blocking risk from 0.7 to ~0.3 for REPA-005a

**Story Sequencing**:
1. REPA-003 (in-progress) → Complete first
2. REPA-005a (new) → Start immediately (parallel with REPA-003 if needed)
3. REPA-005b (new) → Start after REPA-003 completion verified

## Preliminary Verdict

**Verdict**: SPLIT REQUIRED

**Rationale**:
- Story exceeds multiple "too large" indicators (16 ACs, 9 components, 8 SP, REPA-003 dependency)
- REPA-003 dependency creates mid-story blocking risk (0.7 split risk)
- Split into REPA-005a (8 components, no dependency) + REPA-005b (SessionProvider, REPA-003 dependency) reduces complexity and risk
- All other checks pass; split is the only blocking issue

---

## MVP-Critical Gaps

**Analysis**: Core user journey is complete. The story consolidates existing components without adding new functionality. All 16 ACs support the primary goal: eliminate duplicate components across apps.

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Component Divergence Verification | Pre-implementation verification step | **BEFORE AC-1 starts**: Run `diff` on all 7 Uploader sub-components. Document findings in `_implementation/DIVERGENCE-NOTES.md`. If divergence >10% LOC, add reconciliation sub-ACs to story or split. |

**Note**: This is a pre-implementation blocker, not a gap in the story itself. The seed requirement (line 437-445) already documents this step, but it should be elevated to a formal checklist item with BLOCKING status.

---

## Worker Token Summary

- Input: ~55,000 tokens (REPA-005.md, stories.index.md, PLAN.exec.md, api-layer.md, agent instructions, codebase verification)
- Output: ~3,500 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
