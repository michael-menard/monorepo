# Backend Log - KNOW-018: Audit Logging

## Files Touched

### New Files Created

| File Path | Purpose |
|-----------|---------|
| `apps/api/knowledge-base/src/audit/__types__/index.ts` | Zod schemas for audit log entries, query inputs, and configuration |
| `apps/api/knowledge-base/src/audit/audit-logger.ts` | Core AuditLogger class with logAdd/logUpdate/logDelete methods |
| `apps/api/knowledge-base/src/audit/queries.ts` | Query functions: queryAuditByEntry, queryAuditByTimeRange |
| `apps/api/knowledge-base/src/audit/retention-policy.ts` | Retention cleanup with batch deletion: runRetentionCleanup |
| `apps/api/knowledge-base/src/audit/index.ts` | Module exports |
| `apps/api/knowledge-base/src/audit/__tests__/audit-logger.test.ts` | Unit tests for AuditLogger class (12 tests) |
| `apps/api/knowledge-base/src/audit/__tests__/queries.test.ts` | Unit tests for query functions (8 tests) |
| `apps/api/knowledge-base/src/audit/__tests__/retention.test.ts` | Unit tests for retention cleanup (10 tests) |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `apps/api/knowledge-base/src/db/schema.ts` | Added `auditLog` table with id, entry_id (FK with SET NULL), operation, previous_value, new_value, timestamp, user_context, created_at. Added 3 indexes. |
| `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | Added KbAuditByEntryInputSchema, KbAuditQueryInputSchema, KbAuditRetentionInputSchema. Added 3 tool definitions. |
| `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Added handleKbAuditByEntry, handleKbAuditQuery, handleKbAuditRetentionCleanup handlers. Instrumented handleKbAdd, handleKbUpdate, handleKbDelete with audit logging. |

## Database Schema

### New Table: audit_log

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES knowledge_entries(id) ON DELETE SET NULL,
  operation TEXT NOT NULL,  -- 'add' | 'update' | 'delete'
  previous_value JSONB,     -- null for add
  new_value JSONB,          -- null for delete
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_log_entry_id_idx ON audit_log(entry_id);
CREATE INDEX audit_log_timestamp_idx ON audit_log(timestamp);
CREATE INDEX audit_log_entry_timestamp_idx ON audit_log(entry_id, timestamp);
```

## New MCP Tools

| Tool Name | Description |
|-----------|-------------|
| kb_audit_by_entry | Query audit history for a specific entry by UUID |
| kb_audit_query | Query audit logs by time range with optional operation filter |
| kb_audit_retention_cleanup | Manually trigger retention cleanup (admin tool) |

## Modified MCP Tools

| Tool Name | Changes |
|-----------|---------|
| kb_add | Now creates audit log entry after successful add |
| kb_update | Now creates audit log entry with before/after snapshots |
| kb_delete | Now creates audit log entry with deleted entry snapshot |

## Dependencies Added

None. Uses existing dependencies:
- drizzle-orm (existing)
- @repo/logger (existing)
- zod (existing)

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| AUDIT_ENABLED | true | Enable/disable audit logging |
| AUDIT_RETENTION_DAYS | 90 | Days to retain audit logs |
| AUDIT_SOFT_FAIL | true | Continue on audit write failure |
