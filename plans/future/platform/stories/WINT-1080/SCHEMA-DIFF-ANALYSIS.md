# Schema Diff Analysis: WINT vs. LangGraph

**Story**: WINT-1080  
**Created**: 2026-02-14  
**Purpose**: Comprehensive table-by-table comparison of WINT and LangGraph schemas to identify overlaps, differences, and reconciliation strategy.

---

## Executive Summary

This analysis compares the WINT schema (main app database, port 5432, `wint` namespace) with the LangGraph schema (knowledge-base database, port 5433, `public` namespace). Both schemas track stories and workflow data but use fundamentally different approaches:

- **WINT**: Drizzle ORM v0.44.3, 6 schema groups, 24 tables, normalized design, underscored enums
- **LangGraph**: Raw SQL migrations, 14 tables, denormalized design, hyphenated enums, pgvector embeddings

**Key Findings**:
1. **3 overlapping domains**: Stories, features, workflow events
2. **Enum incompatibility**: `story_state` uses different naming conventions (underscores vs. hyphens) and different states (`in_qa` vs. `uat`)
3. **Vector embeddings**: LangGraph has pgvector on 5 tables, WINT has none
4. **11 WINT-unique domains**: Context cache, telemetry, ML pipeline, graph relational
5. **7 LangGraph-unique domains**: Elaborations, proofs, verifications, gaps, feedback, ADRs, acceptance criteria

---

## 1. Overlapping Tables

### 1.1 Stories Table

| Aspect | WINT Schema | LangGraph Schema | Reconciliation Strategy |
|--------|-------------|------------------|-------------------------|
| **Location** | `wint.stories` | `public.stories` | **WINT is source of truth** |
| **Primary Key** | `id: uuid` (PK), `story_id: text` (unique) | `id: uuid` (PK), `story_id: varchar(30)` (unique) | Compatible - keep both |
| **State Enum** | `story_state` (underscored: `ready_to_work`, `in_progress`, `in_qa`) | `story_state` (hyphenated: `ready-to-work`, `in-progress`, `uat`) | **MIGRATION REQUIRED** - see AC-002 |
| **Type Enum** | `story_type: text` (no enum) | `story_type: ENUM` (`feature`, `bug`, `tech-debt`, `spike`, `chore`) | Adopt LangGraph enum in unified schema |
| **Priority** | `story_priority: ENUM` (`P0`, `P1`, `P2`, `P3`, `P4`) | `priority: priority_level ENUM` (`p0`, `p1`, `p2`, `p3`) | Merge: use WINT naming (`P0`), add `P4` |
| **Foreign Keys** | None (story_id is text reference) | `feature_id: UUID REFERENCES features(id)` | Add to unified schema |
| **Vector Embedding** | None | `embedding: vector(1536)` | **ADD to WINT** - see AC-011 |
| **Metadata** | `metadata: JSONB` (typed) | Multiple columns (`goal`, `non_goals`, `packages`, `surfaces`) | Preserve both - WINT metadata is flexible |
| **Dependencies** | `story_dependencies` table (normalized) | `depends_on: VARCHAR(30)[]` (denormalized array) | **WINT approach is better** - keep normalized |
| **Indexes** | 5 indexes (composite, partial) | 4 indexes (basic) | Merge - WINT has better index strategy |

**Differences**:
- WINT tracks `complexity`, `wave`, `epic` - LangGraph does not
- LangGraph tracks `blocked_by`, `follow_up_from` inline - WINT uses relationships table
- WINT has richer state transition tracking (`storyStates`, `storyTransitions` tables)
- LangGraph stores scope as arrays (`packages`, `surfaces`) - WINT stores in JSONB metadata

**Recommendation**: **WINT schema is source of truth**. Migrate LangGraph stories to WINT schema structure, add `embedding` column for pgvector support.

---

### 1.2 Features Table

| Aspect | WINT Schema | LangGraph Schema | Reconciliation Strategy |
|--------|-------------|------------------|-------------------------|
| **Location** | `wint.features` | `public.features` | **WINT is source of truth** |
| **Primary Key** | `id: uuid` (PK), `feature_name: text` (unique) | `id: uuid` (PK), `name: varchar(100)` (unique) | Compatible - rename LangGraph column |
| **Type Classification** | `feature_type: text` (`api_endpoint`, `ui_component`, `service`, `utility`) | None | Add to LangGraph during migration |
| **Location Metadata** | `package_name: text`, `file_path: text` | None | WINT has richer metadata |
| **Vector Embedding** | None | `embedding: vector(1536)` | **ADD to WINT** - see AC-011 |
| **Status Tracking** | `is_active: boolean`, `deprecated_at: timestamp` | None | WINT has better lifecycle tracking |
| **Relationships** | `feature_relationships` table (graph model) | None | WINT has graph relational model |
| **Indexes** | 4 indexes | 1 index | WINT has better index strategy |

**Differences**:
- WINT has rich graph relational model (`capabilities`, `feature_relationships`, `cohesion_rules`)
- LangGraph features are simpler (just name, description, embedding)
- WINT tracks deprecation, activity status, package location

**Recommendation**: **WINT schema is source of truth**. Add `embedding` column to WINT features table, migrate LangGraph features data during WINT-1110.

---

### 1.3 Workflow Events / Audit Log

| Aspect | WINT Schema | LangGraph Schema | Reconciliation Strategy |
|--------|-------------|------------------|-------------------------|
| **Location** | `wint.state_transitions` (generic), `wint.workflow_audit_log` (workflow-specific) | `public.workflow_events` | **WINT is source of truth** |
| **Entity Tracking** | `entity_type: text`, `entity_id: text` | `entity_type: varchar(30)`, `entity_id: uuid` | Compatible - WINT is more flexible (text IDs) |
| **Event Classification** | `event_type: text` | `event_type: varchar(50)` | Compatible |
| **State Tracking** | `from_state: text`, `to_state: text` (dedicated to transitions) | `old_value: JSONB`, `new_value: JSONB` (generic) | Merge approaches - both useful |
| **Actor** | `triggered_by: text` | `actor: varchar(100)` | Compatible - rename to `triggered_by` |
| **Metadata** | `metadata: JSONB` | `old_value: JSONB`, `new_value: JSONB` | Compatible - different structure |
| **Timestamps** | `transitioned_at: timestamp`, `created_at: timestamp` | `created_at: timestamp` | WINT has richer timestamp tracking |
| **Indexes** | 5 indexes (composite) | 3 indexes (basic) | WINT has better index strategy |

**Differences**:
- WINT has two tables: `state_transitions` (generic) and `workflow_audit_log` (workflow-specific)
- LangGraph has one table: `workflow_events` (generic)
- WINT tracks telemetry separately (`agentInvocations`, `agentDecisions`, `agentOutcomes`)
- LangGraph embeds event data in JSONB fields

**Recommendation**: **WINT schema is source of truth**. Use WINT's dual-table approach (state transitions + audit log). Migrate LangGraph workflow_events to WINT tables during WINT-1110.

---

## 2. WINT-Unique Tables (Not in LangGraph)

| Schema Group | Tables | Purpose | Keep in Unified Schema? |
|--------------|--------|---------|-------------------------|
| **Story Management** | `story_states`, `story_transitions`, `story_dependencies` | Normalized story lifecycle tracking | ✅ Yes - core WINT functionality |
| **Context Cache** | `context_packs`, `context_sessions`, `context_cache_hits` | Token optimization via context caching | ✅ Yes - critical for WINT performance |
| **Telemetry** | `agent_invocations`, `agent_decisions`, `agent_outcomes`, `state_transitions` | Agent observability and debugging | ✅ Yes - core WINT telemetry |
| **ML Pipeline** | `training_data`, `ml_models`, `model_predictions`, `model_metrics` | Quality prediction and effort estimation | ✅ Yes - future ML features |
| **Graph Relational** | `capabilities`, `feature_relationships`, `cohesion_rules` | Feature dependency graph and cohesion rules | ✅ Yes - core WINT architecture analysis |
| **Workflow Tracking** | `workflow_executions`, `workflow_checkpoints`, `workflow_audit_log` | Workflow execution state management | ✅ Yes - LangGraph integration will use this |

**Total**: 18 WINT-unique tables, all retained in unified schema.

---

## 3. LangGraph-Unique Tables (Not in WINT)

| Table | Purpose | Migration Strategy |
|-------|---------|-------------------|
| **acceptance_criteria** | Store ACs for stories with verification status | **MIGRATE to WINT** - add to unified schema (AC-004) |
| **story_risks** | Track risks and mitigations per story | **MIGRATE to WINT** - add to unified schema (AC-004) |
| **elaborations** | Store elaboration audit results and verdicts | **KEEP in LangGraph DB** - specific to LangGraph workflow |
| **gaps** | Track gaps identified during elaboration | **KEEP in LangGraph DB** - specific to LangGraph workflow |
| **follow_ups** | Track follow-up stories | **MIGRATE to WINT** - map to `story_dependencies` table |
| **implementation_plans** | Store implementation plan chunks | **KEEP in LangGraph DB** - specific to LangGraph workflow |
| **verifications** | Store verification results (code review, tests, QA) | **KEEP in LangGraph DB** - specific to LangGraph workflow |
| **proofs** | Store proof-of-completion summaries | **KEEP in LangGraph DB** - specific to LangGraph workflow |
| **token_usage** | Track token usage per phase | **MIGRATE to WINT** - map to `context_sessions` table |
| **feedback** | Store feedback on stories and workflow | **MIGRATE to WINT** - add to unified schema or map to telemetry |
| **adrs** | Architectural Decision Records | **KEEP in LangGraph DB** - specific to LangGraph KB |

**Total**: 11 LangGraph-unique tables

**Migration Classification**:
- **Migrate to WINT** (5 tables): `acceptance_criteria`, `story_risks`, `follow_ups`, `token_usage`, `feedback`
- **Keep in LangGraph** (6 tables): `elaborations`, `gaps`, `implementation_plans`, `verifications`, `proofs`, `adrs`

**Rationale**:
- Tables tied to story metadata (ACs, risks, token usage) belong in WINT
- Tables tied to LangGraph workflow phases (elaboration, verification, proofs) stay in LangGraph
- ADRs are knowledge base entities, not workflow entities - keep in LangGraph KB

---

## 4. Enum Comparison

### 4.1 Story State Enum

| WINT Value | LangGraph Value | Semantic Match? | Migration Path |
|------------|-----------------|-----------------|----------------|
| `backlog` | `backlog` | ✅ Exact match | Direct map |
| `ready_to_work` | `ready-to-work` | ✅ Exact match | Normalize to underscores |
| `in_progress` | `in-progress` | ✅ Exact match | Normalize to underscores |
| `ready_for_qa` | `ready-for-qa` | ✅ Exact match | Normalize to underscores |
| `in_qa` | `uat` | ❌ Different naming | Map `uat` → `in_qa` |
| `blocked` | - | ❌ Missing in LangGraph | Add to unified enum |
| `done` | `done` | ✅ Exact match | Direct map |
| `cancelled` | - | ❌ Missing in LangGraph | Add to unified enum |
| - | `draft` | ❌ Missing in WINT | Add to unified enum |

**Unified Enum Proposal** (see AC-002):
```
story_state: ['draft', 'backlog', 'ready_to_work', 'in_progress', 'ready_for_qa', 'in_qa', 'blocked', 'done', 'cancelled']
```

### 4.2 Story Type Enum

| WINT Value | LangGraph Value | Reconciliation |
|------------|-----------------|----------------|
| ❌ No enum (uses `text`) | `feature`, `bug`, `tech-debt`, `spike`, `chore` | Adopt LangGraph enum in unified schema |

**Unified Enum Proposal**:
```
story_type: ['feature', 'bug', 'tech-debt', 'spike', 'chore', 'infra', 'docs']
```
(Added `infra` and `docs` from WINT codebase usage patterns)

### 4.3 Priority Enum

| WINT Value | LangGraph Value | Reconciliation |
|------------|-----------------|----------------|
| `P0`, `P1`, `P2`, `P3`, `P4` | `p0`, `p1`, `p2`, `p3` | Use WINT casing (uppercase), add `P4` |

**Unified Enum Proposal**:
```
story_priority: ['P0', 'P1', 'P2', 'P3', 'P4']
```

---

## 5. Index Strategy Comparison

### 5.1 WINT Index Patterns

**Strengths**:
- Composite indexes on frequently co-queried columns (e.g., `priority + state`, `epic + wave`)
- Partial indexes for active-record filtering (e.g., `state != 'done'`)
- Unique indexes on business keys (e.g., `story_id`, `feature_name`)
- Relationship indexes on both ends of foreign keys

**Example** (from `stories` table):
```typescript
epicWaveIdx: index('stories_epic_wave_idx').on(table.epic, table.wave),
priorityStateIdx: index('stories_priority_state_idx').on(table.priority, table.state),
```

### 5.2 LangGraph Index Patterns

**Strengths**:
- pgvector indexes with IVFFlat algorithm for semantic search
- GIN indexes on array columns (e.g., `depends_on`, `tags`)
- Basic single-column indexes on foreign keys and state

**Example** (from `stories` table):
```sql
CREATE INDEX idx_stories_embedding ON stories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_stories_depends_on ON stories USING GIN(depends_on);
```

**Unified Strategy**:
- Preserve WINT's composite and partial indexes for query performance
- Add LangGraph's pgvector indexes to WINT tables (`features`, `stories`)
- Add GIN indexes for JSONB metadata columns in WINT

---

## 6. pgvector Integration Analysis (AC-011)

### 6.1 Current LangGraph Usage

| Table | Embedding Column | Index Type | Purpose |
|-------|------------------|------------|---------|
| `features` | `embedding vector(1536)` | `ivfflat (vector_cosine_ops)` | Semantic search for features |
| `stories` | `embedding vector(1536)` | `ivfflat (vector_cosine_ops)` | Semantic search for stories |
| `gaps` | `embedding vector(1536)` | None | Semantic search for gap patterns |
| `feedback` | `embedding vector(1536)` | `ivfflat (vector_cosine_ops)` | Semantic search for feedback |
| `adrs` | `embedding vector(1536)` | `ivfflat (vector_cosine_ops)` | Semantic search for ADRs |

**Index Configuration**: `WITH (lists = 100)` (suitable for ~10k-100k vectors)

### 6.2 WINT Tables Requiring pgvector

| Table | Add Embedding? | Rationale |
|-------|----------------|-----------|
| `wint.stories` | ✅ Yes | Semantic search for story similarity, recommendation |
| `wint.features` | ✅ Yes | Semantic search for feature dependencies, cohesion analysis |
| `wint.training_data` | ❓ Maybe | ML features - may use different vector storage |
| `wint.agent_decisions` | ❓ Maybe | Decision pattern matching - defer to future story |
| `wint.context_packs` | ❓ Maybe | Context similarity - defer to future story |

**Migration Strategy**:
1. Add `embedding vector(1536) NULL` to `wint.stories` and `wint.features`
2. Create IVFFlat indexes with `vector_cosine_ops`
3. Existing WINT records will have `NULL` embeddings initially
4. Backfill embeddings in future story (Wave 4+)

**Prerequisites** (see AC-009):
- pgvector extension must be installed in main app database (port 5432)
- Check: `SELECT * FROM pg_extension WHERE extname = 'pgvector';`
- Install: `CREATE EXTENSION vector;` (requires superuser or rds_superuser)

---

## 7. Constraint and Foreign Key Differences

### 7.1 WINT Constraints

**Patterns**:
- `ON DELETE CASCADE` for all child tables (automatic cleanup)
- `UNIQUE` constraints on business keys (`story_id`, `feature_name`)
- `NOT NULL` on required fields with typed defaults
- Drizzle-level validation via Zod schemas

**Example**:
```typescript
storyId: uuid('story_id')
  .notNull()
  .references(() => stories.id, { onDelete: 'cascade' }),
```

### 7.2 LangGraph Constraints

**Patterns**:
- `ON DELETE CASCADE` for child tables
- `UNIQUE` constraints on composite keys (`story_id + ac_id`)
- `DEFAULT` values for nullable fields
- PostgreSQL-level validation via CHECK constraints (not present in current schema)

**Example**:
```sql
story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
UNIQUE(story_id, ac_id)
```

**Unified Strategy**:
- Use WINT's Drizzle-based constraint patterns (type-safe, migration-friendly)
- Preserve LangGraph's composite unique constraints where applicable
- Add CHECK constraints for enum validation (handled by pgEnum in Drizzle)

---

## 8. Timestamp Patterns

### 8.1 WINT Timestamps

**Pattern**:
```typescript
createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
```

**Strengths**:
- Always with timezone (`TIMESTAMPTZ`)
- Both `created_at` and `updated_at` on all tables
- Default to `NOW()` via Drizzle

### 8.2 LangGraph Timestamps

**Pattern**:
```sql
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
```

**Strengths**:
- Always with timezone (`TIMESTAMPTZ`)
- Triggers auto-update `updated_at` on row changes

**Example Trigger**:
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stories_updated_at
  BEFORE UPDATE ON stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Unified Strategy**:
- Use WINT's timestamp pattern (consistent, type-safe)
- Add trigger-based auto-update for `updated_at` (migrate from LangGraph)
- All timestamps use `TIMESTAMPTZ` (timezone-aware)

---

## 9. JSONB vs. Normalized Columns

### 9.1 WINT Approach

**Pattern**: Use JSONB for flexible, schema-evolving metadata
```typescript
metadata: jsonb('metadata').$type<{
  surfaces?: { backend?: boolean; frontend?: boolean; database?: boolean; infra?: boolean }
  tags?: string[]
  experimentVariant?: 'control' | 'variant_a' | 'variant_b'
  blocked_by?: string[]
  blocks?: string[]
}>(),
```

**Strengths**:
- Type-safe via Zod schemas
- Flexible schema evolution
- Single column for related metadata
- Indexed via GIN for queries

### 9.2 LangGraph Approach

**Pattern**: Use dedicated columns for each field
```sql
goal TEXT,
non_goals TEXT[] DEFAULT '{}',
packages TEXT[] DEFAULT '{}',
surfaces surface_type[] DEFAULT '{}',
```

**Strengths**:
- Explicit schema documentation
- PostgreSQL array types for lists
- Direct column indexing
- Easier SQL queries (no JSONB extraction)

**Unified Strategy**:
- Use WINT's JSONB approach for optional, evolving metadata
- Use dedicated columns for core, queryable fields (e.g., `state`, `priority`, `type`)
- Add GIN indexes on JSONB columns for performance
- Document JSONB structure in TypeScript types

---

## 10. Views and Functions

### 10.1 LangGraph Views

| View | Purpose | Migrate to WINT? |
|------|---------|------------------|
| `workable_stories` | Stories ready to work (ready-to-work state, not blocked, dependencies satisfied) | ✅ Yes - recreate in Drizzle or raw SQL |
| `feature_progress` | Story count by state per feature | ✅ Yes - useful for reporting |

**Migration Strategy**:
- Recreate views in unified schema
- Use Drizzle's `sql` helper for raw SQL views
- Document view logic in schema comments

### 10.2 LangGraph Functions

| Function | Purpose | Migrate to WINT? |
|----------|---------|------------------|
| `get_story_next_action(p_story_id)` | Returns next workflow action for story | ❓ Maybe - can be application logic |
| `transition_story_state(p_story_id, p_new_state, p_actor)` | Transition story state with validation and event logging | ✅ Yes - core workflow logic |
| `update_updated_at()` | Trigger function to auto-update `updated_at` | ✅ Yes - migrate to all tables |

**Migration Strategy**:
- Migrate `transition_story_state` function to unified schema
- Migrate `update_updated_at` trigger to all tables with `updated_at` column
- `get_story_next_action` can be application logic (not database function)

---

## 11. Summary Table: Schema Reconciliation Matrix

| Domain | WINT Schema | LangGraph Schema | Source of Truth | Action |
|--------|-------------|------------------|----------------|--------|
| **Stories** | ✅ 4 tables (normalized) | ✅ 1 table (denormalized) | WINT | Migrate LangGraph → WINT structure |
| **Features** | ✅ 4 tables (graph model) | ✅ 1 table (simple) | WINT | Add pgvector to WINT, migrate data |
| **Acceptance Criteria** | ❌ None | ✅ 1 table | LangGraph | Add to WINT unified schema |
| **Story Risks** | ❌ None | ✅ 1 table | LangGraph | Add to WINT unified schema |
| **Dependencies** | ✅ Normalized table | ❌ Array column | WINT | WINT approach is better |
| **Workflow Events** | ✅ 2 tables (state transitions + audit) | ✅ 1 table (generic) | WINT | Merge into WINT tables |
| **Elaborations** | ❌ None | ✅ 1 table | LangGraph | Keep in LangGraph DB |
| **Gaps** | ❌ None | ✅ 1 table | LangGraph | Keep in LangGraph DB |
| **Implementation Plans** | ❌ None | ✅ 1 table | LangGraph | Keep in LangGraph DB |
| **Verifications** | ❌ None | ✅ 1 table | LangGraph | Keep in LangGraph DB |
| **Proofs** | ❌ None | ✅ 1 table | LangGraph | Keep in LangGraph DB |
| **Token Usage** | ✅ `context_sessions` | ✅ `token_usage` | WINT | Merge into WINT telemetry |
| **Feedback** | ❌ None | ✅ 1 table | LangGraph | Evaluate - may add to WINT |
| **ADRs** | ❌ None | ✅ 1 table | LangGraph | Keep in LangGraph KB |
| **Context Cache** | ✅ 3 tables | ❌ None | WINT | WINT-unique, keep as-is |
| **Telemetry** | ✅ 4 tables | ❌ None | WINT | WINT-unique, keep as-is |
| **ML Pipeline** | ✅ 4 tables | ❌ None | WINT | WINT-unique, keep as-is |
| **Graph Relational** | ✅ 4 tables | ❌ None | WINT | WINT-unique, keep as-is |
| **Workflow Tracking** | ✅ 3 tables | ❌ None | WINT | WINT-unique, keep as-is |

---

## 12. Migration Complexity Assessment

| Complexity Factor | Assessment | Impact |
|-------------------|------------|--------|
| **Enum Migration** | 🟡 Medium | Requires data transformation (hyphens → underscores, `uat` → `in_qa`) |
| **pgvector Addition** | 🟡 Medium | Requires extension installation, index creation, nullable columns |
| **Foreign Key Migration** | 🟢 Low | Add foreign keys to WINT, existing data can reference by `story_id` text |
| **Data Type Changes** | 🟢 Low | VARCHAR → TEXT, minimal impact |
| **Index Migration** | 🟢 Low | Create new indexes, no data changes |
| **View Migration** | 🟢 Low | Recreate views, no data changes |
| **Function Migration** | 🟡 Medium | Adapt to WINT schema, test thoroughly |
| **Trigger Migration** | 🟢 Low | Standard `updated_at` pattern, well-tested |
| **JSONB Consolidation** | 🟡 Medium | Migrate array columns to JSONB, extract on read |

**Overall Migration Complexity**: 🟡 **Medium**

**Highest Risk Areas**:
1. Enum migration (data transformation, query updates)
2. pgvector extension installation (requires superuser privileges)
3. Backward compatibility with LangGraph queries (function/view updates)

---

## 13. Database Coexistence Strategy

**Phase 1: Schema Alignment** (WINT-1080 - this story)
- Define unified schema specification
- Generate migration scripts
- Test on local databases
- **DO NOT DEPLOY** to production yet

**Phase 2: LangGraph Code Updates** (WINT-1090)
- Update LangGraph repository to use unified schema
- Update enum value references
- Update query patterns
- Test with migrated schema

**Phase 3: Schema Deployment** (WINT-1090 completion)
- Deploy migration to knowledge-base database (port 5433)
- Validate backward compatibility
- Monitor for errors

**Phase 4: Data Migration** (WINT-1110)
- Migrate LangGraph story data to WINT database
- Handle duplicate stories
- Consolidate workflow events
- Backfill embeddings

**Phase 5: Database Consolidation** (Future - Wave 4+)
- Evaluate performance and operational burden
- Decide if databases should merge
- Plan migration if needed

---

## 14. Recommendations

1. **Prioritize Core Tables** (AC-004):
   - Stories, features, workflow events → highest priority
   - Acceptance criteria, story risks → medium priority
   - Elaborations, proofs, verifications → defer to WINT-1090

2. **Add pgvector Support** (AC-011):
   - Add `embedding vector(1536) NULL` to `wint.stories` and `wint.features`
   - Document pgvector installation prerequisites
   - Defer embedding backfill to future story

3. **Enum Reconciliation** (AC-002):
   - Use underscored naming convention (`ready_to_work`)
   - Document all enum value mappings
   - Generate migration scripts for data transformation

4. **Backward Compatibility** (AC-006):
   - Test all LangGraph views and functions after migration
   - Update queries to use new enum values
   - Provide migration guide for WINT-1090

5. **Time-boxing** (AC-004):
   - Limit unified schema specification to 16 hours
   - Prioritize core tables, document incomplete areas
   - Defer complex domains to follow-up stories

---

## Appendix A: Table Count Summary

| Category | WINT | LangGraph | Unified |
|----------|------|-----------|---------|
| **Overlapping** | 3 | 3 | 3 (WINT wins) |
| **WINT-Unique** | 18 | - | 18 (keep all) |
| **LangGraph-Unique (Migrate)** | - | 5 | 5 (add to WINT) |
| **LangGraph-Unique (Keep Separate)** | - | 6 | 6 (LangGraph DB) |
| **Total Tables in Unified Schema** | 24 | 14 | **26** (24 WINT + 2 LangGraph additions) |

---

## Appendix B: Column Count by Table (Top 10 Largest)

| Table | WINT Columns | LangGraph Columns | Unified Columns |
|-------|-------------|-------------------|-----------------|
| `stories` | 14 | 15 | 17 (merge) |
| `workflow_executions` | 13 | - | 13 |
| `agent_invocations` | 11 | - | 11 |
| `verifications` | - | 16 | 16 (add to WINT) |
| `elaborations` | - | 10 | - (keep in LangGraph) |
| `features` | 10 | 5 | 11 (add embedding) |
| `ml_models` | 11 | - | 11 |
| `context_packs` | 10 | - | 10 |

---

**Document Status**: ✅ Complete  
**Next Steps**: AC-002 (Enum Reconciliation), AC-003 (Ownership Model), AC-004 (Unified Schema Specification)
