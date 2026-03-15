-- tests/db/triggers/test_cdbe1030_artifact_superseded_at.sql
--
-- pgtap tests for CDBE-1030: Artifact Versions superseded_at Cascade Trigger
--
-- This test verifies that:
--   1. The set_artifact_superseded_at trigger function exists in the public schema
--   2. When a new artifact version is inserted for the same story+type, the
--      previous version's superseded_at is auto-set to NOW()
--   3. superseded_at is NOT set when a first version is inserted (no prior version)
--   4. Only the immediately prior version is superseded (not older versions)
--   5. Artifacts of different types for the same story do NOT supersede each other
--   6. Artifacts of the same type for different stories do NOT supersede each other
--
-- Uses the transaction-rollback isolation pattern (see fixtures/rollback-helper.sql).
-- All setup DDL and DML is rolled back at the end — the database stays clean.
--
-- NOTE: The trigger function set_artifact_superseded_at() is defined in CDBE-1030.
-- If that story has not been deployed, assertion 1 will fail with a clear message.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(7);

-- ── Assertion 1: trigger function exists ─────────────────────────────────────
SELECT has_function(
  'public',
  'set_artifact_superseded_at',
  'set_artifact_superseded_at() trigger function should exist in public schema (deployed by CDBE-1030)'
);

-- ── Setup: minimal artifact_versions-like table for testing ──────────────────
-- Mimics the shape of artifacts.artifact_versions or the relevant artifact table.
CREATE TABLE _test_artifact_versions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id      text NOT NULL,
  artifact_type text NOT NULL,
  version       integer NOT NULL,
  content       text,
  created_at    timestamp with time zone DEFAULT now(),
  superseded_at timestamp with time zone
);

-- Attach the trigger to our local test table for isolation
-- Note: since set_artifact_superseded_at may reference a specific table,
-- we test the data model correctness here; the trigger attachment test
-- validates the function exists and can be invoked.
CREATE TRIGGER trg_set_superseded_at
  AFTER INSERT ON _test_artifact_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_artifact_superseded_at();

-- ── Assertion 2: first version starts with superseded_at NULL ────────────────
INSERT INTO _test_artifact_versions (story_id, artifact_type, version, content)
VALUES ('CDBE-0001', 'plan', 1, 'initial plan content');

SELECT is(
  (SELECT superseded_at FROM _test_artifact_versions
   WHERE story_id = 'CDBE-0001' AND artifact_type = 'plan' AND version = 1),
  NULL::timestamptz,
  'First artifact version should have superseded_at = NULL (no prior version to supersede)'
);

-- ── Insert second version to trigger supersession of first ───────────────────
INSERT INTO _test_artifact_versions (story_id, artifact_type, version, content)
VALUES ('CDBE-0001', 'plan', 2, 'updated plan content');

-- ── Assertion 3: first version is now superseded ─────────────────────────────
SELECT isnt(
  (SELECT superseded_at FROM _test_artifact_versions
   WHERE story_id = 'CDBE-0001' AND artifact_type = 'plan' AND version = 1),
  NULL::timestamptz,
  'Version 1 should have superseded_at set when version 2 is inserted'
);

-- ── Assertion 4: second version (current) is NOT yet superseded ──────────────
SELECT is(
  (SELECT superseded_at FROM _test_artifact_versions
   WHERE story_id = 'CDBE-0001' AND artifact_type = 'plan' AND version = 2),
  NULL::timestamptz,
  'Version 2 (current) should have superseded_at = NULL until a version 3 is inserted'
);

-- ── Insert third version; only version 2 should be superseded ────────────────
INSERT INTO _test_artifact_versions (story_id, artifact_type, version, content)
VALUES ('CDBE-0001', 'plan', 3, 'final plan content');

SELECT isnt(
  (SELECT superseded_at FROM _test_artifact_versions
   WHERE story_id = 'CDBE-0001' AND artifact_type = 'plan' AND version = 2),
  NULL::timestamptz,
  'Version 2 should be superseded when version 3 is inserted'
);

-- ── Assertion 5: different artifact_type for same story does NOT supersede ───
INSERT INTO _test_artifact_versions (story_id, artifact_type, version, content)
VALUES ('CDBE-0001', 'evidence', 1, 'first evidence artifact');

SELECT is(
  (SELECT superseded_at FROM _test_artifact_versions
   WHERE story_id = 'CDBE-0001' AND artifact_type = 'plan' AND version = 3),
  NULL::timestamptz,
  'Inserting evidence v1 should NOT supersede the plan artifact'
);

-- ── Assertion 6: same artifact_type for different story does NOT supersede ───
INSERT INTO _test_artifact_versions (story_id, artifact_type, version, content)
VALUES ('CDBE-0002', 'plan', 1, 'another story plan content');

SELECT is(
  (SELECT superseded_at FROM _test_artifact_versions
   WHERE story_id = 'CDBE-0001' AND artifact_type = 'plan' AND version = 3),
  NULL::timestamptz,
  'Inserting a plan for CDBE-0002 should NOT supersede the plan for CDBE-0001'
);

SELECT * FROM finish();
ROLLBACK;
