# CDTS Migration Manifest

## Two-Schema Architecture

| Schema | Purpose | Retention |
|--------|---------|-----------|
| `public` | Graph data — all traversable entities | Standard |
| `analytics` | Append-only telemetry | Time-series, archivable |

## Tables Staying in `public`

All existing tables remain in `public` except `story_token_usage`:

- `knowledge_entries`, `embedding_cache`
- `workflow_transitions`, `workflow_states`
- `tasks`, `task_audit_log`
- `stories`, `story_dependencies`, `story_artifacts`, `story_audit_log`
- `artifact_checkpoints`, `artifact_contexts`, `artifact_reviews`, `artifact_elaborations`
- `artifact_analyses`, `artifact_scopes`, `artifact_plans`, `artifact_evidence`
- `artifact_verifications`, `artifact_fix_summaries`, `artifact_proofs`
- `artifact_qa_gates`, `artifact_completion_reports`
- `plans`, `plan_story_links`, `plan_dependencies`
- `plan_details`, `story_details`, `story_knowledge_links`
- `schema_migrations`

## Tables Moving to `analytics`

| Current Location | New Location | Migration |
|------------------|-------------|-----------|
| `public.story_token_usage` | `analytics.story_token_usage` | 024 |
| `wint.model_experiments` | `analytics.model_experiments` | 024 |
| `wint.model_assignments` | `analytics.model_assignments` | 024 |
| `wint.change_telemetry` | `analytics.change_telemetry` | 024 (IF EXISTS) |

## Schemas to Drop

| Schema | After Migration | Condition |
|--------|----------------|-----------|
| `wint` | 024 | Only if empty after moves |
| `kbar` | N/A | Already empty — drop in future cleanup |
| `artifacts` | N/A | Already empty — drop in future cleanup |
| `telemetry` | N/A | Already empty — drop in future cleanup |
| `umami` | N/A | Already empty — drop in future cleanup |

## Enum Types Moving

| Type | From | To |
|------|------|----|
| `experiment_status` | `wint` | `analytics` |

## New Foreign Keys (Migration 025)

| Source | Column | Target | Condition |
|--------|--------|--------|-----------|
| `analytics.story_token_usage` | `story_id` | `public.stories(story_id)` | Skip if orphan rows exist |

## Existing Internal FKs (auto-move with tables)

| Source | Column | Target |
|--------|--------|--------|
| `analytics.change_telemetry` | `experiment_id` | `analytics.model_experiments(id)` |

## MCP Tool Smoke Test Checklist

After applying migrations 023-025, verify:

- [ ] `kb_log_tokens` — insert a token record
- [ ] `kb_get_token_summary` — aggregation query returns data
- [ ] `kb_get_bottleneck_analysis` — queries `stories` table (unchanged)
- [ ] `kb_stats` — knowledge_entries/embedding_cache counts
- [ ] `kb_search` — semantic + keyword search
- [ ] `pnpm test` in `apps/api/knowledge-base` — all tests pass
