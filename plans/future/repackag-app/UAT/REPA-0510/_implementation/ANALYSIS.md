# Elaboration Analysis - REPA-0510

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Scope matches stories.index.md: migrate 8 core upload components (~1,945 LOC minus SessionProvider) from apps to @repo/upload/components. Split properly isolates non-REPA-003-dependent components. No extra endpoints or infrastructure changes. |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, and ACs are internally consistent. SessionProvider explicitly excluded (deferred to REPA-0520). Local Testing Plan (AC-14, AC-15, AC-16) matches scope. FileValidationResult duplication (AC-10) correctly deferred to REPA-017. |
| 3 | Reuse-First | PASS | — | All components use @repo/app-component-library primitives (barrel import), @repo/upload/types (REPA-002), @repo/hooks (REPA-014), and lucide-react. No new one-off utilities planned. Package boundary rules clearly documented. |
| 4 | Ports & Adapters | PASS | — | No API endpoints modified. Frontend-only consolidation with clear package boundaries. Components are pure UI with dependency injection for callbacks/handlers (no Redux imports in package code). |
| 5 | Local Testability | PASS | — | AC-14 requires 80%+ test coverage (exceeds global 45% minimum). AC-16 includes Playwright E2E tests for upload flows, rate limit, and conflict handling. Tests are concrete and executable. Package-level isolation verified in AC-15. |
| 6 | Decision Completeness | CONDITIONAL | Medium | Component divergence verification (Seed Requirements, line 437-445 of parent REPA-005) is documented but NOT elevated to formal blocking checklist. This is a PRE-IMPLEMENTATION BLOCKER that must complete before AC-1 starts. Story should add explicit checklist item with BLOCKING status. |
| 7 | Risk Disclosure | PASS | — | Split risk 0.3 disclosed (down from 0.7 in parent). REPA-004 dependency clearly marked as non-blocking (UAT). Component divergence risk documented. No hidden dependencies. Test migration complexity acknowledged (MSW handlers). |
| 8 | Story Sizing | CONDITIONAL | Medium | Story has **15 ACs** (exceeds 8-AC limit) BUT was explicitly approved as split from 16-AC parent. Many ACs are mechanical (6 similar component migrations). Estimated 5 SP is reasonable for scope. However, if component divergence reveals >10% LOC differences, may need further split. **Recommendation**: Proceed with current split, monitor divergence verification results. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Component Divergence Verification Not Elevated to Checklist | Medium | The parent elaboration (REPA-005 ANALYSIS.md, Issue #3) identified this as a BLOCKING pre-implementation step. It exists in Seed Requirements (lines 437-445) but is NOT in the formal Completion Checklist. **Required Action**: This analysis identifies this as MVP-critical gap #1 (see below). Must be completed BEFORE starting AC-1. |
| 2 | 15-AC Story Size Justification | Low | Story exceeds 8-AC guideline but was approved as split from 16-AC parent. Six ACs (AC-1 to AC-6) are similar component migrations, reducing effective complexity. **Note**: This is acceptable IF component divergence verification shows <10% LOC differences. If divergence is high, recommend further split. |
| 3 | Import Path Migration Scope Not Quantified | Low | AC-12 and AC-13 require updating imports in main-app and app-instructions-gallery but do not quantify scope. Parent story estimated "20-30 files per app" in Dev Feasibility. **Recommendation**: Add verification step to ACs: "Verify no imports from old paths remain using `pnpm check-types`". Already present in AC-12/AC-13 sub-bullets. |
| 4 | Test Setup Dependency Not Explicit | Low | Package migration requires MSW handlers in `packages/core/upload/src/test/setup.ts` (mentioned in Dev Feasibility). **Recommendation**: Add sub-bullet to AC-14 or create explicit AC for test setup BEFORE migrating component tests. |

## Split Recommendation

**Split Status**: NOT NEEDED (story already appropriately split from parent REPA-005)

**Rationale**:
- This story is ALREADY split 1 of 2 from parent REPA-005
- 15 ACs is high but justified: 6 ACs are mechanical component migrations with similar patterns
- 5 SP is reasonable for 8 components across 2 apps
- No blocking dependencies (REPA-004 is non-blocking, in UAT)
- Low split risk (0.3) indicates manageable scope

**Conditional Split Trigger**:
If component divergence verification reveals:
- >10% LOC differences across components
- Significant logic reconciliation required
- Multiple implementation patterns to choose from

**Then consider**:
- REPA-0510a: Simple components (AC-1 to AC-4: ConflictModal, RateLimitBanner, SessionExpiredBanner, UnsavedChangesDialog)
- REPA-0510b: Medium complexity (AC-5, AC-6: UploaderFileItem, UploaderList)
- REPA-0510c: Domain-specific (AC-8, AC-9: ThumbnailUpload, InstructionsUpload)

**Recommendation**: Proceed with current split. Monitor divergence verification results. Only split further if divergence >10% LOC.

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

**Rationale**:
- All audit checks pass or have acceptable conditional issues
- Story is appropriately split from parent REPA-005
- Scope is manageable (8 components, 5 SP, 0.3 split risk)
- ONE MVP-CRITICAL GAP: Component divergence verification must complete BEFORE implementation starts

**Condition for PASS**:
- Component divergence verification MUST be completed and documented in `_implementation/DIVERGENCE-NOTES.md` BEFORE starting AC-1
- If divergence >10% LOC, story may need further split OR additional reconciliation ACs

---

## MVP-Critical Gaps

**Analysis**: Core user journey is complete. The story consolidates existing components without adding new functionality. All 15 ACs support the primary goal: eliminate duplicate components across apps.

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Component Divergence Verification | Pre-implementation verification step | **BEFORE AC-1 starts**: Run `diff` on all 7 Uploader sub-components (ConflictModal, RateLimitBanner, SessionExpiredBanner, UnsavedChangesDialog, UploaderFileItem, UploaderList) between `apps/web/main-app/src/components/Uploader/` and `apps/web/app-instructions-gallery/src/components/Uploader/`. Document findings in `_implementation/DIVERGENCE-NOTES.md`. If divergence >10% LOC, add reconciliation sub-ACs or recommend further split. Choose canonical implementation source (prefer version with better tests). |

**NOTE**: This gap was identified in parent REPA-005 elaboration (ANALYSIS.md, Issue #3) but not elevated to formal checklist in split story. This is a BLOCKING pre-implementation step.

---

## Worker Token Summary

- Input: ~51,000 tokens (REPA-0510.md, AGENT-CONTEXT.md, stories.index.md, parent REPA-005 analysis, api-layer.md, agent instructions, codebase verification)
- Output: ~4,000 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
