-- Cleanup: Cancel orphaned workflow/test stories while preserving LEGO product work
--
-- PRESERVE:
--   1. All LEGO product stories by prefix: INST, WISH, SETS, BUGF, REPA, ADMI, COGN
--   2. Agent-as-Judge stories: JUDG-*
--   3. Model experimentation stories: MODL-*
--   4. Individual stories: BUGF-032, WINT-9100
--   5. Stories linked to non-archived/non-superseded plans
--
-- CANCEL everything else (TEST-*, WINT-*, WKFL-*, APRS-*, AUDT-*, KFMB-*,
--   CDTS-*, INFR-*, KNOW-*, KBAR-*, LNGG-*, and any other orphans)
--
-- Run as: psql "postgresql://kbuser:TestPassword123!@localhost:5435/knowledgebase" -f cleanup_orphaned_stories.sql

BEGIN;

-- Also cancel plans that are being retired
UPDATE workflow.plans
SET status = 'superseded', updated_at = now()
WHERE plan_slug IN (
  'autonomous-plan-refinement-story-generation',
  'agent-as-judge-phase-gate-system'
)
AND status NOT IN ('archived', 'superseded', 'implemented');

UPDATE workflow.plans
SET status = 'archived', updated_at = now()
WHERE plan_slug IN (
  'infra-persistence',
  'model-experimentation',
  'kb-first-migration',
  'fix-kb-story-lifecycle-transitions',
  'workflow-intelligence-wint',
  'langgraph-integration-adapters',
  'autonomous-dev-system',
  'sdlc-agent-roles',
  'telemetry-observability',
  'learning-self-optimization',
  'workflow-intelligence-program',
  'artifact-jump-table-typed-tables',
  'story-claim-release-multi-agent',
  'database-audit-schema-consolidation',
  'consolidate-db-three-schemas'
)
AND status NOT IN ('archived', 'implemented');

-- DRY RUN: Show what will be cancelled
SELECT s.story_id, s.state, s.feature, left(s.title, 60) as title
FROM workflow.stories s
WHERE s.state IN (
  'backlog', 'created', 'elab', 'ready', 'in_progress',
  'needs_code_review', 'ready_for_qa', 'in_qa',
  'blocked', 'failed_code_review', 'failed_qa'
)
-- Preserve LEGO product prefixes
AND s.story_id !~ '^(INST|WISH|SETS|BUGF|REPA|ADMI|COGN)-'
-- Preserve kept workflow prefixes
AND s.story_id !~ '^(JUDG|MODL)-'
-- Preserve individual stories
AND s.story_id NOT IN ('WINT-9100')
-- Preserve stories linked to living plans
AND s.story_id NOT IN (
  SELECT psl.story_id
  FROM workflow.plan_story_links psl
  JOIN workflow.plans p ON p.plan_slug = psl.plan_slug
  WHERE p.status NOT IN ('archived', 'superseded')
    AND p.deleted_at IS NULL
)
ORDER BY s.story_id;

-- EXECUTE: Cancel orphaned stories
UPDATE workflow.stories
SET state = 'cancelled',
    updated_at = now()
WHERE state IN (
  'backlog', 'created', 'elab', 'ready', 'in_progress',
  'needs_code_review', 'ready_for_qa', 'in_qa',
  'blocked', 'failed_code_review', 'failed_qa'
)
AND story_id !~ '^(INST|WISH|SETS|BUGF|REPA|ADMI|COGN)-'
AND story_id !~ '^(JUDG|MODL)-'
AND story_id NOT IN ('WINT-9100')
AND story_id NOT IN (
  SELECT psl.story_id
  FROM workflow.plan_story_links psl
  JOIN workflow.plans p ON p.plan_slug = psl.plan_slug
  WHERE p.status NOT IN ('archived', 'superseded')
    AND p.deleted_at IS NULL
);

COMMIT;
