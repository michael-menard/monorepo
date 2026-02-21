# Future Opportunities - KBAR-0060

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | AC-5 TC-5.3: Live interruption simulation via internal hook is not fully specified | Low | Medium | Defer true interruption testing (e.g., killing the batch mid-run and verifying checkpoint row) to a dedicated fault-injection test story. Current mitigation (pre-seeding partial state) is sufficient for MVP. |
| 2 | Symlink test (AC-7 TC-7.1) may silently skip on some CI environments that disallow `fs.symlinkSync` | Low | Low | Wrap in `try/catch`; emit a `console.warn` if symlink creation fails. Consider detecting CI environment and skipping the assertion with a descriptive `test.skip`. |
| 3 | No cross-package integration — only `@repo/kbar-sync` is tested | Low | High | Future story could test the sync pipeline end-to-end from API route handler (once KBAR-007+ MCP tools exist) down to `kbar.stories` — a full vertical integration slice. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Performance benchmarking is explicitly deferred | Medium | Medium | A future perf story should time the full `batchSyncByType` over 100+ stories and record throughput (stories/second). This would validate the N+1 fix from KBAR-0040 at scale and establish a regression baseline. |
| 2 | CI pipeline integration is out of scope for KBAR-0060 | Medium | Low | A dedicated DevOps story should add `SKIP_TESTCONTAINERS` toggle to the CI workflow and run the integration suite on a nightly schedule or on PR merge. |
| 3 | No testcontainers shared helper across the entire monorepo | Medium | Medium | The `src/__tests__/helpers/testcontainers.ts` extracted in ST-1 is scoped to `@repo/kbar-sync`. A monorepo-level shared testcontainers package (e.g., `packages/backend/test-helpers/`) would benefit future backend packages that also need PostgreSQL integration tests. |
| 4 | `computeChecksum` import path may silently change after KBAR-0050 merge | Low | Low | Add a smoke-test assertion in ST-5 that `computeChecksum` imported from `@repo/kbar-sync` returns a non-empty string for a known input — guards against silent re-export regressions. |
| 5 | Unicode edge case (AC-7 TC-7.5) only tests titles/descriptions | Low | Low | Future enhancement: add unicode test coverage for artifact file content (not just story frontmatter) and verify deterministic checksum across different Node.js encoding modes. |

## Categories

- **Edge Cases**: AC-5 TC-5.3 interruption simulation, symlink CI skipping, unicode artifact content
- **Performance**: Throughput benchmarking for batch sync over 100+ stories
- **Observability**: CI pipeline integration, nightly integration test scheduling
- **Integrations**: Monorepo-wide testcontainers shared helper, vertical API-to-DB integration slice
