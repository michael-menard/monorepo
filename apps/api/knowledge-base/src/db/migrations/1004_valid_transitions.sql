-- Migration 1004: valid_transitions Lookup Table
--
-- Creates workflow.valid_transitions as the authoritative reference for all
-- legal story state transitions. Derived from the trigger logic in migration
-- 1001 (workflow.validate_story_state_transition).
--
-- Design decisions:
-- - from_state IS NULL represents initial insert (NULL → any state)
-- - Functional unique index on COALESCE(from_state, '__NULL__') to enforce
--   uniqueness while allowing NULL from_state values
-- - No FK to story_state_enum (enum is opaque to Drizzle; validated by trigger)
-- - Table is append-only reference data — no deletes, no updates
--
-- Transition summary (54 total rows):
--   NULL → any (13 rows — initial insert, no prior state)
--   any → cancelled (12 rows — from any non-cancelled state)
--   non-terminal → blocked (10 rows — excludes completed, cancelled, blocked)
--   blocked → backlog, ready, in_progress, elab (4 rows — unblock paths)
--   forward flow (11 rows)
--   recovery paths (4 rows)

-- ── 1. Create table ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow.valid_transitions (
  id          serial        PRIMARY KEY,
  from_state  text,                          -- NULL means initial insert
  to_state    text          NOT NULL,
  label       text          NOT NULL,        -- human-readable transition category
  created_at  timestamptz   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE workflow.valid_transitions IS
  '1004: Authoritative lookup of all legal story state transitions. Derived from '
  'migration 1001 trigger. from_state IS NULL represents initial insert (no prior state).';

COMMENT ON COLUMN workflow.valid_transitions.from_state IS
  'NULL = initial insert (story has no prior state). Non-null = the current state before transition.';

COMMENT ON COLUMN workflow.valid_transitions.to_state IS
  'The state being transitioned into.';

COMMENT ON COLUMN workflow.valid_transitions.label IS
  'Transition category: initial_insert, cancel, block, unblock, forward_flow, recovery.';

-- ── 2. Functional unique index ──────────────────────────────────────────────
-- COALESCE maps NULL → '__NULL__' so that NULL from_state participates in
-- uniqueness enforcement alongside non-NULL values.

CREATE UNIQUE INDEX IF NOT EXISTS idx_valid_transitions_unique
  ON workflow.valid_transitions (COALESCE(from_state, '__NULL__'), to_state);

COMMENT ON INDEX workflow.idx_valid_transitions_unique IS
  '1004: Enforces uniqueness of (from_state, to_state) pairs including NULL from_state.';

-- ── 3. Performance index ─────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_valid_transitions_from_state
  ON workflow.valid_transitions (from_state);

COMMENT ON INDEX workflow.idx_valid_transitions_from_state IS
  '1004: Supports fast lookup of all valid next states from a given from_state.';

-- ── 4. Seed data ─────────────────────────────────────────────────────────────
-- 54 legal transitions derived from migration 1001 trigger logic.
-- Uses DO $$ block to safely seed idempotently.

DO $$
DECLARE
  rows_inserted int;
BEGIN
  INSERT INTO workflow.valid_transitions (from_state, to_state, label)
  SELECT v.from_state, v.to_state, v.label
  FROM (VALUES
    -- NULL → any: initial insert (story has no prior state, 13 rows)
    (NULL::text, 'backlog',            'initial_insert'),
    (NULL::text, 'created',            'initial_insert'),
    (NULL::text, 'elab',               'initial_insert'),
    (NULL::text, 'ready',              'initial_insert'),
    (NULL::text, 'in_progress',        'initial_insert'),
    (NULL::text, 'needs_code_review',  'initial_insert'),
    (NULL::text, 'ready_for_qa',       'initial_insert'),
    (NULL::text, 'in_qa',              'initial_insert'),
    (NULL::text, 'completed',          'initial_insert'),
    (NULL::text, 'cancelled',          'initial_insert'),
    (NULL::text, 'blocked',            'initial_insert'),
    (NULL::text, 'failed_code_review', 'initial_insert'),
    (NULL::text, 'failed_qa',          'initial_insert'),

    -- any → cancelled (12 rows: all states except cancelled itself)
    ('backlog',            'cancelled', 'cancel'),
    ('created',            'cancelled', 'cancel'),
    ('elab',               'cancelled', 'cancel'),
    ('ready',              'cancelled', 'cancel'),
    ('in_progress',        'cancelled', 'cancel'),
    ('needs_code_review',  'cancelled', 'cancel'),
    ('ready_for_qa',       'cancelled', 'cancel'),
    ('in_qa',              'cancelled', 'cancel'),
    ('completed',          'cancelled', 'cancel'),
    ('blocked',            'cancelled', 'cancel'),
    ('failed_code_review', 'cancelled', 'cancel'),
    ('failed_qa',          'cancelled', 'cancel'),

    -- non-terminal → blocked (10 rows: excludes completed, cancelled, blocked)
    ('backlog',            'blocked', 'block'),
    ('created',            'blocked', 'block'),
    ('elab',               'blocked', 'block'),
    ('ready',              'blocked', 'block'),
    ('in_progress',        'blocked', 'block'),
    ('needs_code_review',  'blocked', 'block'),
    ('ready_for_qa',       'blocked', 'block'),
    ('in_qa',              'blocked', 'block'),
    ('failed_code_review', 'blocked', 'block'),
    ('failed_qa',          'blocked', 'block'),

    -- blocked → workable states (4 rows)
    ('blocked', 'backlog',      'unblock'),
    ('blocked', 'ready',        'unblock'),
    ('blocked', 'in_progress',  'unblock'),
    ('blocked', 'elab',         'unblock'),

    -- forward flow (11 rows)
    ('backlog',           'created',            'forward_flow'),
    ('created',           'elab',               'forward_flow'),
    ('elab',              'ready',              'forward_flow'),
    ('elab',              'backlog',            'forward_flow'),
    ('ready',             'in_progress',        'forward_flow'),
    ('in_progress',       'needs_code_review',  'forward_flow'),
    ('needs_code_review', 'ready_for_qa',       'forward_flow'),
    ('needs_code_review', 'failed_code_review', 'forward_flow'),
    ('ready_for_qa',      'in_qa',              'forward_flow'),
    ('in_qa',             'completed',          'forward_flow'),
    ('in_qa',             'failed_qa',          'forward_flow'),

    -- recovery paths (4 rows)
    ('failed_code_review', 'in_progress',       'recovery'),
    ('failed_code_review', 'needs_code_review', 'recovery'),
    ('failed_qa',          'in_progress',       'recovery'),
    ('failed_qa',          'ready_for_qa',      'recovery')

  ) AS v(from_state, to_state, label)
  WHERE NOT EXISTS (
    SELECT 1 FROM workflow.valid_transitions vt
    WHERE COALESCE(vt.from_state, '__NULL__') = COALESCE(v.from_state, '__NULL__')
      AND vt.to_state = v.to_state
  );

  GET DIAGNOSTICS rows_inserted = ROW_COUNT;
  RAISE NOTICE '1004: Inserted % rows into workflow.valid_transitions', rows_inserted;
END $$;

