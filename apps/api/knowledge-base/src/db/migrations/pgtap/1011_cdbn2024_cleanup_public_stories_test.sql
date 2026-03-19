-- pgtap tests for migration 1011: CDBN-2024 cleanup verification
--
-- Run against: KB database (port 5433)
-- Requires:    pgTAP extension
-- Usage:       psql $KB_DATABASE_URL -f pgtap/1011_cdbn2024_cleanup_public_stories_test.sql | pg_prove
--
-- Assumes migration 1011 has already been applied.

BEGIN;

SELECT plan(2);

SELECT hasnt_table('public', 'stories',
  'public.stories should be dropped by CDBN-2024');

SELECT has_column('workflow', 'stories', 'embedding',
  'workflow.stories has embedding column added by CDBN-2024');

SELECT * FROM finish();

ROLLBACK;
