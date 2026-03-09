# Future Opportunities - WKFL-001

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No specification for OUTCOME.yaml validation | Low | Low | Add Zod schema for runtime validation of OUTCOME.yaml structure |
| 2 | No error handling for malformed story artifacts | Low | Low | Define fallback behavior when CHECKPOINT.md or TOKEN-LOG.md are corrupt/missing |
| 3 | No sampling strategy for pattern detection | Low | Medium | Define minimum sample size (e.g., "5 stories minimum" for pattern detection) |
| 4 | No deduplication strategy for KB writes | Medium | Low | Check for similar patterns before writing (similarity threshold: 0.85) |
| 5 | No versioning for OUTCOME.yaml schema | Low | Low | Add schema migration path for future schema changes |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Rich diff visualization | Medium | High | Generate visual diffs for estimated vs actual metrics (charts, graphs) |
| 2 | Confidence scoring for patterns | Medium | Medium | Add confidence levels to detected patterns based on sample size and consistency |
| 3 | Cross-epic pattern detection | High | High | Extend pattern mining beyond single epic to entire monorepo (requires WKFL-006) |
| 4 | Auto-tagging enhancement | Medium | Low | Infer additional tags from story content (e.g., extract domain from story path) |
| 5 | Retrospective templates | Low | Medium | Create retro templates for common analysis types (performance, quality, velocity) |
| 6 | Real-time alerts | Medium | High | Notify when story exceeds budget by >50% during implementation (not just after) |
| 7 | Historical trend analysis | High | High | Track patterns over time, show improvement/regression trends |
| 8 | Agent performance profiling | Medium | Medium | Break down token usage by specific agent workers, identify bottlenecks |
| 9 | Interactive retro reports | Medium | High | Generate HTML/web dashboard for retro analysis (not just markdown) |
| 10 | Proposal prioritization | Medium | Medium | Score proposals by potential impact (estimated token savings, cycle reduction) |

## Categories

### Edge Cases
- Malformed artifacts (Gap #2)
- Schema versioning (Gap #5)
- Missing token logs or incomplete checkpoints

### UX Polish
- Rich diff visualization (Enhancement #1)
- Interactive retro reports (Enhancement #9)
- Retrospective templates (Enhancement #5)

### Performance
- Historical trend analysis (Enhancement #7)
- Agent performance profiling (Enhancement #8)

### Observability
- Real-time alerts (Enhancement #6)
- Confidence scoring for patterns (Enhancement #2)
- Proposal prioritization (Enhancement #10)

### Integrations
- Cross-epic pattern detection (Enhancement #3) - requires WKFL-006
- Auto-tagging enhancement (Enhancement #4)

## Notes

**High-Value Enhancements:**
- **Enhancement #3 (Cross-epic pattern detection)**: Would enable learning across entire workflow system, not just one epic. High impact but depends on WKFL-006.
- **Enhancement #7 (Historical trend analysis)**: Critical for measuring whether workflow improvements are actually working over time.
- **Enhancement #8 (Agent performance profiling)**: Would identify which specific agents/workers consume most tokens, enabling targeted optimization.

**Quick Wins:**
- **Gap #1 (Zod validation)**: Aligns with monorepo convention of using Zod for all schemas. Low effort, prevents runtime errors.
- **Gap #4 (Deduplication)**: Prevents KB bloat early, before WKFL-009 (KB Compressor) is implemented.
- **Enhancement #4 (Auto-tagging)**: Simple regex/path parsing, improves KB searchability immediately.

**Dependencies:**
- Enhancement #3 requires WKFL-006 (Pattern Miner)
- Enhancement #7 would benefit from WKFL-006 output
- Gap #4 (deduplication) becomes less critical once WKFL-009 (KB Compressor) is complete
