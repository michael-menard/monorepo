# Dev Feasibility Review: KNOW-018 — Audit Logging

## Feasibility Summary

- **Feasible**: Yes
- **Confidence**: High
- **Why**: Audit logging is a well-understood pattern with PostgreSQL support. The story depends on KNOW-003 (Core CRUD Operations) which is completed, providing the integration points needed. Standard database table + trigger/function approach or application-level instrumentation are both viable.

## Likely Change Surface

### Areas/Packages Likely Impacted

- **apps/api/knowledge-base/src/mcp-server/**
  - `tool-handlers.ts` - Instrument kb_add, kb_update, kb_delete handlers
  - `tool-schemas.ts` - Add schemas for audit query tools (if exposing via MCP)
  - New file: `audit-logger.ts` - Core audit logging service
  - New file: `retention-policy.ts` - Retention cleanup logic

- **apps/api/knowledge-base/src/db/**
  - New migration: `XXX_add_audit_log_table.sql`
  - Potentially: trigger functions if using database-level auditing

- **apps/api/knowledge-base/src/mcp-server/__tests__/**
  - New test file: `audit-logging.test.ts`
  - Updates to existing CRUD operation tests to verify audit entries

### Endpoints Likely Impacted

- **MCP Tools Modified**:
  - `kb_add` - Add audit logging after successful insert
  - `kb_update` - Add audit logging with before/after snapshots
  - `kb_delete` - Add audit logging with deleted entry snapshot

- **MCP Tools Added** (likely):
  - `kb_audit_query` - Query audit logs by filters (time range, operation type)
  - `kb_audit_by_entry` - Get audit history for specific entry_id
  - `kb_audit_retention_cleanup` - Manually trigger retention policy (admin tool)

### Migration/Deploy Touchpoints

1. **Database Migration**:
   - New `audit_log` table with columns: id, entry_id, operation, previous_value, new_value, timestamp, user_context, etc.
   - Indexes on entry_id and timestamp for query performance
   - Partition strategy consideration for large-scale deployments

2. **Environment Configuration**:
   - New env var: `AUDIT_RETENTION_DAYS` (default 90)
   - New env var: `AUDIT_ENABLED` (default true, allow disabling for testing)

3. **Scheduled Jobs**:
   - Retention cleanup cron/scheduled task setup (e.g., daily at 2 AM)
   - Initial setup requires infrastructure for scheduled execution

## Risk Register (Top 5-10)

### Risk 1: Transaction consistency between main operation and audit log
- **Why it's risky**: If audit write is in separate transaction, failure scenarios could lead to inconsistent state (operation succeeded but no audit entry, or vice versa)
- **Mitigation**: PM should require AC that audit logging is transactional with parent operation. Use same database connection/transaction. Test rollback scenarios explicitly.

### Risk 2: Audit log write failures blocking user operations
- **Why it's risky**: If audit logging fails, should the main operation fail too? Could create availability issues.
- **Mitigation**: PM should decide: hard fail or soft fail? Recommendation: soft fail with error logging and monitoring alerts. AC should specify behavior explicitly.

### Risk 3: Performance overhead of audit logging on every CRUD operation
- **Why it's risky**: Extra database write + JSON serialization on every operation could add 10-50ms per request
- **Mitigation**: PM should include performance SLO in ACs (e.g., "p95 latency increase < 20ms"). Require load testing as part of proof-of-work.

### Risk 4: Unbounded audit log growth
- **Why it's risky**: High-volume usage could generate millions of audit entries, impacting database size and query performance
- **Mitigation**: PM should require retention policy implementation as MUST-HAVE (not future work). AC should specify retention period and verify cleanup actually runs.

### Risk 5: Large entry snapshots in audit logs
- **Why it's risky**: Knowledge entries can be large (100KB+ markdown). Storing full before/after snapshots could double storage requirements.
- **Mitigation**: PM should consider: snapshot full content vs. metadata only? AC should specify what fields are audited. Consider content hash instead of full content for large fields.

### Risk 6: Retention policy accidentally deletes recent logs
- **Why it's risky**: Bug in date calculation or timezone handling could delete logs that should be retained
- **Mitigation**: PM should require edge case testing (boundary dates, timezone changes). AC should specify exact retention behavior (e.g., "delete logs older than 90 days at 00:00 UTC").

### Risk 7: No audit of audit log modifications
- **Why it's risky**: If audit logs themselves can be modified/deleted, compliance value is compromised
- **Mitigation**: PM should specify: audit_log table is append-only (no UPDATE/DELETE except retention policy). Consider database permissions to enforce.

### Risk 8: User context not captured in MCP environment
- **Why it's risky**: MCP tools may not have reliable user identification, making audit logs less useful
- **Mitigation**: PM should clarify: what user_context is available from MCP? If none, document this limitation. AC should specify what context fields are captured (session ID, tool name, etc.).

### Risk 9: Retention policy performance on large datasets
- **Why it's risky**: Deleting millions of old audit entries could lock tables or timeout
- **Mitigation**: PM should require batch deletion strategy in implementation plan. AC should specify max batch size and job timeout handling.

### Risk 10: Schema migrations for audit_log in future
- **Why it's risky**: Changing audit log schema after data exists requires careful migration, especially with large tables
- **Mitigation**: PM should design extensible schema upfront (use JSONB for flexible fields). Document migration strategy in Architecture Notes.

## Scope Tightening Suggestions (Non-breaking)

### Suggestion 1: Limit audit log query capabilities in v1
- **Clarification**: Don't build a full admin UI for audit logs in this story. Provide basic MCP tools for querying by entry_id and date range. Advanced filtering/reporting is future work.
- **Benefit**: Reduces scope, faster delivery

### Suggestion 2: Define explicit OUT OF SCOPE items
- **Recommended additions to Non-Goals**:
  - Audit log export to external systems (Splunk, CloudWatch, etc.)
  - Audit log integrity verification (cryptographic signatures)
  - Audit log replication/backup strategy
  - Admin UI for viewing audit logs (MCP tools only)

### Suggestion 3: Hardcode retention period in v1
- **Clarification**: Instead of configurable retention policy, start with fixed 90-day retention. Makes implementation simpler and reduces test matrix.
- **Benefit**: Faster implementation, can make configurable in future story

### Suggestion 4: Limit audited operations to CUD only (not R)
- **Clarification**: Don't audit read operations (kb_get, kb_list, kb_search) in v1. Only log Create, Update, Delete.
- **Benefit**: Reduces audit log volume significantly, focuses on compliance use case

## Missing Requirements / Ambiguities

### Ambiguity 1: What constitutes an "update" for audit purposes?
- **Unclear**: If only metadata changes (e.g., tags updated but content unchanged), is this audited? What about embedding regeneration?
- **Recommended decision**: "Audit any kb_update call regardless of what fields changed. Log full before/after entry snapshots."

### Ambiguity 2: User/context identification in audit logs
- **Unclear**: MCP tools may not have authenticated user context. What identifier should be logged?
- **Recommended decision**: "Audit logs capture: timestamp, operation, entry_id, tool_name, session_id (if available). User identification is future work pending MCP auth story."

### Ambiguity 3: Retention policy execution schedule
- **Unclear**: How often does retention cleanup run? Who triggers it?
- **Recommended decision**: "Retention cleanup runs daily at 02:00 UTC via cron job. Also provide kb_audit_retention_cleanup MCP tool for manual admin execution."

### Ambiguity 4: Audit log query pagination
- **Unclear**: Audit queries could return thousands of results. Is pagination required?
- **Recommended decision**: "All audit query tools support limit/offset parameters. Default limit 100, max limit 1000. Include total_count in response."

### Ambiguity 5: Behavior on audit write failure
- **Unclear**: If audit log write fails, should the main operation fail or succeed?
- **Recommended decision**: "Audit logging is best-effort. If audit write fails, log error to application logs and emit monitoring metric, but allow main operation to succeed. Include this in Architecture Notes."

### Ambiguity 6: Audit log table partitioning
- **Unclear**: For large deployments, should audit_log be partitioned by date?
- **Recommended decision**: "V1 uses single audit_log table. Table partitioning is future work if needed for scale. Document this in Infrastructure Notes."

### Ambiguity 7: What fields are logged for each operation?
- **Unclear**: Full entry object or subset? Include embeddings?
- **Recommended decision**: "Audit logs include: id, title, content, tags, metadata. Exclude: embedding vectors (too large), created_at/updated_at (redundant with audit timestamp)."

## Evidence Expectations

### What Proof/Dev Should Capture

1. **Database Schema Evidence**:
   - Screenshot or SQL dump of `audit_log` table structure
   - EXPLAIN ANALYZE for audit query performance
   - Row counts before/after retention cleanup

2. **Integration Test Evidence**:
   - Test output showing audit entries created for each CRUD operation
   - Test output showing retention policy deletes old logs correctly
   - Test output showing audit queries return correct filtered results

3. **Unit Test Coverage**:
   - audit-logger.ts with >80% coverage
   - retention-policy.ts with >80% coverage
   - Updated CRUD handler tests verifying audit calls

4. **Performance Benchmarks**:
   - Before/after latency measurements for kb_add, kb_update, kb_delete
   - Load test results with audit logging enabled (1000+ operations)
   - Retention cleanup execution time with various dataset sizes

5. **Configuration Evidence**:
   - Example .env showing audit configuration variables
   - Cron job configuration for retention cleanup

### What Might Fail in CI/Deploy

1. **Migration Failures**:
   - audit_log table creation could fail if pgvector extension setup is incomplete
   - Index creation could timeout on large existing databases

2. **Integration Test Failures**:
   - Tests querying audit_log could fail if database setup incomplete
   - Retention cleanup tests could fail due to timezone assumptions

3. **Performance Regression**:
   - CI performance tests might flag >20% slowdown in CRUD operations
   - Load tests might timeout if audit logging overhead too high

4. **Missing Environment Variables**:
   - Tests might fail if AUDIT_RETENTION_DAYS not set in CI environment

5. **Scheduled Job Setup**:
   - Retention cleanup cron job requires infrastructure setup that might not exist in test environment
