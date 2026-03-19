-- pgtap tests for migration 1007: PIPE-0020 Ghost State Audit Trail
--
-- Run against: KB database (port 5433, schema: workflow)
-- Requires:    pgTAP extension
-- Usage:       psql $KB_DATABASE_URL -f pgtap/1007_pipe_0020_ghost_state_audit_test.sql | pg_prove
--
-- Assumes migrations 1001 and 1007 have already been applied.
--
-- Test plan (7 tests):
--   1. Zero ghost-state rows remain in workflow.stories
--   2. uat and done ghost states have 0 rows individually
--   3. PIPE-0020 history rows use event_type='state_change' exclusively
--   4. PIPE-0020 history rows contain required metadata fields
--   5. story_state_history event_type check constraint rejects 'state_changed'
--   6. Idempotency: re-running NOT EXISTS INSERT inserts 0 new PIPE-0020 rows
--   7. Idempotency: total count is unchanged after re-run

BEGIN;

SELECT plan(7);

-- ── 1. Zero ghost-state rows remain ──────────────────────────────────────────
-- Canonical exclusion query: any story still holding a ghost state value
-- indicates migration 1001 or 1007 did not fully execute.

SELECT is(
  (
    SELECT COUNT(*)::int
    FROM workflow.stories
    WHERE state::text IN (
      'uat', 'done', 'in_review', 'ready_for_review',
      'deferred', 'ready_to_work', 'elaboration', 'draft'
    )
  ),
  0,
  'zero ghost-state rows remain in workflow.stories after migration 1007'
);

-- ── 2. uat and done ghost states individually have 0 rows ────────────────────

SELECT is(
  (
    SELECT COUNT(*)::int
    FROM workflow.stories
    WHERE state::text IN ('uat', 'done')
  ),
  0,
  'uat and done ghost states have 0 rows (migrated to completed)'
);

-- ── 3. PIPE-0020 history rows use event_type='state_change' ──────────────────

SELECT is(
  (
    SELECT COUNT(*)::int
    FROM workflow.story_state_history
    WHERE (metadata->>'migrated_by') = 'PIPE-0020'
      AND event_type <> 'state_change'
  ),
  0,
  'all PIPE-0020 history rows use event_type=''state_change'' (not state_changed)'
);

-- ── 4. PIPE-0020 history rows contain required metadata fields ────────────────

SELECT is(
  (
    SELECT COUNT(*)::int
    FROM workflow.story_state_history
    WHERE (metadata->>'migrated_by') = 'PIPE-0020'
      AND (
        metadata->>'migration_date' IS NULL
        OR metadata->>'original_state' IS NULL
      )
  ),
  0,
  'all PIPE-0020 history rows have migration_date and original_state metadata fields'
);

-- ── 5. CHECK constraint rejects event_type='state_changed' ───────────────────
-- Uses throws_ok without a SAVEPOINT — pgtap wraps the call in its own subtransaction.

SELECT throws_ok(
  $$INSERT INTO workflow.story_state_history (story_id, event_type, from_state, to_state)
    VALUES ('PIPE-0020-constraint-test', 'state_changed', 'backlog', 'created')$$,
  '23514',
  NULL,
  'inserting event_type=''state_changed'' raises check_violation (23514)'
);

-- ── 6-7. Idempotency: re-running INSERT logic inserts 0 new rows ─────────────
-- Create a temp table to hold before/after counts, then run the re-insert,
-- then assert counts are equal. No SAVEPOINT needed — we just read counts.

CREATE TEMP TABLE _pipe_0020_idempotency (
  count_before int,
  count_after  int
) ON COMMIT DROP;

INSERT INTO _pipe_0020_idempotency (count_before, count_after)
SELECT
  (SELECT COUNT(*)::int FROM workflow.story_state_history WHERE (metadata->>'migrated_by') = 'PIPE-0020'),
  0;

-- Re-run the uat→completed backfill (representative of all 8 mappings)
INSERT INTO workflow.story_state_history (story_id, event_type, from_state, to_state, metadata)
SELECT
  s.story_id,
  'state_change',
  'uat',
  'completed',
  jsonb_build_object(
    'migrated_by', 'PIPE-0020',
    'migration_date', NOW()::text,
    'original_state', 'uat'
  )
FROM workflow.stories s
WHERE s.state::text = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM workflow.story_state_history h
    WHERE h.story_id = s.story_id
      AND h.event_type = 'state_change'
      AND h.from_state = 'uat'
      AND h.to_state = 'completed'
      AND (h.metadata->>'migrated_by') = 'PIPE-0020'
  )
  AND EXISTS (
    SELECT 1 FROM workflow.story_state_history h2
    WHERE h2.story_id = s.story_id
      AND h2.from_state = 'uat'
  );

UPDATE _pipe_0020_idempotency
SET count_after = (
  SELECT COUNT(*)::int FROM workflow.story_state_history WHERE (metadata->>'migrated_by') = 'PIPE-0020'
);

SELECT is(
  (SELECT count_after - count_before FROM _pipe_0020_idempotency),
  0,
  'idempotency: re-running uat→completed INSERT inserts 0 new PIPE-0020 rows'
);

SELECT is(
  (SELECT count_after FROM _pipe_0020_idempotency),
  (SELECT count_before FROM _pipe_0020_idempotency),
  'idempotency: total PIPE-0020 history row count is unchanged after re-run'
);

SELECT * FROM finish();

ROLLBACK;
