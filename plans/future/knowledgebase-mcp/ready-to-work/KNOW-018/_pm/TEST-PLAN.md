# Test Plan: KNOW-018 — Audit Logging

## Scope Summary

- **Endpoints touched**: None directly (MCP server internal functionality)
- **UI touched**: No
- **Data/storage touched**: Yes
  - New `audit_log` table in PostgreSQL
  - Audit log retention policy infrastructure

## Happy Path Tests

### Test 1: Audit log entry created on kb_add
- **Setup**: Fresh database with audit logging enabled
- **Action**: Call `kb_add` with valid entry data
- **Expected outcome**:
  - Entry created successfully
  - Audit log entry created with:
    - operation: "add"
    - entry_id: new entry's ID
    - timestamp: current time
    - user/context information (if available from MCP context)
- **Evidence**: Query `audit_log` table and verify entry exists with correct fields

### Test 2: Audit log entry created on kb_update
- **Setup**: Existing entry in database
- **Action**: Call `kb_update` to modify the entry
- **Expected outcome**:
  - Entry updated successfully
  - Audit log entry created with:
    - operation: "update"
    - entry_id: updated entry's ID
    - previous_value: JSON snapshot of old state
    - new_value: JSON snapshot of new state
    - timestamp: current time
- **Evidence**: Query `audit_log` table and verify entry with before/after snapshots

### Test 3: Audit log entry created on kb_delete
- **Setup**: Existing entry in database
- **Action**: Call `kb_delete` to remove the entry
- **Expected outcome**:
  - Entry deleted successfully
  - Audit log entry created with:
    - operation: "delete"
    - entry_id: deleted entry's ID
    - previous_value: JSON snapshot of deleted entry
    - timestamp: current time
- **Evidence**: Query `audit_log` table and verify deletion was logged

### Test 4: Query audit logs by entry_id
- **Setup**: Multiple audit log entries for different operations on same entry
- **Action**: Query audit logs filtered by specific entry_id
- **Expected outcome**: All audit events for that entry returned in chronological order
- **Evidence**: Verify returned records match expected operations sequence

### Test 5: Query audit logs by time range
- **Setup**: Audit log entries spanning multiple days
- **Action**: Query audit logs with start_date and end_date parameters
- **Expected outcome**: Only logs within the specified range returned
- **Evidence**: Verify all returned timestamps fall within query range

### Test 6: Retention policy removes old logs
- **Setup**: Audit logs with entries older than retention period (e.g., 90 days)
- **Action**: Run retention policy cleanup job
- **Expected outcome**:
  - Logs older than retention period deleted
  - Recent logs preserved
- **Evidence**: Query `audit_log` table before and after cleanup, verify counts

## Error Cases

### Error 1: Audit logging fails but operation succeeds
- **Setup**: Simulate audit log write failure (e.g., table lock, disk full)
- **Action**: Attempt kb_add operation
- **Expected**:
  - Operation completes successfully (audit is non-blocking)
  - Error logged to application logs
  - Monitoring alert triggered (if configured)
- **Evidence**: Check application logs for audit write failure; verify entry was created

### Error 2: Query audit logs with invalid entry_id
- **Setup**: Database with audit logs
- **Action**: Query with non-existent entry_id
- **Expected**: Empty result set returned (not error)
- **Evidence**: Verify response is empty array/list

### Error 3: Query audit logs with invalid date range
- **Setup**: Database with audit logs
- **Action**: Query with end_date before start_date
- **Expected**: Validation error returned with clear message
- **Evidence**: HTTP 400 or appropriate error code with helpful error message

### Error 4: Retention policy run with invalid configuration
- **Setup**: Invalid retention period configuration (e.g., negative days)
- **Action**: Attempt to run retention cleanup
- **Expected**: Validation error, no logs deleted
- **Evidence**: Verify audit_log row count unchanged

## Edge Cases (Reasonable)

### Edge 1: Concurrent operations on same entry
- **Setup**: Two simultaneous kb_update calls for same entry
- **Action**: Execute concurrent updates
- **Expected**:
  - Both operations complete successfully (or one fails with conflict)
  - Both audit log entries created with correct before/after snapshots
  - Audit log shows clear operation sequence
- **Evidence**: Query audit_log, verify both operations logged with accurate timestamps and values

### Edge 2: Large entry update logged
- **Setup**: Entry with large content field (e.g., 100KB markdown)
- **Action**: Update entry with equally large new content
- **Expected**:
  - Audit log captures full before/after snapshots
  - No truncation or data loss
  - Performance acceptable (< 100ms overhead)
- **Evidence**: Query audit log, verify full content in previous_value and new_value fields

### Edge 3: Bulk operations create many audit entries
- **Setup**: Empty database
- **Action**: Perform bulk kb_add of 1000+ entries
- **Expected**:
  - All entries created successfully
  - 1000+ audit log entries created
  - Performance degradation < 20%
- **Evidence**: Query audit_log count, compare bulk operation time with/without audit logging

### Edge 4: Retention policy with zero logs to delete
- **Setup**: All audit logs within retention period
- **Action**: Run retention cleanup
- **Expected**:
  - Job completes successfully
  - No logs deleted
  - No errors logged
- **Evidence**: Verify audit_log row count unchanged before/after

### Edge 5: Audit log pagination for large result sets
- **Setup**: Entry with 1000+ audit events (many updates)
- **Action**: Query audit logs by entry_id with pagination
- **Expected**:
  - Results paginated correctly
  - No duplicate entries across pages
  - Total count accurate
- **Evidence**: Verify page boundaries, check for duplicates, sum page sizes

### Edge 6: Audit logging at exactly retention boundary
- **Setup**: Audit logs with timestamps exactly at retention cutoff (e.g., exactly 90 days old)
- **Action**: Run retention cleanup
- **Expected**: Boundary behavior well-defined (either kept or deleted consistently)
- **Evidence**: Query for entries at exact boundary timestamp before/after cleanup

## Required Tooling Evidence

### Backend
- **Database queries required**:
  ```sql
  -- Verify audit log entry structure
  SELECT * FROM audit_log WHERE entry_id = '<test_entry_id>';

  -- Check retention cleanup
  SELECT COUNT(*) FROM audit_log WHERE created_at < NOW() - INTERVAL '90 days';

  -- Verify operation types
  SELECT operation, COUNT(*) FROM audit_log GROUP BY operation;
  ```

- **MCP tool calls** (via test harness):
  - `kb_add` with various payloads
  - `kb_update` with modifications
  - `kb_delete` for cleanup
  - New audit query tools: `kb_audit_query`, `kb_audit_by_entry`

- **Assertions required**:
  - HTTP 200 for successful operations
  - Audit log table row counts
  - Audit log JSON field contents (operation, entry_id, timestamps)
  - Retention policy execution logs

### Frontend
- **Not applicable** (backend-only feature)

## Risks to Call Out

### Risk 1: Audit log write failures impact user operations
- **Mitigation**: Ensure audit logging is non-blocking and failures don't fail parent operations
- **Test**: Simulate audit write failures and verify kb_add/update/delete still succeed

### Risk 2: Audit log storage growth unbounded
- **Mitigation**: Retention policy must be robust and automatically scheduled
- **Test**: Verify retention cleanup runs on schedule and deletes expected volume

### Risk 3: Performance degradation from audit logging overhead
- **Mitigation**: Benchmark operations with/without audit logging, set SLO for acceptable overhead
- **Test**: Load test with 1000+ concurrent operations, measure p95/p99 latencies

### Risk 4: Sensitive data exposure in audit logs
- **Mitigation**: Define what fields are logged (avoid PII if not needed), document access controls
- **Test**: Review audit log content policy, verify no unexpected sensitive data logged

### Risk 5: Missing audit events due to transaction rollbacks
- **Mitigation**: Audit logging must be transactional with parent operation
- **Test**: Trigger operation failures after initial processing but before commit, verify no orphaned audit logs

### Risk 6: Audit log schema migration complexity
- **Mitigation**: Design audit_log schema to be extensible (JSONB fields for flexibility)
- **Test**: Not testable in this story, but document migration strategy for future schema changes
