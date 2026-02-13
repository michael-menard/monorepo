# Future Opportunities - REPA-014

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No test coverage for useUnsavedChangesPrompt | Medium | Low | Post-MVP: Add basic unit tests for useUnsavedChangesPrompt covering: dialog state toggling, blocker integration, beforeunload handler. Estimated 100-150 lines similar to other hook tests. |
| 2 | Consumer count claims not verified | Low | Low | Story claims "101 total import references across 21 files" but actual count is 18 files (6 hook definitions, 8 consumer files, 3 test files, 1 re-export). The "101 import references" may include internal function calls within hooks. Post-MVP: Clarify what "import references" means for documentation accuracy. |
| 3 | JSDoc completeness varies across hooks | Low | Low | useLocalStorage has comprehensive JSDoc with examples. useMultiSelect and useUnsavedChangesPrompt have good coverage. useDelayedShow has minimal JSDoc. Post-MVP: Standardize JSDoc format and add usage examples for all hooks. |
| 4 | No guidance on when to use each hook | Medium | Low | README.md mentioned in AC-1 but no requirements for what it should contain. Post-MVP: Add decision tree or usage guide: "When to use useLocalStorage vs context API?", "When to use useDelayedShow vs CSS transitions?". |
| 5 | No Storybook documentation | Medium | Medium | Unlike @repo/upload or @repo/gallery, no Storybook examples provided. Post-MVP: Add Storybook stories showing each hook in action with interactive examples. |
| 6 | Missing changelog/migration guide | Medium | Low | When hooks move from apps to package, developers may have questions. Post-MVP: Create MIGRATION.md documenting the move and any breaking changes (even if none expected). |
| 7 | No ESLint rule to prevent re-duplication | Medium | Medium | After consolidation, nothing prevents developers from re-implementing these hooks in apps. Post-MVP: Add ESLint rule to detect hook duplicates or warn on new hook files in apps/web/**/hooks/ that could be shared. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | useLocalStorage could support TTL/expiration | Medium | Medium | Add optional TTL parameter to useLocalStorage for auto-expiring cached data. Useful for ephemeral preferences or temporary state. Estimated 50-100 LOC + tests. |
| 2 | useLocalStorage could support storage events | Low | Low | Add optional listener for storage events to sync state across tabs/windows. Currently each instance is independent. |
| 3 | useMultiSelect could support keyboard-only range selection | Low | Medium | Current shift-click range selection works great with mouse but lacks keyboard equivalent. Add Shift+Arrow for keyboard range selection matching ARIA patterns. |
| 4 | useDelayedShow could support custom easing | Low | Low | Currently hard-coded 300ms default delay. Could accept easing function or transition config for more sophisticated animations. |
| 5 | useUnsavedChangesPrompt could support custom dialog content | Medium | Medium | Currently hardcoded dialog state management. Could accept custom dialog component or message prop for app-specific styling/wording. |
| 6 | Package could include useDebounce / useThrottle | High | Medium | Common React hooks missing from package. Per Non-Goals line 52, these are out of scope for MVP but high-value additions. Estimated 100 LOC + 200 LOC tests each. |
| 7 | Package could include useMediaQuery hook | Medium | Low | Useful for responsive behavior. May already exist in one of the apps - audit codebase for additional hook consolidation candidates. |
| 8 | TypeScript branded types for localStorage keys | Low | Low | Use branded types to prevent typos in localStorage keys: `type LocalStorageKey = string & { __brand: 'localStorage' }`. Improves type safety but adds complexity. |
| 9 | Add error boundary wrapper for browser API hooks | Low | Medium | useLocalStorage interacts with browser localStorage which can throw. Consider wrapping in error boundary or providing fallback error handling hook. |
| 10 | Versioning strategy for breaking changes | Medium | Low | Once 10+ apps consume these hooks, breaking changes become costly. Post-MVP: Define deprecation and versioning strategy (e.g., useLocalStorageV2 or feature flags). |

## Categories

### Edge Cases
- Gap #2: Consumer count verification
- Gap #3: JSDoc completeness
- Enhancement #8: Branded types for type safety

### UX Polish
- Enhancement #1: TTL/expiration support
- Enhancement #3: Keyboard-only range selection
- Enhancement #4: Custom easing for useDelayedShow
- Enhancement #5: Custom dialog content

### Performance
- Enhancement #2: Storage event sync (reduces unnecessary re-renders across tabs)

### Observability
- Gap #1: Test coverage for useUnsavedChangesPrompt
- Gap #7: ESLint rule to prevent duplication

### Integrations
- Enhancement #6: Add useDebounce/useThrottle (integrate with timing utilities)
- Enhancement #7: Add useMediaQuery (integrate with responsive design system)
- Enhancement #9: Error boundary integration

### Developer Experience
- Gap #4: Usage guidance
- Gap #5: Storybook documentation
- Gap #6: Migration guide
- Enhancement #10: Versioning strategy

## Post-MVP Story Candidates

**REPA-014b: Add useDebounce and useThrottle to @repo/hooks**
- Priority: High (common need across apps)
- Effort: 2 SP
- Dependencies: REPA-014
- Scope: Add two new hooks with comprehensive tests and Storybook examples

**REPA-014c: Enhance @repo/hooks Documentation**
- Priority: Medium
- Effort: 1 SP
- Dependencies: REPA-014
- Scope: Add Storybook stories, usage guide, migration documentation, complete JSDoc

**REPA-014d: Add TTL Support to useLocalStorage**
- Priority: Medium
- Effort: 2 SP
- Dependencies: REPA-014
- Scope: Add optional TTL/expiration with automatic cleanup

**REPA-014e: Prevent Hook Duplication via Linting**
- Priority: Low
- Effort: 1 SP
- Dependencies: REPA-014
- Scope: Add ESLint rule to detect duplicate hooks in apps, enforce use of @repo/hooks

## Notes

- Story successfully focuses on consolidation over enhancement - appropriate MVP scope
- Many opportunities exist for future enhancement but none block core user journey
- Consider bundling documentation improvements (Gaps #4, #5, #6) into single follow-up story
- Enhancement #6 (useDebounce/useThrottle) is highest-value follow-up based on common usage patterns
