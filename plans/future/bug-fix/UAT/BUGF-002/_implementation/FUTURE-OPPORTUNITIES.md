# Future Opportunities - BUGF-002

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Edge Case: Concurrent Edits** - Story mentions "last write wins" for concurrent edits but no conflict detection UI | Low | Medium | Consider adding optimistic locking with version/timestamp comparison. Show warning if another user modified the MOC since page load. Not MVP-blocking as concurrent edits on same MOC are rare. |
| 2 | **Edge Case: Navigation During Save** - Story mentions "abort signal" for navigation away during mutation but doesn't specify implementation | Low | Low | Add AbortController to RTK Query mutation to cancel in-flight requests when user navigates away. Prevents console errors and unnecessary API calls. Not blocking as error handling already present. |
| 3 | **Test Coverage: CreateMocPage Tests** - No edit page tests currently exist, but CreateMocPage.test.tsx exists as reference | Low | Medium | After implementing edit page, create comprehensive test suite following CreateMocPage.test.tsx patterns. Not MVP-blocking - feature can ship with manual testing, automated tests can follow. |
| 4 | **Error Recovery: Form State Persistence** - CreateMocPage uses localStorage for form recovery, but edit page doesn't specify this pattern | Low | Medium | Consider persisting form edits to localStorage during editing session (not just on error) to prevent data loss from browser crashes or accidental tab closes. Not MVP - basic error state preservation (AC-9) is sufficient. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **UX Polish: Unsaved Changes Warning** - No mention of browser "beforeunload" warning when leaving page with unsaved changes | Medium | Low | Add `useUnsavedChangesPrompt` hook (check if exists in codebase) to warn user before navigating away from dirty form. Improves UX but not required for MVP. |
| 2 | **UX Polish: Auto-save Draft** - No auto-save functionality for long editing sessions | Medium | High | Implement periodic auto-save to drafts (every 30s) using debounced form state. Requires backend support for draft versioning. Good future enhancement but not MVP. |
| 3 | **UX Polish: Change Preview** - No visual diff or preview of changes before saving | Low | Medium | Show side-by-side comparison of original vs edited values before save, or highlight changed fields. Nice-to-have for power users. |
| 4 | **Performance: Optimistic Updates** - Story uses standard mutation flow (wait for API response before UI update) | Low | Medium | Consider optimistic updates for faster perceived performance: update local cache immediately on save, rollback on error. Requires careful error handling. Not needed for MVP as save operation is fast. |
| 5 | **Observability: Save Analytics** - No mention of tracking save success/failure rates or edit patterns | Low | Low | Add analytics events for save attempts, failures (with error type), and edit field usage. Useful for understanding user behavior and identifying common errors. Can be added post-launch. |
| 6 | **Accessibility: Keyboard Shortcuts** - No keyboard shortcuts for save action (e.g., Ctrl+S / Cmd+S) | Low | Low | Add keyboard shortcut handler to trigger save on Ctrl+S/Cmd+S. Small UX improvement for power users familiar with desktop editing workflows. |
| 7 | **Integration: Edit History / Audit Log** - No tracking of edit history or who changed what | Medium | High | Add backend support for edit history with timestamps and user attribution. Display edit history on detail page. Large effort requiring backend changes. Good Phase 2 feature. |

## Categories

### Edge Cases
- Concurrent edits conflict detection (Gap #1)
- Navigation during mutation abort signal (Gap #2)
- Form state persistence for crash recovery (Gap #4)

### UX Polish
- Unsaved changes warning (Enhancement #1)
- Auto-save to drafts (Enhancement #2)
- Change preview/diff view (Enhancement #3)
- Keyboard shortcuts for save (Enhancement #6)

### Performance
- Optimistic updates for perceived performance (Enhancement #4)

### Observability
- Save analytics and error tracking (Enhancement #5)

### Integrations
- Edit history and audit log (Enhancement #7)

## Implementation Notes

### Priority Recommendations (Post-MVP)

**High Priority (Next Sprint):**
- Unsaved changes warning (Enhancement #1) - Low effort, medium impact, prevents user frustration

**Medium Priority (Within 2 Sprints):**
- Concurrent edit detection (Gap #1) - Medium effort, prevents data loss in multi-user scenarios
- Test coverage for edit pages (Gap #3) - Follow existing test patterns, improve confidence

**Low Priority (Future Enhancement):**
- Auto-save drafts (Enhancement #2) - Requires backend work, nice-to-have
- Edit history (Enhancement #7) - Large effort, good for Phase 2 feature set

### Reuse Opportunities

When implementing future enhancements, consider:

1. **useUnsavedChangesPrompt** - Check if this hook exists in `packages/core/hooks` or similar. May have been used in other forms.

2. **AbortController Pattern** - Check other RTK Query mutations in codebase for abort signal patterns. May already have utility functions for this.

3. **Analytics Events** - Check if analytics service exists in `@repo/analytics` or similar for consistent event tracking.

4. **Optimistic Updates** - Reference RTK Query docs and existing mutations for optimistic update patterns. May need custom `onQueryStarted` handlers.
