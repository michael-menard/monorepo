# Future Opportunities - INFR-0120

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No normalization of evidence items, review findings, or QA issues into separate tables | Medium | Medium | Consider normalizing if query patterns emerge that require filtering/aggregating individual evidence items or findings across stories. Current JSONB denormalization is appropriate for MVP (max ~20 items per artifact, co-location benefits), but track query performance in production. |
| 2 | No full-text search indexes on JSONB fields | Low | Medium | Add GIN indexes for JSONB fields if text search across evidence descriptions or review findings becomes a common query pattern. Defer until INFR-0020+ when actual query patterns are established. |
| 3 | No materialized views for QA metrics aggregation | Medium | Medium | Create materialized views for QA trend analysis (e.g., "average AC pass rate per epic", "most common QA issues") once INFR-0020 enables artifact sync and queries are used in production. |
| 4 | No archival strategy for old artifact versions | Low | High | Consider partitioning or archival strategy for artifact tables if data volume grows large (>1M rows). Monitor table size in production before implementing. |
| 5 | No composite indexes for complex queries | Medium | Low | Add composite indexes for specific query patterns discovered in INFR-0020+ (e.g., `(story_id, created_at DESC)` for time-series queries, `(artifact_type, status)` for filtering). Current `idx_story_artifact` from INFR-0110 covers basic queries. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Zod schema validation in database triggers | High | High | Add PostgreSQL triggers to validate JSONB structure against Zod schemas at insert/update time, preventing schema drift. Trade-off: performance overhead vs runtime safety. Evaluate after INFR-0020 implementation to measure impact. |
| 2 | Automated schema alignment tests | High | Medium | Create automated tests comparing Drizzle schema field definitions to Zod artifact schemas from orchestrator package. Prevents drift between TypeScript and DB schemas. Should be implemented as part of INFR-0020 to ensure sync correctness. |
| 3 | JSONB schema versioning | Medium | Medium | Track JSONB schema version in each artifact row to handle backward compatibility during Zod schema evolution. Current approach allows additive changes, but breaking changes require migration. Consider implementing before first breaking Zod schema change. |
| 4 | Read replicas for query-heavy workloads | Medium | High | If artifact queries become a bottleneck in INFR-0020+, consider read replicas for Aurora PostgreSQL to offload analytical queries from transactional writes. Monitor query patterns first. |
| 5 | Column-level encryption for sensitive evidence | Low | High | If evidence artifacts contain sensitive data (API keys, PII, credentials), implement column-level encryption for JSONB fields. Current story assumes non-sensitive workflow artifacts. Re-evaluate if artifact types expand. |
| 6 | Artifact diff tracking | High | High | Track diffs between artifact versions (not just full snapshots) to enable "what changed" queries and reduce storage for large JSONB fields. Useful for INFR-0020+ artifact versioning and audit trails. |
| 7 | Cross-story evidence correlation | Medium | High | Enable queries like "show all stories where AC-3 failed due to similar root causes" by extracting common patterns from evidence JSONB and indexing them. Useful for KBAR learning loop (KBAR-0110+). |
| 8 | Evidence quality scoring | Medium | Medium | Calculate evidence quality scores (completeness, test coverage, E2E pass rate) and store as computed columns for filtering/ranking stories by QA quality. Useful for batch processing (WINT-6010+) to prioritize high-quality stories. |

## Categories

### Edge Cases
- **Large JSONB payloads** (50+ evidence items): Verify no truncation or performance degradation. Test plan includes this as edge case.
- **Concurrent inserts to same story**: Verify no deadlocks when multiple agents write different artifact types simultaneously. Test plan includes this.
- **Migration rollback with partial data**: Ensure rollback cleanly removes tables even if some data inserted. Drizzle transactions handle this.

### UX Polish
- **GraphQL schema for artifacts**: If MCP tools in KBAR-0110+ expose artifacts via GraphQL, auto-generate schema from Drizzle tables to ensure type consistency.
- **Artifact visualization**: Future UI for visualizing evidence/review/QA artifacts could benefit from normalized evidence items table (easier to query individual items for charts).

### Performance
- **Partitioning by artifact_type**: If queries always filter by artifact_type, partitioning evidence/review/qa-verify tables by type could improve query performance. Defer until production query patterns emerge.
- **Compression for large JSONB**: PostgreSQL TOAST handles large JSONB automatically, but explicit compression strategies (e.g., zlib) could reduce storage costs if artifact JSON exceeds 2KB average.

### Observability
- **Schema drift alerts**: Add monitoring to alert when Drizzle-generated Zod schemas diverge from orchestrator artifact Zod schemas. Critical for INFR-0020 sync correctness.
- **Migration performance tracking**: Track migration apply time in CI/CD to catch performance regressions from future schema changes.

### Integrations
- **KBAR artifact extraction**: KBAR-0110+ will extract lessons from evidence/review/qa-verify artifacts. Ensure JSONB structure is easily parsable by MCP tools (current Zod schemas already support this).
- **LangGraph state checkpoints**: Future LangGraph integration (LNGG-0060+) may persist checkpoints as artifacts. Verify checkpoint_artifacts table (from INFR-0110) integrates with review/QA artifacts for complete workflow state.
