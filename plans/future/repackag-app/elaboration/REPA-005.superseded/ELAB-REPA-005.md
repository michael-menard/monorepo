# Elaboration Report - REPA-005

**Date**: 2026-02-11
**Verdict**: SPLIT REQUIRED

## Summary

REPA-005 (Migrate Upload Components to @repo/upload) exceeds multiple "too large" indicators and requires a split before implementation can proceed. The story includes 16 acceptance criteria across 9 components migrating to 2 apps (~1,945 LOC total), plus a blocking dependency on REPA-003 for SessionProvider migration. Autonomous elaboration recommends splitting into REPA-005a (15 ACs, core components) and REPA-005b (1 AC, SessionProvider-only) to reduce blocking risk and complexity.

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

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | Story Too Large | High | **SPLIT REQUIRED**: 16 ACs exceed 8-AC limit. Recommend REPA-005a (core Uploader sub-components: AC-1 to AC-6, AC-8 to AC-16) + REPA-005b (SessionProvider: AC-7 only, after REPA-003 completion). | BLOCKED |
| 2 | REPA-003 Dependency Blocking Risk | Medium | AC-7 (SessionProvider) cannot proceed until REPA-003 (useUploaderSession hook) is completed. Story status shows REPA-003 as "ready-to-work" (not completed). If REPA-003 is delayed, SessionProvider migration blocks. **Mitigation**: Story already documents split option in Seed Requirements (line 430-435). Recommend making split the DEFAULT plan, not fallback. | MITIGATED BY SPLIT |
| 3 | Component Divergence Verification Gap | Medium | Seed Requirements (AC line 437-445) require running `diff` on all 7 Uploader sub-components to verify duplication claim. This verification MUST happen BEFORE starting migration to choose canonical implementation. **Required Action**: Add explicit pre-implementation checklist item with BLOCKING status. | PRE-IMPL CHECKLIST |
| 4 | FileValidationResult Schema Duplication Deferral | Low | AC-10 defers FileValidationResult schema consolidation to REPA-017 (backlog). This is acceptable for MVP but creates technical debt. Both ThumbnailUpload and InstructionsUpload will have identical schemas in __types__/index.ts. **Note**: No fix required for MVP, documented correctly as non-blocking. | KB-LOGGED |
| 5 | Import Path Migration Scope Unclear | Medium | AC-12 and AC-13 require updating "all imports" in main-app and app-instructions-gallery but do not quantify scope. Story mentions "20-30 files per app" in Dev Feasibility but this is not in ACs. **Recommendation**: Add sub-bullet to AC-12/AC-13: "Verify no imports from old paths remain using TypeScript compilation check (`pnpm check-types`)". | KB-LOGGED |

## Split Recommendation (SPLIT REQUIRED)

**Split Status**: REQUIRED (not optional) - Story sizing audit check FAILED with High severity.

Given the story exceeds multiple "too large" indicators (16 ACs, 9 components, 8 SP, blocking dependency), a split is the PRIMARY implementation strategy:

### Proposed Splits

#### REPA-005a: Core Upload Components (No Dependency)
- **Scope**: Core Uploader Sub-Components + Domain-Specific Components
- **ACs**: AC-1 to AC-6, AC-8 to AC-16 (15 ACs total)
- **Components**: ConflictModal, RateLimitBanner, SessionExpiredBanner, UnsavedChangesDialog, UploaderFileItem, UploaderList, ThumbnailUpload, InstructionsUpload, plus package structure (AC-11), app migrations (AC-12, AC-13), testing (AC-14, AC-15, AC-16)
- **Story Points**: 5 SP
- **Dependencies**: REPA-004 (UAT, non-blocking)
- **Risk**: Low - No REPA-003 dependency, can start immediately
- **Status**: Ready to start after split formalization

#### REPA-005b: SessionProvider Migration (REPA-003 Dependent)
- **Scope**: SessionProvider Migration Only (auth injection pattern)
- **ACs**: AC-7 only (1 AC)
- **Components**: SessionProvider with both auth modes (Redux + anonymous)
- **Story Points**: 3 SP
- **Dependencies**: REPA-003 (BLOCKING - useUploaderSession hook), REPA-005a (completed)
- **Risk**: Medium - Requires completed REPA-003, auth injection pattern needs careful testing
- **Status**: Ready to start after REPA-003 completion verified

### Sequencing

1. **Step 1**: Complete REPA-003 (in-progress, ready-to-work status)
2. **Step 2**: Start REPA-005a immediately (parallel with REPA-003 if needed) - 8 components, no hook dependency
3. **Step 3**: Start REPA-005b after REPA-003 completion verified - SessionProvider only

## Discovery Findings

### MVP-Critical Gaps Identified

| # | Finding | Resolution | Notes |
|---|---------|-----------|-------|
| 1 | Component divergence verification gap - Seed Requirements require running `diff` on all 7 Uploader sub-components to verify exact duplication claim before migration starts. This verification MUST happen BEFORE AC-1 to choose canonical implementation. | Add as Pre-Implementation Checklist Item (BLOCKING) | Action Required BEFORE AC-1 starts: (1) Run `diff` on all 7 Uploader sub-components between main-app and app-instructions-gallery, (2) Document findings in `_implementation/DIVERGENCE-NOTES.md`, (3) If divergence >10% LOC, add reconciliation sub-ACs or split further, (4) Choose canonical implementation source (prefer version with better tests). This verification will inform the migration strategy for each component. |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | KB Entry | Notes |
|---|---------|----------|----------|-------|
| 1 | FileValidationResult schema duplication (ThumbnailUpload + InstructionsUpload) | future-proofing | kb-repa-005-1 | AC-10 already correctly defers this to REPA-017 (backlog). Move FileValidationResult to @repo/upload/types in future. For now, keep schemas local with cross-reference comments. |
| 2 | No explicit coverage floor per component | edge-case | kb-repa-005-2 | AC-14 sets 80%+ package-level target with "No component below 75%" guideline, but this is not enforced per AC. Consider adding explicit per-component coverage gates in follow-up. |
| 3 | SessionProvider auth mode tests implicit | edge-case | kb-repa-005-3 | AC-7 requires tests for "BOTH auth modes" but does not specify test case count or coverage scenarios. Consider explicit test matrix: (1) authenticated with user ID, (2) anonymous without props, (3) auth state change, (4) expired session handling. |
| 4 | Import path migration verification manual | future-proofing | kb-repa-005-4 | AC-12 and AC-13 require "Verify no imports from old paths remain" but rely on manual check. Consider adding automated codemod or ESLint banned-imports rule to prevent regression. HIGH VALUE, LOW EFFORT - Recommended for near-term roadmap. |
| 5 | Storybook documentation deferred | integrations | kb-repa-005-5 | Non-goal (line 89): Upload components would benefit from Storybook stories for reusability discovery. Recommend adding to REPA-020 (Domain Card Factories) or separate REPA-023 story. |
| 6 | Batch Operations Accessibility for UploaderList | ux-polish | kb-repa-005-6 | UploaderList supports batch operations but lacks accessibility enhancements: (1) Keyboard shortcuts for batch cancel, (2) Screen reader announcements, (3) Undo support. HIGH VALUE, MEDIUM EFFORT - Recommended for near-term roadmap. |
| 7 | Drag-and-Drop Enhancements for ThumbnailUpload | ux-polish | kb-repa-005-7 | ThumbnailUpload preserves drag-and-drop but does not support multi-file drop (only single image). Consider: (1) Multi-file drop with first-image selection, (2) Drag-over visual feedback, (3) Invalid file type rejection indicator. HIGH VALUE, HIGH EFFORT - Recommended for long-term roadmap. |
| 8 | Progress Streaming for InstructionsUpload | performance | kb-repa-005-8 | InstructionsUpload has sequential queue but no real-time progress streaming beyond per-file progress. Consider: (1) WebSocket progress for large PDFs (>10MB), (2) Time-remaining estimates, (3) Batch ETA display. |
| 9 | Rate Limit Banner Auto-Dismiss | ux-polish | kb-repa-005-9 | RateLimitBanner has countdown timer but does not auto-dismiss or retry when timer reaches 0. Consider: (1) Auto-dismiss + auto-retry on countdown complete, (2) User preference toggle, (3) Snackbar notification on retry success. HIGH VALUE, LOW EFFORT - Recommended for immediate follow-up (Do Next). |
| 10 | Conflict Modal Slug Preview | ux-polish | kb-repa-005-10 | ConflictModal shows suggested slug but does not preview final URL. Consider: (1) Real-time slug preview as user types, (2) Slug validation, (3) Copy-to-clipboard button. HIGH VALUE, LOW EFFORT - Recommended for immediate follow-up (Do Next). |
| 11 | Session Expired Banner Refresh Integration | ux-polish | kb-repa-005-11 | SessionExpiredBanner prompts for refresh but does not integrate with token refresh hook. Consider: (1) Auto-refresh using @repo/auth-hooks/useTokenRefresh (REPA-012), (2) Silent refresh before showing banner, (3) Retry upload after successful refresh. Depends on REPA-012 completion. HIGH VALUE, MEDIUM EFFORT - Near-term roadmap. |
| 12 | UnsavedChangesDialog Content Preview | ux-polish | kb-repa-005-12 | UnsavedChangesDialog prevents navigation but does not show what will be lost. Consider: (1) Unsaved file count display, (2) Upload progress summary in dialog body, (3) "Save draft" option for resume later. LOW PRIORITY - Backlog (nice-to-have UX polish). |
| 13 | Component-Level Error Boundaries | observability | kb-repa-005-13 | None of the 9 components have error boundary wrappers. Consider: (1) @repo/app-component-library/ErrorBoundary wrapper for each upload component, (2) Fallback UI for crashes, (3) Error telemetry with @repo/logger. HIGH VALUE, MEDIUM EFFORT - Near-term roadmap. |
| 14 | Accessibility Audit Beyond WCAG AA | ux-polish | kb-repa-005-14 | UI/UX Notes specify WCAG 2.1 AA compliance but not AAA. Consider: (1) High contrast mode, (2) Reduced motion for all animations, (3) Voice control compatibility (Dragon NaturallySpeaking). HIGH VALUE, HIGH EFFORT - Long-term roadmap. |
| 15 | Upload Component Analytics | observability | kb-repa-005-15 | No analytics instrumentation planned. Consider: (1) Track component usage (ConflictModal open rate, RateLimitBanner trigger count), (2) Upload success/failure metrics per component, (3) Average time-to-resolve-conflict metric. LOW PRIORITY - Backlog (valuable but not MVP-critical). |

### Follow-up Stories Suggested

_None - Split recommendation is the primary next action._

### Items Marked Out-of-Scope

_None - All findings above are deferred to future stories or KB-logged._

## Proceed to Implementation?

**NO - Blocked by split requirement**

This story cannot proceed to implementation in its current form due to Audit Check #8 (Story Sizing) failing with High severity. The story must be split into REPA-005a and REPA-005b per the split recommendation above before implementation can start.

**Next Action**: Orchestrator MUST spawn `pm-story-split-leader` to formalize REPA-005a and REPA-005b in the feature roadmap.

---

**Report Generated**: 2026-02-11
**Analysis Completed By**: elab-autonomous-decider (autonomous mode)
**Elaboration Report Generated By**: elab-completion-leader (autonomous mode)
