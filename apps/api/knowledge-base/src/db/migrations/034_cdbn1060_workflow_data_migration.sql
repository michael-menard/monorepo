-- Migration 034: workflow data migration — migrate wint.* live rows into workflow.* (CDBN-1060)
--
-- Source: lego_dev@5432, wint schema
-- Target: knowledgebase@5433, workflow schema (created by migration 033)
--
-- Migrates:
--   wint.stories         (1 live row)  → workflow.stories
--   wint.story_states    (4 live rows) → workflow.story_state_history (event_type='state_change')
--   wint.story_transitions (4 live rows) → workflow.story_state_history (event_type='transition')
--   wint.workflow_executions (0 live rows) → workflow.workflow_executions (nothing to migrate)
--
-- wint.workflow_executions discrepancy:
--   The CDBN-1060 MANIFEST reported 5 rows from stale pg_stat_user_tables data.
--   VACUUM and live count query against lego_dev@5432 revealed 0 live rows (15 dead tuples).
--   Cross-database FK constraints from artifacts.* and kbar.* tables that reference
--   wint.stories(id) [UUID] in lego_dev@5432 are DEFERRED — they cannot be resolved
--   via cross-database FK (PostgreSQL limitation). See DECISION-fk-deferred.md.
--
-- Idempotent: ON CONFLICT DO NOTHING on all inserts.

-- ============================================================================
-- Safety preamble: only run on knowledgebase DB
-- ============================================================================

DO $$ BEGIN
  IF current_database() != 'knowledgebase' THEN
    RAISE EXCEPTION 'Wrong database: expected knowledgebase, got %', current_database();
  END IF;
END $$;

-- ============================================================================
-- Safety check: workflow schema must exist (migration 033 must have run)
-- ============================================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'workflow'
  ) THEN
    RAISE EXCEPTION 'workflow schema does not exist — run migration 033 first';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'workflow' AND table_name = 'stories'
  ) THEN
    RAISE EXCEPTION 'workflow.stories table does not exist — run migration 033 first';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'workflow' AND table_name = 'story_state_history'
  ) THEN
    RAISE EXCEPTION 'workflow.story_state_history table does not exist — run migration 033 first';
  END IF;
END $$;

-- ============================================================================
-- Insert 1 row into workflow.stories
-- Source: wint.stories, story_id=WINT-1040
-- UUID in source: 7c52c4b9-af9a-4f20-ad56-610cf71dfaab
-- The workflow schema uses story_id TEXT PK (not UUID), mapping to 'WINT-1040'
-- feature mapped from wint.stories.epic ('wint')
-- ============================================================================

INSERT INTO workflow.stories (
  story_id,
  feature,
  state,
  title,
  priority,
  description,
  created_at,
  updated_at
) VALUES (
  'WINT-1040',
  'wint',
  'backlog',
  'Update /story-status Command to Use DB as Primary Source for Story Lookup',
  'P2',
  NULL,
  '2026-02-18 04:50:12.502564+00',
  '2026-02-24 04:29:25.946+00'
)
ON CONFLICT (story_id) DO NOTHING;

-- ============================================================================
-- Insert 4 rows into workflow.story_state_history from wint.story_states
-- event_type = 'state_change'
-- Source UUIDs are preserved as history record IDs.
-- Metadata includes source provenance: entered_at, exited_at, reason,
-- triggered_by, source_table, source_id.
-- from_state/to_state derived from entered/exited state context:
--   Each state row represents a period in that state.
--   We model: from_state=NULL (entering), to_state=state (the state entered).
--   exited_at=NULL means currently active in that state.
-- ============================================================================

INSERT INTO workflow.story_state_history (
  id,
  story_id,
  event_type,
  from_state,
  to_state,
  metadata,
  created_at
) VALUES
  -- Row 1: entered ready_to_work, immediately exited
  (
    '150dbbbc-9d63-42d1-9308-47ff0380a074',
    'WINT-1040',
    'state_change',
    NULL,
    'ready_to_work',
    jsonb_build_object(
      'source_table', 'wint.story_states',
      'source_id', '150dbbbc-9d63-42d1-9308-47ff0380a074',
      'entered_at', '2026-02-24T04:29:17.779+00:00',
      'exited_at', '2026-02-24T04:29:17.787+00:00',
      'reason', 'WINT-1120 AC-6 test',
      'triggered_by', 'wint-1120-spike'
    ),
    '2026-02-24 04:29:17.774947+00'
  ),
  -- Row 2: entered backlog, exited
  (
    '6d7dfbd9-5419-4b1b-bdaa-0c5c9a4e6864',
    'WINT-1040',
    'state_change',
    NULL,
    'backlog',
    jsonb_build_object(
      'source_table', 'wint.story_states',
      'source_id', '6d7dfbd9-5419-4b1b-bdaa-0c5c9a4e6864',
      'entered_at', '2026-02-24T04:29:17.787+00:00',
      'exited_at', '2026-02-24T04:29:25.939+00:00',
      'reason', 'WINT-1120 revert',
      'triggered_by', 'wint-1120-spike'
    ),
    '2026-02-24 04:29:17.784824+00'
  ),
  -- Row 3: entered in_progress, exited
  (
    'd124f949-e061-4464-b121-411146becd61',
    'WINT-1040',
    'state_change',
    NULL,
    'in_progress',
    jsonb_build_object(
      'source_table', 'wint.story_states',
      'source_id', 'd124f949-e061-4464-b121-411146becd61',
      'entered_at', '2026-02-24T04:29:25.939+00:00',
      'exited_at', '2026-02-24T04:29:25.947+00:00',
      'reason', 'WINT-1120 AC-7 story-move simulation',
      'triggered_by', 'wint-1120-spike'
    ),
    '2026-02-24 04:29:25.934872+00'
  ),
  -- Row 4: entered backlog, exited_at=NULL (currently active state)
  (
    '6cfde72f-0ca3-4727-80ff-ec85ede1d515',
    'WINT-1040',
    'state_change',
    NULL,
    'backlog',
    jsonb_build_object(
      'source_table', 'wint.story_states',
      'source_id', '6cfde72f-0ca3-4727-80ff-ec85ede1d515',
      'entered_at', '2026-02-24T04:29:25.947+00:00',
      'exited_at', NULL,
      'reason', '',
      'triggered_by', 'wint-1120-spike'
    ),
    '2026-02-24 04:29:25.944568+00'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Insert 4 rows into workflow.story_state_history from wint.story_transitions
-- event_type = 'transition'
-- Source UUIDs are preserved as history record IDs.
-- from_state and to_state are taken directly from transition records.
-- ============================================================================

INSERT INTO workflow.story_state_history (
  id,
  story_id,
  event_type,
  from_state,
  to_state,
  metadata,
  created_at
) VALUES
  -- Row 1: backlog → ready_to_work
  (
    'c6893cd1-7dc2-4f77-8569-5e76087e5fe2',
    'WINT-1040',
    'transition',
    'backlog',
    'ready_to_work',
    jsonb_build_object(
      'source_table', 'wint.story_transitions',
      'source_id', 'c6893cd1-7dc2-4f77-8569-5e76087e5fe2',
      'transitioned_at', '2026-02-24T04:29:17.779+00:00',
      'reason', 'WINT-1120 AC-6 test',
      'triggered_by', 'wint-1120-spike'
    ),
    '2026-02-24 04:29:17.774947+00'
  ),
  -- Row 2: ready_to_work → backlog
  (
    '1168768e-cb4d-4d33-908a-0ad9cfaee801',
    'WINT-1040',
    'transition',
    'ready_to_work',
    'backlog',
    jsonb_build_object(
      'source_table', 'wint.story_transitions',
      'source_id', '1168768e-cb4d-4d33-908a-0ad9cfaee801',
      'transitioned_at', '2026-02-24T04:29:17.787+00:00',
      'reason', 'WINT-1120 revert',
      'triggered_by', 'wint-1120-spike'
    ),
    '2026-02-24 04:29:17.784824+00'
  ),
  -- Row 3: backlog → in_progress
  (
    'c311d77d-1cc4-487d-ac71-ec3bf2bf1ff4',
    'WINT-1040',
    'transition',
    'backlog',
    'in_progress',
    jsonb_build_object(
      'source_table', 'wint.story_transitions',
      'source_id', 'c311d77d-1cc4-487d-ac71-ec3bf2bf1ff4',
      'transitioned_at', '2026-02-24T04:29:25.939+00:00',
      'reason', 'WINT-1120 AC-7 story-move simulation',
      'triggered_by', 'wint-1120-spike'
    ),
    '2026-02-24 04:29:25.934872+00'
  ),
  -- Row 4: in_progress → backlog
  (
    '26b56a63-05c0-4f39-8a6b-98c17e35f657',
    'WINT-1040',
    'transition',
    'in_progress',
    'backlog',
    jsonb_build_object(
      'source_table', 'wint.story_transitions',
      'source_id', '26b56a63-05c0-4f39-8a6b-98c17e35f657',
      'transitioned_at', '2026-02-24T04:29:25.947+00:00',
      'reason', '',
      'triggered_by', 'wint-1120-spike'
    ),
    '2026-02-24 04:29:25.944568+00'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- workflow.workflow_executions: 0 rows migrated
-- DISCREPANCY NOTE:
--   MANIFEST reported 5 rows based on stale pg_stat_user_tables.n_live_tup data.
--   Live query: SELECT COUNT(*) FROM wint.workflow_executions → returned 0.
--   VACUUM VERBOSE wint.workflow_executions revealed 15 dead tuples, 0 live tuples.
--   Root cause: pg_stat data was stale (table had been truncated/deleted but not vacuumed).
--   Decision: migrate 0 rows. No INSERT needed.
-- ============================================================================

-- ============================================================================
-- Row parity verification
-- ============================================================================

DO $$
DECLARE
  v_stories_count         INT;
  v_state_change_count    INT;
  v_transition_count      INT;
  v_total_history_count   INT;
  v_executions_count      INT;
BEGIN
  SELECT COUNT(*) INTO v_stories_count
    FROM workflow.stories WHERE story_id = 'WINT-1040';

  SELECT COUNT(*) INTO v_state_change_count
    FROM workflow.story_state_history
    WHERE story_id = 'WINT-1040' AND event_type = 'state_change';

  SELECT COUNT(*) INTO v_transition_count
    FROM workflow.story_state_history
    WHERE story_id = 'WINT-1040' AND event_type = 'transition';

  SELECT COUNT(*) INTO v_total_history_count
    FROM workflow.story_state_history WHERE story_id = 'WINT-1040';

  SELECT COUNT(*) INTO v_executions_count
    FROM workflow.workflow_executions WHERE story_id = 'WINT-1040';

  -- Assert stories = 1
  IF v_stories_count != 1 THEN
    RAISE EXCEPTION 'Row parity FAIL: workflow.stories expected 1 for WINT-1040, got %', v_stories_count;
  END IF;

  -- Assert state_change = 4
  IF v_state_change_count != 4 THEN
    RAISE EXCEPTION 'Row parity FAIL: story_state_history state_change expected 4 for WINT-1040, got %', v_state_change_count;
  END IF;

  -- Assert transition = 4
  IF v_transition_count != 4 THEN
    RAISE EXCEPTION 'Row parity FAIL: story_state_history transition expected 4 for WINT-1040, got %', v_transition_count;
  END IF;

  -- Assert total history = 8
  IF v_total_history_count != 8 THEN
    RAISE EXCEPTION 'Row parity FAIL: story_state_history total expected 8 for WINT-1040, got %', v_total_history_count;
  END IF;

  -- workflow_executions = 0 (source had 0 live rows; stale stats showed 5)
  IF v_executions_count != 0 THEN
    RAISE EXCEPTION 'Row parity FAIL: workflow_executions expected 0 for WINT-1040 (stale stats discrepancy), got %', v_executions_count;
  END IF;

  RAISE NOTICE 'Row parity CHECK: stories=% (expect 1), state_change=% (expect 4), transition=% (expect 4), total_history=% (expect 8), executions=% (expect 0)',
    v_stories_count, v_state_change_count, v_transition_count, v_total_history_count, v_executions_count;
  RAISE NOTICE 'Migration 034 complete: WINT-1040 data migrated to workflow schema.';
END $$;
