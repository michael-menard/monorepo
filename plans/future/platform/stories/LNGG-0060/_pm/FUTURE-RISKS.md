# Future Risks: LNGG-0060 - Checkpoint Adapter

## Non-MVP Risks

### Risk 1: Checkpoint File Growth Over Time

**Impact (if not addressed post-MVP)**: As stories accumulate, 1000+ checkpoint files may cause performance issues for batch operations.

**Recommended Timeline**: After 500+ checkpoints in production (estimated 3-6 months post-MVP)

**Mitigation Options**:
- Implement checkpoint archival for completed stories (move to archive/ directory)
- Add pagination to readBatch operations
- Database-backed checkpoint index for fast lookups

---

### Risk 2: Concurrent Write Conflicts Without Locking

**Impact (if not addressed post-MVP)**: Multiple processes updating same checkpoint simultaneously may lead to lost updates (last-write-wins).

**Recommended Timeline**: If concurrent workflows implemented (future roadmap item)

**Mitigation Options**:
- File-level locking using `lockfile` or `proper-lockfile` npm package
- Optimistic locking with version field (increment on each write)
- Move checkpoint state to database with ACID transactions

---

### Risk 3: No Checkpoint History/Audit Trail

**Impact (if not addressed post-MVP)**: Cannot investigate when/why checkpoint state changed (useful for debugging resume failures).

**Recommended Timeline**: After first resume failure requiring investigation (reactive)

**Mitigation Options**:
- Append-only checkpoint log (CHECKPOINT-HISTORY.yaml)
- Database event log for checkpoint updates
- Git commit checkpoints at each phase transition

---

### Risk 4: Schema Version Migration Path

**Impact (if not addressed post-MVP)**: When CheckpointSchema v2 is needed, no tooling to migrate existing files.

**Recommended Timeline**: Before introducing schema v2 (future breaking change)

**Mitigation Options**:
- Migration script to bulk-update checkpoint files
- Backward-compatible schema with feature flags
- Database-backed checkpoints for easier schema evolution

---

### Risk 5: No Checkpoint Validation CLI

**Impact (if not addressed post-MVP)**: Cannot easily validate all checkpoints in repository for schema compliance.

**Recommended Timeline**: After schema drift detected in production (reactive)

**Mitigation Options**:
- Add `pnpm validate:checkpoints` script to scan all CHECKPOINT.yaml files
- CI job to validate checkpoints on PR
- Pre-commit hook to validate changed checkpoints

---

## Scope Tightening Suggestions

### Out of Scope for LNGG-0060 (Future Stories)

| Feature | Reason | Suggested Story |
|---------|--------|-----------------|
| Checkpoint archival | Not needed until 500+ checkpoints | LNGG-0065: Checkpoint Archival |
| File-level locking | Not needed unless concurrent workflows | LNGG-0070: Concurrent Checkpoint Locking |
| Checkpoint history log | Not needed for MVP happy path | LNGG-0075: Checkpoint Audit Trail |
| Schema v2 migration | No breaking changes planned | LNGG-0080: Checkpoint Schema Migration Tool |
| Database persistence | Already handled by separate nodes | (No story - already covered) |
| GraphQL/REST API | Internal utility only | (No story - not a requirement) |

---

## Future Requirements

### Nice-to-Have Requirements

1. **Checkpoint Diff Utility**: Helper method to compare two checkpoints and return differences
   - Use case: Debugging state changes
   - Complexity: Low (1-2 hours)
   - Suggested API: `adapter.diff(checkpoint1, checkpoint2) => DiffResult`

2. **Checkpoint Summary Stats**: Aggregate stats across all checkpoints (phase distribution, blocked count)
   - Use case: Workflow dashboard metrics
   - Complexity: Medium (4-6 hours)
   - Suggested API: `adapter.getStats(directory) => CheckpointStats`

3. **Checkpoint Watch Mode**: File watcher to detect checkpoint changes for live dashboard
   - Use case: Real-time workflow monitoring
   - Complexity: Medium (4-6 hours)
   - Requires: `chokidar` or `fs.watch` integration

4. **Checkpoint Backup/Restore**: Snapshot checkpoints before risky operations
   - Use case: Rollback failed phase transitions
   - Complexity: Low (2-3 hours)
   - Suggested API: `adapter.backup(filePath) => backupPath`, `adapter.restore(backupPath)`

---

## Polish and Edge Case Handling

### Edge Cases for Future Consideration

1. **Symbolic Link Resolution**: What if checkpoint file is a symlink?
   - Current behavior: Follows symlinks (Node.js default)
   - Future: Document behavior or add explicit symlink handling

2. **Network Filesystem Delays**: What if checkpoint on NFS mount with high latency?
   - Current behavior: Atomic write may be slower, no timeout
   - Future: Add configurable write timeout

3. **Large Resume Hints Object**: What if `resume_hints.partial_state` is >10MB?
   - Current behavior: No size limits, may cause memory issues
   - Future: Add size validation or streaming support

4. **Unicode Characters in Fields**: What if story_id contains emoji or non-ASCII?
   - Current behavior: YAML parser supports UTF-8
   - Future: Document character set restrictions

5. **Checkpoint Permissions**: What if checkpoint file created with restrictive permissions?
   - Current behavior: Uses Node.js defaults (0644)
   - Future: Add configurable file permissions option

---

## Performance Optimizations (Post-MVP)

### Potential Optimizations

1. **Batch Write Operations**: Add `writeBatch()` method for bulk checkpoint updates
   - Estimated improvement: 10x faster for 100+ writes
   - Complexity: Medium (4-6 hours)

2. **In-Memory Caching**: Cache recently-read checkpoints to avoid repeated disk I/O
   - Estimated improvement: 5-10x faster for repeated reads
   - Complexity: Medium (6-8 hours)
   - Requires: Cache invalidation strategy

3. **Async Validation**: Defer Zod validation to worker thread for large batches
   - Estimated improvement: 2-3x faster for readBatch of 1000+ files
   - Complexity: High (8-12 hours)
   - Requires: Worker thread pool

4. **Lazy Field Parsing**: Only parse required fields instead of full checkpoint
   - Estimated improvement: 2x faster for simple queries (e.g., just current_phase)
   - Complexity: Medium (4-6 hours)
   - Breaking change: New API method `readPartial(filePath, fields)`

---

## Monitoring and Observability (Post-MVP)

### Metrics to Track

1. **Read/Write Latency**: P50, P95, P99 latency for adapter operations
2. **Validation Failure Rate**: % of checkpoints failing Zod validation
3. **Batch Operation Size**: Distribution of readBatch array sizes
4. **Error Rate by Type**: CheckpointNotFoundError vs ValidationError vs WriteError
5. **File Size Distribution**: Checkpoint file sizes over time

### Suggested Instrumentation

- Add OpenTelemetry spans to adapter methods
- Log validation errors to structured logger with checkpoint path
- Emit metrics to Prometheus/Grafana (future observability stack)
