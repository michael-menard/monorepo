---
story_id: KNOW-128
title: Migration Rollback Capability
status: backlog
epic: knowledgebase-mcp
created: 2026-01-31
updated: 2026-01-31
depends_on: [KNOW-043]
blocks: []
assignee: null
priority: P3
story_points: 2
tags: [knowledge-base, migration, rollback, resilience, data-integrity]
follow_up_from: KNOW-043
---

# KNOW-128: Migration Rollback Capability

## Follow-up Context

**Parent Story:** KNOW-043 (Lessons Learned Migration)
**Source:** QA Discovery Notes - Follow-up Stories Suggested
**Original Finding:** "Migration Rollback Capability - Implement checkpoint/resume and rollback for failed migrations. If migration fails midway, provide ability to undo partial imports and resume from last checkpoint."
**Category:** Enhancement Opportunity
**Impact:** Medium - Improves operational safety and resilience during migrations
**Effort:** Low-Medium - Leverages existing KB tools and transaction patterns

## Context

KNOW-043 implements one-time migration of LESSONS-LEARNED.md files to the Knowledge Base using `kb_bulk_import`. While the migration script is designed to be idempotent (can re-run without creating duplicates), it lacks mechanisms to handle partial failures gracefully.

If migration fails midway (e.g., network timeout, invalid entry, resource exhaustion), the operator has limited options:
1. **Re-run entire migration**: Works due to idempotency, but inefficient for large migrations
2. **Manually inspect KB**: Time-consuming to determine which entries were imported vs. skipped
3. **Accept partial state**: Risky if failure cause is systemic (e.g., schema mismatch)

This story adds checkpoint/resume and rollback capabilities to make migrations more resilient and operator-friendly.

## Goal

Enhance the migration script from KNOW-043 with:
1. **Checkpoint mechanism**: Track migration progress; resume from last successful checkpoint on retry
2. **Rollback capability**: Undo all imported entries from a failed migration run
3. **Batch transaction support**: Import entries in batches; rollback batch on failure
4. **Detailed failure reporting**: Log which entries succeeded/failed with reasons

## Non-Goals

- **General-purpose rollback**: Only for migration script failures; not a database backup/restore system
- **Automated retry logic**: Operator triggers retry; no automatic retry loops
- **Cross-migration rollback**: Only rollback current migration run; no "undo last 3 migrations" capability
- **Dependency graph analysis**: Simple sequential rollback; no analysis of entry dependencies
- **Point-in-time recovery**: Use KNOW-015 (Disaster Recovery) for comprehensive PITR

## Scope

### Modified Files

- `scripts/migrate-lessons-learned.ts` - Add checkpoint/rollback logic
- `docs/knowledge-base/lessons-learned-migration.md` - Document rollback procedures

### Packages Affected

- `apps/api/knowledge-base` - May need `kb_delete_batch` utility for efficient rollback

## Acceptance Criteria

### AC1: Checkpoint Tracking
- [ ] Migration script maintains checkpoint file (`.migration-checkpoint.json`)
- [ ] Checkpoint file tracks: migration run ID, timestamp, files processed, entries imported
- [ ] Script resumes from last checkpoint when re-run with `--resume` flag
- [ ] Checkpoint file deleted automatically on successful migration completion

### AC2: Rollback Command
- [ ] Script supports `--rollback <run-id>` flag to undo migration run
- [ ] Rollback deletes all entries imported during specified run (tracked via migration run ID tag)
- [ ] Rollback reports count of entries deleted
- [ ] Rollback fails safely if run ID not found or no entries to delete

### AC3: Batch Transaction Support
- [ ] Migration processes entries in configurable batches (default: 50 entries)
- [ ] Batch failure rolls back only that batch; previous batches remain committed
- [ ] Operator can retry failed batch after fixing underlying issue
- [ ] Script logs which batch failed for targeted retry

### AC4: Failure Reporting
- [ ] Migration script logs failed entries with: filename, line number, error reason
- [ ] Failed entries saved to `.migration-failures.json` for operator review
- [ ] Script provides summary report: total entries, succeeded, failed, skipped
- [ ] Operator can generate detailed report with `--report <run-id>` flag

### AC5: Migration Run Metadata
- [ ] Each migration run has unique ID (timestamp-based UUID)
- [ ] All imported entries tagged with `migration-run-id: <id>` for traceability
- [ ] Run metadata stored in KB as special entry (category: `migration-metadata`)
- [ ] Operator can list all migration runs with `--list-runs` flag

### AC6: Documentation
- [ ] Migration guide updated with checkpoint/resume examples
- [ ] Rollback procedure documented with safety checks
- [ ] Troubleshooting section added for common migration failure scenarios
- [ ] Examples of batch retry after fixing data issues

## Architecture Notes

### Checkpoint File Schema

```typescript
const MigrationCheckpointSchema = z.object({
  run_id: z.string().uuid(),
  started_at: z.string().datetime(),
  last_checkpoint_at: z.string().datetime(),
  files_processed: z.array(z.string()),
  entries_imported: z.number(),
  current_file: z.string().optional(),
  current_batch: z.number().optional(),
  status: z.enum(['in-progress', 'completed', 'failed']),
})
```

### Migration Run Metadata Entry

```typescript
// Stored in KB for run tracking
const MigrationRunMetadataSchema = z.object({
  category: z.literal('migration-metadata'),
  content: z.string(), // JSON-serialized run details
  tags: ['migration-run', 'lessons-learned-migration'],
  migration_run_id: z.string().uuid(),
  entries_imported: z.number(),
  files_migrated: z.array(z.string()),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),
  status: z.enum(['completed', 'failed', 'rolled-back']),
})
```

### Rollback Flow

```
Operator runs: pnpm migrate:lessons --rollback <run-id>
                           ↓
    Query KB for entries with tag: migration-run-id:<run-id>
                           ↓
              Batch delete via kb_delete
                           ↓
         Update migration metadata entry (status: rolled-back)
                           ↓
            Report: "Rolled back 127 entries from run <id>"
```

### Batch Processing Flow

```
For each LESSONS-LEARNED.md file:
  For each batch of 50 entries:
    Try:
      Parse batch entries
      Validate entries
      Import batch via kb_bulk_import
      Update checkpoint
    Catch:
      Log batch failure
      Save failed entries to .migration-failures.json
      Continue to next batch (or abort based on --fail-fast flag)
```

## Test Plan

### Happy Path Tests

#### Test 1: Successful Migration with Checkpoints
**Setup:** LESSONS-LEARNED.md files with 200 entries

**Action:** Run migration with batch size 50

**Expected:**
- 4 checkpoints created (one per batch)
- All 200 entries imported
- Checkpoint file deleted on completion
- Migration run metadata entry created

#### Test 2: Resume After Failure
**Setup:** Migration failed on batch 3 of 4

**Action:** Run migration with `--resume` flag

**Expected:**
- Script reads checkpoint file
- Resumes from batch 3
- Completes batches 3 and 4
- Total entries imported: 200 (no duplicates)

#### Test 3: Rollback Migration
**Setup:** Migration completed with 150 entries imported

**Action:** Run migration with `--rollback <run-id>`

**Expected:**
- All 150 entries deleted from KB
- Migration metadata entry updated (status: rolled-back)
- Report confirms 150 entries deleted

### Error Cases

#### Error 1: Rollback Non-Existent Run
**Setup:** No migration run with specified ID

**Action:** Run `--rollback <invalid-id>`

**Expected:** Error message: "Migration run <id> not found"

#### Error 2: Partial Batch Failure
**Setup:** Batch 2 has malformed entry at position 30

**Action:** Run migration

**Expected:**
- Batch 1 succeeds, committed
- Batch 2 fails, rolled back
- Batch 3+ skipped (or processed based on `--continue-on-error` flag)
- Failed entry logged to .migration-failures.json

#### Error 3: Resume Without Checkpoint
**Setup:** No checkpoint file exists

**Action:** Run migration with `--resume` flag

**Expected:** Error message: "No checkpoint file found. Run migration without --resume to start fresh."

### Edge Cases

#### Edge 1: Concurrent Migration Runs
**Setup:** Two operators run migration simultaneously

**Expected:** Second run detects existing checkpoint, aborts with error: "Migration already in progress"

#### Edge 2: Checkpoint File Corruption
**Setup:** Checkpoint file is malformed JSON

**Expected:** Script detects corruption, offers to delete and restart fresh

## Risks / Edge Cases

1. **Checkpoint file loss**: If checkpoint file deleted mid-migration, resume fails; operator must re-run full migration (idempotency ensures correctness)
2. **Rollback cascades**: Deleting entries may affect agents that already queried those lessons; acceptable since rollback is for failed migrations
3. **Large rollback performance**: Deleting 1000+ entries may be slow; batch deletion via `kb_delete_batch` utility improves performance
4. **Partial rollback scenarios**: If rollback itself fails midway, KB may be in inconsistent state; document manual cleanup procedures

## Open Questions

None - story is well-scoped and builds on existing migration infrastructure from KNOW-043.

---

## Related Stories

**Depends on:** KNOW-043 (Lessons Learned Migration) - Provides base migration script to enhance
**Related:** KNOW-015 (Disaster Recovery) - Comprehensive backup/restore for catastrophic failures

---

## Notes

- This story is optional; KNOW-043's idempotent migration is sufficient for MVP
- Prioritize if migrations become frequent or large-scale (e.g., migrating other markdown sources)
- Rollback capability is primarily for operator safety and confidence during migrations
- Consider as template for future bulk import operations beyond lessons learned

---

## Token Budget

| Phase | Input Tokens | Output Tokens | Total |
|-------|--------------|---------------|-------|
| Elaboration | — | — | — |
| Implementation | — | — | — |

(To be filled during execution)
