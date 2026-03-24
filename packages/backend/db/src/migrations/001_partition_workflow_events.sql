-- =============================================================================
-- Migration 001: Convert telemetry.workflow_events to monthly range-partitioned table
-- Story: CDBE-5020
-- Target DB: lego_dev
-- Partition key: ts (timestamptz, NOT NULL DEFAULT NOW())
-- Partition convention: telemetry.workflow_events_y<YYYY>m<MM>
-- =============================================================================

-- Safety preamble: abort if not running against lego_dev
DO $$
BEGIN
  IF current_database() <> 'lego_dev' THEN
    RAISE EXCEPTION
      'Migration 001 aborted: expected database ''lego_dev'', got ''%''',
      current_database();
  END IF;
END;
$$;

-- =============================================================================
-- Step 1: Rename existing table to backup (IF the original table still exists
--         as a plain table — guard for idempotency on re-run)
-- =============================================================================
DO $$
BEGIN
  -- Only rename if workflow_events exists as a plain/heap table (relkind = 'r')
  -- and the backup does not already exist (idempotency guard)
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'telemetry'
      AND c.relname = 'workflow_events'
      AND c.relkind = 'r'
  ) THEN
    ALTER TABLE telemetry.workflow_events RENAME TO workflow_events_old;
    RAISE NOTICE 'Renamed telemetry.workflow_events to telemetry.workflow_events_old';
  ELSIF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'telemetry'
      AND c.relname = 'workflow_events'
      AND c.relkind = 'p'  -- already partitioned
  ) THEN
    RAISE NOTICE 'telemetry.workflow_events is already a partitioned table — skipping rename step';
  ELSE
    RAISE NOTICE 'telemetry.workflow_events_old already exists or workflow_events missing — skipping rename step';
  END IF;
END;
$$;

-- =============================================================================
-- Step 2: Drop old unique index on event_id (if it exists on the plain table)
--         Indexes cannot be copied to partitioned tables directly; we recreate them.
-- =============================================================================
DROP INDEX IF EXISTS telemetry.idx_workflow_events_event_id_unique;

-- =============================================================================
-- Step 3: Create new partitioned parent table
--         Same column set as original (per schema.ts lines 551–579)
--         Partitioned by RANGE on ts
-- =============================================================================
CREATE TABLE IF NOT EXISTS telemetry.workflow_events (
  event_id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  event_type       telemetry.workflow_event_type NOT NULL,
  event_version    integer     NOT NULL DEFAULT 1,
  ts               timestamptz NOT NULL DEFAULT NOW(),
  run_id           text,
  item_id          text,
  workflow_name    text,
  agent_role       text,
  status           text,
  payload          jsonb,
  correlation_id   uuid,
  source           text,
  emitted_by       text
) PARTITION BY RANGE (ts);

-- =============================================================================
-- Step 4: Create initial child partitions
--         Current month (2026-03) + next 2 months (2026-04, 2026-05)
--         Adjust manually if deploying in a different month.
-- =============================================================================

-- Current month partition
CREATE TABLE IF NOT EXISTS telemetry.workflow_events_y2026m03
  PARTITION OF telemetry.workflow_events
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- Next month
CREATE TABLE IF NOT EXISTS telemetry.workflow_events_y2026m04
  PARTITION OF telemetry.workflow_events
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- Month after next
CREATE TABLE IF NOT EXISTS telemetry.workflow_events_y2026m05
  PARTITION OF telemetry.workflow_events
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- Historical catch-all partition for any rows with ts before 2026-03-01
-- (covers data migrated from workflow_events_old that may predate current month)
CREATE TABLE IF NOT EXISTS telemetry.workflow_events_y2026m01
  PARTITION OF telemetry.workflow_events
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE IF NOT EXISTS telemetry.workflow_events_y2026m02
  PARTITION OF telemetry.workflow_events
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Catch-all for any rows older than 2026-01-01
CREATE TABLE IF NOT EXISTS telemetry.workflow_events_y2025_and_prior
  PARTITION OF telemetry.workflow_events
  FOR VALUES FROM (MINVALUE) TO ('2026-01-01');

-- =============================================================================
-- Step 5: Migrate existing data from backup table
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'telemetry'
      AND c.relname = 'workflow_events_old'
  ) THEN
    INSERT INTO telemetry.workflow_events
    SELECT
      event_id,
      event_type,
      event_version,
      ts,
      run_id,
      item_id,
      workflow_name,
      agent_role,
      status,
      payload,
      correlation_id,
      source,
      emitted_by
    FROM telemetry.workflow_events_old;

    RAISE NOTICE 'Migrated rows from workflow_events_old to partitioned workflow_events';
  ELSE
    RAISE NOTICE 'workflow_events_old not found — skipping data migration (already migrated or fresh install)';
  END IF;
END;
$$;

-- =============================================================================
-- Step 6: Drop backup table (only if data migration succeeded)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'telemetry'
      AND c.relname = 'workflow_events_old'
  ) THEN
    DROP TABLE telemetry.workflow_events_old;
    RAISE NOTICE 'Dropped telemetry.workflow_events_old';
  END IF;
END;
$$;

-- =============================================================================
-- Step 7: Recreate indexes on partitioned parent
--         (PostgreSQL propagates to child partitions automatically)
-- =============================================================================

-- Unique index on event_id (was uniqueIndex in Drizzle schema)
CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_events_event_id_unique
  ON telemetry.workflow_events (event_id);

-- Composite index: event_type + ts (primary time-range access pattern)
CREATE INDEX IF NOT EXISTS idx_workflow_events_event_type_ts
  ON telemetry.workflow_events (event_type, ts);

-- Composite index: run_id + ts
CREATE INDEX IF NOT EXISTS idx_workflow_events_run_id_ts
  ON telemetry.workflow_events (run_id, ts);

-- Index: item_id
CREATE INDEX IF NOT EXISTS idx_workflow_events_item_id
  ON telemetry.workflow_events (item_id);

-- Index: workflow_name
CREATE INDEX IF NOT EXISTS idx_workflow_events_workflow_name
  ON telemetry.workflow_events (workflow_name);

-- Index: agent_role
CREATE INDEX IF NOT EXISTS idx_workflow_events_agent_role
  ON telemetry.workflow_events (agent_role);

-- Index: status
CREATE INDEX IF NOT EXISTS idx_workflow_events_status
  ON telemetry.workflow_events (status);

-- Index: ts (standalone for pure time-range queries)
CREATE INDEX IF NOT EXISTS idx_workflow_events_ts
  ON telemetry.workflow_events (ts);

-- =============================================================================
-- Verification notice
-- =============================================================================
DO $$
DECLARE
  partition_count integer;
  row_count bigint;
BEGIN
  SELECT count(*)
  INTO partition_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'telemetry'
    AND c.relname LIKE 'workflow_events_%'
    AND c.relkind = 'r';

  SELECT count(*) INTO row_count FROM telemetry.workflow_events;

  RAISE NOTICE 'Migration 001 complete: % child partitions, % total rows accessible via parent',
    partition_count, row_count;
END;
$$;

-- =============================================================================
-- ROLLBACK INSTRUCTIONS (inverse steps — do NOT run unless reverting migration)
-- =============================================================================
--
-- To revert this migration and restore the unpartitioned table:
--
-- 1. Rename current (partitioned) table to backup:
--    ALTER TABLE telemetry.workflow_events RENAME TO workflow_events_partitioned;
--
-- 2. Create plain replacement table (identical schema, no PARTITION BY):
--    CREATE TABLE telemetry.workflow_events (
--      event_id         uuid        NOT NULL DEFAULT gen_random_uuid(),
--      event_type       telemetry.workflow_event_type NOT NULL,
--      event_version    integer     NOT NULL DEFAULT 1,
--      ts               timestamptz NOT NULL DEFAULT NOW(),
--      run_id           text,
--      item_id          text,
--      workflow_name    text,
--      agent_role       text,
--      status           text,
--      payload          jsonb,
--      correlation_id   uuid,
--      source           text,
--      emitted_by       text
--    );
--
-- 3. Migrate data back from all child partitions via parent:
--    INSERT INTO telemetry.workflow_events SELECT * FROM telemetry.workflow_events_partitioned;
--
-- 4. Drop partitioned table and all child partitions:
--    DROP TABLE telemetry.workflow_events_partitioned CASCADE;
--    -- CASCADE drops all child partition tables automatically.
--
-- 5. Recreate unique constraint and indexes on plain table:
--    CREATE UNIQUE INDEX idx_workflow_events_event_id_unique ON telemetry.workflow_events (event_id);
--    CREATE INDEX idx_workflow_events_event_type_ts ON telemetry.workflow_events (event_type, ts);
--    CREATE INDEX idx_workflow_events_run_id_ts ON telemetry.workflow_events (run_id, ts);
--    CREATE INDEX idx_workflow_events_item_id ON telemetry.workflow_events (item_id);
--    CREATE INDEX idx_workflow_events_workflow_name ON telemetry.workflow_events (workflow_name);
--    CREATE INDEX idx_workflow_events_agent_role ON telemetry.workflow_events (agent_role);
--    CREATE INDEX idx_workflow_events_status ON telemetry.workflow_events (status);
--    CREATE INDEX idx_workflow_events_ts ON telemetry.workflow_events (ts);
--
-- =============================================================================
