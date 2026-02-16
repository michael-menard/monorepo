# Future Opportunities - BUGF-018

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Test setup inconsistency between apps | Low | Low | Consolidate URL.createObjectURL stub to shared test-utils package (relates to BUGF-043) |
| 2 | No automated memory leak detection in CI | Low | Medium | Add memory profiling checks to CI pipeline using Puppeteer heap snapshots |
| 3 | Manual memory profiling is tedious | Low | Low | Create browser extension or DevTools script to automate blob URL leak detection |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Custom hook could centralize pattern | Low | Low | Create `useObjectURL(file)` hook if more components adopt this pattern (>5 uses) |
| 2 | No ESLint rule for createObjectURL without cleanup | Medium | Medium | Write custom ESLint rule to detect `URL.createObjectURL` without corresponding `revokeObjectURL` in same component |
| 3 | FileReader alternative not evaluated | Low | High | Document performance comparison between `createObjectURL` vs. `FileReader.readAsDataURL` for future decisions |
| 4 | No TypeScript guard for blob URL types | Low | Low | Create branded type `type BlobURL = string & { readonly __brand: 'BlobURL' }` to enforce cleanup at compile time |
| 5 | Cleanup pattern not documented in CLAUDE.md | Medium | Low | Add section to CLAUDE.md about blob URL cleanup best practices for future components |
| 6 | No runtime warning in development | Low | Medium | Add dev-mode runtime check that warns when component unmounts with unreleased blob URLs |
| 7 | ImageUploadZone cleanup timing unclear | Low | Low | Document when parent should call cleanup vs. when ImageUploadZone should (current story assumes component cleanup) |
| 8 | Multiple createObjectURL calls in ThumbnailUpload | Low | Low | Consider consolidating file select and drag-drop handlers to avoid code duplication (lines 95 and 120) |
| 9 | No usage metrics for blob URL lifecycles | Low | Medium | Add telemetry to track blob URL creation/revocation for debugging future memory issues |
| 10 | Test coverage doesn't verify concurrent cleanup | Low | Medium | Add test for rapid file selection/replacement to ensure no race conditions in cleanup |

## Categories

### Edge Cases
- **Rapid file selection:** User rapidly selects multiple files before cleanup completes (Gap #10)
- **Component re-mount:** Component unmounts and remounts quickly - verify no stale URLs persist
- **Concurrent operations:** Multiple components creating blob URLs simultaneously

### UX Polish
- **Dev-mode warnings:** Runtime detection of blob URL leaks during development (Enhancement #6)
- **Better debugging:** Browser extension to visualize blob URL lifecycle (Gap #3)
- **Performance metrics:** Compare FileReader vs. createObjectURL performance (Enhancement #3)

### Performance
- **FileReader evaluation:** Document when FileReader.readAsDataURL might be preferred (Enhancement #3)
- **Cleanup consolidation:** Reduce duplicate code in ThumbnailUpload handlers (Enhancement #8)

### Observability
- **Automated leak detection:** CI pipeline checks for memory leaks (Gap #2)
- **Usage telemetry:** Track blob URL creation/cleanup patterns (Enhancement #9)
- **Runtime metrics:** Log cleanup timing and success rates in production

### Integrations
- **ESLint integration:** Detect missing cleanup at lint time (Enhancement #2)
- **TypeScript integration:** Branded types for compile-time safety (Enhancement #4)
- **Test-utils integration:** Shared test setup for blob URL mocking (Gap #1)

### Code Quality
- **Documentation:** Add pattern to CLAUDE.md (Enhancement #5)
- **Abstraction:** Custom hook if pattern becomes common (Enhancement #1)
- **Type safety:** Branded blob URL type (Enhancement #4)

---

## Prioritization

### High Value, Low Effort (Do Next)
1. **Enhancement #5:** Document pattern in CLAUDE.md
2. **Gap #1:** Consolidate test setup (blocked by BUGF-043)
3. **Enhancement #8:** Consolidate ThumbnailUpload handlers

### High Value, Medium Effort (Future Sprint)
1. **Enhancement #2:** ESLint rule for createObjectURL cleanup
2. **Enhancement #6:** Dev-mode runtime warnings
3. **Gap #2:** Automated memory leak detection in CI

### Low Value, Medium-High Effort (Backlog)
1. **Enhancement #3:** FileReader performance comparison
2. **Enhancement #9:** Usage telemetry
3. **Gap #3:** Browser extension for leak detection

### Low Priority (Nice to Have)
1. **Enhancement #1:** Custom hook (only if pattern becomes common)
2. **Enhancement #4:** Branded blob URL type
3. **Enhancement #7:** Document ImageUploadZone cleanup contract
4. **Gap #10:** Concurrent cleanup tests

---

## Related Stories

- **BUGF-043:** Consolidate Duplicated Test Setup Files (relates to Gap #1)
- **BUGF-024:** Fix Code Quality Issues and Technical Debt (relates to Enhancement #8)
- **BUGF-017:** Convert TypeScript Interfaces to Zod Schemas (relates to Enhancement #4 - type safety theme)

---

## Notes

### Why These Are Non-MVP

1. **Current fix is sufficient:** The memory leak is resolved with useEffect cleanup
2. **No user-facing impact:** Users cannot detect blob URL leaks; impact is long-running sessions only
3. **Low leak frequency:** Components are short-lived in typical user workflows
4. **Existing tests adequate:** 7 unit tests verify cleanup; manual profiling validates
5. **Pattern is simple:** Not complex enough to warrant custom hook or extensive tooling yet

### When to Revisit

- **Custom hook (Enhancement #1):** If 5+ components adopt createObjectURL pattern
- **ESLint rule (Enhancement #2):** If more leak issues found in code review
- **CI memory checks (Gap #2):** If manual profiling becomes bottleneck
- **Runtime warnings (Enhancement #6):** If devs repeatedly miss cleanup in new components
- **CLAUDE.md docs (Enhancement #5):** Before next team onboarding or when pattern is stabilized

### Future-Proofing

If blob URL usage expands significantly (e.g., video previews, PDF rendering), consider:
1. Abstracting cleanup into a shared hook or component wrapper
2. Adding ESLint enforcement to prevent future leaks
3. Implementing automated memory profiling in CI/CD
4. Creating comprehensive blob URL lifecycle documentation
