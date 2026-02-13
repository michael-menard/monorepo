# Future Opportunities - REPA-003

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No TypeScript type-only imports | Low | Low | The story doesn't enforce `import type` for type-only imports. While not breaking, this could increase bundle size. Consider adding linting rule to enforce type-only imports in future package structure stories. |
| 2 | No Zod schema migration for hook options | Low | Medium | Story uses TypeScript interfaces for UseUploadManagerOptions and UseUploaderSessionOptions. Per CLAUDE.md, all types should use Zod schemas. Consider creating Zod schemas for hook options in future refactor (enables runtime validation of hook parameters). |
| 3 | Missing hook deprecation warnings | Low | Low | Story documents breaking changes in useUploaderSession API but doesn't include deprecation warnings in old hook locations. Consider adding console.warn deprecation messages in app-local hooks before deletion (helps catch missed migration spots during gradual rollout). |
| 4 | No performance benchmarks for debounced localStorage writes | Low | Medium | Story preserves 300ms debounce delay but doesn't validate this is optimal for consolidated hook. Consider adding performance tests to measure localStorage write impact on upload flow (could reveal optimization opportunities). |
| 5 | File handle tracking uses Map without size limits | Medium | Medium | useUploadManager tracks File objects in a ref Map with no cleanup strategy. For long-running upload sessions, this could accumulate memory. Consider adding size limit or LRU eviction policy in future enhancement. |
| 6 | Session migration (anon → auth) not covered by E2E tests | Medium | High | AC-7 documents session migration scenario but TEST-PLAN.md marks E2E tests as optional. This is a complex user flow (login mid-upload) that benefits from E2E coverage. Recommend dedicated E2E test in future iteration. |
| 7 | No instrumentation for upload analytics | Low | Medium | Hooks have no telemetry/analytics hooks (e.g., tracking upload success rates, retry counts, session restoration frequency). Consider adding optional analytics callback in future story (helps product understand upload behavior patterns). |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Hook composability: useUploadManager + useUploaderSession coupling | Medium | High | Current architecture requires apps to wire useUploadManager and useUploaderSession separately. Consider creating a composite `useUploadFlow` hook in future that combines both with sensible defaults (reduces boilerplate in consuming apps). |
| 2 | Progress tracking enhancements: estimated time remaining | Low | Medium | useUploadManager tracks progress (0-100%) but doesn't estimate time remaining. Consider adding ETA calculation based on upload speed (improves user experience for large file uploads). |
| 3 | Retry strategy enhancements: exponential backoff | Medium | Medium | Current retry logic re-queues failed files immediately. Consider adding exponential backoff for transient errors (reduces server load, improves success rate for flaky networks). |
| 4 | Session restoration UX: preview before restore | Low | Medium | Session restoration shows toast notification but doesn't give user option to reject restoration. Consider adding modal preview of restored session with "Resume" or "Start Fresh" options (better UX for stale sessions). |
| 5 | Upload concurrency optimization: adaptive concurrency | High | High | Current concurrency is fixed at 3. Consider adaptive concurrency based on network conditions (e.g., reduce to 1 on slow networks, increase to 5 on fast networks). Requires network speed detection. |
| 6 | File handle recovery: prompt user to re-select lost files | Medium | Medium | Current implementation logs error when file handle is lost but doesn't prompt user to re-select. Consider adding UI callback (onFileNeedsReselect) that triggers file input dialog (better recovery UX). Note: Story includes onFileNeedsReselect callback but no UI implementation. |
| 7 | Session key migration: automatic cleanup of old anon keys | Low | Low | Session migration removes old anon key but doesn't clean up orphaned anon keys from users who never logged in. Consider background cleanup task to remove expired anon session keys (reduces localStorage bloat). |
| 8 | TypeScript strict mode alignment: enable noImplicitAny | Low | Low | CLAUDE.md notes `noImplicitAny: false` is allowed but discouraged. Consider refactoring hooks to eliminate any types in future strict mode enhancement (improves type safety). |
| 9 | Bundle size optimization: code splitting | Low | High | Hooks import full @repo/upload-types package. Consider splitting package into smaller modules (e.g., @repo/upload/types/session, @repo/upload/types/upload) to enable tree-shaking (reduces bundle size for apps that don't use all features). |
| 10 | Developer experience: Storybook documentation | Medium | Medium | Consolidated hooks will be shared across 6+ apps. Consider adding Storybook stories demonstrating hook usage patterns (authenticated vs anonymous, session restoration, retry flows). Improves discoverability and reduces integration friction. |

## Categories

### Edge Cases
- File handle tracking memory limits (Gap #5)
- Session migration E2E testing (Gap #6)
- File handle recovery UX (Enhancement #6)

### UX Polish
- Session restoration preview modal (Enhancement #4)
- Estimated time remaining (Enhancement #2)
- File re-selection prompt (Enhancement #6)

### Performance
- Debounce delay validation (Gap #4)
- Adaptive concurrency (Enhancement #5)
- Bundle size optimization (Enhancement #9)

### Observability
- Upload analytics instrumentation (Gap #7)
- Performance benchmarks (Gap #4)

### Integrations
- Storybook documentation (Enhancement #10)
- Hook composability (Enhancement #1)

### Code Quality
- Zod schema migration (Gap #2)
- TypeScript strict mode (Enhancement #8)
- Type-only imports (Gap #1)

---

## Priority Recommendations

**High Impact, Low Effort (Quick Wins):**
1. Add deprecation warnings to old hooks (Gap #3)
2. Automatic cleanup of orphaned anon session keys (Enhancement #7)
3. Type-only import enforcement (Gap #1)

**High Impact, Medium Effort (Next Iteration):**
1. E2E test for session migration (Gap #6)
2. Retry with exponential backoff (Enhancement #3)
3. Storybook documentation (Enhancement #10)

**High Impact, High Effort (Future Stories):**
1. Composite `useUploadFlow` hook (Enhancement #1)
2. Adaptive concurrency (Enhancement #5)
3. Bundle size optimization (Enhancement #9)

**Defer to Post-MVP:**
- Upload analytics (Gap #7)
- Session restoration preview modal (Enhancement #4)
- File handle memory limits (Gap #5)
- Estimated time remaining (Enhancement #2)
