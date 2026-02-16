# Future Risks: WINT-0040 - Create Telemetry Tables

## Non-MVP Risks

### Risk 1: JSONB Query Performance at Scale

**Risk**: Complex JSONB queries on securityIssues, performanceMetrics, and artifactsMetadata may become slow as telemetry data grows beyond 100K rows.

**Impact (if not addressed post-MVP)**:
- Analytics queries (e.g., "find all stories with security issues") could timeout
- Dashboard load times degrade
- May need to normalize JSONB data into separate tables for efficient querying

**Recommended timeline**: Wave 13 (Telemetry) - after WINT-3060 (Telemetry Query Command) validates actual query patterns

**Mitigation options**:
- Add GIN indexes on JSONB columns for common query paths
- Implement materialized views for frequently-accessed aggregations
- Consider partitioning telemetry tables by date range (monthly partitions)

---

### Risk 2: Lack of JSONB Schema Enforcement

**Risk**: No runtime enforcement of JSONB structure at database level. Malformed data can be inserted if Zod validation is bypassed (raw SQL, database tools, migrations).

**Impact (if not addressed post-MVP)**:
- Future code expecting `securityIssues[0].severity` may encounter undefined/null errors
- Data quality degrades over time
- Debugging costs increase due to inconsistent structures

**Recommended timeline**: Post-Wave 13 (Telemetry) - after ingestion patterns stabilize

**Mitigation options**:
- PostgreSQL 14+ JSONB schema validation (CHECK constraints with jsonb_path_query)
- Application-level validation middleware in @repo/db
- Periodic data quality audits via cron job
- Document expected schemas in ADR-LOG.md

---

### Risk 3: Index Write Overhead on High-Volume Inserts

**Risk**: 4 new composite indexes increase write latency on agentInvocations table, which may receive 1000+ inserts/minute during batch processing.

**Impact (if not addressed post-MVP)**:
- Telemetry ingestion (WINT-3020) may bottleneck on database writes
- Increased Aurora write IOPS costs
- Potential for queue backlog during peak load

**Recommended timeline**: WINT-3020 (Invocation Logging) - measure actual write load

**Mitigation options**:
- Batch inserts (insert 100 rows at once instead of 1 at a time)
- Partial indexes (only index recent data: `WHERE started_at > NOW() - INTERVAL '30 days'`)
- Write-optimized Aurora instance class during batch processing
- Consider TimescaleDB extension for time-series optimizations

---

### Risk 4: Migration Rollback Complexity

**Risk**: Rolling back WINT-0040 migration after production data has been collected will lose new column data permanently.

**Impact (if not addressed post-MVP)**:
- Cannot safely rollback if bugs discovered post-deployment
- Data loss risk for collected telemetry metrics
- May need emergency hotfix instead of clean rollback

**Recommended timeline**: Before production deployment (pre-Wave 13)

**Mitigation options**:
- Backup telemetry tables before migration
- Implement data export before rollback
- Shadow deployment strategy (collect to new columns + old columns temporarily)
- Document rollback procedure with data preservation steps

---

### Risk 5: Token Estimation Accuracy

**Risk**: estimatedCost column relies on heuristic calculations (token count × model pricing). Actual API costs may differ due to prompt caching, rate limits, or pricing changes.

**Impact (if not addressed post-MVP)**:
- Budget tracking (WINT-0260) may be inaccurate
- Cost anomaly detection (AUTO-3070) triggers false alarms
- Financial reporting requires manual reconciliation with API invoices

**Recommended timeline**: WINT-0260 (Model Cost Tracking)

**Mitigation options**:
- Store both estimated and actual costs (sync with API invoices weekly)
- Add `costVariance` column for tracking estimation error
- Alert on >20% variance between estimate and actuals
- Adjust estimation heuristics based on historical variance

---

### Risk 6: Composite Index Maintenance

**Risk**: As schema evolves, composite indexes may become stale or suboptimal for new query patterns.

**Impact (if not addressed post-MVP)**:
- Gradual query performance degradation
- Unused indexes consume disk space and slow writes
- Query optimizer may choose wrong index

**Recommended timeline**: Quarterly index review (post-Wave 13)

**Mitigation options**:
- Monitor index usage with `pg_stat_user_indexes`
- Drop unused indexes (<1% usage over 30 days)
- Recreate indexes with new column orders if query patterns change
- Document index purpose in code comments (prevents accidental removal)

---

### Risk 7: Cross-Story Telemetry Correlations

**Risk**: Telemetry data from WINT-0040 (agent-level) and INFR-0040 (workflow-level) live in separate schemas, making cross-layer analysis difficult.

**Impact (if not addressed post-MVP)**:
- Cannot easily join agent decisions with workflow outcomes
- Analytics dashboards require complex multi-schema queries
- ML pipeline (WINT-0050) may need denormalized views

**Recommended timeline**: WINT-0050 (ML Pipeline Tables) - when cross-layer features are built

**Mitigation options**:
- Create cross-schema foreign keys (agentInvocations.workflowId → workflow_events.id)
- Materialized views joining wint.* and telemetry.* data
- Event correlation middleware in telemetry ingestion layer
- Document correlation strategy in ADR-LOG.md

---

## Scope Tightening Suggestions

### Clarifications for Future Iterations

1. **totalTokens Computation**: Specify if computed at DB level (GENERATED column) or application level
2. **Index Naming Convention**: Standardize `idx_{table}_{col1}_{col2}` pattern across all WINT tables
3. **JSONB Schema Documentation**: Add `__types__/telemetry-metadata.ts` with TypeScript interfaces for JSONB structures
4. **Cost Precision**: Define decimal precision for estimatedCost (NUMERIC(10,4) vs NUMERIC(8,2))
5. **Evaluation Workflow**: Document when/how evaluatedAt and correctnessScore are populated (separate story?)

### OUT OF SCOPE Candidates for Later

1. **Telemetry Data Retention Policy** → Defer to TELE-0040 (Alerting Rules)
   - How long to keep telemetry data (30 days? 90 days?)
   - Archival strategy for old data (S3 export?)
   - Partitioning by date range

2. **Real-Time Telemetry Streaming** → Not in Wave 2 scope
   - WebSocket streaming of telemetry events
   - Live dashboard updates
   - Pub/sub architecture

3. **Advanced Analytics Queries** → Defer to TELE-0030 (Dashboards-as-Code)
   - Percentile calculations (P50, P95, P99)
   - Time-series aggregations (tokens per day, error rate trends)
   - Correlation analysis (high lintErrors → low correctnessScore?)

4. **Audit Trail Compliance** → Future enhancement
   - GDPR/SOC2 requirements for telemetry data
   - Data anonymization or PII scrubbing
   - Tamper-proof audit logs (append-only with signatures)

5. **Multi-Tenancy** → Not in current scope
   - Tenant-level telemetry isolation
   - Per-tenant query performance
   - Tenant-specific retention policies

---

## Future Requirements

### Nice-to-Have Enhancements

1. **Computed Column for totalTokens**
   - Use PostgreSQL GENERATED ALWAYS AS for automatic computation
   - Eliminates application-level calculation risk
   - Ensures data integrity

2. **CHECK Constraints for Ranges**
   - `correctnessScore BETWEEN 0 AND 100`
   - `lintErrors >= 0` and `typeErrors >= 0`
   - Prevents invalid data at database level

3. **Partial Indexes for Recent Data**
   - Index only last 30 days: `WHERE started_at > NOW() - INTERVAL '30 days'`
   - Reduces index size by 90%+ for append-only data
   - Maintains fast query performance on recent telemetry

4. **GIN Indexes for JSONB Queries**
   ```sql
   CREATE INDEX idx_security_issues_gin
   ON wint.agent_outcomes USING GIN (security_issues);
   ```
   - Enables fast JSONB containment queries
   - Supports `@>`, `@?`, and `@@` operators

5. **Materialized View for Common Aggregations**
   ```sql
   CREATE MATERIALIZED VIEW wint.telemetry_summary AS
   SELECT agent_name,
          DATE(started_at) as date,
          COUNT(*) as invocation_count,
          SUM(total_tokens) as total_tokens,
          AVG(estimated_cost) as avg_cost
   FROM wint.agent_invocations
   GROUP BY agent_name, DATE(started_at);
   ```
   - Refresh daily via cron
   - Fast dashboard queries

### Polish and Edge Case Handling

1. **Migration Progress Tracking**
   - Log migration steps to `wint.migration_log` table
   - Track applied_at timestamp, duration, rows affected
   - Rollback metadata (who, when, why)

2. **Index Usage Monitoring**
   - Automated pg_stat_user_indexes export to telemetry
   - Alert if index usage drops below threshold
   - Suggest index drops for unused indexes

3. **Zod Schema Versioning**
   - Track schema version in JSONB metadata: `{ version: 1, data: {...} }`
   - Enable schema evolution without breaking changes
   - Document migration path for v1 → v2 structures

4. **Error Budget Tracking**
   - Track telemetry ingestion failures (Zod validation errors)
   - Alert if error rate exceeds 1% of total inserts
   - Automatic fallback to degraded mode (skip validation) if DB unavailable

5. **Cost Anomaly Detection**
   - Track rolling average of estimatedCost per agent
   - Alert if single invocation exceeds 3x average
   - Prevents runaway token costs from bugs

---

## Metrics for Future Monitoring

Once TELE-0020 (Prometheus Metrics) is implemented:

- `wint_telemetry_inserts_total{table}` - Total insert count per table
- `wint_telemetry_insert_duration_ms{table}` - P50, P95, P99 insert latency
- `wint_telemetry_index_scans_total{index}` - Index usage counter
- `wint_telemetry_jsonb_validation_errors_total{column}` - Zod validation failures
- `wint_telemetry_query_duration_ms{query_pattern}` - Query performance tracking

These metrics will inform future optimizations (partial indexes, partitioning, normalization).
