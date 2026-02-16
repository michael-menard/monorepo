# Future Opportunities - WINT-0160

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Story doesn't specify error logging strategy for subprocess failures | Low | Low | Add @repo/logger.error calls in error handling section of implementation. Story mentions using @repo/logger but doesn't specify exact logging strategy for subprocess errors. |
| 2 | No mention of timeout handling for long-running doc-sync processes | Low | Low | Consider adding subprocess timeout (e.g., 60s) to prevent hanging nodes. Current story assumes doc-sync completes quickly (10-30s per SKILL.md). |
| 3 | Story doesn't address concurrent node execution scenarios | Low | Medium | Consider thread-safety if multiple nodes could invoke doc-sync simultaneously. Current story assumes single-threaded orchestrator execution. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Performance: Caching SYNC-REPORT parsing results | Medium | Low | Cache parsed SYNC-REPORT.md results by file hash to avoid re-parsing in multi-node workflows. Speeds up batch processing. |
| 2 | Observability: Add metrics for doc-sync invocation times | Medium | Low | Track node execution time, subprocess duration, and parsing time for performance monitoring. Useful for identifying slowdowns in large workflows. |
| 3 | Developer Experience: Add helper function for common config patterns | Low | Low | Create `createDocSyncCheckOnlyNode()` and `createDocSyncForceNode()` convenience factories for common use cases. Reduces boilerplate in graph construction. |
| 4 | Testing: Integration test with real doc-sync agent | High | Medium | Story specifies unit tests with mocks. Optional integration test (mentioned in Test Plan) would validate end-to-end behavior. Consider adding to future test suite. |
| 5 | Extensibility: Support custom SYNC-REPORT parsing strategies | Low | Medium | Allow injecting custom parsers for different report formats. Enables experimentation with doc-sync output format changes without node code changes. |

## Categories

### Edge Cases
- **Timeout handling**: Doc-sync hangs or takes too long
- **Concurrent execution**: Multiple nodes invoke doc-sync simultaneously
- **Invalid SYNC-REPORT format**: Parsing fails or report malformed

### UX Polish
- **Better error messages**: Distinguish between subprocess failure, parsing failure, and missing report
- **Progress reporting**: Stream subprocess stdout/stderr for real-time feedback in long operations
- **Retry logic**: Automatic retry on transient subprocess failures

### Performance
- **Result caching**: Cache parsed SYNC-REPORT by content hash
- **Lazy loading**: Only parse SYNC-REPORT sections actually needed by downstream nodes
- **Parallel parsing**: Parse multiple SYNC-REPORT sections concurrently

### Observability
- **Metrics collection**: Track invocation count, duration, success rate
- **Detailed logging**: Log subprocess args, exit codes, parsing results
- **Telemetry integration**: Emit workflow events for doc-sync invocations (future WINT-3xxx stories)

### Integrations
- **LangGraph graph integration**: Story creates node; future stories will integrate into graphs (WINT-9110)
- **KB writing**: Connect with LNGG-0050 KB writing adapter for learning capture
- **Batch processing**: Use in WINT-6xxx batch processing workflows
