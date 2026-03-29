-- =============================================================================
-- 1150_deferred_writes_cleanup_proc.sql
-- Migration: Add cleanup_deferred_writes stored procedure
-- Plan: valiant-shimmying-frost (DB-backed Deferred Writes)
-- =============================================================================
-- Creates the public.cleanup_deferred_writes(integer) function that is called
-- during kb_health checks to purge old processed deferred write entries.
-- =============================================================================

DO $$
BEGIN
  IF current_database() <> 'knowledgebase' THEN
    RAISE EXCEPTION
      'Safety check failed: expected database "knowledgebase" but connected to "%". Aborting migration.',
      current_database();
  END IF;
END;
$$;

-- =============================================================================
-- Stored procedure: cleanup_deferred_writes
-- Deletes processed deferred_writes rows older than N days.
-- Returns the number of rows deleted.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_deferred_writes(days_to_keep integer)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM deferred_writes
  WHERE processed_at IS NOT NULL
    AND processed_at < NOW() - (days_to_keep || ' days')::interval;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_deferred_writes(integer) IS
  'Deletes processed deferred_writes rows older than the specified number of days. '
  'Called during kb_health checks as a fire-and-forget TTL sweep. '
  'Returns the count of deleted rows.';

-- =============================================================================
-- Self-registration
-- =============================================================================

INSERT INTO schema_migrations (filename, applied_by)
VALUES ('1150_deferred_writes_cleanup_proc.sql', current_user)
ON CONFLICT (filename) DO NOTHING;
