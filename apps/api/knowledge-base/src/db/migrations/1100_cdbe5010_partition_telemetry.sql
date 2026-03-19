-- Migration: 1100_cdbe5010_partition_telemetry
-- Story:     CDBE-5010 — Partition agent_invocations and token_usage Tables
--
-- Strategy: rename+copy (required because PostgreSQL cannot ALTER TABLE ... PARTITION BY
--           on a non-empty table).
--
-- Tables affected:
--   workflow.agent_invocations   — RANGE-partitioned on started_at
--   analytics.story_token_usage  — RANGE-partitioned on logged_at
--
-- Partition layout (both tables):
--   _default   — DEFAULT partition (historical / out-of-range data)
--   _y2026m03  — 2026-03-01 ≤ ts < 2026-04-01  (current month at migration time)
--   _y2026m04  — 2026-04-01 ≤ ts < 2026-05-01  (next month)
--
-- FK strategy:
--   The child tables (agent_outcomes, agent_decisions, hitl_decisions) hold only
--   invocation_id (uuid), not started_at.  FKs reference agent_invocations(id) via
--   a per-partition UNIQUE INDEX ON (id).  This is the correct PostgreSQL pattern
--   for FK from non-partitioned child to partitioned parent when the FK column set
--   is a subset of the partition key.
--
-- MAINTENANCE WINDOW NOTE:
--   The INSERT INTO … SELECT * FROM _old step acquires a lock on the old table for
--   the duration of the copy.  For production, run during a low-traffic maintenance
--   window.  The entire migration is a single transaction — if any step fails the
--   whole migration rolls back cleanly.
--
-- Requires: migrations 999_full_schema_baseline, 999_add_telemetry_tables applied.
-- Usage: psql $KB_DATABASE_URL -f 1100_cdbe5010_partition_telemetry.sql

BEGIN;

-- ============================================================
-- SECTION 0 — Safety preamble: verify we are on the right DB
-- ============================================================

DO $$
BEGIN
  IF current_database() NOT IN ('knowledgebase', 'knowledge_base', 'kbdb') THEN
    RAISE EXCEPTION '1100: Wrong database. current_database() = %, expected knowledgebase/kbdb. Aborting.',
      current_database();
  END IF;
END;
$$;

-- ============================================================
-- SECTION 1 — Snapshot pre-migration row counts
-- ============================================================

DO $$
DECLARE
  v_ai_count   bigint;
  v_stu_count  bigint;
BEGIN
  SELECT COUNT(*) INTO v_ai_count  FROM workflow.agent_invocations;
  SELECT COUNT(*) INTO v_stu_count FROM analytics.story_token_usage;

  RAISE NOTICE '1100: Pre-migration snapshot — agent_invocations: % rows, story_token_usage: % rows',
    v_ai_count, v_stu_count;

  -- Stash into a temp table so post-migration DO blocks can read them
  CREATE TEMP TABLE IF NOT EXISTS _migration_1100_counts (
    table_name text PRIMARY KEY,
    row_count   bigint NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _migration_1100_counts VALUES
    ('agent_invocations',  v_ai_count),
    ('story_token_usage',  v_stu_count)
  ON CONFLICT (table_name) DO UPDATE SET row_count = EXCLUDED.row_count;
END;
$$;

-- ============================================================
-- SECTION 2 — Drop FKs referencing workflow.agent_invocations
-- ============================================================

ALTER TABLE workflow.agent_outcomes
  DROP CONSTRAINT IF EXISTS agent_outcomes_invocation_id_fkey;

ALTER TABLE workflow.agent_decisions
  DROP CONSTRAINT IF EXISTS agent_decisions_invocation_id_fkey;

ALTER TABLE workflow.hitl_decisions
  DROP CONSTRAINT IF EXISTS hitl_decisions_invocation_id_fkey;

-- ============================================================
-- SECTION 3 — Rename original agent_invocations to _old
-- ============================================================

ALTER TABLE workflow.agent_invocations RENAME TO agent_invocations_old;

-- ============================================================
-- SECTION 4 — Create partitioned parent: workflow.agent_invocations
-- ============================================================
-- NOTE: Drizzle ORM does not model PARTITION BY — partitioning is managed
-- entirely in this migration.  The Drizzle schema definition (workflow.ts)
-- carries an explanatory comment pointing here.
--
-- PK is now (id, started_at) as required by PostgreSQL range-partitioned tables
-- where the partition key column must be part of every unique constraint.

CREATE TABLE workflow.agent_invocations (
  id              uuid                        NOT NULL DEFAULT gen_random_uuid(),
  invocation_id   text                        NOT NULL,
  agent_name      text                        NOT NULL,
  story_id        text,
  phase           text,
  input_payload   jsonb,
  output_payload  jsonb,
  duration_ms     integer,
  input_tokens    integer,
  output_tokens   integer,
  status          text                        NOT NULL,
  error_message   text,
  started_at      timestamp with time zone    NOT NULL DEFAULT now(),
  completed_at    timestamp with time zone,
  created_at      timestamp with time zone    NOT NULL DEFAULT now(),
  cached_tokens   integer                     NOT NULL DEFAULT 0,
  total_tokens    integer                     NOT NULL DEFAULT 0,
  estimated_cost  numeric(10, 4)              NOT NULL DEFAULT '0.0000',
  model_name      text,
  CONSTRAINT agent_invocations_pkey PRIMARY KEY (id, started_at)
) PARTITION BY RANGE (started_at);

-- ============================================================
-- SECTION 5 — Create partitions for agent_invocations
-- ============================================================

CREATE TABLE workflow.agent_invocations_default
  PARTITION OF workflow.agent_invocations
  DEFAULT;

CREATE TABLE workflow.agent_invocations_y2026m03
  PARTITION OF workflow.agent_invocations
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE workflow.agent_invocations_y2026m04
  PARTITION OF workflow.agent_invocations
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- ============================================================
-- SECTION 6 — Indexes for agent_invocations
-- ============================================================
-- AC-3: per-partition UNIQUE INDEX on (invocation_id, started_at)
-- FK support: per-partition UNIQUE INDEX on (id) alone so that child tables
--             referencing agent_invocations(id) continue to work without
--             needing started_at on those child tables.

-- DEFAULT partition
CREATE UNIQUE INDEX agent_invocations_default_invocation_id_started_at_uidx
  ON workflow.agent_invocations_default (invocation_id, started_at);

CREATE UNIQUE INDEX agent_invocations_default_id_uidx
  ON workflow.agent_invocations_default (id);

-- y2026m03 partition
CREATE UNIQUE INDEX agent_invocations_y2026m03_invocation_id_started_at_uidx
  ON workflow.agent_invocations_y2026m03 (invocation_id, started_at);

CREATE UNIQUE INDEX agent_invocations_y2026m03_id_uidx
  ON workflow.agent_invocations_y2026m03 (id);

-- y2026m04 partition
CREATE UNIQUE INDEX agent_invocations_y2026m04_invocation_id_started_at_uidx
  ON workflow.agent_invocations_y2026m04 (invocation_id, started_at);

CREATE UNIQUE INDEX agent_invocations_y2026m04_id_uidx
  ON workflow.agent_invocations_y2026m04 (id);

-- Performance indexes on parent (PostgreSQL propagates to partitions automatically)
CREATE INDEX agent_invocations_agent_name_idx
  ON workflow.agent_invocations (agent_name);

CREATE INDEX agent_invocations_story_id_idx
  ON workflow.agent_invocations (story_id);

CREATE INDEX agent_invocations_started_at_idx
  ON workflow.agent_invocations (started_at);

CREATE INDEX agent_invocations_status_idx
  ON workflow.agent_invocations (status);

CREATE INDEX agent_invocations_agent_name_started_at_idx
  ON workflow.agent_invocations (agent_name, started_at);

CREATE INDEX agent_invocations_agent_name_story_id_idx
  ON workflow.agent_invocations (agent_name, story_id);

-- ============================================================
-- SECTION 7 — Copy data from _old into new partitioned table
-- ============================================================

INSERT INTO workflow.agent_invocations
SELECT
  id, invocation_id, agent_name, story_id, phase,
  input_payload, output_payload, duration_ms, input_tokens, output_tokens,
  status, error_message, started_at, completed_at, created_at,
  cached_tokens, total_tokens, estimated_cost, model_name
FROM workflow.agent_invocations_old;

-- ============================================================
-- SECTION 8 — Verify agent_invocations row count
-- ============================================================

DO $$
DECLARE
  v_expected  bigint;
  v_actual    bigint;
BEGIN
  SELECT row_count INTO v_expected
  FROM _migration_1100_counts
  WHERE table_name = 'agent_invocations';

  SELECT COUNT(*) INTO v_actual FROM workflow.agent_invocations;

  IF v_actual <> v_expected THEN
    RAISE EXCEPTION '1100: agent_invocations row count mismatch — expected %, got %. Rolling back.',
      v_expected, v_actual;
  END IF;

  RAISE NOTICE '1100: agent_invocations row count verified: % rows', v_actual;
END;
$$;

-- ============================================================
-- SECTION 9 — Recreate FKs referencing new partitioned agent_invocations
-- ============================================================
-- Note: references agent_invocations(id) — supported by per-partition
--       UNIQUE INDEX ON (id) created in section 6.

ALTER TABLE workflow.agent_outcomes
  ADD CONSTRAINT agent_outcomes_invocation_id_fkey
  FOREIGN KEY (invocation_id)
  REFERENCES workflow.agent_invocations(id)
  ON DELETE CASCADE;

ALTER TABLE workflow.agent_decisions
  ADD CONSTRAINT agent_decisions_invocation_id_fkey
  FOREIGN KEY (invocation_id)
  REFERENCES workflow.agent_invocations(id)
  ON DELETE CASCADE;

ALTER TABLE workflow.hitl_decisions
  ADD CONSTRAINT hitl_decisions_invocation_id_fkey
  FOREIGN KEY (invocation_id)
  REFERENCES workflow.agent_invocations(id)
  ON DELETE SET NULL;

-- ============================================================
-- SECTION 10 — Drop old agent_invocations table
-- ============================================================

DROP TABLE workflow.agent_invocations_old;

-- ============================================================
-- SECTION 11 — Rename original story_token_usage to _old
-- ============================================================

ALTER TABLE analytics.story_token_usage RENAME TO story_token_usage_old;

-- ============================================================
-- SECTION 12 — Create partitioned parent: analytics.story_token_usage
-- ============================================================
-- NOTE: The baseline schema (999_full_schema_baseline.sql) defines story_token_usage
-- without an estimated_cost column.  The Drizzle schema (analytics.ts) likewise omits it.
-- This migration matches the canonical baseline exactly.
-- The CHECK constraint story_token_usage_phase_check is preserved.
-- PK is now (id, logged_at) as required for the range partition key.

CREATE TABLE analytics.story_token_usage (
  id              uuid                        NOT NULL DEFAULT gen_random_uuid(),
  story_id        text                        NOT NULL,
  feature         text,
  phase           text                        NOT NULL,
  agent           text,
  iteration       integer                                DEFAULT 0,
  input_tokens    integer                     NOT NULL DEFAULT 0,
  output_tokens   integer                     NOT NULL DEFAULT 0,
  total_tokens    integer                     NOT NULL DEFAULT 0,
  logged_at       timestamp with time zone    NOT NULL DEFAULT now(),
  created_at      timestamp with time zone    NOT NULL DEFAULT now(),
  CONSTRAINT story_token_usage_pkey PRIMARY KEY (id, logged_at),
  CONSTRAINT story_token_usage_phase_check CHECK (
    phase = ANY (ARRAY[
      'pm-generate'::text,
      'pm-elaborate'::text,
      'pm-refine'::text,
      'dev-setup'::text,
      'dev-implementation'::text,
      'dev-fix'::text,
      'code-review'::text,
      'qa-verification'::text,
      'qa-gate'::text,
      'architect-review'::text,
      'other'::text
    ])
  )
) PARTITION BY RANGE (logged_at);

-- ============================================================
-- SECTION 13 — Create partitions for story_token_usage
-- ============================================================

CREATE TABLE analytics.story_token_usage_default
  PARTITION OF analytics.story_token_usage
  DEFAULT;

CREATE TABLE analytics.story_token_usage_y2026m03
  PARTITION OF analytics.story_token_usage
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE analytics.story_token_usage_y2026m04
  PARTITION OF analytics.story_token_usage
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- ============================================================
-- SECTION 14 — Indexes on story_token_usage
-- ============================================================

CREATE INDEX story_token_usage_story_id_idx
  ON analytics.story_token_usage (story_id);

CREATE INDEX story_token_usage_feature_idx
  ON analytics.story_token_usage (feature);

CREATE INDEX story_token_usage_phase_idx
  ON analytics.story_token_usage (phase);

CREATE INDEX story_token_usage_logged_at_idx
  ON analytics.story_token_usage (logged_at);

CREATE INDEX story_token_usage_feature_phase_idx
  ON analytics.story_token_usage (feature, phase);

CREATE INDEX story_token_usage_phase_logged_at_idx
  ON analytics.story_token_usage (phase, logged_at);

-- ============================================================
-- SECTION 15 — Copy data from _old into new partitioned story_token_usage
-- ============================================================

INSERT INTO analytics.story_token_usage
SELECT
  id, story_id, feature, phase, agent, iteration,
  input_tokens, output_tokens, total_tokens, logged_at, created_at
FROM analytics.story_token_usage_old;

-- ============================================================
-- SECTION 16 — Verify story_token_usage row count
-- ============================================================

DO $$
DECLARE
  v_expected  bigint;
  v_actual    bigint;
BEGIN
  SELECT row_count INTO v_expected
  FROM _migration_1100_counts
  WHERE table_name = 'story_token_usage';

  SELECT COUNT(*) INTO v_actual FROM analytics.story_token_usage;

  IF v_actual <> v_expected THEN
    RAISE EXCEPTION '1100: story_token_usage row count mismatch — expected %, got %. Rolling back.',
      v_expected, v_actual;
  END IF;

  RAISE NOTICE '1100: story_token_usage row count verified: % rows', v_actual;
END;
$$;

-- ============================================================
-- SECTION 17 — Verify no orphaned FK rows
-- ============================================================

DO $$
DECLARE
  v_orphaned_outcomes   bigint;
  v_orphaned_decisions  bigint;
  v_orphaned_hitl       bigint;
BEGIN
  -- agent_outcomes orphans
  SELECT COUNT(*)
  INTO v_orphaned_outcomes
  FROM workflow.agent_outcomes o
  LEFT JOIN workflow.agent_invocations ai ON ai.id = o.invocation_id
  WHERE ai.id IS NULL;

  IF v_orphaned_outcomes > 0 THEN
    RAISE EXCEPTION '1100: % orphaned agent_outcomes rows after migration (invocation_id not found in agent_invocations).',
      v_orphaned_outcomes;
  END IF;

  -- agent_decisions orphans
  SELECT COUNT(*)
  INTO v_orphaned_decisions
  FROM workflow.agent_decisions d
  LEFT JOIN workflow.agent_invocations ai ON ai.id = d.invocation_id
  WHERE ai.id IS NULL;

  IF v_orphaned_decisions > 0 THEN
    RAISE EXCEPTION '1100: % orphaned agent_decisions rows after migration (invocation_id not found in agent_invocations).',
      v_orphaned_decisions;
  END IF;

  -- hitl_decisions orphans (invocation_id is nullable — only check non-NULL rows)
  SELECT COUNT(*)
  INTO v_orphaned_hitl
  FROM workflow.hitl_decisions h
  LEFT JOIN workflow.agent_invocations ai ON ai.id = h.invocation_id
  WHERE h.invocation_id IS NOT NULL
    AND ai.id IS NULL;

  IF v_orphaned_hitl > 0 THEN
    RAISE EXCEPTION '1100: % orphaned hitl_decisions rows after migration (non-null invocation_id not found in agent_invocations).',
      v_orphaned_hitl;
  END IF;

  RAISE NOTICE '1100: FK orphan check passed — no orphaned rows in agent_outcomes, agent_decisions, or hitl_decisions.';
END;
$$;

-- ============================================================
-- SECTION 18 — Drop old story_token_usage table
-- ============================================================

DROP TABLE analytics.story_token_usage_old;

-- ============================================================
-- SECTION 19 — Completion notice
-- ============================================================

DO $$
DECLARE
  v_ai_rows     bigint;
  v_stu_rows    bigint;
  v_ai_parts    bigint;
  v_stu_parts   bigint;
BEGIN
  SELECT COUNT(*) INTO v_ai_rows  FROM workflow.agent_invocations;
  SELECT COUNT(*) INTO v_stu_rows FROM analytics.story_token_usage;

  SELECT COUNT(*)
  INTO v_ai_parts
  FROM pg_class c
  JOIN pg_inherits i ON i.inhrelid = c.oid
  JOIN pg_class p ON p.oid = i.inhparent
  JOIN pg_namespace ns ON ns.oid = p.relnamespace
  WHERE ns.nspname = 'workflow'
    AND p.relname = 'agent_invocations';

  SELECT COUNT(*)
  INTO v_stu_parts
  FROM pg_class c
  JOIN pg_inherits i ON i.inhrelid = c.oid
  JOIN pg_class p ON p.oid = i.inhparent
  JOIN pg_namespace ns ON ns.oid = p.relnamespace
  WHERE ns.nspname = 'analytics'
    AND p.relname = 'story_token_usage';

  RAISE NOTICE '1100: Migration complete. agent_invocations: % rows across % partitions. story_token_usage: % rows across % partitions.',
    v_ai_rows, v_ai_parts, v_stu_rows, v_stu_parts;
END;
$$;

-- ============================================================
-- SECTION 20 — Table comments
-- ============================================================

COMMENT ON TABLE workflow.agent_invocations IS
  '1100: RANGE-partitioned on started_at. PK (id, started_at). '
  'Monthly partitions named agent_invocations_y<YYYY>m<MM>. '
  'DEFAULT partition for historical data. '
  'FKs from agent_outcomes, agent_decisions, hitl_decisions reference (id) via per-partition unique index.';

COMMENT ON TABLE analytics.story_token_usage IS
  '1100: RANGE-partitioned on logged_at. PK (id, logged_at). '
  'Monthly partitions named story_token_usage_y<YYYY>m<MM>. '
  'DEFAULT partition for historical data. No dependent FKs.';

COMMIT;
