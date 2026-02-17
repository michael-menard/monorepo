# Future Opportunities - WINT-0090

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Story creation tools deferred (explicit non-goal) | Medium | Medium | Follow-up story for story_create() MCP tool. Requires additional validation logic (unique storyId, epic validation, dependency checking). |
| 2 | Complex workflow validation deferred (FSM state machine) | Low | High | Future story to add comprehensive state transition rules (e.g., prevent moving from "done" to "backlog" without explicit rollback flag). Current implementation has basic validation only. |
| 3 | Batch story operations not supported (single-story only per non-goals) | Medium | Medium | Future enhancement: story_update_batch() for bulk status updates. Useful for batch-coordinator workflows (WINT-6010+). |
| 4 | No LangGraph integration in this story (deferred to WINT-9XXX) | Low | Low | MCP tools usable from LangGraph nodes, but no dedicated adapter nodes. Follow WINT-9XXX phase for LangGraph parity. |
| 5 | Story deletion/archival not supported | Low | Low | Add story_archive() MCP tool in future iteration. Consider soft-delete pattern (archived flag vs hard delete). |
| 6 | No dependency management tools (storyDependencies table unused) | Medium | Medium | WINT-1030+ will add dependency query/update tools (story_add_dependency, story_resolve_dependency, story_get_blocked_by). |
| 7 | Real-time change notifications not included | Low | High | Pub/sub or WebSocket layer for story status updates. Deferred until real-time requirements clarified. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Story search by title/description (beyond status/feature filters) | Medium | Medium | Add story_search(query, filters) with full-text search. Requires PostgreSQL tsvector index on title + description. |
| 2 | Story analytics/reporting (average time-in-state, bottleneck detection) | High | Medium | Add story_get_metrics() returning time-in-state breakdown, transition frequency, etc. Leverage storyStates and storyTransitions tables. |
| 3 | Story filtering by multiple criteria (status + priority + wave) | Medium | Low | Extend story_get_by_status to accept optional priority/wave filters. Simple Drizzle query extension. |
| 4 | Story audit log (who changed what when) | Low | Medium | Enhance storyTransitions with richer metadata (user ID, IP address, session ID). Useful for compliance/debugging. |
| 5 | Story state validation rules engine (configurable FSM) | High | High | YAML-defined state transition rules with validation logic. Major enhancement requiring rules engine infrastructure. |
| 6 | Story tagging/categorization (beyond epic) | Medium | Low | Add tags field to story metadata with tag-based queries. |
| 7 | Story snapshot/versioning (track changes over time) | Medium | High | Temporal table pattern or manual snapshot table. Captures full story state at each update for rollback/audit. |
| 8 | Optimistic concurrency control (version field) | Low | Low | Add version integer to stories table with UPDATE WHERE version = X. Prevents lost updates in concurrent scenarios. |
| 9 | Story template support (pre-fill common fields by type) | Low | Medium | Story templates for feature/bug/infra with default AC, metadata. Requires template schema + storage. |
| 10 | Story export/import (bulk data migration) | Low | Medium | Export stories to JSON/CSV, import from external sources. Useful for portfolio migration or backup. |

## Categories

### Edge Cases
- **Story ID collision**: What if human-readable ID conflicts with UUID? (Low risk - storyId has unique constraint, will fail gracefully)
- **Empty result pagination**: offset > total stories (Handled - returns empty array)
- **Special characters in epic names**: Unicode, spaces, hyphens in queries (Low risk - text column handles UTF-8)
- **Concurrent state transitions**: Two agents updating same story simultaneously (Mitigated with database transactions, but no optimistic locking)

### UX Polish
- Story search autocomplete (type-ahead suggestions)
- Story status timeline visualization (graphical view of state history)
- Story dependency graph visualization (D3.js or similar)
- Story bulk edit UI (select multiple, apply status change)

### Performance
- Query caching for story_get_by_status (high-frequency read)
- Materialized view for story summary stats (count by status/epic)
- Database query plan analysis (ensure indexes used effectively)
- Connection pooling tuning (@repo/db already handles, but may need review under high load)

### Observability
- MCP tool latency tracking (log query duration)
- Story query frequency metrics (which tools used most often)
- Error rate monitoring (percentage of null returns vs successful queries)
- Database slow query log integration (identify bottlenecks)

### Integrations
- GitHub Actions integration (auto-update story status on PR merge)
- Slack notifications for status changes (real-time team updates)
- Jira/Linear sync (bidirectional status sync for hybrid teams)
- CLI wrapper for MCP tools (command-line story management without agent)
