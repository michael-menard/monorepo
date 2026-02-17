# Future Opportunities - LNGG-0060

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No checkpoint rotation/cleanup logic | Low - Only becomes issue after 500+ checkpoints accumulate | Medium | Future story: "Checkpoint Archival & Cleanup" - Add adapter methods for archiving/deleting old checkpoints based on age or completion status. |
| 2 | No concurrent access locking | Low - Workflow-level locking already handled by idempotency.ts | Medium | Document that file-level locking is NOT provided by adapter (out of scope per Non-Goals). Consumers must handle concurrency via workflow-level phase locking. |
| 3 | No validation of phase state transitions | Low - Resume logic may allow invalid jumps (e.g., setup → proof) | Low | Future enhancement: Add `validatePhaseTransition(current, next)` helper that enforces valid state machine transitions (setup→plan→execute→proof→review→fix→qa-verify→done). |
| 4 | Missing resume_hints schema validation | Low - Partial_state field is z.record(z.unknown()), allows any data | Low | Future: Define strict schema for common resume_hints patterns (e.g., skip_phases array, retry counts). Currently accepts arbitrary JSON. |
| 5 | No checkpoint diff/history tracking | Low - Cannot see what changed between updates | High | Future story: "Checkpoint History Tracking" - Add optional versioning to capture checkpoint state evolution over time. Useful for debugging workflow failures. |
| 6 | No metrics/observability hooks | Low - Cannot track checkpoint read/write performance or failure rates | Medium | Future: Add optional telemetry callbacks for monitoring adapter operations (read latency, write failures, validation errors). Integrate with TELE epic. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Batch write operation missing | Medium - Dashboard/bulk updates require serial writes | Low | Add `writeBatch(updates: Array<{filePath, checkpoint}>): Promise<BatchWriteResult>` for parallel atomic writes. Useful for batch checkpoint updates. |
| 2 | Schema migration helper | Medium - When CheckpointSchema v2 arrives, need migration path | Medium | Add `migrateCheckpoint(v1Checkpoint): v2Checkpoint` helper function. Enables gradual migration of 100+ existing files when schema evolves. |
| 3 | Validation-only mode | Low - Cannot validate checkpoints without reading full file | Low | Add `validate(filePath): Promise<ValidationResult>` method that checks schema compliance without parsing content field. Useful for CI/pre-commit hooks. |
| 4 | Partial update with validation bypass | Low - update() always validates merged result, blocks intentional schema violations during migration | Low | Add optional `{ skipValidation: true }` flag to update() for migration scenarios where temporary schema violations are acceptable. |
| 5 | JSON export/import | Medium - No way to convert checkpoint to/from JSON for API exposure | Low | Add `toJSON(checkpoint): JSONCheckpoint` and `fromJSON(json): Checkpoint` helpers. Enables REST API endpoints for checkpoint inspection (future WINT stories). |
| 6 | Checkpoint templating | Low - Each new checkpoint created from scratch | Low | Add `createFromTemplate(storyId, featureDir, template: CheckpointTemplate)` factory with common templates (feature, bug-fix, infrastructure). Reduces boilerplate. |
| 7 | Watch mode for checkpoint changes | Medium - Dashboard cannot reactively update on checkpoint writes | High | Add optional `watch(filePath, callback)` method using Node.js fs.watch. Enables real-time dashboard updates. Requires event emitter pattern. |
| 8 | Checkpoint schema inference | Low - No way to detect schema version from file content before parsing | Low | Add `detectSchemaVersion(filePath): Promise<number>` that peeks at schema field without full parse. Enables smart version routing when v2 arrives. |

## Categories

### Edge Cases
- Gap #3: Phase transition validation
- Gap #4: Resume hints schema
- Enhancement #4: Validation bypass for migrations

### UX Polish
- Enhancement #1: Batch write operations
- Enhancement #6: Checkpoint templating
- Enhancement #5: JSON export for APIs

### Performance
- Gap #6: Observability hooks
- Enhancement #7: Watch mode for dashboards

### Observability
- Gap #6: Metrics/telemetry integration
- Enhancement #8: Schema version detection

### Integrations
- Enhancement #5: JSON export for REST APIs (future WINT-9XXX stories)
- Enhancement #7: Watch mode for dashboard (future AUTO-2XXX stories)

### Future-Proofing
- Gap #1: Checkpoint rotation/cleanup (future WINT story after 500+ files)
- Gap #5: History tracking (debugging tool)
- Enhancement #2: Schema migration helpers (for v2 transition)
