-- Migration 1012: Knowledge Table Embedding NOTIFY Triggers — CDBE-4030
--
-- Purpose: Add pg_notify trigger functions to all five knowledge tables so that
--          the embedding-worker process can subscribe to the knowledge_embedding_needed
--          channel and generate embeddings asynchronously on INSERT and relevant UPDATE.
--
-- Target tables (public schema, all have embedding vector(1536) column from CDBE-4020):
--   - lessons_learned
--   - adrs
--   - code_standards
--   - rules
--   - cohesion_rules
--
-- Channel: knowledge_embedding_needed
-- Payload: {"table": "<table_name>", "id": "<uuid>"}
--
-- Design decisions:
--   - Fires on INSERT (always — row has no embedding yet)
--   - Fires on UPDATE only when content column(s) change (embedding may be stale)
--   - Each table has its own trigger function for clarity
--   - CREATE OR REPLACE + DROP IF EXISTS guards ensure idempotency
--   - DB safety preamble (DO block) guards against wrong-database application
--
-- Dependency: CDBE-4020 must be applied first (embedding column must exist on all five tables).
--             Migration 1012 does NOT add embedding columns — it only adds triggers.

-- ── 0. Safety preamble ────────────────────────────────────────────────────────

DO $$
BEGIN
  IF current_database() <> 'knowledgebase' THEN
    RAISE EXCEPTION '1012: This migration must run against the ''knowledgebase'' database. '
      'Current database: %', current_database();
  END IF;
  RAISE NOTICE '1012: Safety check passed — running against database: %', current_database();
END $$;

-- ── 1. Trigger function: notify_knowledge_embedding_needed ────────────────────
-- Shared base pattern — each table has its own wrapper for clarity.
-- The function emits pg_notify with table name + row id.

-- ── 1a. lessons_learned ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_lessons_learned_embedding()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'knowledge_embedding_needed',
    json_build_object('table', 'lessons_learned', 'id', NEW.id::text)::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION notify_lessons_learned_embedding() IS
  '1012: Emits pg_notify(knowledge_embedding_needed) on INSERT or content UPDATE of lessons_learned.';

-- Drop and recreate to ensure idempotency
DROP TRIGGER IF EXISTS trg_lessons_learned_embedding_notify ON lessons_learned;

CREATE TRIGGER trg_lessons_learned_embedding_notify
  AFTER INSERT OR UPDATE OF title, content
  ON lessons_learned
  FOR EACH ROW
  EXECUTE FUNCTION notify_lessons_learned_embedding();

-- ── 1b. adrs ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_adrs_embedding()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'knowledge_embedding_needed',
    json_build_object('table', 'adrs', 'id', NEW.id::text)::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION notify_adrs_embedding() IS
  '1012: Emits pg_notify(knowledge_embedding_needed) on INSERT or content UPDATE of adrs.';

DROP TRIGGER IF EXISTS trg_adrs_embedding_notify ON adrs;

CREATE TRIGGER trg_adrs_embedding_notify
  AFTER INSERT OR UPDATE OF title, context, decision
  ON adrs
  FOR EACH ROW
  EXECUTE FUNCTION notify_adrs_embedding();

-- ── 1c. code_standards ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_code_standards_embedding()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'knowledge_embedding_needed',
    json_build_object('table', 'code_standards', 'id', NEW.id::text)::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION notify_code_standards_embedding() IS
  '1012: Emits pg_notify(knowledge_embedding_needed) on INSERT or content UPDATE of code_standards.';

DROP TRIGGER IF EXISTS trg_code_standards_embedding_notify ON code_standards;

CREATE TRIGGER trg_code_standards_embedding_notify
  AFTER INSERT OR UPDATE OF title, content
  ON code_standards
  FOR EACH ROW
  EXECUTE FUNCTION notify_code_standards_embedding();

-- ── 1d. rules ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_rules_embedding()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'knowledge_embedding_needed',
    json_build_object('table', 'rules', 'id', NEW.id::text)::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION notify_rules_embedding() IS
  '1012: Emits pg_notify(knowledge_embedding_needed) on INSERT or content UPDATE of rules.';

DROP TRIGGER IF EXISTS trg_rules_embedding_notify ON rules;

CREATE TRIGGER trg_rules_embedding_notify
  AFTER INSERT OR UPDATE OF rule_text
  ON rules
  FOR EACH ROW
  EXECUTE FUNCTION notify_rules_embedding();

-- ── 1e. cohesion_rules ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_cohesion_rules_embedding()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'knowledge_embedding_needed',
    json_build_object('table', 'cohesion_rules', 'id', NEW.id::text)::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION notify_cohesion_rules_embedding() IS
  '1012: Emits pg_notify(knowledge_embedding_needed) on INSERT or content UPDATE of cohesion_rules.';

DROP TRIGGER IF EXISTS trg_cohesion_rules_embedding_notify ON cohesion_rules;

CREATE TRIGGER trg_cohesion_rules_embedding_notify
  AFTER INSERT OR UPDATE OF rule_name, conditions
  ON cohesion_rules
  FOR EACH ROW
  EXECUTE FUNCTION notify_cohesion_rules_embedding();

-- ── 2. Completion notice ───────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE '1012: Migration complete — embedding NOTIFY triggers added to 5 knowledge tables (lessons_learned, adrs, code_standards, rules, cohesion_rules). Channel: knowledge_embedding_needed.';
END $$;
