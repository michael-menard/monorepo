---
story_id: KNOW-018
title: "Audit Logging"
status: uat
created_at: "2026-01-25"
updated_at: "2026-01-31"
depends_on: ["KNOW-003"]
blocks: []
epic: "knowledgebase-mcp"
story_prefix: "KNOW"
priority: P1
estimated_complexity: medium
---

# KNOW-018: Audit Logging

## Context

Compliance, debugging, and operational transparency require comprehensive audit trails of all knowledge base modifications. This story implements audit logging to track who changed what and when, along with retention policy infrastructure to manage audit log lifecycle.

This builds on KNOW-003 (Core CRUD Operations) by instrumenting kb_add, kb_update, and kb_delete operations to automatically create audit log entries. The audit trail captures operation type, entry_id, before/after snapshots (for updates/deletes), timestamps, and available user context from the MCP environment.

Audit logs serve multiple purposes:
1. **Compliance**: Meet regulatory requirements for data modification tracking
2. **Debugging**: Trace the history of changes to diagnose issues
3. **Security**: Detect unauthorized or suspicious modifications
4. **Operational insights**: Understand usage patterns and high-value content

The retention policy ensures audit logs don't grow unbounded while preserving recent history for active investigations.

## Goal

Implement production-ready audit logging that:
1. Automatically creates audit log entries for all kb_add, kb_update, and kb_delete operations
2. Captures operation type, entry_id, before/after snapshots, and timestamps
3. Stores audit logs in PostgreSQL with efficient indexes for querying
4. Provides MCP tools to query audit logs by entry_id and time range
5. Implements retention policy to automatically delete logs older than 90 days
6. Handles audit write failures gracefully without blocking main operations
7. Logs all audit operations for monitoring and alerting

## Non-Goals

The following are explicitly **out of scope** for this story:

- **Audit log UI/dashboard** - Deferred to future story (MCP tools only in this story)
- **Audit log export to external systems** - No Splunk, CloudWatch, or S3 integration
- **Cryptographic integrity verification** - No digital signatures or tamper-proof mechanisms
- **Audit logging for read operations** - Only Create, Update, Delete operations are audited (kb_get, kb_list, kb_search not logged)
- **Configurable retention policies** - Fixed 90-day retention in v1 (future story can make configurable)
- **User authentication** - MCP environment may not provide authenticated user context; log available session metadata only
- **Audit log replication/backup** - Standard database backup strategy applies
- **Real-time alerting** - Monitoring setup is separate concern (log structured events for future alerting)

## Scope

### Packages Affected

**New implementation:**
- `apps/api/knowledge-base/src/audit/` (new directory)
  - `audit-logger.ts` - Core audit logging service with public API
  - `retention-policy.ts` - Retention cleanup logic and scheduling
  - `queries.ts` - Audit log database queries (read/write)
  - `__types__/index.ts` - Zod schemas for audit log entries and query inputs
  - `__tests__/` - Vitest test suite

**Modified files:**
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts`
  - Instrument kb_add, kb_update, kb_delete handlers
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts`
  - Add schemas for kb_audit_query, kb_audit_by_entry, kb_audit_retention_cleanup tools

**Database schema:**
- `apps/api/knowledge-base/schema/`
  - `audit_log` table definition and migration script
  - Indexes for efficient querying

**Shared packages (reuse):**
- `@repo/logger` - All logging (NO console.log)
- Docker Compose from KNOW-001 - PostgreSQL database
- Drizzle ORM from KNOW-003 - Type-safe queries

### Endpoints

**MCP Tools Added:**
- `kb_audit_query` - Query audit logs by time range and operation type
- `kb_audit_by_entry` - Get full audit history for specific entry_id
- `kb_audit_retention_cleanup` - Manually trigger retention policy (admin tool)

**MCP Tools Modified:**
- `kb_add` - Adds audit log entry after successful create
- `kb_update` - Adds audit log entry with before/after snapshots
- `kb_delete` - Adds audit log entry with deleted entry snapshot

### Infrastructure

**Database:**
- `audit_log` table in PostgreSQL
  - Columns:
    - `id` (UUID, primary key)
    - `entry_id` (UUID, foreign key to knowledge_entries)
    - `operation` (text: "add", "update", "delete")
    - `previous_value` (JSONB, nullable - for update/delete)
    - `new_value` (JSONB, nullable - for add/update)
    - `timestamp` (timestamptz, default NOW())
    - `user_context` (JSONB, nullable - session metadata)
    - `created_at` (timestamptz)
  - Indexes:
    - Primary key on `id`
    - Index on `entry_id` for fast entry history queries
    - Index on `timestamp` for time range queries and retention cleanup
    - Composite index on `(entry_id, timestamp)` for sorted history retrieval

**Scheduled Jobs:**
- Daily cron job at 02:00 UTC to run retention cleanup
- Initial setup: manual execution via kb_audit_retention_cleanup tool

**Environment variables:**
- `AUDIT_ENABLED` - Enable/disable audit logging (default: true)
- `AUDIT_RETENTION_DAYS` - Retention period in days (default: 90)
- `AUDIT_SOFT_FAIL` - Continue on audit write failure (default: true)

## Acceptance Criteria

### AC1: Audit log entry created on kb_add
**Given** audit logging is enabled
**When** kb_add is called with valid entry data
**Then**:
- Entry created successfully
- Audit log entry created with:
  - operation: "add"
  - entry_id: new entry's ID
  - new_value: JSON snapshot of created entry (id, title, content, tags, metadata)
  - timestamp: current time (UTC)
  - user_context: available session metadata from MCP
- Main operation latency increase < 20ms (p95)

### AC2: Audit log entry created on kb_update
**Given** existing entry in database
**When** kb_update is called to modify the entry
**Then**:
- Entry updated successfully
- Audit log entry created with:
  - operation: "update"
  - entry_id: updated entry's ID
  - previous_value: JSON snapshot of entry before update
  - new_value: JSON snapshot of entry after update
  - timestamp: current time (UTC)
- Both snapshots exclude embedding vectors (too large)

### AC3: Audit log entry created on kb_delete
**Given** existing entry in database
**When** kb_delete is called
**Then**:
- Entry deleted successfully
- Audit log entry created with:
  - operation: "delete"
  - entry_id: deleted entry's ID
  - previous_value: JSON snapshot of deleted entry (id, title, content, tags)
  - new_value: null
  - timestamp: current time (UTC)

### AC4: Audit logging is transactional
**Given** kb_update operation that will fail validation
**When** operation is attempted
**Then**:
- Main operation fails and rolls back
- No audit log entry created (transaction rollback)
- Database remains consistent

### AC5: Audit write failures are non-blocking (soft fail)
**Given** audit_log table is locked or unavailable
**When** kb_add is called
**Then**:
- Main operation succeeds
- Error logged to application logs: "Audit log write failed: [reason]"
- Monitoring metric emitted (audit_write_failure counter)
- User receives successful response

### AC6: Query audit logs by entry_id
**Given** multiple audit log entries for entry "abc-123"
**When** kb_audit_by_entry is called with entry_id="abc-123"
**Then**:
- All audit events for that entry returned
- Results sorted by timestamp (oldest first)
- Each result includes: operation, previous_value, new_value, timestamp, user_context
- Pagination supported (limit/offset parameters)

### AC7: Query audit logs by time range
**Given** audit logs spanning 6 months
**When** kb_audit_query is called with start_date="2026-01-01" and end_date="2026-01-31"
**Then**:
- Only logs within January 2026 returned
- All timestamps in result set fall within query range (inclusive)
- Results sorted by timestamp (newest first for query, oldest first for by_entry)
- Pagination supported (default limit 100, max limit 1000)

### AC8: Filter audit logs by operation type
**Given** mixed audit log entries (add, update, delete)
**When** kb_audit_query is called with operation="update"
**Then**:
- Only update operations returned
- Results match operation filter exactly

### AC9: Retention policy deletes old logs
**Given** audit logs with entries older than 90 days
**When** kb_audit_retention_cleanup is executed
**Then**:
- Logs with timestamp < (NOW() - 90 days) deleted
- Recent logs (within 90 days) preserved
- Deletion count logged: "Deleted N audit log entries older than 90 days"
- Operation completes in < 30 seconds for 1M+ log entries

### AC10: Retention cleanup uses batch deletion
**Given** 500,000 old audit log entries to delete
**When** retention cleanup runs
**Then**:
- Deletion happens in batches of 10,000 rows
- No table locks held longer than 5 seconds
- Progress logged every batch: "Deleted batch 1/50 (10000 entries)"
- Graceful handling of interruption (resume on next run)

### AC11: Audit logging can be disabled
**Given** AUDIT_ENABLED=false in environment
**When** any CRUD operation is executed
**Then**:
- Main operation succeeds normally
- No audit log entries created
- No audit-related errors or warnings logged

### AC12: Boundary behavior for retention policy
**Given** audit log entry with timestamp exactly 90 days ago
**When** retention cleanup runs
**Then**:
- Entry is deleted (>= retention days triggers cleanup)
- Boundary behavior is consistent and documented

### AC13: Concurrent operations logged correctly
**Given** two simultaneous kb_update calls for different entries
**When** operations execute concurrently
**Then**:
- Both audit log entries created successfully
- No deadlocks or race conditions
- Timestamps accurately reflect execution order (within millisecond precision)

### AC14: Large entry updates logged efficiently
**Given** entry with 100KB content field
**When** kb_update modifies the large content
**Then**:
- Audit log captures full before/after snapshots
- No truncation or data loss
- Audit write completes in < 100ms

### AC15: Invalid query parameters rejected
**Given** kb_audit_query request with end_date before start_date
**When** query is executed
**Then**:
- Validation error returned
- Error message: "end_date must be after start_date"
- No database query executed

## Reuse Plan

### Reusing from Existing Packages

**1. Drizzle ORM (KNOW-001, KNOW-003)**
- Location: `apps/api/knowledge-base/src/db`
- Usage: Type-safe queries for audit_log table (insert, select, delete)
- Benefits: Type inference, SQL builder, transaction support

**2. @repo/logger**
- Location: `packages/core/logger`
- Usage: All logging (audit operations, errors, retention cleanup progress)
- Benefits: Structured logging, consistent format, filtering by level

**3. Zod**
- Already used in KNOW-002, KNOW-003
- Usage: Input validation schemas for audit query parameters
- Benefits: Type safety, automatic validation, clear error messages

**4. Transaction Pattern from KNOW-003**
- KNOW-003 demonstrates database transaction usage
- Reuse same pattern: audit log write within same transaction as main operation
- Ensures atomicity: both succeed or both rollback

### Reusing Patterns

**Soft Fail Pattern:**
- Similar to KNOW-002's cache failure handling
- Audit write failures logged but don't fail main operation
- Monitoring metrics for observability

**Input Validation Pattern:**
- KNOW-003 uses Zod schemas for CRUD operation inputs
- Reuse same pattern for AuditQueryInputSchema, AuditByEntryInputSchema
- Consistent error handling across all operations

**Batch Processing Pattern:**
- KNOW-002 demonstrates batch API requests
- Apply to retention policy: delete in batches to avoid long table locks
- Progress logging for long-running operations

### No New Shared Packages Required

All dependencies satisfied by existing packages. No new shared packages needed.

## Architecture Notes

### Ports & Adapters

**Port (Interface):**
```typescript
// audit/types.ts
export interface AuditLogPort {
  logOperation(
    operation: 'add' | 'update' | 'delete',
    entryId: string,
    previousValue: Record<string, unknown> | null,
    newValue: Record<string, unknown> | null,
    userContext?: Record<string, unknown>
  ): Promise<void>

  queryByEntry(entryId: string, options?: PaginationOptions): Promise<AuditLogEntry[]>
  queryByTimeRange(startDate: Date, endDate: Date, options?: QueryOptions): Promise<AuditLogEntry[]>
  runRetentionCleanup(retentionDays: number): Promise<number>
}
```

**Adapter (Implementation):**
```typescript
// audit/audit-logger.ts
import { AuditLogPort } from './types'
import { db } from '../db/client'
import { logger } from '@repo/logger'

export class PostgresAuditLogger implements AuditLogPort {
  constructor(private dbClient: DrizzleClient) {}

  async logOperation(
    operation: 'add' | 'update' | 'delete',
    entryId: string,
    previousValue: Record<string, unknown> | null,
    newValue: Record<string, unknown> | null,
    userContext?: Record<string, unknown>
  ): Promise<void> {
    const input = AuditLogEntrySchema.parse({
      id: crypto.randomUUID(),
      entry_id: entryId,
      operation,
      previous_value: previousValue,
      new_value: newValue,
      timestamp: new Date(),
      user_context: userContext ?? {},
      created_at: new Date()
    })

    try {
      await this.dbClient.insert(auditLogTable).values(input)
      logger.info('Audit log entry created', { operation, entryId })
    } catch (error) {
      if (process.env.AUDIT_SOFT_FAIL === 'true') {
        logger.error('Audit log write failed (soft fail enabled)', { error, operation, entryId })
        // Emit monitoring metric: audit_write_failure++
      } else {
        throw error // Hard fail: rollback transaction
      }
    }
  }

  async queryByEntry(entryId: string, options?: PaginationOptions): Promise<AuditLogEntry[]> {
    const validated = PaginationOptionsSchema.parse(options ?? {})

    return this.dbClient
      .select()
      .from(auditLogTable)
      .where(eq(auditLogTable.entry_id, entryId))
      .orderBy(asc(auditLogTable.timestamp))
      .limit(validated.limit ?? 100)
      .offset(validated.offset ?? 0)
  }

  async runRetentionCleanup(retentionDays: number): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    let totalDeleted = 0
    const batchSize = 10000

    while (true) {
      const deleted = await this.dbClient
        .delete(auditLogTable)
        .where(lt(auditLogTable.timestamp, cutoffDate))
        .limit(batchSize)
        .returning({ id: auditLogTable.id })

      totalDeleted += deleted.length
      logger.info(`Deleted audit log batch`, { count: deleted.length, totalDeleted })

      if (deleted.length < batchSize) break // No more to delete
    }

    logger.info(`Retention cleanup completed`, { totalDeleted, retentionDays, cutoffDate })
    return totalDeleted
  }
}
```

**Integration with CRUD Handlers:**
```typescript
// mcp-server/tool-handlers.ts
import { auditLogger } from '../audit/audit-logger'

export async function handleKbAdd(input: KbAddInput): Promise<KbAddOutput> {
  const validatedInput = KbAddInputSchema.parse(input)

  // Main operation
  const newEntry = await db.transaction(async (tx) => {
    const entry = await tx.insert(knowledgeEntries).values(validatedInput).returning()

    // Audit logging within same transaction
    await auditLogger.logOperation(
      'add',
      entry.id,
      null, // no previous value for add
      entry, // new entry snapshot
      extractUserContext() // from MCP session if available
    )

    return entry
  })

  return { success: true, entry: newEntry }
}
```

### Key Architectural Decisions

1. **Transactional Integrity**: Audit log writes happen within the same database transaction as the main operation. This ensures either both succeed or both rollback.

2. **Soft Fail by Default**: Audit write failures don't block main operations (configurable via AUDIT_SOFT_FAIL). This prioritizes availability over audit completeness.

3. **Snapshot Storage**: Full entry snapshots stored as JSONB for flexibility. Embedding vectors excluded to reduce storage (can be regenerated if needed).

4. **Batch Deletion**: Retention cleanup uses batched deletes (10k rows at a time) to avoid long table locks and enable progress logging.

5. **Append-Only Table**: audit_log table has no UPDATE operations (except retention DELETE). This prevents tampering with audit history.

## Infrastructure Notes

**Minimal new infrastructure required.**

Database infrastructure from KNOW-001:
- PostgreSQL database
- Docker Compose for local development
- Drizzle ORM setup

**New database objects:**
```sql
-- apps/api/knowledge-base/schema/migrations/XXX_add_audit_log.sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  operation TEXT NOT NULL CHECK (operation IN ('add', 'update', 'delete')),
  previous_value JSONB,
  new_value JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_entry_id ON audit_log(entry_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_log_entry_timestamp ON audit_log(entry_id, timestamp);
```

**Scheduled job setup:**
- Cron job to run retention cleanup daily at 02:00 UTC
- Initial setup: environment-specific (local dev may skip, production requires cron configuration)
- Fallback: manual execution via kb_audit_retention_cleanup MCP tool

**Configuration:**
```bash
# .env additions
AUDIT_ENABLED=true                # Enable audit logging
AUDIT_RETENTION_DAYS=90           # Retention period (days)
AUDIT_SOFT_FAIL=true              # Continue on audit write failure
```

## HTTP Contract Plan

**Not applicable.** This story implements MCP tools, not HTTP endpoints. The MCP tool contracts are:

**kb_audit_by_entry:**
```json
{
  "name": "kb_audit_by_entry",
  "description": "Get full audit history for a specific knowledge base entry",
  "inputSchema": {
    "type": "object",
    "properties": {
      "entry_id": {
        "type": "string",
        "format": "uuid",
        "description": "Entry ID to query audit logs for"
      },
      "limit": {
        "type": "number",
        "description": "Max results to return (default 100, max 1000)",
        "default": 100
      },
      "offset": {
        "type": "number",
        "description": "Number of results to skip for pagination",
        "default": 0
      }
    },
    "required": ["entry_id"]
  }
}
```

**kb_audit_query:**
```json
{
  "name": "kb_audit_query",
  "description": "Query audit logs by time range and filters",
  "inputSchema": {
    "type": "object",
    "properties": {
      "start_date": {
        "type": "string",
        "format": "date-time",
        "description": "Start of time range (ISO 8601)"
      },
      "end_date": {
        "type": "string",
        "format": "date-time",
        "description": "End of time range (ISO 8601)"
      },
      "operation": {
        "type": "string",
        "enum": ["add", "update", "delete"],
        "description": "Filter by operation type (optional)"
      },
      "limit": {
        "type": "number",
        "description": "Max results to return (default 100, max 1000)",
        "default": 100
      },
      "offset": {
        "type": "number",
        "description": "Number of results to skip for pagination",
        "default": 0
      }
    },
    "required": ["start_date", "end_date"]
  }
}
```

**kb_audit_retention_cleanup:**
```json
{
  "name": "kb_audit_retention_cleanup",
  "description": "Manually trigger audit log retention policy cleanup (admin tool)",
  "inputSchema": {
    "type": "object",
    "properties": {
      "retention_days": {
        "type": "number",
        "description": "Delete logs older than this many days (default 90)",
        "default": 90,
        "minimum": 1
      },
      "dry_run": {
        "type": "boolean",
        "description": "If true, report count without deleting",
        "default": false
      }
    },
    "required": []
  }
}
```

## Seed Requirements

**Not applicable.** Audit logs are generated by user operations, not seeded. Test data for unit/integration tests is created via:

1. Execute CRUD operations to generate audit entries
2. Manually insert audit_log rows with specific timestamps for retention testing
3. No seed script needed for production data

## Test Plan

### Scope Summary

**Endpoints touched:** MCP tools (kb_add, kb_update, kb_delete modified; kb_audit_query, kb_audit_by_entry, kb_audit_retention_cleanup added)
**UI touched:** No
**Data/storage touched:** Yes (audit_log table, knowledge_entries table)

### Happy Path Tests

**Test 1: Audit log entry created on kb_add**
- **Setup**: Fresh database with audit logging enabled
- **Action**: Call `kb_add` with valid entry data
- **Expected outcome**:
  - Entry created successfully
  - Audit log entry created with operation="add", new_value snapshot
- **Evidence**: Query `audit_log` table and verify entry exists with correct fields

**Test 2: Audit log entry created on kb_update**
- **Setup**: Existing entry in database
- **Action**: Call `kb_update` to modify the entry
- **Expected outcome**:
  - Entry updated successfully
  - Audit log entry created with operation="update", previous_value and new_value snapshots
- **Evidence**: Query `audit_log` table and verify entry with before/after snapshots

**Test 3: Audit log entry created on kb_delete**
- **Setup**: Existing entry in database
- **Action**: Call `kb_delete` to remove the entry
- **Expected outcome**:
  - Entry deleted successfully
  - Audit log entry created with operation="delete", previous_value snapshot
- **Evidence**: Query `audit_log` table and verify deletion was logged

**Test 4: Query audit logs by entry_id**
- **Setup**: Multiple audit log entries for different operations on same entry
- **Action**: Call `kb_audit_by_entry` with specific entry_id
- **Expected outcome**: All audit events for that entry returned in chronological order
- **Evidence**: Verify returned records match expected operations sequence

**Test 5: Query audit logs by time range**
- **Setup**: Audit log entries spanning multiple days
- **Action**: Call `kb_audit_query` with start_date and end_date parameters
- **Expected outcome**: Only logs within the specified range returned
- **Evidence**: Verify all returned timestamps fall within query range

**Test 6: Retention policy removes old logs**
- **Setup**: Audit logs with entries older than retention period (e.g., 90 days)
- **Action**: Call `kb_audit_retention_cleanup`
- **Expected outcome**:
  - Logs older than retention period deleted
  - Recent logs preserved
- **Evidence**: Query `audit_log` table before and after cleanup, verify counts

### Error Cases

**Test 7: Audit logging fails but operation succeeds (soft fail)**
- **Setup**: Simulate audit log write failure (e.g., table lock)
- **Action**: Attempt kb_add operation
- **Expected outcome**:
  - Operation completes successfully (audit is non-blocking)
  - Error logged to application logs
- **Evidence**: Check application logs for audit write failure; verify entry was created

**Test 8: Transaction rollback prevents audit log entry**
- **Setup**: kb_update operation that will fail validation after initial processing
- **Action**: Attempt invalid update
- **Expected outcome**:
  - Main operation fails and rolls back
  - No audit log entry created
- **Evidence**: Query audit_log and knowledge_entries tables, verify both unchanged

**Test 9: Query audit logs with invalid entry_id**
- **Setup**: Database with audit logs
- **Action**: Call kb_audit_by_entry with non-existent entry_id
- **Expected outcome**: Empty result set returned (not error)
- **Evidence**: Verify response is empty array

**Test 10: Query audit logs with invalid date range**
- **Setup**: Database with audit logs
- **Action**: Call kb_audit_query with end_date before start_date
- **Expected outcome**: Validation error returned with clear message
- **Evidence**: Verify error message and no database query executed

**Test 11: Retention policy with invalid configuration**
- **Setup**: Invalid retention period configuration (e.g., negative days)
- **Action**: Attempt to run retention cleanup
- **Expected outcome**: Validation error, no logs deleted
- **Evidence**: Verify audit_log row count unchanged

### Edge Cases

**Test 12: Concurrent operations on same entry**
- **Setup**: Two simultaneous kb_update calls for same entry
- **Action**: Execute concurrent updates
- **Expected outcome**:
  - Both audit log entries created with correct before/after snapshots
  - Audit log shows clear operation sequence
- **Evidence**: Query audit_log, verify both operations logged with accurate timestamps and values

**Test 13: Large entry update logged**
- **Setup**: Entry with large content field (e.g., 100KB markdown)
- **Action**: Update entry with equally large new content
- **Expected outcome**:
  - Audit log captures full before/after snapshots
  - No truncation or data loss
  - Performance acceptable (< 100ms overhead)
- **Evidence**: Query audit log, verify full content in previous_value and new_value fields

**Test 14: Bulk operations create many audit entries**
- **Setup**: Empty database
- **Action**: Perform bulk kb_add of 1000+ entries
- **Expected outcome**:
  - All entries created successfully
  - 1000+ audit log entries created
  - Performance degradation < 20%
- **Evidence**: Query audit_log count, compare bulk operation time with/without audit logging

**Test 15: Retention policy with zero logs to delete**
- **Setup**: All audit logs within retention period
- **Action**: Run retention cleanup
- **Expected outcome**:
  - Job completes successfully
  - No logs deleted
  - No errors logged
- **Evidence**: Verify audit_log row count unchanged before/after

**Test 16: Audit log pagination for large result sets**
- **Setup**: Entry with 1000+ audit events (many updates)
- **Action**: Query audit logs by entry_id with pagination
- **Expected outcome**:
  - Results paginated correctly
  - No duplicate entries across pages
  - Total count accurate
- **Evidence**: Verify page boundaries, check for duplicates, sum page sizes

**Test 17: Audit logging at exactly retention boundary**
- **Setup**: Audit logs with timestamps exactly at retention cutoff (e.g., exactly 90 days old)
- **Action**: Run retention cleanup
- **Expected outcome**: Boundary behavior well-defined (entry deleted as >= 90 days triggers cleanup)
- **Evidence**: Query for entries at exact boundary timestamp before/after cleanup

**Test 18: Audit logging disabled**
- **Setup**: Set AUDIT_ENABLED=false
- **Action**: Execute kb_add, kb_update, kb_delete operations
- **Expected outcome**:
  - All operations succeed normally
  - No audit log entries created
- **Evidence**: Query audit_log table, verify count is zero

### Required Tooling Evidence

**Backend:**
- **Database queries required**:
  ```sql
  -- Verify audit log entry structure
  SELECT * FROM audit_log WHERE entry_id = '<test_entry_id>';

  -- Check retention cleanup
  SELECT COUNT(*) FROM audit_log WHERE timestamp < NOW() - INTERVAL '90 days';

  -- Verify operation types
  SELECT operation, COUNT(*) FROM audit_log GROUP BY operation;
  ```

- **MCP tool calls** (via test harness):
  - `kb_add` with various payloads
  - `kb_update` with modifications
  - `kb_delete` for cleanup
  - `kb_audit_query` with filters
  - `kb_audit_by_entry` with entry_id
  - `kb_audit_retention_cleanup` with dry_run and actual execution

- **Assertions required**:
  - Audit log table row counts
  - Audit log JSON field contents (operation, entry_id, timestamps, snapshots)
  - Retention policy execution logs
  - Performance metrics (latency impact)

**Frontend:**
- **Not applicable** (backend-only feature)

### Risks to Call Out

**Risk 1: Audit log write failures impact user operations**
- **Mitigation**: Ensure audit logging is non-blocking (soft fail by default) and failures don't fail parent operations
- **Test**: Simulate audit write failures and verify kb_add/update/delete still succeed

**Risk 2: Audit log storage growth unbounded**
- **Mitigation**: Retention policy must be robust and automatically scheduled
- **Test**: Verify retention cleanup runs on schedule and deletes expected volume

**Risk 3: Performance degradation from audit logging overhead**
- **Mitigation**: Benchmark operations with/without audit logging, set SLO for acceptable overhead (< 20ms p95)
- **Test**: Load test with 1000+ concurrent operations, measure p95/p99 latencies

**Risk 4: Sensitive data exposure in audit logs**
- **Mitigation**: Define what fields are logged (exclude embeddings, keep metadata), document access controls
- **Test**: Review audit log content policy, verify no unexpected sensitive data logged

**Risk 5: Missing audit events due to transaction rollbacks**
- **Mitigation**: Audit logging must be transactional with parent operation
- **Test**: Trigger operation failures after initial processing but before commit, verify no orphaned audit logs

**Risk 6: Audit log schema migration complexity**
- **Mitigation**: Design audit_log schema to be extensible (JSONB fields for flexibility)
- **Test**: Not testable in this story, but document migration strategy for future schema changes

## UI/UX Notes

**SKIPPED** - This story does not touch UI.

This story implements backend audit logging infrastructure with MCP tool access only. No user-facing UI components required.

Future stories that display audit logs in a web interface should reference:
- Design system components: `Table` or `DataTable` from `_primitives`
- Timestamp formatting utilities
- Pagination controls
- Filter/search UI patterns

## Definition of Done

- [ ] All acceptance criteria (AC1-AC15) passing
- [ ] Vitest test suite with >80% code coverage
- [ ] All tests passing in CI
- [ ] Database migration script created and tested
- [ ] audit_log table created with proper indexes
- [ ] kb_add, kb_update, kb_delete handlers instrumented with audit logging
- [ ] kb_audit_query, kb_audit_by_entry, kb_audit_retention_cleanup MCP tools implemented
- [ ] Retention policy cleanup logic implemented with batch deletion
- [ ] Environment variables documented in README
- [ ] @repo/logger used for all logging (no console.log)
- [ ] Zod schemas for all types (no TypeScript interfaces)
- [ ] Soft fail behavior tested and documented
- [ ] Performance benchmarks met (< 20ms p95 overhead for CRUD operations)
- [ ] Proof document (PROOF-KNOW-018.md) created with evidence
- [ ] Cron job setup documented (not required for local dev)

## Token Budget

**Estimated tokens for KNOW-018:**

| Phase | Estimated Tokens |
|-------|------------------|
| PM Story Generation | 35,000 |
| Elaboration | 50,000 |
| Implementation | 150,000 |
| QA Verification | 40,000 |
| **Total** | **275,000** |

## Agent Log

| Timestamp | Agent | Action | Notes |
|-----------|-------|--------|-------|
| 2026-01-25 | pm-story-generation-leader | Story generated | Synthesized from index entry and worker artifacts (TEST-PLAN.md, DEV-FEASIBILITY.md, UIUX-NOTES.md) |
| 2026-01-25 | elab-completion-leader | Elaboration complete | CONDITIONAL PASS. Approved for implementation after addressing 3 medium-severity issues during dev (transaction pattern, foreign key cascade, user context extraction). 1 gap marked as AC (dry-run). |

## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on 2026-01-25_

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | No audit log access control | out-of-scope | Audit logs may contain sensitive information but role-based access control is deferred to KNOW-039. |
| 2 | No audit log count/stats query | out-of-scope | Operators need capacity planning tools but these are not required for v1. |
| 3 | Retention policy scheduling not implemented | out-of-scope | Cron job documented; local dev may skip; production scheduler environment-specific. |
| 4 | No dry-run for retention cleanup | add-as-ac | kb_audit_retention_cleanup supports `dry_run` parameter in schema. Added as AC16. |
| 5 | Query performance at scale undefined | out-of-scope | AC9 performance target documented; verification deferred to implementation. |
| 6 | No correlation ID propagation | out-of-scope | KNOW-0052 adds correlation IDs; integration deferred. |
| 7 | Snapshot diff not provided | out-of-scope | Audit logs store before/after; diff computation deferred. |
| 8 | No pagination total count | out-of-scope | Pagination supported; total count enhancement deferred. |
| 9 | Audit log export not supported | out-of-scope | Non-goal per story; export deferred to future story. |
| 10 | No entry title/summary in audit logs | out-of-scope | Enhancement to denormalize entry title deferred. |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Add audit log search by user/session | out-of-scope | Compliance search deferred to future story after user_context schema finalized. |
| 2 | Audit log streaming/webhooks | out-of-scope | Real-time monitoring via webhooks deferred to future story. |
| 3 | Audit log rollup/aggregation | out-of-scope | Archival strategy deferred to future story. |
| 4 | Configurable retention per operation type | out-of-scope | Fine-grained retention deferred to future story. |
| 5 | Audit log visualization timeline | out-of-scope | UI/UX deferred to separate story. |
| 6 | Snapshot compression | out-of-scope | Storage optimization deferred to future story. |
| 7 | Entry resurrection from audit logs | out-of-scope | Power user feature deferred to future story. |
| 8 | Audit log integrity verification | out-of-scope | Tamper detection deferred to high-security future story. |
| 9 | Batch audit operations | out-of-scope | Bulk optimization deferred to when KNOW-006 implemented. |
| 10 | Audit log retention policy notifications | out-of-scope | Operational alerts deferred to future story. |

### Follow-up Stories Suggested

- [ ] KNOW-039: Access Control - Restrict audit tools to admin roles
- [ ] Future: Audit Log Dashboard UI
- [ ] Future: Bulk Audit Export for compliance
- [ ] Future: User/Session Audit Search
- [ ] Future: Retention Policy Configurability
- [ ] Future: Entry Resurrection from Audit History

### Items Marked Out-of-Scope

- **Audit log access control**: Deferred to KNOW-039
- **Audit log UI/dashboard**: Non-goal; MCP tools only
- **External system integration**: Non-goal; Splunk/CloudWatch deferred
- **Cryptographic integrity**: Non-goal; deferred to high-security story
- **Read operation auditing**: Non-goal; CUD operations only
- **Configurable retention**: Non-goal; fixed 90-day retention
- **User authentication**: Non-goal; logs available MCP metadata
- **Replication/backup**: Standard database backup applies
- **Real-time alerting**: Non-goal; separate monitoring concern
- **Scheduling implementation**: Local dev may skip; production environment-specific
