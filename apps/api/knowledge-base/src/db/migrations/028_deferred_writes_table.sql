-- Migration 028: deferred_writes table + TTL cleanup procedure
-- Moves deferred KB write tracking from YAML files to the database.
-- If the DB is down when a write fails, the write is silently lost (accepted tradeoff).

BEGIN;

CREATE TABLE IF NOT EXISTS public.deferred_writes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation     TEXT NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}',
  error         TEXT,
  retry_count   INTEGER NOT NULL DEFAULT 0,
  last_retry    TIMESTAMPTZ,
  story_id      TEXT,
  agent         TEXT,
  processed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial index for fast unprocessed queries (the hot path)
CREATE INDEX IF NOT EXISTS idx_deferred_writes_unprocessed
  ON public.deferred_writes (created_at)
  WHERE processed_at IS NULL;

-- Partial index for filtering unprocessed by operation
CREATE INDEX IF NOT EXISTS idx_deferred_writes_unprocessed_operation
  ON public.deferred_writes (operation)
  WHERE processed_at IS NULL;

-- Partial index for filtering unprocessed by story_id
CREATE INDEX IF NOT EXISTS idx_deferred_writes_unprocessed_story
  ON public.deferred_writes (story_id)
  WHERE processed_at IS NULL AND story_id IS NOT NULL;

-- Stored procedure: cleanup processed rows older than retention_days
CREATE OR REPLACE FUNCTION public.cleanup_deferred_writes(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.deferred_writes
  WHERE processed_at IS NOT NULL
    AND processed_at < now() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMIT;
