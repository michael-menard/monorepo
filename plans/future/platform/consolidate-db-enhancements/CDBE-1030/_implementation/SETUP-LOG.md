# CDBE-1030 Setup Log

**Setup Date**: 2026-03-19
**Story ID**: CDBE-1030
**Mode**: implement
**Gen Mode**: false
**Autonomy Level**: conservative

## Setup Actions Completed

### 1. Precondition Checks
- [x] Story status checked: ready-to-work (via story seed analysis)
- [x] Dependency CDBE-1010 verified: COMPLETE (migration 1010 deployed)
- [x] Migration slot 1020 confirmed available
- [x] No prior implementation checkpoint found

### 2. Knowledge Base Analysis
**Query**: Database migration patterns and PostgreSQL trigger patterns for CDBE stories
**Key Findings**:
- Per CDBE-1010 pattern: Use `CREATE OR REPLACE FUNCTION`, `SECURITY INVOKER`, idempotent DDL
- pgtap lesson (23ea4ba2): CDBE-1030 pgtap tests require SAVEPOINT + DO block guards
- Migration files reference: `1010_story_state_history_trigger.sql` (gold standard)

**Identified Constraints** (from STORY-SEED.md):
1. `artifacts.story_artifacts` lacks `superseded_at` column (must ADD COLUMN first)
2. `workflow.plans.status` is PostgreSQL ENUM (plan_status_enum), not text
3. `backlog → deferred` transition must exist in `workflow.valid_transitions` (safety guard)
4. `kbar.artifact_versions` table is DEAD - use `artifacts.story_artifacts.iteration`
5. Trigger 2 performs bulk UPDATE on `workflow.stories` - requires index validation

### 3. Artifact Generation
- [x] CHECKPOINT.yaml: Created (iteration 0, phase: setup)
- [x] SCOPE.yaml: Created (db: true, migrations risk flag set)
- [x] SETUP-LOG.md: This file (documenting setup decisions)

### 4. Story Scope Analysis
**Touches**: Database (migrations) only - no API, no UI, no frontend
**Risk Flags**: 
- migrations: true (two database triggers, one column addition)
- performance: true (requires index on `artifacts.story_artifacts` for Trigger 1)

**Files to Modify**:
- Create: `apps/api/knowledge-base/src/db/migrations/1020_artifact_and_plan_cascade_triggers.sql`
- Create: `apps/api/knowledge-base/src/db/migrations/pgtap/1020_artifact_and_plan_cascade_triggers_test.sql`

## Implementation Constraints (HARD REQUIREMENTS)

### Trigger 1: Artifact Version Supersession
- **Event**: BEFORE INSERT on `artifacts.story_artifacts`
- **Action**: Find most recent non-superseded row for same `(story_id, artifact_type)` and set `superseded_at = NOW()`
- **Side Effect**: UPDATE `workflow.stories.updated_at = NOW()` for the inserted artifact's story
- **Idempotency**: No-op if first insert for this artifact type (UPDATE affects 0 rows)

### Trigger 2: Plan Archival Cascade
- **Event**: AFTER UPDATE on `workflow.plans`
- **Condition**: `NEW.status = 'archived'::plan_status_enum AND OLD.status IS DISTINCT FROM NEW.status`
- **Action**: Bulk UPDATE `workflow.stories.state = 'deferred'` where story_id IN (plan's stories) AND state = 'backlog'
- **Pre-condition Guard**: `backlog → deferred` must exist in `workflow.valid_transitions`
- **Idempotency**: No-op if zero linked backlog stories

### Migration Requirements
- **Column Addition**: `ALTER TABLE artifacts.story_artifacts ADD COLUMN IF NOT EXISTS superseded_at timestamptz`
- **Index Creation**: `CREATE INDEX IF NOT EXISTS idx_story_artifacts_non_superseded ON artifacts.story_artifacts (story_id, artifact_type, created_at DESC) WHERE superseded_at IS NULL`
- **Trigger Idempotency**: Use `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER`
- **Function Idempotency**: Use `CREATE OR REPLACE FUNCTION`
- **Comments**: COMMENT ON all functions, triggers, and new columns citing migration 1020

### pgtap Testing
- **SAVEPOINT Guard**: All `CREATE TRIGGER` DDL must be wrapped in SAVEPOINT + DO block checking `pg_proc`
- **Tests Required**:
  1. Column existence (`has_column`)
  2. Trigger existence (`has_trigger`)
  3. Trigger 1 supersedes prior row on second insert
  4. Trigger 1 no-op on first insert
  5. Trigger 1 bumps `stories.updated_at`
  6. Trigger 2 defers linked backlog stories
  7. Trigger 2 no-op for non-archived status
  8. Idempotency (second migration run succeeds)

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| `superseded_at` column doesn't exist | Add in migration first, before function definition |
| ENUM comparison in PL/pgSQL | Use explicit cast: `NEW.status::text = 'archived'` or ENUM literal comparison |
| `backlog → deferred` not in valid_transitions | Pre-condition guard with `DO $$ BEGIN IF NOT EXISTS … RAISE EXCEPTION`  |
| Large plan cascades cause sequential scans | Confirm indexes on `plan_story_links` exist before deployment |
| pgtap test fails if function doesn't exist | Use SAVEPOINT + DO block checking `pg_proc` before CREATE TRIGGER |

## Next Steps

1. **Read full CDBE-1030.md** and STORY-SEED.md
2. **Review migration 1010** for pattern reference
3. **Write migration 1020** with both triggers
4. **Write pgtap tests** with SAVEPOINT guards
5. **Run migration** and verify idempotency
6. **Run tests** with full coverage
7. **Create PR** with migration + tests

## Story Seed Context
- **Dependency**: CDBE-1010 (COMPLETE) - establishes trigger pattern
- **Conflicts Found**: 2 (1 blocking: superseded_at column, 1 warning: valid_transitions check)
- **Lessons Loaded**: true
- **ADRs Loaded**: false

---

**Setup Completed**: 2026-03-19 00:00:00Z
**Ready for Implementation**: YES
