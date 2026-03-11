# CDTS Migration Manifest

**Story**: CDTS-0020 — Audit Actual Table Locations and Produce Migration Manifest
**Date**: 2026-03-08
**Ground Truth Source**: Live knowledgebase DB (localhost:5433)
**References**: AC-8, AC-9, AC-10

---

## Summary

- **Total tables tracked**: 36
- **Existing tables**: 33 (32 in public, 1 in drizzle)
- **Tables that stay**: 31 (stay in public schema as-is)
- **Tables that move**: 1 (story_token_usage: public → analytics)
- **Tables to create in analytics**: 3 (model_experiments, model_assignments, change_telemetry — never existed in live DB)
- **Tables to create in public**: 4 new tables from bootstrap design + schema_migrations already exists

---

## Full Manifest

| table_name | current_schema | target_schema | action | notes |
|------------|----------------|---------------|--------|-------|
| artifact_analyses | public | public | stay | 17 artifact type tables stay in public for graph traversal |
| artifact_checkpoints | public | public | stay | |
| artifact_completion_reports | public | public | stay | |
| artifact_contexts | public | public | stay | |
| artifact_dev_feasibility | public | public | stay | |
| artifact_elaborations | public | public | stay | |
| artifact_evidence | public | public | stay | |
| artifact_fix_summaries | public | public | stay | |
| artifact_plans | public | public | stay | |
| artifact_proofs | public | public | stay | |
| artifact_qa_gates | public | public | stay | |
| artifact_reviews | public | public | stay | |
| artifact_scopes | public | public | stay | |
| artifact_story_seeds | public | public | stay | |
| artifact_test_plans | public | public | stay | |
| artifact_uiux_notes | public | public | stay | |
| artifact_verifications | public | public | stay | |
| audit_log | public | public | stay | |
| embedding_cache | public | public | stay | |
| knowledge_entries | public | public | stay | Core KB entries with vector(1536) embeddings |
| plan_story_links | public | public | stay | |
| plans | public | public | stay | Will add +embedding, +deleted_at in CDTS-1020 |
| schema_migrations | public | public | stay | Created by CDTS-0010; already exists |
| stories | public | public | stay | Will add +embedding, +deleted_at in CDTS-1020 |
| story_artifacts | public | public | stay | Will add story_id FK in CDTS-1020 |
| story_audit_log | public | public | stay | |
| story_dependencies | public | public | stay | |
| story_token_usage | public | analytics | move | Only table moving schemas — append-only telemetry |
| task_audit_log | public | public | stay | |
| tasks | public | public | stay | Will add +deleted_at in CDTS-1020 |
| work_state | public | public | stay | Will add story_id FK in CDTS-1020 |
| work_state_history | public | public | stay | |
| __drizzle_migrations | drizzle | drizzle | stay | Drizzle ORM internal tracking table — do not touch |
| model_experiments | (none — not in live DB) | analytics | create-in-analytics | Defined in 016_model_experiments.sql targeting wint, never applied. Create fresh in analytics. |
| model_assignments | (none — not in live DB) | analytics | create-in-analytics | Defined in 016_wint_model_assignments.sql targeting wint, never applied. Create fresh in analytics. |
| change_telemetry | (none — not in live DB) | analytics | create-in-analytics | Referenced in 017_change_telemetry_experiment_fk.sql but base DDL missing. Create fresh in analytics. |
| plan_details | (not in live DB) | public | new | 1:1 split from plans (cold detail). CDTS-1020. |
| story_details | (not in live DB) | public | new | 1:1 split from stories (cold detail). CDTS-1020. |
| plan_dependencies | (not in live DB) | public | new | Plan-to-plan dependency tracking. CDTS-1020. |
| story_knowledge_links | (not in live DB) | public | new | Graph edges: story <-> KB entry. CDTS-1020. |

---

## Action Legend

| Action | Description |
|--------|-------------|
| stay | Table exists in current_schema and remains there unchanged (DDL may be altered in place) |
| move | Table moves from current_schema to target_schema (ALTER TABLE SET SCHEMA) |
| create-in-analytics | Table does not exist in live DB; must be created fresh in analytics schema |
| new | New table, does not exist anywhere in live DB; will be created in Phase 1 |

---

## Analytics Schema Tables (Complete List)

These 4 tables will exist in the `analytics` schema after CDTS-1010:

| table_name | origin | story |
|------------|--------|-------|
| story_token_usage | Moved from public | CDTS-1010 |
| model_experiments | Created fresh (never existed) | CDTS-1010 |
| model_assignments | Created fresh (never existed) | CDTS-1010 |
| change_telemetry | Created fresh (never existed) | CDTS-1010 |

---

## Schemas Dropped vs Kept

| Schema | Status | Action | Notes |
|--------|--------|--------|-------|
| public | Exists | Keep | Primary graph schema |
| drizzle | Exists | Keep | Drizzle ORM internal |
| wint | Does NOT exist | N/A | Was never created — no drop needed |
| kbar | Does NOT exist in live DB | N/A | Was assumed in bootstrap but not present |
| artifacts | Does NOT exist in live DB | N/A | Was assumed in bootstrap but not present |
| telemetry | Does NOT exist in live DB | N/A | Was assumed in bootstrap but not present |
| umami | Does NOT exist in live DB | N/A | Was assumed in bootstrap but not present |
| analytics | Does NOT exist yet | Create | CDTS-1010 will CREATE SCHEMA analytics |

---

## New Tables for Phase 1 (CDTS-1020)

| table_name | target_schema | description | dependencies |
|------------|---------------|-------------|--------------|
| plan_details | public | 1:1 detail split from plans; raw_content, phases, dependencies | plans.id FK |
| story_details | public | 1:1 detail split from stories; story_dir, touches_*, blocked_reason | stories.story_id FK |
| plan_dependencies | public | Plan-to-plan dependency edges | plans.id FK ×2 |
| story_knowledge_links | public | Graph edges: story <-> KB entry with type + confidence score | stories.story_id + knowledge_entries.id FKs |

---

## FK Changes for Phase 1 (CDTS-1020)

### FKs to Add

| source_table | source_column | target_table | target_column | on_delete | story |
|-------------|---------------|--------------|---------------|-----------|-------|
| story_artifacts | story_id | stories | story_id | RESTRICT | CDTS-1020 |
| work_state | story_id | stories | story_id | RESTRICT | CDTS-1020 |

### Cross-Schema FK

| source_table | source_column | target_table | target_column | on_delete | story |
|-------------|---------------|--------------|---------------|-----------|-------|
| analytics.story_token_usage | story_id | public.stories | story_id | RESTRICT | CDTS-1010 |

---

## Migration Sequence

| Story | Action | Tables Affected |
|-------|--------|-----------------|
| CDTS-0010 | Done | Created schema_migrations |
| CDTS-1010 | Create analytics schema; move story_token_usage; create 3 wint tables | analytics.story_token_usage, analytics.model_experiments, analytics.model_assignments, analytics.change_telemetry |
| CDTS-1020 | Structural DDL: splits, soft-delete, FKs, graph edges | plans, stories, tasks, knowledge_entries (soft-delete); plan_details, story_details, plan_dependencies, story_knowledge_links (new); story_artifacts FK, work_state FK |
| CDTS-1030 | Update Drizzle schema.ts | schema.ts |
| CDTS-1040 | Update MCP Tool SQL | tool-handlers.ts, semantic.ts, keyword.ts, etc. |
| CDTS-1050 | Apply migrations and verify | All above |
