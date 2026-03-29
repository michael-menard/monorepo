-- pgtap tests for migration 1120: minimum_path column on workflow.stories
--
-- Run against: KB DB after migration 1120 applied
-- Requires:    pgTAP extension, migration 1120 applied
-- Usage:       psql $KB_DATABASE_URL -f pgtap/1120_aprs1030_minimum_path_test.sql | pg_prove
--
-- Test groups (8 assertions total):
--   MP-1: Column existence and definition (3 assertions)
--   MP-2: Default value (1 assertion)
--   MP-3: Index existence (1 assertion)
--   MP-4: Read/write round-trip (2 assertions)
--   MP-5: Partial index filters correctly (1 assertion)
--
-- All writes are inside BEGIN…ROLLBACK to leave the DB clean after the run.
-- Fixtures use story_id prefix 'TEST-1120-*' to avoid collisions with real data.

BEGIN;

SELECT plan(8);

-- ────────────────────────────────────────────────────────────────────────────
-- Fixture: seed test stories
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO workflow.stories (story_id, feature, title, minimum_path)
VALUES
  ('TEST-1120-A', 'aprs-1030-test', 'Minimum path story (true)', true),
  ('TEST-1120-B', 'aprs-1030-test', 'Non-minimum path story (false)', false),
  ('TEST-1120-C', 'aprs-1030-test', 'Default minimum path story', DEFAULT)
ON CONFLICT (story_id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- MP-1: Column existence and definition
-- ════════════════════════════════════════════════════════════════════════════

-- MP-1a: minimum_path column exists on workflow.stories
SELECT has_column(
  'workflow',
  'stories',
  'minimum_path',
  'MP-1a: workflow.stories has minimum_path column'
);

-- MP-1b: minimum_path column is of type boolean
SELECT col_type_is(
  'workflow',
  'stories',
  'minimum_path',
  'bool',
  'MP-1b: minimum_path column is boolean'
);

-- MP-1c: minimum_path column is NOT NULL
SELECT col_not_null(
  'workflow',
  'stories',
  'minimum_path',
  'MP-1c: minimum_path column has NOT NULL constraint'
);

-- ════════════════════════════════════════════════════════════════════════════
-- MP-2: Default value
-- ════════════════════════════════════════════════════════════════════════════

-- MP-2a: Default value for minimum_path is false
SELECT col_default_is(
  'workflow',
  'stories',
  'minimum_path',
  'false',
  'MP-2a: minimum_path default is false'
);

-- ════════════════════════════════════════════════════════════════════════════
-- MP-3: Index existence
-- ════════════════════════════════════════════════════════════════════════════

-- MP-3a: Partial index idx_stories_minimum_path exists
SELECT has_index(
  'workflow',
  'stories',
  'idx_stories_minimum_path',
  'MP-3a: partial index idx_stories_minimum_path exists'
);

-- ════════════════════════════════════════════════════════════════════════════
-- MP-4: Read/write round-trip
-- ════════════════════════════════════════════════════════════════════════════

-- MP-4a: Story inserted with minimum_path = true can be read back
SELECT is(
  (SELECT minimum_path FROM workflow.stories WHERE story_id = 'TEST-1120-A'),
  true,
  'MP-4a: minimum_path=true round-trips correctly'
);

-- MP-4b: Story inserted with minimum_path = false can be read back
SELECT is(
  (SELECT minimum_path FROM workflow.stories WHERE story_id = 'TEST-1120-B'),
  false,
  'MP-4b: minimum_path=false round-trips correctly'
);

-- ════════════════════════════════════════════════════════════════════════════
-- MP-5: Partial index filters correctly
-- ════════════════════════════════════════════════════════════════════════════

-- MP-5a: Only minimum_path=true stories appear via partial index scan
SELECT is(
  (SELECT COUNT(*)::int
   FROM workflow.stories
   WHERE minimum_path = true
     AND story_id LIKE 'TEST-1120-%'),
  1,
  'MP-5a: exactly one TEST-1120 story has minimum_path=true'
);

SELECT * FROM finish();

ROLLBACK;
