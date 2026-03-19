-- pgtap tests for migration 1090: ingest_story_from_yaml stored procedure
--
-- Run against: pgtap test database (port 5434, schema: workflow)
-- Requires:    pgTAP extension, migrations 999 (baseline) + 1001 + 1013 + 1050 + 1090 applied
-- Usage:       psql $PGTAP_URL -f pgtap/1090_cdbe2030_ingest_story_from_yaml_test.sql | pg_prove
--
-- Test groups:
--   HP-1: Schema structure (function exists, is SECURITY INVOKER)
--   HP-2: Full happy-path ingest (stories + details + content + dependencies)
--   HP-3: Idempotent re-ingest (same payload twice, counts reflect update)
--   HP-4: story_content upsert by section_name (overwrite existing section)
--   HP-5: Dependency deduplication (ON CONFLICT DO NOTHING for duplicate dep)
--   HP-6: Depth-5 dependency chain is allowed
--   ED-1: Depth-6 dependency chain is rejected (P0005)
--   ED-2: Cycle detection (P0004)
--   ED-3: Invalid caller raises P0001
--   ED-4: JSONB schema validation error — missing required keys (P0003)

BEGIN;

SELECT plan(22);

-- ── Test setup ─────────────────────────────────────────────────────────────────
-- Seed chain stories for depth tests (TEST-1090-D1 through D6)

INSERT INTO workflow.stories (story_id, feature, state, title)
VALUES
  ('TEST-1090-D1', 'cdbe-2030-test', 'backlog', 'pgtap depth chain 1'),
  ('TEST-1090-D2', 'cdbe-2030-test', 'backlog', 'pgtap depth chain 2'),
  ('TEST-1090-D3', 'cdbe-2030-test', 'backlog', 'pgtap depth chain 3'),
  ('TEST-1090-D4', 'cdbe-2030-test', 'backlog', 'pgtap depth chain 4'),
  ('TEST-1090-D5', 'cdbe-2030-test', 'backlog', 'pgtap depth chain 5'),
  ('TEST-1090-D6', 'cdbe-2030-test', 'backlog', 'pgtap depth chain 6'),
  ('TEST-1090-CYC', 'cdbe-2030-test', 'backlog', 'pgtap cycle target')
ON CONFLICT (story_id) DO NOTHING;

-- Seed existing DB dependency chain: D2 → D3 → D4 → D5 → D6 (depth 4 from D2)
INSERT INTO workflow.story_dependencies (story_id, depends_on_id, dependency_type)
VALUES
  ('TEST-1090-D2', 'TEST-1090-D3', 'depends_on'),
  ('TEST-1090-D3', 'TEST-1090-D4', 'depends_on'),
  ('TEST-1090-D4', 'TEST-1090-D5', 'depends_on'),
  ('TEST-1090-D5', 'TEST-1090-D6', 'depends_on')
ON CONFLICT ON CONSTRAINT uq_story_dependency DO NOTHING;

-- Seed cycle: CYC → D1 (we will try to add D1 → CYC, creating a cycle)
INSERT INTO workflow.story_dependencies (story_id, depends_on_id, dependency_type)
VALUES
  ('TEST-1090-CYC', 'TEST-1090-D1', 'depends_on')
ON CONFLICT ON CONSTRAINT uq_story_dependency DO NOTHING;

-- ── HP-1: Schema structure ─────────────────────────────────────────────────────

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND p.proname = 'ingest_story_from_yaml'
  ),
  'HP-1a: workflow.ingest_story_from_yaml function exists'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND p.proname = 'ingest_story_from_yaml'
      AND p.prosecdef = false  -- SECURITY INVOKER (not DEFINER)
  ),
  'HP-1b: ingest_story_from_yaml is SECURITY INVOKER'
);

-- ── HP-2: Full happy-path ingest ───────────────────────────────────────────────

DO $$
DECLARE
  r record;
BEGIN
  SELECT * INTO r FROM workflow.ingest_story_from_yaml(
    'dev-implement-leader',
    jsonb_build_object(
      'story_id',    'TEST-1090-HP2',
      'title',       'Happy path ingest test',
      'feature',     'cdbe-2030-test',
      'state',       'ready',
      'priority',    'high',
      'description', 'Full ingest test',
      'story_dir',   'plans/test',
      'story_file',  'TEST-1090-HP2.md',
      'touches_backend', true,
      'touches_database', true,
      'content', jsonb_build_array(
        jsonb_build_object('section_name', 'description', 'content_text', 'Test content', 'source_format', 'markdown'),
        jsonb_build_object('section_name', 'acceptance_criteria', 'content_text', 'AC text')
      ),
      'dependencies', jsonb_build_array(
        jsonb_build_object('depends_on_id', 'TEST-1090-D1', 'dependency_type', 'depends_on')
      )
    )
  );
  ASSERT r.inserted_stories = 1,
    format('HP-2: expected inserted_stories=1, got %s', r.inserted_stories);
  ASSERT r.updated_stories = 0,
    format('HP-2: expected updated_stories=0, got %s', r.updated_stories);
  ASSERT r.upserted_content = 2,
    format('HP-2: expected upserted_content=2, got %s', r.upserted_content);
  ASSERT r.upserted_details = 1,
    format('HP-2: expected upserted_details=1, got %s', r.upserted_details);
  ASSERT r.inserted_dependencies = 1,
    format('HP-2: expected inserted_dependencies=1, got %s', r.inserted_dependencies);
  ASSERT r.skipped_dependencies = 0,
    format('HP-2: expected skipped_dependencies=0, got %s', r.skipped_dependencies);
END $$;

SELECT ok(
  EXISTS (SELECT 1 FROM workflow.stories WHERE story_id = 'TEST-1090-HP2' AND state = 'ready'),
  'HP-2a: story TEST-1090-HP2 was created with state=ready'
);

SELECT ok(
  EXISTS (SELECT 1 FROM workflow.story_details WHERE story_id = 'TEST-1090-HP2' AND touches_backend = true),
  'HP-2b: story_details row created for TEST-1090-HP2'
);

SELECT ok(
  (SELECT count(*) FROM workflow.story_content WHERE story_id = 'TEST-1090-HP2') = 2,
  'HP-2c: two story_content sections created for TEST-1090-HP2'
);

SELECT ok(
  EXISTS (SELECT 1 FROM workflow.story_dependencies WHERE story_id = 'TEST-1090-HP2' AND depends_on_id = 'TEST-1090-D1'),
  'HP-2d: dependency TEST-1090-HP2 → TEST-1090-D1 created'
);

-- ── HP-3: Idempotent re-ingest ─────────────────────────────────────────────────

DO $$
DECLARE
  r record;
BEGIN
  -- Re-ingest same payload — should update existing story
  SELECT * INTO r FROM workflow.ingest_story_from_yaml(
    'dev-implement-leader',
    jsonb_build_object(
      'story_id',    'TEST-1090-HP2',
      'title',       'Happy path ingest test (updated)',
      'feature',     'cdbe-2030-test',
      'content', jsonb_build_array(
        jsonb_build_object('section_name', 'description', 'content_text', 'Updated content')
      ),
      'dependencies', jsonb_build_array(
        jsonb_build_object('depends_on_id', 'TEST-1090-D1', 'dependency_type', 'depends_on')
      )
    )
  );
  ASSERT r.inserted_stories = 0,
    format('HP-3: expected inserted_stories=0 (update), got %s', r.inserted_stories);
  ASSERT r.updated_stories = 1,
    format('HP-3: expected updated_stories=1, got %s', r.updated_stories);
  ASSERT r.skipped_dependencies = 1,
    format('HP-3: expected skipped_dependencies=1 (dup), got %s', r.skipped_dependencies);
END $$;

SELECT ok(
  EXISTS (SELECT 1 FROM workflow.stories WHERE story_id = 'TEST-1090-HP2' AND title = 'Happy path ingest test (updated)'),
  'HP-3a: story title was updated on re-ingest'
);

-- ── HP-4: story_content upsert by section_name ─────────────────────────────────

DO $$
BEGIN
  PERFORM workflow.ingest_story_from_yaml(
    'dev-implement-leader',
    jsonb_build_object(
      'story_id', 'TEST-1090-HP4',
      'title',    'Content upsert test',
      'feature',  'cdbe-2030-test',
      'content',  jsonb_build_array(
        jsonb_build_object('section_name', 'description', 'content_text', 'Original')
      )
    )
  );
  -- Re-ingest with updated content for same section_name
  PERFORM workflow.ingest_story_from_yaml(
    'dev-implement-leader',
    jsonb_build_object(
      'story_id', 'TEST-1090-HP4',
      'title',    'Content upsert test',
      'feature',  'cdbe-2030-test',
      'content',  jsonb_build_array(
        jsonb_build_object('section_name', 'description', 'content_text', 'Updated')
      )
    )
  );
END $$;

SELECT ok(
  (SELECT count(*) FROM workflow.story_content WHERE story_id = 'TEST-1090-HP4') = 1,
  'HP-4a: only one story_content row exists after upsert (no duplicate sections)'
);

SELECT ok(
  EXISTS (SELECT 1 FROM workflow.story_content WHERE story_id = 'TEST-1090-HP4' AND content_text = 'Updated'),
  'HP-4b: story_content section content was updated to new value'
);

-- ── HP-5: Dependency deduplication ─────────────────────────────────────────────

DO $$
DECLARE
  r record;
BEGIN
  PERFORM workflow.ingest_story_from_yaml(
    'dev-implement-leader',
    jsonb_build_object(
      'story_id',    'TEST-1090-HP5',
      'title',       'Dependency dedup test',
      'feature',     'cdbe-2030-test',
      'dependencies', jsonb_build_array(
        jsonb_build_object('depends_on_id', 'TEST-1090-D1', 'dependency_type', 'depends_on')
      )
    )
  );
  -- Re-ingest same dep — should be skipped, not inserted again
  SELECT * INTO r FROM workflow.ingest_story_from_yaml(
    'dev-implement-leader',
    jsonb_build_object(
      'story_id',    'TEST-1090-HP5',
      'title',       'Dependency dedup test',
      'feature',     'cdbe-2030-test',
      'dependencies', jsonb_build_array(
        jsonb_build_object('depends_on_id', 'TEST-1090-D1', 'dependency_type', 'depends_on')
      )
    )
  );
  ASSERT r.inserted_dependencies = 0,
    format('HP-5: expected inserted_dependencies=0, got %s', r.inserted_dependencies);
  ASSERT r.skipped_dependencies = 1,
    format('HP-5: expected skipped_dependencies=1, got %s', r.skipped_dependencies);
END $$;

SELECT ok(
  (SELECT count(*) FROM workflow.story_dependencies WHERE story_id = 'TEST-1090-HP5') = 1,
  'HP-5a: exactly one dependency row after duplicate ingest'
);

-- ── HP-6: Depth-5 dependency chain is allowed ──────────────────────────────────
-- D1 → D2 → D3 → D4 → D5 → D6 (depth = 5 from D1, which is the max allowed)
-- Existing DB: D2→D3→D4→D5→D6. Adding D1→D2 via payload.

DO $$
BEGIN
  PERFORM workflow.ingest_story_from_yaml(
    'dev-implement-leader',
    jsonb_build_object(
      'story_id',    'TEST-1090-D1',
      'title',       'pgtap depth chain 1',
      'feature',     'cdbe-2030-test',
      'dependencies', jsonb_build_array(
        jsonb_build_object('depends_on_id', 'TEST-1090-D2', 'dependency_type', 'depends_on')
      )
    )
  );
END $$;

SELECT ok(
  EXISTS (SELECT 1 FROM workflow.story_dependencies WHERE story_id = 'TEST-1090-D1' AND depends_on_id = 'TEST-1090-D2'),
  'HP-6a: depth-5 chain was accepted (D1 → D2 → D3 → D4 → D5 → D6)'
);

-- ── ED-1: Depth-6 chain is rejected ───────────────────────────────────────────
-- Adding another story that depends on D1 would create depth 6.
-- We instead add a new story TEST-1090-D0 → D1 (where D1→D2→...→D6 is depth 5)
-- making total chain 6 hops.

SELECT throws_matching(
  $$
    PERFORM workflow.ingest_story_from_yaml(
      'dev-implement-leader',
      jsonb_build_object(
        'story_id',    'TEST-1090-D0',
        'title',       'Depth 6 attempt',
        'feature',     'cdbe-2030-test',
        'dependencies', jsonb_build_array(
          jsonb_build_object('depends_on_id', 'TEST-1090-D1', 'dependency_type', 'depends_on')
        )
      )
    )
  $$,
  'P0005',
  'ED-1: depth-6 dependency chain raises P0005'
);

-- ── ED-2: Cycle detection ──────────────────────────────────────────────────────
-- DB has: CYC → D1. We try to add D1 → CYC (creating a cycle).

SELECT throws_matching(
  $$
    PERFORM workflow.ingest_story_from_yaml(
      'dev-implement-leader',
      jsonb_build_object(
        'story_id',    'TEST-1090-D1',
        'title',       'Cycle attempt',
        'feature',     'cdbe-2030-test',
        'dependencies', jsonb_build_array(
          jsonb_build_object('depends_on_id', 'TEST-1090-CYC', 'dependency_type', 'depends_on')
        )
      )
    )
  $$,
  'P0004',
  'ED-2: cycle detection raises P0004'
);

-- ── ED-3: Invalid caller ───────────────────────────────────────────────────────

SELECT throws_matching(
  $$
    PERFORM workflow.ingest_story_from_yaml(
      'unknown-agent-xyz-999',
      jsonb_build_object(
        'story_id', 'TEST-1090-ED3',
        'title',    'Unauthorized test',
        'feature',  'cdbe-2030-test'
      )
    )
  $$,
  'P0001',
  'ED-3: invalid caller_agent_id raises P0001'
);

-- ── ED-4: JSONB schema validation — missing required keys ──────────────────────

SELECT throws_matching(
  $$
    PERFORM workflow.ingest_story_from_yaml(
      'dev-implement-leader',
      jsonb_build_object(
        'title', 'Missing story_id and feature'
      )
    )
  $$,
  'P0003',
  'ED-4a: missing story_id raises P0003'
);

SELECT throws_matching(
  $$
    PERFORM workflow.ingest_story_from_yaml(
      'dev-implement-leader',
      jsonb_build_object(
        'story_id', 'TEST-1090-ED4',
        'feature',  'cdbe-2030-test'
      )
    )
  $$,
  'P0003',
  'ED-4b: missing title raises P0003'
);

SELECT throws_matching(
  $$
    PERFORM workflow.ingest_story_from_yaml(
      'dev-implement-leader',
      jsonb_build_object(
        'story_id', 'TEST-1090-ED4',
        'title',    'Missing feature'
      )
    )
  $$,
  'P0003',
  'ED-4c: missing feature raises P0003'
);

SELECT throws_matching(
  $$
    PERFORM workflow.ingest_story_from_yaml(
      'dev-implement-leader',
      NULL
    )
  $$,
  'P0003',
  'ED-4d: NULL payload raises P0003'
);

SELECT * FROM finish();

ROLLBACK;
