# Task: Clean up KB database schema.ts

## Current State

- Database has 53 tables organized in 4 schemas: workflow (27), public (8), artifacts (18), analytics (4)
- `apps/api/knowledge-base/src/db/schema.ts` has ~2600 lines with old/duplicate definitions
- The schema.ts has tables in both "public" and "workflow" schema that don't match the actual DB

## Goal

Rewrite `apps/api/knowledge-base/src/db/schema.ts` to match the actual database tables.

## Database Tables (run this to verify):

```bash
docker exec -i knowledge-base-postgres psql -U kbuser -d knowledgebase -c "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema IN ('public', 'workflow', 'artifacts', 'analytics') AND table_type = 'BASE TABLE' ORDER BY table_schema, table_name;"
```

## Approach

1. **Backup** the current schema.ts
2. **Query each table** from the DB to get exact columns:

   ```bash
   docker exec -i knowledge-base-postgres psql -U kbuser -d knowledgebase -c "\d workflow.stories"
   docker exec -i knowledge-base-postgres psql -U kbuser -d knowledgebase -c "\d workflow.plans"
   # etc for all 53 tables
   ```

3. **Rewrite schema.ts** with clean definitions:
   - Only define tables that exist in the DB
   - Use proper schema prefixes (workflow., artifacts., analytics.)
   - Remove duplicate/old definitions
   - Include all columns, indexes, foreign keys
   - Export types

4. **Update db/index.ts** to export the correct tables

## Tables to Define

**public schema (8):**

- knowledge_entries
- embedding_cache
- adrs
- audit_log
- code_standards
- cohesion_rules
- lessons_learned
- rules

**workflow schema (27):**

- stories
- story_dependencies
- story_content
- story_state_history
- story_touches
- story_outcomes
- plans
- plan_dependencies
- plan_story_links
- plan_revision_history
- plan_execution_log
- work_state
- workflow_executions
- workflow_checkpoints
- workflow_audit_log
- worktrees
- agents
- agent_invocations
- agent_outcomes
- agent_decisions
- hitl_decisions
- context_sessions
- context_packs
- context_cache_hits
- ml_models
- model_metrics
- model_predictions
- training_data

**artifacts schema (18):**

- story_artifacts
- artifact_checkpoints
- artifact_contexts
- artifact_reviews
- artifact_elaborations
- artifact_analyses
- artifact_scopes
- artifact_plans
- artifact_evidence
- artifact_verifications
- artifact_fix_summaries
- artifact_proofs
- artifact_qa_gates
- artifact_completion_reports
- artifact_story_seeds
- artifact_test_plans
- artifact_dev_feasibility
- artifact_uiux_notes

**analytics schema (4):**

- story_token_usage
- change_telemetry
- model_experiments
- model_assignments

## Important Notes

- Use `pgSchema('workflow')`, `pgSchema('artifacts')`, `pgSchema('analytics')` for non-public schemas
- Include enums: story_state_enum, priority_enum, plan_status_enum, agent_decision_type, context_pack_type, model_type
- Handle vector columns properly (pgvector)
- Include foreign key relationships where applicable
- Export types for each table

## Test

After rewrite, verify with:

```bash
cd apps/api/knowledge-base && pnpm check-types
```
