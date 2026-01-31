# Implementation Plan - KNOW-018: Audit Logging

## Overview

Implement comprehensive audit logging for the knowledge-base MCP server, including:
1. New audit module with logging services
2. Three new MCP tools for querying audit logs
3. Instrumentation of existing CRUD operations
4. Database schema with efficient indexes
5. Retention policy infrastructure

## File Structure

```
apps/api/knowledge-base/src/audit/
  __types__/
    index.ts              # Zod schemas for audit types
  __tests__/
    audit-logger.test.ts  # Unit tests for audit logger
    queries.test.ts       # Unit tests for query functions
    retention.test.ts     # Unit tests for retention cleanup
  audit-logger.ts         # Core AuditLogger class
  queries.ts              # Query functions for audit logs
  retention-policy.ts     # Retention cleanup logic
  index.ts                # Module exports
```

## Implementation Steps

### Step 1: Create Zod Schemas (audit/__types__/index.ts)

Define schemas for:
- `AuditOperationSchema` - 'add' | 'update' | 'delete'
- `AuditLogEntrySchema` - Full audit log entry structure
- `AuditQueryInputSchema` - Parameters for kb_audit_query
- `AuditByEntryInputSchema` - Parameters for kb_audit_by_entry
- `AuditRetentionInputSchema` - Parameters for kb_audit_retention_cleanup
- `PaginationOptionsSchema` - Limit/offset pagination

### Step 2: Create Database Schema (db/schema.ts modification)

Add `auditLog` table with:
- `id` (UUID, primary key)
- `entry_id` (UUID, nullable - SET NULL on delete to preserve history)
- `operation` ('add' | 'update' | 'delete')
- `previous_value` (JSONB, nullable)
- `new_value` (JSONB, nullable)
- `timestamp` (timestamptz)
- `user_context` (JSONB, nullable)
- `created_at` (timestamptz)

Indexes:
- Primary key on `id`
- Index on `entry_id`
- Index on `timestamp`
- Composite index on `(entry_id, timestamp)`

### Step 3: Implement Audit Logger (audit/audit-logger.ts)

Core class with:
- `logOperation()` - Create audit log entry
- `createSnapshot()` - Create entry snapshot (exclude embedding)
- `extractUserContext()` - Extract MCP session metadata
- Soft fail support (AUDIT_SOFT_FAIL env var)
- Environment variable checking (AUDIT_ENABLED)

### Step 4: Implement Query Functions (audit/queries.ts)

Functions:
- `queryByEntry()` - Get audit history for specific entry
- `queryByTimeRange()` - Get audit logs by date range with filters
- Both support pagination (limit/offset)

### Step 5: Implement Retention Policy (audit/retention-policy.ts)

Functions:
- `runRetentionCleanup()` - Delete logs older than retention period
- Batch deletion (10k rows at a time)
- Progress logging
- Dry-run support

### Step 6: Add MCP Tool Schemas (mcp-server/tool-schemas.ts)

Add schemas for:
- `kb_audit_query`
- `kb_audit_by_entry`
- `kb_audit_retention_cleanup`

### Step 7: Add Tool Handlers (mcp-server/tool-handlers.ts)

Add handlers:
- `handleKbAuditQuery()`
- `handleKbAuditByEntry()`
- `handleKbAuditRetentionCleanup()`

### Step 8: Instrument CRUD Operations

Modify handlers in tool-handlers.ts:
- `handleKbAdd()` - Add audit logging after successful create
- `handleKbUpdate()` - Add audit logging with before/after snapshots
- `handleKbDelete()` - Add audit logging with deleted entry snapshot

### Step 9: Create Tests

Test files:
- `audit/__tests__/audit-logger.test.ts`
- `audit/__tests__/queries.test.ts`
- `audit/__tests__/retention.test.ts`

Test coverage for:
- All happy paths (AC1-AC3, AC6-AC9)
- Transactional integrity (AC4)
- Soft fail behavior (AC5)
- Batch deletion (AC10)
- Disabled logging (AC11)
- Boundary behavior (AC12)
- Concurrent operations (AC13)
- Large entries (AC14)
- Validation errors (AC15)

## Key Design Decisions

### 1. Transaction Strategy
- Audit logging happens AFTER successful CRUD operation
- If audit write fails with AUDIT_SOFT_FAIL=true, log error but don't fail main operation
- If AUDIT_SOFT_FAIL=false, throw error (operation already succeeded, but audit write is critical)

### 2. Foreign Key Strategy
- Use `ON DELETE SET NULL` for entry_id reference
- Preserves audit history even after entry deletion
- entry_id becomes NULL for deleted entries (audit log still shows the operation)

### 3. Snapshot Strategy
- Exclude `embedding` field from snapshots (too large, ~6KB per entry)
- Include: id, content, role, tags, createdAt, updatedAt, metadata
- Store as JSONB for flexibility

### 4. User Context Extraction
- Extract from tool call context if available
- Include: correlation_id, client info, session metadata
- Store as JSONB for flexibility

### 5. Performance Targets
- Audit write overhead: < 20ms p95
- Retention cleanup: < 30s for 1M+ entries (batch processing)
- Query performance: Use indexes for efficient filtering

## Dependencies

- @repo/logger (logging)
- drizzle-orm (database operations)
- zod (schema validation)
- Existing KNOW-003 CRUD operations

## Environment Variables

```bash
AUDIT_ENABLED=true              # Enable/disable audit logging
AUDIT_RETENTION_DAYS=90         # Retention period in days
AUDIT_SOFT_FAIL=true            # Continue on audit write failure
```

## Estimated Token Usage

| Phase | Estimated Tokens |
|-------|------------------|
| Types | 3,000 |
| Schema | 2,000 |
| Logger | 5,000 |
| Queries | 4,000 |
| Retention | 3,000 |
| Tool Schemas | 3,000 |
| Tool Handlers | 8,000 |
| CRUD Instrumentation | 5,000 |
| Tests | 15,000 |
| **Total** | **48,000** |
