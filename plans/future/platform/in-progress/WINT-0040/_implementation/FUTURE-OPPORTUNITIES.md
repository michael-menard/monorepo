# Future Opportunities - WINT-0040

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No PostgreSQL-level JSONB schema validation | Medium | Medium | Consider PostgreSQL 14+ JSONB schema validation for critical fields (securityIssues, performanceMetrics). Currently relying on Zod validation at ORM layer only. Trade-off: stronger data integrity vs migration complexity. |
| 2 | No partial indexes for high-cardinality queries | Low | Low | If telemetry volume grows, consider partial indexes for common filters (e.g., WHERE status = 'success' for agentInvocations). Current full indexes may have write overhead. |
| 3 | No automated index monitoring | Low | Medium | Add index usage monitoring to detect unused indexes or missing indexes. Could integrate with TELE-0030 (Dashboards-as-Code) for visibility. |
| 4 | No retention policy for telemetry data | Medium | Medium | Telemetry tables will grow unbounded. Consider adding createdAt-based partitioning or archival strategy in future TELE epic. Not MVP-blocking but will become critical at scale. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Add embedding columns for semantic search | High | High | agentDecisions could benefit from embedding column for similarity search (find similar decisions). Requires embedding generation pipeline. Defer to ML Pipeline epic (WINT-0050+). |
| 2 | Add GIN indexes for JSONB queries | Medium | Low | If JSONB queries become common (e.g., filtering by securityIssues severity), add GIN indexes: `CREATE INDEX idx_agent_outcomes_security_issues ON wint.agent_outcomes USING GIN (security_issues)`. Monitor query patterns first. |
| 3 | Add materialized views for common aggregations | Medium | Medium | Pre-compute common telemetry aggregations (e.g., agent success rates, average token usage per agent). Defer to TELE-0030 (Dashboards-as-Code) based on actual query patterns. |
| 4 | Add audit trail for schema changes | Low | High | Track who/when telemetry schema changes occur. Could extend stateTransitions table or create separate schema_versions table. Nice-to-have for compliance but not urgent. |
| 5 | Add real-time telemetry streaming support | High | High | Current design is append-only logs. Real-time dashboards would benefit from PostgreSQL LISTEN/NOTIFY or external streaming (Kafka). Major architectural change - defer to future TELE epic. |
| 6 | Add distributed tracing correlation IDs | High | Medium | Link agentInvocations to distributed traces (OpenTelemetry). Would require adding traceId/spanId columns. Valuable for debugging but requires broader observability strategy. Defer to INFR epic. |
| 7 | Add cost prediction model training data columns | Medium | Low | agentInvocations could track additional metadata for cost prediction models (e.g., prompt complexity score, cache hit rate). Defer to WINT-0050 (ML Pipeline) based on actual ML needs. |

## Categories

### Edge Cases
- **Large JSONB arrays**: TEST-PLAN.md covers 100+ item arrays, but no upper bound specified. Consider documenting practical limits (e.g., 1000 security issues) to avoid performance degradation.
- **High-frequency inserts**: Composite indexes may cause write contention under heavy load. Monitor and consider batch ingestion if needed.
- **Unicode in JSONB strings**: Ensure JSONB string handling supports full Unicode (emojis, CJK characters) for international error messages.

### UX Polish
- **Developer experience**: Add helper functions for common JSONB queries (e.g., `getSecurityIssuesBySeverity()`). Defer to @repo/db package enhancements.
- **Migration documentation**: Add inline SQL comments explaining each index's purpose for future maintainers.

### Performance
- **Index selectivity monitoring**: Track index hit rates and bloat. Could integrate with TELE-0020 (Prometheus Metrics).
- **JSONB compression**: Large performanceMetrics objects could benefit from TOAST compression tuning. Defer until actual size patterns emerge.
- **Connection pooling under load**: Ensure Drizzle ORM connection pool handles concurrent telemetry writes. Load testing deferred to TELE epic.

### Observability
- **Migration health checks**: Add post-migration validation queries to detect data anomalies (e.g., NULL counts, index coverage).
- **Schema drift detection**: Automated checks to ensure Zod schemas match actual database schema. Could prevent Zod/DB mismatches.
- **Query performance baselines**: Document expected query performance (EXPLAIN ANALYZE outputs) for regression detection.

### Integrations
- **OpenTelemetry export**: agentInvocations could be exported to OpenTelemetry collectors for unified observability. Defer to INFR-0060 (Instrument Orchestrator).
- **Prometheus metrics**: Token counts, error rates, decision quality scores could feed Prometheus. Covered by TELE-0020.
- **ML pipeline integration**: Training data extraction from agentOutcomes. Covered by WINT-0050.
- **External BI tools**: Expose telemetry via read-only views or API for tools like Metabase. Defer to TELE-0030.

### Security
- **PII in JSONB fields**: No validation that securityIssues or other JSONB columns don't contain PII. Add PII scanning in future security audit.
- **Row-level security**: Telemetry tables have no RLS policies. Consider if multi-tenant scenarios emerge.

### Data Quality
- **Anomaly detection**: Flag unusual token usage (e.g., 10x normal) or quality scores (all 0 or all 100) for manual review.
- **Consistency checks**: Ensure totalTokens = inputTokens + outputTokens + cachedTokens (if DB GENERATED, automatic; if app-level, needs validation).
- **Referential integrity monitoring**: Detect orphaned agentDecisions/agentOutcomes if agentInvocations deleted (though CASCADE should prevent this).
