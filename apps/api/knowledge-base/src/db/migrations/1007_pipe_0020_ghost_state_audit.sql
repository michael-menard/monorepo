-- Migration 1007: Ghost State Data Migration — Audit Trail for PIPE-0020
--
-- Purpose: Verify no ghost-state rows remain after migration 1001, and record
--          a retroactive audit trail in workflow.story_state_history for each
--          story that was migrated from a ghost state to a canonical state.
--
-- Ghost state mappings (same as migration 1001):
--   uat            → completed
--   done           → completed
--   in_review      → needs_code_review
--   ready_for_review → needs_code_review
--   deferred       → cancelled
--   ready_to_work  → ready
--   elaboration    → elab
--   draft          → backlog
--
-- Design decisions:
--   - DISABLE/ENABLE TRIGGER (guarded: only if trigger exists) to allow ghost-state UPDATEs
--   - NOT EXISTS guard on history INSERT (no unique constraint — guard prevents duplication)
--   - event_type = 'state_change' (matches CHECK constraint on story_state_history)
--   - metadata records migration source and original ghost state
--   - Idempotent: safe to run multiple times
--
-- Dependency: Migration 1001 should be applied first (trigger guard handles both cases).

-- ── 0. Safety preamble ────────────────────────────────────────────────────────

DO $$
BEGIN
  IF current_database() <> 'knowledgebase' THEN
    RAISE EXCEPTION '1007: This migration must run against the ''knowledgebase'' database. '
      'Current database: %', current_database();
  END IF;
  RAISE NOTICE '1007: Safety check passed — running against database: %', current_database();
END $$;

-- ── 1. Pre-flight count ───────────────────────────────────────────────────────

DO $$
DECLARE
  ghost_rows_found int;
BEGIN
  SELECT COUNT(*)::int INTO ghost_rows_found
  FROM workflow.stories
  WHERE state::text IN (
    'uat', 'done', 'in_review', 'ready_for_review',
    'deferred', 'ready_to_work', 'elaboration', 'draft'
  );

  RAISE NOTICE '1007: Pre-flight — ghost_rows_found=%', ghost_rows_found;
END $$;

-- ── 2. Ghost-state UPDATEs + History backfill ────────────────────────────────
-- All logic in a single DO $$ block to capture row counts via GET DIAGNOSTICS.
-- UPDATEs are idempotent: WHERE clause matches only rows still in ghost state.
-- History INSERT uses NOT EXISTS guard (no unique constraint beyond PK).
-- event_type = 'state_change' matches the CHECK constraint on story_state_history.
--
-- For each history backfill mapping, we look for stories that:
--   (a) are currently in the canonical target state, AND
--   (b) have an existing history row whose from_state = the ghost state
--       (evidence the story was in the ghost state at some prior point)
-- This ensures we only backfill rows where there is provenance evidence.

DO $$
DECLARE
  ghost_rows_found      int;
  rows_updated          int := 0;
  v_count               int;
  history_rows_inserted int;
BEGIN
  -- Count remaining ghost rows before UPDATEs
  SELECT COUNT(*)::int INTO ghost_rows_found
  FROM workflow.stories
  WHERE state::text IN (
    'uat', 'done', 'in_review', 'ready_for_review',
    'deferred', 'ready_to_work', 'elaboration', 'draft'
  );

  -- ── 3a. DISABLE transition trigger (if it exists) ──────────────────────────
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND c.relname = 'stories'
      AND t.tgname = 'enforce_state_transition'
  ) THEN
    ALTER TABLE workflow.stories DISABLE TRIGGER enforce_state_transition;
    RAISE NOTICE '1007: enforce_state_transition trigger DISABLED';
  ELSE
    RAISE NOTICE '1007: enforce_state_transition trigger not found — skipping DISABLE (safe)';
  END IF;

  -- ── 3b. Idempotent ghost-state UPDATEs with row count capture ──────────────
  UPDATE workflow.stories SET state = 'completed'         WHERE state::text = 'uat';
  GET DIAGNOSTICS v_count = ROW_COUNT; rows_updated := rows_updated + v_count;

  UPDATE workflow.stories SET state = 'completed'         WHERE state::text = 'done';
  GET DIAGNOSTICS v_count = ROW_COUNT; rows_updated := rows_updated + v_count;

  UPDATE workflow.stories SET state = 'needs_code_review' WHERE state::text = 'in_review';
  GET DIAGNOSTICS v_count = ROW_COUNT; rows_updated := rows_updated + v_count;

  UPDATE workflow.stories SET state = 'needs_code_review' WHERE state::text = 'ready_for_review';
  GET DIAGNOSTICS v_count = ROW_COUNT; rows_updated := rows_updated + v_count;

  UPDATE workflow.stories SET state = 'cancelled'         WHERE state::text = 'deferred';
  GET DIAGNOSTICS v_count = ROW_COUNT; rows_updated := rows_updated + v_count;

  UPDATE workflow.stories SET state = 'ready'             WHERE state::text = 'ready_to_work';
  GET DIAGNOSTICS v_count = ROW_COUNT; rows_updated := rows_updated + v_count;

  UPDATE workflow.stories SET state = 'elab'              WHERE state::text = 'elaboration';
  GET DIAGNOSTICS v_count = ROW_COUNT; rows_updated := rows_updated + v_count;

  UPDATE workflow.stories SET state = 'backlog'           WHERE state::text = 'draft';
  GET DIAGNOSTICS v_count = ROW_COUNT; rows_updated := rows_updated + v_count;

  -- ── 3c. ENABLE transition trigger (if it exists) ───────────────────────────
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'workflow'
      AND c.relname = 'stories'
      AND t.tgname = 'enforce_state_transition'
  ) THEN
    ALTER TABLE workflow.stories ENABLE TRIGGER enforce_state_transition;
    RAISE NOTICE '1007: enforce_state_transition trigger ENABLED';
  ELSE
    RAISE NOTICE '1007: enforce_state_transition trigger not found — skipping ENABLE (safe)';
  END IF;

  RAISE NOTICE '1007: UPDATEs complete — rows_updated=%', rows_updated;

  -- ── 3d. History backfill INSERTs ───────────────────────────────────────────

  -- Backfill: uat → completed
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

  -- Backfill: done → completed
  INSERT INTO workflow.story_state_history (story_id, event_type, from_state, to_state, metadata)
  SELECT
    s.story_id,
    'state_change',
    'done',
    'completed',
    jsonb_build_object(
      'migrated_by', 'PIPE-0020',
      'migration_date', NOW()::text,
      'original_state', 'done'
    )
  FROM workflow.stories s
  WHERE s.state::text = 'completed'
    AND NOT EXISTS (
      SELECT 1 FROM workflow.story_state_history h
      WHERE h.story_id = s.story_id
        AND h.event_type = 'state_change'
        AND h.from_state = 'done'
        AND h.to_state = 'completed'
        AND (h.metadata->>'migrated_by') = 'PIPE-0020'
    )
    AND EXISTS (
      SELECT 1 FROM workflow.story_state_history h2
      WHERE h2.story_id = s.story_id
        AND h2.from_state = 'done'
    );

  -- Backfill: in_review → needs_code_review
  INSERT INTO workflow.story_state_history (story_id, event_type, from_state, to_state, metadata)
  SELECT
    s.story_id,
    'state_change',
    'in_review',
    'needs_code_review',
    jsonb_build_object(
      'migrated_by', 'PIPE-0020',
      'migration_date', NOW()::text,
      'original_state', 'in_review'
    )
  FROM workflow.stories s
  WHERE s.state::text = 'needs_code_review'
    AND NOT EXISTS (
      SELECT 1 FROM workflow.story_state_history h
      WHERE h.story_id = s.story_id
        AND h.event_type = 'state_change'
        AND h.from_state = 'in_review'
        AND h.to_state = 'needs_code_review'
        AND (h.metadata->>'migrated_by') = 'PIPE-0020'
    )
    AND EXISTS (
      SELECT 1 FROM workflow.story_state_history h2
      WHERE h2.story_id = s.story_id
        AND h2.from_state = 'in_review'
    );

  -- Backfill: ready_for_review → needs_code_review
  INSERT INTO workflow.story_state_history (story_id, event_type, from_state, to_state, metadata)
  SELECT
    s.story_id,
    'state_change',
    'ready_for_review',
    'needs_code_review',
    jsonb_build_object(
      'migrated_by', 'PIPE-0020',
      'migration_date', NOW()::text,
      'original_state', 'ready_for_review'
    )
  FROM workflow.stories s
  WHERE s.state::text = 'needs_code_review'
    AND NOT EXISTS (
      SELECT 1 FROM workflow.story_state_history h
      WHERE h.story_id = s.story_id
        AND h.event_type = 'state_change'
        AND h.from_state = 'ready_for_review'
        AND h.to_state = 'needs_code_review'
        AND (h.metadata->>'migrated_by') = 'PIPE-0020'
    )
    AND EXISTS (
      SELECT 1 FROM workflow.story_state_history h2
      WHERE h2.story_id = s.story_id
        AND h2.from_state = 'ready_for_review'
    );

  -- Backfill: deferred → cancelled
  INSERT INTO workflow.story_state_history (story_id, event_type, from_state, to_state, metadata)
  SELECT
    s.story_id,
    'state_change',
    'deferred',
    'cancelled',
    jsonb_build_object(
      'migrated_by', 'PIPE-0020',
      'migration_date', NOW()::text,
      'original_state', 'deferred'
    )
  FROM workflow.stories s
  WHERE s.state::text = 'cancelled'
    AND NOT EXISTS (
      SELECT 1 FROM workflow.story_state_history h
      WHERE h.story_id = s.story_id
        AND h.event_type = 'state_change'
        AND h.from_state = 'deferred'
        AND h.to_state = 'cancelled'
        AND (h.metadata->>'migrated_by') = 'PIPE-0020'
    )
    AND EXISTS (
      SELECT 1 FROM workflow.story_state_history h2
      WHERE h2.story_id = s.story_id
        AND h2.from_state = 'deferred'
    );

  -- Backfill: ready_to_work → ready
  INSERT INTO workflow.story_state_history (story_id, event_type, from_state, to_state, metadata)
  SELECT
    s.story_id,
    'state_change',
    'ready_to_work',
    'ready',
    jsonb_build_object(
      'migrated_by', 'PIPE-0020',
      'migration_date', NOW()::text,
      'original_state', 'ready_to_work'
    )
  FROM workflow.stories s
  WHERE s.state::text = 'ready'
    AND NOT EXISTS (
      SELECT 1 FROM workflow.story_state_history h
      WHERE h.story_id = s.story_id
        AND h.event_type = 'state_change'
        AND h.from_state = 'ready_to_work'
        AND h.to_state = 'ready'
        AND (h.metadata->>'migrated_by') = 'PIPE-0020'
    )
    AND EXISTS (
      SELECT 1 FROM workflow.story_state_history h2
      WHERE h2.story_id = s.story_id
        AND h2.from_state = 'ready_to_work'
    );

  -- Backfill: elaboration → elab
  INSERT INTO workflow.story_state_history (story_id, event_type, from_state, to_state, metadata)
  SELECT
    s.story_id,
    'state_change',
    'elaboration',
    'elab',
    jsonb_build_object(
      'migrated_by', 'PIPE-0020',
      'migration_date', NOW()::text,
      'original_state', 'elaboration'
    )
  FROM workflow.stories s
  WHERE s.state::text = 'elab'
    AND NOT EXISTS (
      SELECT 1 FROM workflow.story_state_history h
      WHERE h.story_id = s.story_id
        AND h.event_type = 'state_change'
        AND h.from_state = 'elaboration'
        AND h.to_state = 'elab'
        AND (h.metadata->>'migrated_by') = 'PIPE-0020'
    )
    AND EXISTS (
      SELECT 1 FROM workflow.story_state_history h2
      WHERE h2.story_id = s.story_id
        AND h2.from_state = 'elaboration'
    );

  -- Backfill: draft → backlog
  INSERT INTO workflow.story_state_history (story_id, event_type, from_state, to_state, metadata)
  SELECT
    s.story_id,
    'state_change',
    'draft',
    'backlog',
    jsonb_build_object(
      'migrated_by', 'PIPE-0020',
      'migration_date', NOW()::text,
      'original_state', 'draft'
    )
  FROM workflow.stories s
  WHERE s.state::text = 'backlog'
    AND NOT EXISTS (
      SELECT 1 FROM workflow.story_state_history h
      WHERE h.story_id = s.story_id
        AND h.event_type = 'state_change'
        AND h.from_state = 'draft'
        AND h.to_state = 'backlog'
        AND (h.metadata->>'migrated_by') = 'PIPE-0020'
    )
    AND EXISTS (
      SELECT 1 FROM workflow.story_state_history h2
      WHERE h2.story_id = s.story_id
        AND h2.from_state = 'draft'
    );

  -- Count total PIPE-0020 history rows inserted across all mappings
  SELECT COUNT(*)::int INTO history_rows_inserted
  FROM workflow.story_state_history
  WHERE (metadata->>'migrated_by') = 'PIPE-0020';

  RAISE NOTICE '1007: ghost_rows_found=%, rows_updated=%, history_rows_inserted=%',
    ghost_rows_found, rows_updated, history_rows_inserted;
END $$;
