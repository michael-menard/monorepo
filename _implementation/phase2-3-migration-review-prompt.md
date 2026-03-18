# Phase 2-3 Migration Stories Review Prompt

## Overview

You are reviewing 5 migration stories from the `consolidate-db-normalized` epic (Phase 2-3). These stories complete the database schema consolidation by migrating live data, updating queries, and ensuring FK integrity.

**Stories to Review:**

1. **CDBN-2012** - Migrate telemetry Schema Live Data
2. **CDBN-2013** - Migrate Story/Plan Content Split and Cross-Schema FK Verification
3. **CDBN-2020** - Filesystem Ingestion Pipeline for Stories and Plans Not in DB
4. **CDBN-3010** - Update MCP Tool SQL and Drizzle Queries to New Schema
5. **CDBN-3020** - Update Telemetry Commands and Roadmap Queries to New Schema

---

## Context Sources

### Database Schemas (Reference These)

**Migration files to examine:**

- `apps/api/knowledge-base/src/db/migrations/033_workflow_schema.sql` - workflow schema
- `apps/api/knowledge-base/src/db/migrations/034_artifacts_schema.sql` - artifacts schema
- `apps/api/knowledge-base/src/db/migrations/034_knowledge_extensions.sql` - knowledge schema (hitl_decisions, context_packs, context_sessions)
- `apps/api/knowledge-base/src/db/migrations/034_cdbn1060_workflow_data_migration.sql` - example data migration
- `apps/api/knowledge-base/src/db/migrations/035_cdbn2011_knowledge_data_migration.sql` - CDBN-2011 (just completed)

**Source database (lego_dev@5432):**
38 tables in `wint` schema including:

- agent_invocations, agent_decisions, agent_outcomes
- token_usage
- workflow_executions, workflow_checkpoints, workflow_audit_log
- dep_audit_runs, dep_audit_findings
- ml_models, model_metrics, model_predictions, training_data
- change_telemetry
- stories, story_artifacts, story_dependencies

**Target database (knowledgebase@5433):**

- Schemas: workflow, artifacts, telemetry, public
- Tables already migrated in Phase 1: see migration files above

### Code to Examine

**MCP Tools:**

- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` - KB MCP tool handlers
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` - Tool input/output schemas

**Context Cache:**

- `packages/backend/mcp-tools/src/context-cache/` - Context cache implementations
- `packages/backend/orchestrator/src/artifacts/knowledge-context.ts` - Knowledge context loading

**Telemetry:**

- `apps/api/knowledge-base/src/crud-operations/` - CRUD operations
- Search for `INSERT INTO wint.` patterns to find telemetry writes

**Story/Plan Content:**

- `apps/api/knowledge-base/src/scripts/` - Ingestion scripts
- Look for story.yaml parsing logic

---

## Sub-Agent Strategy

### 1. Database Specialist (for CDBN-2012, CDBN-2013)

Focus: FK dependencies, migration ordering, data volume

**Key questions:**

- What tables have FK dependencies that require specific migration order?
- Are there cross-schema FKs that need verification?
- What's the expected row count for each table?

**Context to gather:**

```bash
# Run against lego_dev to get row counts
docker exec monorepo-postgres psql -U postgres -d lego_dev -c "SELECT 'wint.' || table_name, n_live_tup FROM pg_stat_user_tables WHERE schemaname = 'wint' ORDER BY n_live_tup DESC;"
```

### 2. Code Migration Specialist (for CDBN-3010, CDBN-3020)

Focus: Find all queries that reference old schema tables

**Key questions:**

- What MCP tools need updating?
- Where are telemetry writes happening?
- Are there any hardcoded table references?

**Search patterns:**

```
# Find wint schema references
grep -r "wint\." --include="*.ts" apps/api/knowledge-base/src | head -50
grep -r "wint\." --include="*.ts" packages/backend/mcp-tools/src | head -30

# Find kbar schema references
grep -r "kbar\." --include="*.ts" apps/api/knowledge-base/src | head -30

# Found ~135 total references across the codebase including:
# - wint.stories, wint.token_usage, wint.workflow_executions
# - wint.change_telemetry, wint.model_affinity, wint.codebase_health
# - wint.story_blockers, wint.story_outcomes
# - kbar.stories, kbar.artifacts, kbar.story_dependencies
```

# Find wint schema references

grep -r "wint\." --include="_.ts" apps/api/knowledge-base/src | head -50
grep -r "wint\." --include="_.ts" packages/backend/mcp-tools/src | head -30

# Find kbar schema references

grep -r "kbar\." --include="\*.ts" apps/api/knowledge-base/src | head -30

````

### 3. Filesystem/Ingestion Specialist (for CDBN-2020)

Focus: Story file parsing, idempotency, reconciliation

**Key questions:**

- Where are story.yaml files located?
- What's the parsing logic?
- How to handle duplicates?

**Context to gather:**

```bash
# Find all story.yaml files
find plans -name "story.yaml" | head -20

# Check for existing ingestion logic
ls -la apps/api/knowledge-base/src/scripts/
````

### 4. Integration/FK Specialist (for CDBN-2013)

Focus: Cross-schema FK verification, content splitting

**Key questions:**

- What FK constraints exist across schemas?
- How to verify zero orphaned references?
- What's the content parsing strategy?

---

## Review Checklist by Story

### CDBN-2012: Telemetry Migration

| Check                                                    | Priority |
| -------------------------------------------------------- | -------- |
| Row counts from source tables                            | HIGH     |
| FK dependency chain (invocations → decisions → outcomes) | HIGH     |
| Nullable FK handling for missing story_ids               | MEDIUM   |
| Migration ordering (parent before child)                 | HIGH     |
| Idempotency strategy                                     | HIGH     |

### CDBN-2013: Content Split + FK Verification

| Check                                                                | Priority |
| -------------------------------------------------------------------- | -------- |
| Content parsing strategy (structured vs raw fallback)                | HIGH     |
| Cross-schema FK verification script                                  | HIGH     |
| Self-referential FK handling (story_dependencies, plan_dependencies) | HIGH     |
| Zero data loss verification                                          | MEDIUM   |

### CDBN-2020: Filesystem Ingestion

| Check                                  | Priority |
| -------------------------------------- | -------- |
| Story.yaml schema variations to handle | HIGH     |
| Idempotency (dedupe by story_id)       | HIGH     |
| Reconciliation report format           | MEDIUM   |
| Error handling for parse failures      | MEDIUM   |

### CDBN-3010: MCP Tool Updates

| Check                               | Priority |
| ----------------------------------- | -------- |
| Complete list of MCP tools affected | HIGH     |
| Context cache tool impact           | HIGH     |
| Test coverage for each tool         | MEDIUM   |
| Rollback strategy if issues         | MEDIUM   |

### CDBN-3020: Telemetry Commands

| Check                              | Priority |
| ---------------------------------- | -------- |
| All telemetry write paths          | HIGH     |
| Error logging for failed writes    | HIGH     |
| Read path impact                   | MEDIUM   |
| Monitoring/alerting if writes fail | MEDIUM   |

---

## Decision Framework

For each story, determine:

1. **Implementation Order**: Can stories run in parallel or must they be sequential?
   - CDBN-2012 → CDBN-2013 (FK verification needs migrated data)
   - CDBN-2013 → CDBN-2020 (filesystem ingestion populates migrated tables)
   - CDBN-2013 → CDBN-3010, CDBN-3020 (query updates need final schema)

2. **Risks to Flag**:
   - Data loss potential
   - Downtime requirements
   - Rollback complexity
   - Test coverage gaps

3. **Dependencies to Validate**:
   - CDBN-2011 must complete first (just done)
   - Phase 1 schemas must exist (CDBN-1030, CDBN-1040, CDBN-1050, CDBN-1060)

---

## Output Format

For each story, provide:

```yaml
story: CDBN-XXXX
overall_assessment: READY|NEEDS_CLARIFICATION|BLOCKED

context_checks:
  - source_tables_identified: true|false
  - target_tables_identified: true|false
  - migration_order_determined: true|false
  - row_counts_estimated: true|false

issues:
  - severity: blocking|should_fix|note
    category: data_volume|fk_dependency|parsing|testing|documentation
    issue: 'Description'
    suggestion: 'How to address'

implementation_questions:
  - 'Question for decision'

recommendations:
  - 'Suggested improvement'
```

---

## Execution

Run parallel sub-agents:

1. **Database Analyst** - Analyze source/target schemas, row counts, FK dependencies
2. **Code Mapper** - Find all code references to old schemas
3. **Integration Specialist** - Verify cross-story dependencies and ordering

Gather results, synthesize concerns, and provide final recommendations.
