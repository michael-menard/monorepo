# Consolidate Stories Tables: Migrate from public.stories to workflow.stories

## Context

Currently there are two stories tables:

- **public.stories** (638 rows): Full schema with all story metadata
- **workflow.stories** (1 row): Minimal schema created in CDBN-1050, only contains story_id, feature, state, title, priority, description, created_at, updated_at

The public schema is intended for user-facing data. Stories are internal workflow data and should live in the workflow schema.

## Problem

1. **Data duplication**: Same data exists in two places
2. **Schema mismatch**: workflow.stories is too minimal - missing 20+ fields
3. **Confusion**: Unclear which table is the source of truth
4. **Incomplete migration**: CDBN-1050 created the DDL but never migrated data

## Schema Comparison

### public.stories (current)

| Column              | Type      | Notes                             |
| ------------------- | --------- | --------------------------------- |
| id                  | UUID      | PK                                |
| story_id            | TEXT      | UNIQUE                            |
| feature             | TEXT      |                                   |
| epic                | TEXT      |                                   |
| title               | TEXT      |                                   |
| description         | TEXT      |                                   |
| story_type          | TEXT      | feature/bug/spike/chore/tech_debt |
| points              | INTEGER   |                                   |
| priority            | TEXT      | critical/high/medium/low          |
| state               | TEXT      | workflow state                    |
| phase               | TEXT      | implementation phase              |
| iteration           | INTEGER   | fix count                         |
| blocked             | BOOLEAN   |                                   |
| blocked_reason      | TEXT      |                                   |
| blocked_by_story    | TEXT      |                                   |
| touches_backend     | BOOLEAN   |                                   |
| touches_frontend    | BOOLEAN   |                                   |
| touches_database    | BOOLEAN   |                                   |
| touches_infra       | BOOLEAN   |                                   |
| acceptance_criteria | JSONB     |                                   |
| embedding           | VECTOR    | pgvector                          |
| created_at          | TIMESTAMP |                                   |
| updated_at          | TIMESTAMP |                                   |
| started_at          | TIMESTAMP |                                   |
| completed_at        | TIMESTAMP |                                   |

### workflow.stories (current - too minimal)

| Column      | Type        | Notes       |
| ----------- | ----------- | ----------- |
| story_id    | TEXT        | PRIMARY KEY |
| feature     | TEXT        | NOT NULL    |
| state       | TEXT        | NOT NULL    |
| title       | TEXT        | NOT NULL    |
| priority    | TEXT        |             |
| description | TEXT        |             |
| created_at  | TIMESTAMPTZ |             |
| updated_at  | TIMESTAMPTZ |             |

### Decision Required: Schema Strategy

**Option A: Extend workflow.stories to match public.stories**

- Pros: Complete consolidation, single source of truth
- Cons: Large migration, must handle vector column differently

**Option B: Keep minimal workflow.stories, use views**

- Pros: Minimal schema change, backward compatible
- Cons: Two tables still exist, views may have limitations

**Option C: Migrate to workflow.stories with core fields only**

- Pros: Simple migration, clear separation
- Cons: Lose some metadata (can be stored in story_details or JSONB)

**Recommendation**: Option A - Extend workflow.stories to match public.stories for full consolidation.

## Related Tables to Consider

1. **story_details** - Complements public.stories with file/path info - should migrate to workflow schema
2. **story_dependencies** - Already has entries in both schemas - needs deduping
3. **story_artifacts** - References stories.story_id - FK updates needed
4. **story_knowledge_links** - References stories.story_id - FK updates needed
5. **story_outcomes** - References stories.story_id - FK updates needed
6. **story_audit_log** - References stories.id (UUID) - needs careful migration

## Migration Phases

### Phase 1: Prepare

1. Extend workflow.stories schema to match public.stories (add all missing columns)
2. Add id UUID primary key to workflow.stories for FK compatibility
3. Create new migration file (034_consolidate_stories_schema.sql)

### Phase 2: Migrate Data

1. Insert all rows from public.stories to workflow.stories
2. Handle conflicts (workflow.stories already has WINT-1040)
3. Migrate related tables (story_dependencies, story_artifacts, etc.)

### Phase 3: Verify

1. Count validation: workflow.stories should have 638 rows
2. FK validation: All related tables point to workflow.stories
3. Query validation: All existing queries work

### Phase 4: Cleanup

1. Drop or rename public.stories (keep as backup view initially)
2. Update ERD documentation
3. Update Drizzle schema references

## Risks

1. **Vector column**: embedding column uses pgvector - may need special handling
2. **FK cascade**: Many tables reference public.stories - must update all FKs
3. **Downtime**: May need brief read-only window during migration
4. **Rollback**: Must have rollback plan if migration fails

## Stories Generated From This Plan

- **CDBN-2020**: Extend workflow.stories schema to match public.stories
- **CDBN-2021**: Migrate data from public.stories to workflow.stories
- **CDBN-2022**: Migrate related tables (story_details, story_dependencies, etc.)
- **CDBN-2023**: Verify migration and update FK references
- **CDBN-2024**: Cleanup - remove/deprecate public.stories and update ERD
