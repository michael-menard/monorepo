# CDTS-0020 — Live Table Inventory

**Source**: Ground-truth query against live knowledgebase DB (localhost:5433)
**Date**: 2026-03-08
**Note**: This is ground-truth data — NOT bootstrap assumptions from AGENT-CONTEXT.md

---

## Query Executed

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_catalog = 'knowledgebase'
  AND table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;
```

---

## Raw Query Output

| table_schema | table_name                  |
|--------------|-----------------------------|
| drizzle      | __drizzle_migrations        |
| public       | artifact_analyses           |
| public       | artifact_checkpoints        |
| public       | artifact_completion_reports |
| public       | artifact_contexts           |
| public       | artifact_dev_feasibility    |
| public       | artifact_elaborations       |
| public       | artifact_evidence           |
| public       | artifact_fix_summaries      |
| public       | artifact_plans              |
| public       | artifact_proofs             |
| public       | artifact_qa_gates           |
| public       | artifact_reviews            |
| public       | artifact_scopes             |
| public       | artifact_story_seeds        |
| public       | artifact_test_plans         |
| public       | artifact_uiux_notes         |
| public       | artifact_verifications      |
| public       | audit_log                   |
| public       | embedding_cache             |
| public       | knowledge_entries           |
| public       | plan_story_links            |
| public       | plans                       |
| public       | schema_migrations           |
| public       | stories                     |
| public       | story_artifacts             |
| public       | story_audit_log             |
| public       | story_dependencies          |
| public       | story_token_usage           |
| public       | task_audit_log              |
| public       | tasks                       |
| public       | work_state                  |
| public       | work_state_history          |

**Total**: 33 rows (1 in drizzle schema, 32 in public schema)

---

## Schemas Present

```sql
SELECT schema_name
FROM information_schema.schemata
WHERE catalog_name = 'knowledgebase'
ORDER BY schema_name;
```

| schema_name        |
|--------------------|
| drizzle            |
| information_schema |
| pg_catalog         |
| pg_temp_3          |
| pg_toast           |
| pg_toast_temp_3    |
| public             |

**User-created schemas**: `public`, `drizzle`

---

## Summary by Schema

| Schema   | Table Count | Notes |
|----------|-------------|-------|
| public   | 32          | All application tables |
| drizzle  | 1           | `__drizzle_migrations` — Drizzle ORM tracking table |

---

## Discrepancies vs Bootstrap AGENT-CONTEXT.md

### ENG-001 Resolution

The bootstrap `AGENT-CONTEXT.md` listed the following tables as being in the `wint` schema:
- `wint.model_experiments`
- `wint.model_assignments`
- `wint.change_telemetry`

**GROUND TRUTH: No `wint` schema exists in the live knowledgebase DB.**

These tables were defined in migration SQL files (016_model_experiments.sql, 016_wint_model_assignments.sql, 017_change_telemetry_experiment_fk.sql) but were **NEVER applied** to the live database. The `wint` schema was never created.

### Additional Discrepancies

| Bootstrap Assumption | Ground Truth | Resolution |
|---------------------|--------------|------------|
| `wint.model_experiments` exists | Does NOT exist anywhere | Will be CREATE'd in analytics schema |
| `wint.model_assignments` exists | Does NOT exist anywhere | Will be CREATE'd in analytics schema |
| `wint.change_telemetry` exists | Does NOT exist anywhere | Will be CREATE'd in analytics schema |
| `schema_migrations` is NEW | Already EXISTS in public | CDTS-0010 confirmed applied |
| `plan_dependencies` exists | Does NOT exist in live DB | Not yet created — listed as NEW in manifest |
| `story_details` exists | Does NOT exist in live DB | Not yet created — listed as NEW in manifest |
| `plan_details` exists | Does NOT exist in live DB | Not yet created — listed as NEW in manifest |
| `story_knowledge_links` exists | Does NOT exist in live DB | Not yet created — listed as NEW in manifest |

### Tables Present But Not in Bootstrap Public List

The following tables exist in `public` but were listed as part of a 13-table artifact type group in bootstrap (enumerated here for completeness):
- `artifact_analyses`
- `artifact_checkpoints`
- `artifact_completion_reports`
- `artifact_contexts`
- `artifact_dev_feasibility`
- `artifact_elaborations`
- `artifact_evidence`
- `artifact_fix_summaries`
- `artifact_plans`
- `artifact_proofs`
- `artifact_qa_gates`
- `artifact_reviews`
- `artifact_scopes`
- `artifact_story_seeds`
- `artifact_test_plans`
- `artifact_uiux_notes`
- `artifact_verifications`

These 17 artifact_ tables are the 13+ artifact type tables referenced in the bootstrap context (the actual count is 17, not 13).
