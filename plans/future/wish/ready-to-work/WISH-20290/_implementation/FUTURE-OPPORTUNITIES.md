# Future Opportunities - WISH-20290

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Coverage threshold documentation in root README | Low | Low | Add section to monorepo root README.md documenting the two-tier coverage strategy (45% global, 80% test utilities) so developers understand the rationale. Non-MVP: local README.md in src/test/utils/ sufficient for immediate needs. |
| 2 | Pre-commit coverage hooks | Low | Medium | Add Husky pre-commit hook that runs coverage checks for modified test utility files, providing faster feedback than CI pipeline. Non-MVP: CI enforcement sufficient, local developers can run `pnpm test:coverage` manually. |
| 3 | Coverage trend tracking | Low | High | Integrate coverage reporting with historical trend tracking (e.g., Codecov, Coveralls) to visualize coverage changes over time. Non-MVP: threshold enforcement prevents regressions, trends are nice-to-have. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Extend pattern to other critical paths | Medium | Low | Apply 80% threshold to other critical directories: `src/hooks/**/*.ts`, `src/utils/**/*.ts`, `src/lib/**/*.ts`. Create follow-up stories for each domain as utilities proliferate. Priority: Medium (prevents technical debt accumulation). Timeline: Post-WISH-2120, as utility libraries grow. |
| 2 | CI/CD coverage badge integration | Low | Low | Add coverage badges to PR comments showing test utility coverage percentage and threshold compliance status. Improves visibility for reviewers. Implementation: GitHub Actions workflow + coverage reporter integration. |
| 3 | VSCode tasks for coverage checks | Low | Low | Create `.vscode/tasks.json` with coverage check tasks (`Tasks: Run Task` → `Run Test Utils Coverage`). Improves developer experience for local validation. Complements WISH-20291 (VS Code snippets story). |
| 4 | Coverage exemptions framework | Low | Medium | Add mechanism for exempting specific functions from coverage requirements with `/* istanbul ignore next */` or similar annotations, plus ESLint rule to require justification comments. Non-MVP: 80% threshold already allows 20% uncovered code for edge cases. |
| 5 | Per-function coverage reporting | Low | Medium | Configure Vitest to report coverage at function level (not just file level) for more granular insights into which utility functions lack tests. Implementation: vitest.config.ts `coverage.reportOnFailure: true` + custom reporter. Non-MVP: file-level coverage sufficient for initial enforcement. |
| 6 | Coverage regression detection in CI | Medium | Medium | Add CI step that compares coverage between base branch and PR branch, failing if test utility coverage decreases. Prevents gradual erosion even within the 80% threshold. Implementation: Store coverage baseline artifacts, compare on PR. |

## Categories

- **Edge Cases**: Pre-commit hooks, coverage exemptions, regression detection
- **UX Polish**: VSCode tasks, coverage badges, per-function reporting
- **Performance**: N/A - configuration only
- **Observability**: Coverage trend tracking, historical reporting
- **Integrations**: Follow-up stories for hooks/utils/lib directories (item #1)

## Scope Tightening Suggestions

1. **Focus on test utilities only**: Do not expand to other directories in this story. Defer `src/hooks/`, `src/utils/`, `src/lib/` to follow-up stories (see Enhancement #1).
2. **Documentation scope**: Keep README.md local to `src/test/utils/`. Defer root README updates to future documentation sprint.
3. **CI configuration**: Use existing test commands without modifying CI pipeline configuration files. Coverage enforcement happens automatically via Vitest exit codes.
4. **Avoid tooling expansion**: Do not add Codecov, Coveralls, or other coverage platforms in this story. Use built-in Vitest reporters (text, json, html).

## Extensibility Notes

The per-directory threshold pattern established in this story creates a foundation for future coverage enforcement:

```typescript
// Future expansion example (NOT in scope for WISH-20290)
thresholds: {
  'src/test/utils/**/*.ts': { lines: 80, functions: 80, branches: 80, statements: 80 },
  'src/hooks/**/*.ts': { lines: 80, functions: 80, branches: 80, statements: 80 },
  'src/utils/**/*.ts': { lines: 70, functions: 70, branches: 70, statements: 70 },
  'src/lib/**/*.ts': { lines: 85, functions: 85, branches: 85, statements: 85 },
}
```

Each critical path can have independent threshold requirements based on:
- **Criticality**: Core infrastructure (lib) may warrant 85%, less critical utilities 70%
- **Testability**: Some code is inherently harder to test (e.g., browser API wrappers)
- **Risk profile**: Authentication/security code deserves higher coverage than UI polish

This story establishes the pattern without imposing a one-size-fits-all approach.

## Related Stories

- **WISH-2120** (UAT): Parent story - test utilities complete with 100% coverage
- **WISH-20291** (Elaboration): VS Code snippets for test utility discovery - complements this story by improving discoverability
- **WISH-20292** (Elaboration): Auto-cleanup in test teardown - MSW handler cleanup automation (marked cancelled, already implemented)
- **WISH-2121** (Future): Playwright test utilities - may follow similar coverage pattern when implemented

## Cross-Domain Impact

While this story is scoped to `app-wishlist-gallery`, the two-tier coverage strategy may serve as a template for other apps:

- `apps/web/main-app` - Could adopt similar pattern for shared utilities
- `apps/web/app-dashboard` - Could adopt similar pattern for dashboard-specific test helpers
- `packages/core/*` - Could adopt higher thresholds (85-90%) for shared package code

However, expanding to other apps/packages is explicitly OUT OF SCOPE for WISH-20290. Each app should evaluate coverage strategy independently based on:
1. Existing test infrastructure maturity
2. Team capacity for maintaining higher coverage
3. Risk profile of the application domain
