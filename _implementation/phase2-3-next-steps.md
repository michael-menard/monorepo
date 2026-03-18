# Phase 2-3 Migration Stories - Continuation Prompt

## Done

- CDBN-2011 ✅ - Migrated knowledge schema data (62 lessons, tables created)

## Remaining Stories

| Story         | Goal                                                         | Key Risk                         |
| ------------- | ------------------------------------------------------------ | -------------------------------- |
| **CDBN-2012** | Migrate telemetry data (agent_invocations, token_usage, etc) | FK chain ordering, volume        |
| **CDBN-2013** | Split story/plan content + cross-schema FK verification      | Content parsing, FK verification |
| **CDBN-2020** | Ingest stories from filesystem not in DB                     | Idempotency                      |
| **CDBN-3010** | Update MCP tool SQL to new schema                            | ~135 refs to update              |
| **CDBN-3020** | Update telemetry commands to new schema                      | Silent failures                  |

## Implementation Order

```
CDBN-2011 (done)
    ↓
CDBN-2012 → CDBN-2013 → CDBN-2020 → CDBN-3010 + CDBN-3020
```

## Key Context

**Source DB (lego_dev):** 38 wint tables, most have 0 rows (verify before migration)

**Target DB (knowledgebase):**

- workflow, artifacts schemas exist
- knowledge schema created by CDBN-2011
- Need: telemetry schema (for CDBN-2012)

**Code Updates Needed (CDBN-3010/3020):**

- 135+ refs to wint._ and kbar._ tables
- Context cache tools especially sensitive
- Telemetry writes are fire-and-forget (silent failures risk)

## Immediate Actions

1. **CDBN-2012**: Create telemetry schema migration (like 034_knowledge_extensions.sql)
2. **CDBN-2013**: Need migration for story_content, plan_content tables + FK verification script
3. **CDBN-2020**: Node.js script to parse story.yaml files
4. **CDBN-3010/3020**: Search/replace table refs after schemas ready

## Files Created

- `tree/story-cdbn-2011/apps/api/knowledge-base/src/db/migrations/035_cdbn2011_knowledge_data_migration.sql`
- `_implementation/phase2-3-migration-review-prompt.md`

## Next Step

Start with CDBN-2012: Create telemetry schema tables, then migrate data.
