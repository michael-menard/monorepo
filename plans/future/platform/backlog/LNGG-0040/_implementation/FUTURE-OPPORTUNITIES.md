# Future Opportunities - LNGG-0040

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No rollback mechanism for batch failures | Low | Medium | Add transaction-like rollback for batch operations if any move fails |
| 2 | No stage movement history tracking | Low | Low | Integrate with WINT-0070 (Workflow Tracking Tables) for audit trail |
| 3 | No dry-run mode for batch operations | Low | Low | Add `dryRun: boolean` flag to preview changes without applying |
| 4 | No custom workflow support per epic | Medium | High | Allow epics to define custom stage transitions beyond default DAG |
| 5 | No notification system for stage changes | Low | Medium | Emit events for external systems to subscribe to stage transitions |
| 6 | Error messages lack localization | Low | Low | Support i18n for error messages if platform becomes multi-language |
| 7 | No progress tracking for large batches | Medium | Medium | Emit progress events for batches >50 stories |
| 8 | No concurrency tuning per environment | Low | Low | Make concurrency limit (10) configurable via env var or config |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Performance: Could cache StoryFileAdapter instances | Medium | Low | Pool adapter instances to reduce initialization overhead |
| 2 | UX: No validation feedback before batch execution | Medium | Medium | Pre-validate all transitions and return validation summary before executing |
| 3 | UX: Batch operations return opaque error objects | Low | Low | Add structured error codes for programmatic error handling |
| 4 | Testing: No cross-platform filesystem tests | Low | Medium | Add tests for Windows path handling, case-sensitivity issues |
| 5 | Monitoring: No metrics collection for stage movements | Medium | Medium | Emit metrics (count, latency, error rate) for observability |
| 6 | Accessibility: Logs not optimized for screen readers | Low | Low | Add alt-text equivalents for structured log data |
| 7 | Developer UX: No CLI wrapper for manual stage moves | Medium | Low | Create `pnpm story:move` command for quick manual transitions |
| 8 | Performance: Batch read could use streaming | High | High | For 1000+ stories, stream results instead of loading all into memory |
| 9 | Developer UX: No interactive stage picker | Medium | Medium | Add `inquirer` prompt for selecting target stage during CLI usage |
| 10 | Security: No audit log for stage movements | Medium | Medium | Log all stage changes to append-only audit log for compliance |

## Categories

### Edge Cases
- **Gap 1**: Rollback mechanism for batch failures
- **Gap 3**: Dry-run mode for batch operations
- **Gap 7**: Progress tracking for large batches

### UX Polish
- **Enhancement 2**: Validation feedback before batch execution
- **Enhancement 7**: CLI wrapper for manual stage moves
- **Enhancement 9**: Interactive stage picker

### Performance
- **Enhancement 1**: Cache StoryFileAdapter instances
- **Enhancement 8**: Batch read streaming for large datasets
- **Gap 8**: Concurrency tuning per environment

### Observability
- **Enhancement 5**: Metrics collection for stage movements
- **Enhancement 10**: Audit log for compliance
- **Gap 2**: Stage movement history tracking (WINT-0070 integration)

### Integrations
- **Gap 4**: Custom workflow support per epic
- **Gap 5**: Notification system for stage changes

### Quality
- **Enhancement 3**: Structured error codes for programmatic handling
- **Enhancement 4**: Cross-platform filesystem tests
- **Gap 6**: Error message localization

---

## Prioritized Recommendations

### High Impact, Low Effort (Do Next)
1. **Enhancement 1**: Cache StoryFileAdapter instances - simple performance win
2. **Enhancement 7**: CLI wrapper for manual stage moves - improves developer UX
3. **Gap 3**: Dry-run mode - low-hanging safety feature

### High Impact, Medium Effort (Roadmap)
1. **Enhancement 2**: Validation feedback before batch execution - prevents errors
2. **Enhancement 5**: Metrics collection - critical for production observability
3. **Gap 7**: Progress tracking for large batches - needed for batch processing UX

### Medium Impact, High Effort (Future)
1. **Enhancement 8**: Batch read streaming - only needed at scale (1000+ stories)
2. **Gap 4**: Custom workflow support - requires product decision on flexibility vs consistency

### Low Priority (Nice to Have)
1. **Gap 6**: Error message localization
2. **Enhancement 6**: Screen reader optimization
3. **Gap 8**: Concurrency tuning configuration

---

## Integration Opportunities

### WINT-0070 (Workflow Tracking Tables)
When WINT-0070 is implemented, integrate stage movement history:
- Log all stage transitions to `workflow_events` table
- Include user/agent context, timestamp, reason
- Enable audit trail queries: "Show all stories that returned to in-progress from UAT"

### LNGG-0020 (Index Management Adapter)
Coordinate with index adapter for consistency:
- Stage movements should trigger index updates
- Batch operations should update index atomically
- Consider event-based coordination between adapters

### WINT-0030 (Context Cache Tables)
Cache frequently accessed story status data:
- Reduce file reads for status lookups
- Invalidate cache on stage movements
- TTL-based cache expiration

### Telemetry/Monitoring (TELE epic)
Emit structured events for observability:
- Stage movement counts by type (forward, backward, lateral)
- Error rates by error type
- Batch operation latency percentiles (p50, p95, p99)

---

## Notes

**Gap vs Enhancement**:
- **Gaps**: Missing functionality that could improve robustness or completeness
- **Enhancements**: Nice-to-have features that improve UX or performance

**MVP Decision Rationale**:
All items in this document are deferred because they don't block the core user journey:
- Stories can be moved between stages (core requirement met)
- Transitions are validated (safety requirement met)
- Batch operations work for reasonable scale (<100 stories)
- Errors are handled gracefully

These opportunities improve polish, scale, and developer experience but are not required for LangGraph workflow adoption.

---

Generated: 2026-02-14
Story: LNGG-0040 - Stage Movement Adapter
