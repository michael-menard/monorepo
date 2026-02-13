# Future Opportunities - REPA-005

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | FileValidationResult schema duplication (ThumbnailUpload + InstructionsUpload) | Low | Low | **REPA-017 (backlog)**: Move FileValidationResult to @repo/upload/types. Currently deferred per AC-10 with cross-reference comments in __types__/index.ts files. |
| 2 | No explicit coverage floor per component | Low | Low | AC-14 sets 80%+ package-level target with "No component below 75%" guideline, but this is not enforced per AC. Consider adding explicit per-component coverage gates in follow-up (e.g., AC-14 sub-bullet: "Each component ≥75% coverage"). |
| 3 | SessionProvider auth mode tests implicit | Medium | Low | AC-7 requires tests for "BOTH auth modes (with props, without props)" but does not specify test case count or coverage scenarios. Consider adding explicit test matrix in follow-up: (1) authenticated mode with user ID, (2) anonymous mode without props, (3) auth state change (anonymous → authenticated migration), (4) expired session handling. |
| 4 | Import path migration verification manual | Medium | Low | AC-12 and AC-13 require "Verify no imports from old paths remain" but rely on manual check. Consider adding automated codemod or ESLint rule in follow-up to prevent regression (e.g., banned-imports rule for `@/components/Uploader/*` in consuming apps). |
| 5 | Storybook documentation deferred | Low | Medium | Non-goal (line 89): "Storybook documentation: Deferred to follow-up work". Upload components would benefit from Storybook stories for reusability discovery. Recommend adding to REPA-020 (Domain Card Factories) or separate REPA-023 story. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Batch Operations for UploaderList** | Medium | Medium | UploaderList (AC-6) supports "batch operations (cancel all, retry all)" but does not specify accessibility for batch actions. Consider adding: (1) Keyboard shortcuts for batch cancel (e.g., Ctrl+Shift+X), (2) Screen reader announcements for batch operations ("Cancelling 3 uploads..."), (3) Undo support for batch actions. |
| 2 | **Drag-and-Drop Enhancements for ThumbnailUpload** | Medium | High | ThumbnailUpload (AC-8) preserves drag-and-drop but does not support multi-file drop (only single image). Consider adding: (1) Multi-file drop with first-image selection, (2) Drag-over visual feedback (border highlight), (3) Invalid file type rejection with visual indicator. |
| 3 | **Progress Streaming for InstructionsUpload** | Low | High | InstructionsUpload (AC-9) has sequential upload queue but no real-time progress streaming beyond per-file progress. Consider adding: (1) WebSocket progress updates for large PDFs (>10MB), (2) Time-remaining estimates, (3) Batch ETA display ("2 of 5 files, ~3 minutes remaining"). |
| 4 | **Rate Limit Banner Auto-Dismiss** | Low | Low | RateLimitBanner (AC-2) has countdown timer but does not auto-dismiss or retry when timer reaches 0. Consider adding: (1) Auto-dismiss + auto-retry when countdown completes, (2) User preference toggle for auto-retry (localStorage: `uploadAutoRetry: boolean`), (3) Snackbar notification when retry succeeds. |
| 5 | **Conflict Modal Slug Preview** | Low | Medium | ConflictModal (AC-1) shows suggested slug but does not preview final URL. Consider adding: (1) Real-time slug preview as user types new title (e.g., "URL: /instructions/{slug}"), (2) Slug validation (no special chars, max length), (3) Copy-to-clipboard button for suggested slug. |
| 6 | **Session Expired Banner Refresh Integration** | Low | Medium | SessionExpiredBanner (AC-3) prompts for refresh but does not integrate with token refresh hook. Consider adding: (1) Auto-refresh attempt using @repo/auth-hooks/useTokenRefresh (REPA-012), (2) Silent refresh on session expiry (attempt before showing banner), (3) Retry upload automatically after successful refresh. |
| 7 | **UnsavedChangesDialog Content Preview** | Low | High | UnsavedChangesDialog (AC-4) prevents navigation but does not show what will be lost. Consider adding: (1) Unsaved file count display ("3 files uploading"), (2) Upload progress summary in dialog body, (3) "Save draft" option (persist upload session for later resume). |
| 8 | **Component-Level Error Boundaries** | Medium | Medium | None of the 9 components have error boundary wrappers. Consider adding: (1) @repo/app-component-library/ErrorBoundary wrapper for each upload component, (2) Fallback UI for component crashes, (3) Error telemetry integration (log to @repo/logger). |
| 9 | **Accessibility Audit Beyond WCAG AA** | Medium | High | UI/UX Notes (line 535-575) specify WCAG 2.1 AA compliance but do not cover advanced accessibility features. Consider WCAG AAA enhancements: (1) High contrast mode support, (2) Reduced motion mode for all animations (not just progress bars), (3) Voice control compatibility (Dragon NaturallySpeaking testing). |
| 10 | **Upload Component Analytics** | Low | Medium | No analytics instrumentation planned for upload components. Consider adding: (1) Track component usage (ConflictModal open rate, RateLimitBanner trigger count), (2) Upload success/failure metrics per component, (3) Average time-to-resolve-conflict metric. |

## Categories

### Edge Cases
- **Gap #2**: No explicit per-component coverage floor (75% guideline not enforced per AC)
- **Gap #3**: SessionProvider auth mode test scenarios implicit (no test matrix)
- **Enhancement #4**: Rate limit banner auto-dismiss/retry when timer completes
- **Enhancement #6**: Session expired banner auto-refresh integration

### UX Polish
- **Enhancement #1**: Batch operations keyboard shortcuts and screen reader support
- **Enhancement #2**: Multi-file drop support for ThumbnailUpload
- **Enhancement #5**: Conflict modal slug preview with validation
- **Enhancement #7**: Unsaved changes dialog content preview (file count, progress)

### Performance
- **Enhancement #3**: Progress streaming for InstructionsUpload (WebSocket for >10MB files)

### Observability
- **Enhancement #8**: Component-level error boundaries with telemetry
- **Enhancement #10**: Upload component analytics instrumentation

### Integrations
- **Gap #5**: Storybook documentation for reusability discovery (deferred to REPA-020 or REPA-023)

### Future-Proofing
- **Gap #1**: FileValidationResult schema consolidation (REPA-017 backlog)
- **Gap #4**: Automated import path migration verification (ESLint banned-imports rule)
- **Enhancement #9**: WCAG AAA accessibility enhancements (high contrast, voice control)

---

## Prioritization Recommendations

### High Value, Low Effort (Do Next)
1. **Enhancement #4**: Rate limit banner auto-dismiss/retry (improves UX, ~2 hours)
2. **Enhancement #5**: Conflict modal slug preview (reduces user errors, ~4 hours)
3. **Gap #4**: ESLint banned-imports rule (prevents regression, ~2 hours)

### High Value, Medium Effort (Near-Term Roadmap)
1. **Enhancement #1**: Batch operations accessibility (keyboard + screen reader, ~8 hours)
2. **Enhancement #8**: Component-level error boundaries (resilience, ~6 hours)
3. **Enhancement #6**: Session expired banner auto-refresh (reduces friction, ~6 hours)

### High Value, High Effort (Long-Term Roadmap)
1. **Enhancement #2**: Multi-file drop for ThumbnailUpload (power-user feature, ~16 hours)
2. **Enhancement #3**: Progress streaming for InstructionsUpload (large file UX, ~20 hours)
3. **Enhancement #9**: WCAG AAA accessibility audit (compliance, ~40 hours)

### Low Priority (Backlog)
1. **Gap #5**: Storybook documentation (useful but not blocking, defer to REPA-020)
2. **Enhancement #10**: Upload component analytics (valuable but not MVP-critical)
3. **Enhancement #7**: Unsaved changes dialog content preview (nice-to-have UX polish)

---

## Notes

- All gaps are non-blocking for MVP. The story can proceed to implementation with current scope.
- Enhancement opportunities are ranked by user impact and implementation effort.
- SessionProvider enhancements (#6) depend on REPA-012 (@repo/auth-hooks) completion.
- Storybook work (#5) may be better suited for REPA-020 (Domain Card Factories) to batch documentation efforts.
