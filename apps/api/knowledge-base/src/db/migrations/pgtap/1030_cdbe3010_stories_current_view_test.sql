-- pgtap tests for migration 1030: workflow.stories_current view
--
-- Run against: KB database (port 5435, schema: workflow)
-- Requires:    pgTAP extension, migrations 1010 + 1030 applied
-- Usage:       psql $KB_DATABASE_URL -f pgtap/1030_cdbe3010_stories_current_view_test.sql | pg_prove
--
-- Test plan (7 assertions):
--   1. has_view — view exists in workflow schema
--   2. HP-2a — story with one open row: current_state matches to_state
--   3. HP-2b — story with one open row: entered_at is NOT NULL
--   4. HP-3a — story with no history rows: current_state IS NULL
--   5. HP-3b — story with no history rows: entered_at IS NULL
--   6. HP-4  — story with multiple rows (one closed, one open): open row wins
--   7. EC-2  — idempotency: CREATE OR REPLACE VIEW runs without error

BEGIN;

SELECT plan(7);

-- ── Test story setup ───────────────────────────────────────────────────────────
-- Three test stories covering all scenarios. ON CONFLICT DO NOTHING for safety.

INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES
  ('TEST-3010-ONE-ROW', 'cdbe-3010-test', 'backlog', 'pgtap test story — one open history row'),
  ('TEST-3010-NO-HIST',  'cdbe-3010-test', 'backlog', 'pgtap test story — no history rows'),
  ('TEST-3010-MULTI',    'cdbe-3010-test', 'backlog', 'pgtap test story — multiple history rows')
ON CONFLICT (story_id) DO NOTHING;

-- ── HP-2: Insert one open history row for TEST-3010-ONE-ROW ───────────────────
-- NULL → backlog is a valid initial transition per migration 1001.
-- The trigger (migration 1010) will leave this row open (exited_at IS NULL).

INSERT INTO workflow.story_state_history (story_id, event_type, from_state, to_state)
VALUES ('TEST-3010-ONE-ROW', 'state_change', NULL, 'backlog');

-- ── HP-4: Insert two rows for TEST-3010-MULTI ─────────────────────────────────
-- First row: NULL → backlog (trigger closes it when second row is inserted)
-- Second row: backlog → created (open after insert, exited_at IS NULL)
-- After both inserts: first row has exited_at set, second row is the open row.

INSERT INTO workflow.story_state_history (story_id, event_type, from_state, to_state)
VALUES ('TEST-3010-MULTI', 'state_change', NULL, 'backlog');

INSERT INTO workflow.story_state_history (story_id, event_type, from_state, to_state)
VALUES ('TEST-3010-MULTI', 'state_change', 'backlog', 'created');

-- ── TEST 1: View exists ────────────────────────────────────────────────────────

SELECT has_view(
  'workflow', 'stories_current',
  '1030: workflow.stories_current view exists'
);

-- ── TEST 2: HP-2a — current_state matches to_state of open row ────────────────

SELECT is(
  (SELECT current_state FROM workflow.stories_current WHERE story_id = 'TEST-3010-ONE-ROW'),
  'backlog',
  '1030 HP-2a: story with one open row returns current_state = ''backlog'''
);

-- ── TEST 3: HP-2b — entered_at is NOT NULL ────────────────────────────────────

SELECT isnt(
  (SELECT entered_at FROM workflow.stories_current WHERE story_id = 'TEST-3010-ONE-ROW'),
  NULL,
  '1030 HP-2b: story with one open row returns non-null entered_at'
);

-- ── TEST 4: HP-3a — current_state IS NULL for story with no history ───────────

SELECT is(
  (SELECT current_state FROM workflow.stories_current WHERE story_id = 'TEST-3010-NO-HIST'),
  NULL,
  '1030 HP-3a: story with no history rows returns current_state IS NULL'
);

-- ── TEST 5: HP-3b — entered_at IS NULL for story with no history ──────────────

SELECT is(
  (SELECT entered_at FROM workflow.stories_current WHERE story_id = 'TEST-3010-NO-HIST'),
  NULL,
  '1030 HP-3b: story with no history rows returns entered_at IS NULL'
);

-- ── TEST 6: HP-4 — multi-row story returns open row values only ───────────────
-- The trigger closed the NULL → backlog row when backlog → created was inserted.
-- Only the open row (to_state = 'created') should be returned.

SELECT is(
  (SELECT current_state FROM workflow.stories_current WHERE story_id = 'TEST-3010-MULTI'),
  'created',
  '1030 HP-4: story with multiple rows returns current_state from the open row (''created''), not the closed row'
);

-- ── TEST 7: EC-2 — idempotency: CREATE OR REPLACE VIEW runs without error ─────

SELECT lives_ok(
  $$CREATE OR REPLACE VIEW workflow.stories_current AS
    SELECT
      s.story_id,
      s.feature,
      s.state,
      s.title,
      s.priority,
      s.description,
      s.tags,
      s.experiment_variant,
      s.blocked_reason,
      s.blocked_by_story,
      s.started_at,
      s.completed_at,
      s.file_hash,
      s.created_at,
      s.updated_at,
      h.to_state   AS current_state,
      h.created_at AS entered_at
    FROM workflow.stories s
    LEFT JOIN LATERAL (
      SELECT to_state, created_at
      FROM workflow.story_state_history
      WHERE story_id = s.story_id
        AND exited_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    ) h ON true$$,
  '1030 EC-2: CREATE OR REPLACE VIEW workflow.stories_current is idempotent (runs without error)'
);

SELECT * FROM finish();

ROLLBACK;
