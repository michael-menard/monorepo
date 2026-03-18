-- pgtap tests for migration 1004: workflow.valid_transitions
--
-- Run against: KB database (port 5433, schema: workflow)
-- Requires:    pgTAP extension
-- Usage:       psql $KB_DATABASE_URL -f pgtap/1004_valid_transitions_test.sql | pg_prove
--
-- Assumes migration 1004 has already been applied.

BEGIN;

SELECT plan(25);

-- ── Table structure ───────────────────────────────────────────────────────────

SELECT has_table('workflow', 'valid_transitions',
  'workflow.valid_transitions table exists');

SELECT has_column('workflow', 'valid_transitions', 'id',
  'valid_transitions has id column');

SELECT has_column('workflow', 'valid_transitions', 'from_state',
  'valid_transitions has from_state column');

SELECT has_column('workflow', 'valid_transitions', 'to_state',
  'valid_transitions has to_state column');

SELECT has_column('workflow', 'valid_transitions', 'label',
  'valid_transitions has label column');

SELECT has_column('workflow', 'valid_transitions', 'created_at',
  'valid_transitions has created_at column');

SELECT col_is_null('workflow', 'valid_transitions', 'from_state',
  'from_state allows NULL (initial insert case)');

SELECT col_not_null('workflow', 'valid_transitions', 'to_state',
  'to_state is NOT NULL');

SELECT col_not_null('workflow', 'valid_transitions', 'label',
  'label is NOT NULL');

SELECT has_pk('workflow', 'valid_transitions',
  'valid_transitions has a primary key');

-- ── Indexes ───────────────────────────────────────────────────────────────────

SELECT has_index('workflow', 'valid_transitions', 'idx_valid_transitions_unique',
  'unique index idx_valid_transitions_unique exists');

SELECT has_index('workflow', 'valid_transitions', 'idx_valid_transitions_from_state',
  'performance index idx_valid_transitions_from_state exists');

-- ── Row counts by label ───────────────────────────────────────────────────────

SELECT is(
  (SELECT COUNT(*)::int FROM workflow.valid_transitions WHERE label = 'initial_insert'),
  13,
  '13 initial_insert rows (NULL → each of 13 canonical states)'
);

SELECT is(
  (SELECT COUNT(*)::int FROM workflow.valid_transitions WHERE label = 'cancel'),
  12,
  '12 cancel rows (any non-cancelled state → cancelled)'
);

SELECT is(
  (SELECT COUNT(*)::int FROM workflow.valid_transitions WHERE label = 'block'),
  10,
  '10 block rows (non-terminal states → blocked, excludes completed/cancelled/blocked)'
);

SELECT is(
  (SELECT COUNT(*)::int FROM workflow.valid_transitions WHERE label = 'unblock'),
  4,
  '4 unblock rows (blocked → backlog/ready/in_progress/elab)'
);

SELECT is(
  (SELECT COUNT(*)::int FROM workflow.valid_transitions WHERE label = 'forward_flow'),
  11,
  '11 forward_flow rows (canonical progression through lifecycle)'
);

SELECT is(
  (SELECT COUNT(*)::int FROM workflow.valid_transitions WHERE label = 'recovery'),
  4,
  '4 recovery rows (failed_code_review/failed_qa → retry states)'
);

SELECT is(
  (SELECT COUNT(*)::int FROM workflow.valid_transitions),
  54,
  '54 total rows match complete transition matrix'
);

-- ── Specific key transitions ──────────────────────────────────────────────────

SELECT ok(
  EXISTS (
    SELECT 1 FROM workflow.valid_transitions
    WHERE from_state IS NULL AND to_state = 'backlog' AND label = 'initial_insert'
  ),
  'NULL → backlog exists (initial_insert)'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM workflow.valid_transitions
    WHERE from_state = 'in_progress' AND to_state = 'needs_code_review' AND label = 'forward_flow'
  ),
  'in_progress → needs_code_review exists (forward_flow)'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM workflow.valid_transitions
    WHERE from_state = 'failed_qa' AND to_state = 'ready_for_qa' AND label = 'recovery'
  ),
  'failed_qa → ready_for_qa exists (recovery)'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM workflow.valid_transitions
    WHERE from_state = 'completed' AND to_state = 'in_progress'
  ),
  'completed → in_progress does NOT exist (no resurrection from completed)'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM workflow.valid_transitions
    WHERE from_state = 'cancelled' AND to_state = 'backlog'
  ),
  'cancelled → backlog does NOT exist (no reopen from cancelled)'
);

-- ── Uniqueness enforcement ────────────────────────────────────────────────────

SELECT throws_ok(
  $$INSERT INTO workflow.valid_transitions (from_state, to_state, label)
    VALUES ('backlog', 'created', 'duplicate_test')$$,
  '23505',
  NULL,
  'duplicate (from_state, to_state) pair raises an error'
);

SELECT throws_ok(
  $$INSERT INTO workflow.valid_transitions (from_state, to_state, label)
    VALUES (NULL, 'backlog', 'duplicate_null_test')$$,
  '23505',
  NULL,
  'duplicate NULL from_state pair raises an error (COALESCE index enforces)'
);

SELECT * FROM finish();

ROLLBACK;

