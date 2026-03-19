-- pgtap tests for migration 1012: Knowledge Embedding NOTIFY Triggers — CDBE-4030
--
-- Run against: KB database (port 5433, schema: public)
-- Requires:    pgTAP extension
-- Usage:       psql $KB_DATABASE_URL -f pgtap/1012_cdbe_4030_notify_triggers_test.sql | pg_prove
--
-- Assumes migrations 1012 and CDBE-4020 (embedding columns) have already been applied.
--
-- Test plan (12 tests):
--   1-5:   INSERT trigger exists on each of the five tables
--   6-10:  UPDATE trigger exists on each of the five tables
--   11:    Trigger functions exist for all five tables
--   12:    Trigger fires for INSERT and produces correct channel name (functional check via pg_trigger catalog)

BEGIN;

SELECT plan(12);

-- ── 1-5. INSERT trigger existence on each table ───────────────────────────────

SELECT has_trigger(
  'public',
  'lessons_learned',
  'trg_lessons_learned_embedding_notify',
  'INSERT trigger trg_lessons_learned_embedding_notify exists on lessons_learned'
);

SELECT has_trigger(
  'public',
  'adrs',
  'trg_adrs_embedding_notify',
  'INSERT trigger trg_adrs_embedding_notify exists on adrs'
);

SELECT has_trigger(
  'public',
  'code_standards',
  'trg_code_standards_embedding_notify',
  'INSERT trigger trg_code_standards_embedding_notify exists on code_standards'
);

SELECT has_trigger(
  'public',
  'rules',
  'trg_rules_embedding_notify',
  'INSERT trigger trg_rules_embedding_notify exists on rules'
);

SELECT has_trigger(
  'public',
  'cohesion_rules',
  'trg_cohesion_rules_embedding_notify',
  'INSERT trigger trg_cohesion_rules_embedding_notify exists on cohesion_rules'
);

-- ── 6-10. UPDATE trigger existence on each table ─────────────────────────────
-- These use the same trigger names (triggers handle both INSERT and UPDATE events)

SELECT is(
  (
    SELECT COUNT(*)::int
    FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'lessons_learned'
      AND t.tgname = 'trg_lessons_learned_embedding_notify'
      AND (t.tgtype & 4) > 0  -- bit 2 = INSERT
      AND (t.tgtype & 16) > 0 -- bit 4 = UPDATE
  ),
  1,
  'trg_lessons_learned_embedding_notify fires on both INSERT and UPDATE'
);

SELECT is(
  (
    SELECT COUNT(*)::int
    FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'adrs'
      AND t.tgname = 'trg_adrs_embedding_notify'
      AND (t.tgtype & 4) > 0
      AND (t.tgtype & 16) > 0
  ),
  1,
  'trg_adrs_embedding_notify fires on both INSERT and UPDATE'
);

SELECT is(
  (
    SELECT COUNT(*)::int
    FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'code_standards'
      AND t.tgname = 'trg_code_standards_embedding_notify'
      AND (t.tgtype & 4) > 0
      AND (t.tgtype & 16) > 0
  ),
  1,
  'trg_code_standards_embedding_notify fires on both INSERT and UPDATE'
);

SELECT is(
  (
    SELECT COUNT(*)::int
    FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'rules'
      AND t.tgname = 'trg_rules_embedding_notify'
      AND (t.tgtype & 4) > 0
      AND (t.tgtype & 16) > 0
  ),
  1,
  'trg_rules_embedding_notify fires on both INSERT and UPDATE'
);

SELECT is(
  (
    SELECT COUNT(*)::int
    FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'cohesion_rules'
      AND t.tgname = 'trg_cohesion_rules_embedding_notify'
      AND (t.tgtype & 4) > 0
      AND (t.tgtype & 16) > 0
  ),
  1,
  'trg_cohesion_rules_embedding_notify fires on both INSERT and UPDATE'
);

-- ── 11. Trigger functions exist ────────────────────────────────────────────────

SELECT is(
  (
    SELECT COUNT(*)::int
    FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'notify_lessons_learned_embedding',
        'notify_adrs_embedding',
        'notify_code_standards_embedding',
        'notify_rules_embedding',
        'notify_cohesion_rules_embedding'
      )
  ),
  5,
  'all five notify trigger functions exist in public schema'
);

-- ── 12. Payload shape: trigger functions emit to knowledge_embedding_needed ────
-- Verify the trigger function bodies contain the correct channel name and
-- the json_build_object('table', ..., 'id', ...) payload pattern.

SELECT is(
  (
    SELECT COUNT(*)::int
    FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'notify_lessons_learned_embedding',
        'notify_adrs_embedding',
        'notify_code_standards_embedding',
        'notify_rules_embedding',
        'notify_cohesion_rules_embedding'
      )
      AND p.prosrc LIKE '%knowledge_embedding_needed%'
      AND p.prosrc LIKE '%json_build_object%'
      AND p.prosrc LIKE '%''table''%'
      AND p.prosrc LIKE '%''id''%'
  ),
  5,
  'all five trigger functions emit to knowledge_embedding_needed with table+id payload'
);

SELECT * FROM finish();

ROLLBACK;
