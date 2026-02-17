# Future Opportunities - WINT-1011

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | `blocked` and `cancelled` states have no directory swim-lane equivalent; directory fallback returns `not_found` for these states | Low | Low | Document in `__types__/index.ts` as an explicit code comment. Consider adding a `KNOWN_DB_ONLY_STATES` constant listing `['blocked', 'cancelled']` for future Phase 7 cleanup. No action needed in Phase 1. |
| 2 | `storyGetByStatus` and `storyGetByFeature` return `[]` on DB error (same as empty result), preventing the shim from emitting a warning on DB errors for list queries | Low | Medium | A future story could wrap the underlying list tools in a try/catch that distinguishes thrown errors from empty results. For Phase 1, the behavior is correct: directory fallback on any empty/error result is safe and conservative. |
| 3 | No retry logic on transient DB connection failures (explicitly deferred per Risk 3) | Medium | Medium | Defer to Phase 2 (WINT-2030+ telemetry window). After transient failure frequency is measurable, evaluate single-retry with 100ms exponential backoff. Add to WINT-2000s backlog when telemetry data is available. |
| 4 | Test command syntax (`--testPathPattern`) may not match actual Vitest config | Low | Low | During setup phase, verify the test run command against `packages/backend/mcp-tools/package.json` scripts and `vitest.config.ts`. Adjust the documented test commands in WINT-1011.md's Test Plan section if needed. No story change required before implementation. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Directory scan uses parent-dir-name approach (simple, no frontmatter parsing). A more robust approach could parse YAML frontmatter `status:` field for stories that have been manually edited outside swim-lane convention | Medium | Medium | Acceptable for Phase 1. The frontmatter parsers at `packages/backend/database-schema/src/seed/parsers/` could be reused in a future story to add frontmatter fallback when parent-dir-name is ambiguous (e.g., stories under `elaboration/` which is not a swim-lane). Defer to Phase 7 migration cleanup. |
| 2 | Shim is explicitly a temporary artifact (WINT-7100 deletion). The deletion checklist documented in Architecture Notes is informal — a future story could formalize it as a WINT-7100 pre-condition checklist with automated coverage verification | Low | Low | Add the deletion checklist to WINT-7100 story file as formal ACs when WINT-7100 is elaborated. No action needed in WINT-1011. |
| 3 | `STORIES_ROOT` detection uses `process.env.STORIES_ROOT ?? detectMonorepoRoot()`. A future enhancement could cache the resolved root path per process lifetime to avoid repeated filesystem walks | Low | Low | Negligible for Phase 1 call volumes. If shim is invoked at high frequency (batch mode, WINT-6010+), add memoization. Defer to Phase 6. |
| 4 | Directory fallback scan has no depth limit beyond the stated guard on story directory name pattern (`/^[A-Z]{2,10}-\d{3,4}$/`). Large story trees could be slow | Low | Low | Add a configurable `maxDepth` to `ShimOptions` in a future story. For Phase 1 with ~150 stories, performance is not a concern. |

## Categories

- **Edge Cases**: Items 1, 2 (state coverage gaps, error ambiguity)
- **Performance**: Items 3 (retry backoff), 7 (STORIES_ROOT caching), 8 (scan depth limit)
- **Observability**: Item 2 (DB error vs empty result distinction)
- **Integrations**: Item 5 (frontmatter fallback using existing parsers)
- **Cleanup / Deletion**: Item 6 (formalize WINT-7100 deletion checklist)
