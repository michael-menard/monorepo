# Schema Ownership Model: Source of Truth and Dual Database Coexistence

**Story**: WINT-1080  
**Created**: 2026-02-14  
**Purpose**: Define which schema is the source of truth for each domain, document ownership boundaries, and specify dual database coexistence strategy during migration phase.

---

## Executive Summary

The WINT and LangGraph schemas operate on **separate PostgreSQL databases**:

- **Main App Database** (port 5432, `wint` schema namespace) - WINT platform
- **Knowledge Base Database** (port 5433, `public` schema namespace) - LangGraph workflow

This document defines **ownership boundaries** for each schema domain, specifies which database is the **source of truth** during the migration phase, and documents the **dual database coexistence strategy** from WINT-1080 completion through WINT-1110 data migration.

**Key Decisions**:
1. **WINT schema is source of truth** for stories, features, workflow events
2. **LangGraph schema retains ownership** of elaborations, proofs, verifications (workflow-specific)
3. **Dual database coexistence** during migration phase (WINT-1080 → WINT-1110)
4. **No database consolidation** in this wave (deferred to Wave 4+)

---

## 1. Ownership Matrix: Domain-by-Domain

### 1.1 Stories Domain

| Aspect | WINT Schema | LangGraph Schema | Source of Truth | Rationale |
|--------|-------------|------------------|----------------|-----------|
| **Core Story Data** | `wint.stories` | `public.stories` | **WINT** | WINT has richer normalization (metadata, dependencies), supports context caching, ML pipeline |
| **Story State Tracking** | `wint.story_states`, `wint.story_transitions` | None | **WINT** | WINT has dedicated tables for state history and transitions |
| **Story Dependencies** | `wint.story_dependencies` (normalized table) | `depends_on: text[]` (denormalized array) | **WINT** | WINT's normalized approach is more scalable and queryable |
| **Acceptance Criteria** | None | `public.acceptance_criteria` | **Migrate to WINT** | ACs are story metadata, belong in WINT |
| **Story Risks** | None | `public.story_risks` | **Migrate to WINT** | Risks are story metadata, belong in WINT |
| **Priority and Complexity** | `story_priority` enum, `complexity` text | `priority_level` enum | **WINT** | WINT has richer priority levels (P0-P4) |
| **Story Lifecycle** | `state: story_state` enum (8 states) | `state: story_state` enum (7 states) | **WINT** | WINT has more comprehensive lifecycle (`blocked`, `cancelled`) |

**Decision**: **WINT is source of truth for all story-related data.**

**Migration Path**:
1. WINT-1080: Add `acceptance_criteria` and `story_risks` tables to WINT schema
2. WINT-1090: Update LangGraph code to query WINT schema
3. WINT-1110: Migrate LangGraph story data to WINT database
4. Post-migration: Deprecate LangGraph `stories` table (or use as read-only cache)

---

### 1.2 Features Domain

| Aspect | WINT Schema | LangGraph Schema | Source of Truth | Rationale |
|--------|-------------|------------------|----------------|-----------|
| **Core Feature Data** | `wint.features` | `public.features` | **WINT** | WINT has graph relational model (`feature_relationships`, `capabilities`, `cohesion_rules`) |
| **Feature Metadata** | `feature_type`, `package_name`, `file_path`, `tags` | `name`, `description` | **WINT** | WINT has richer metadata for dependency analysis |
| **Feature Relationships** | `wint.feature_relationships` (graph model) | None | **WINT** | WINT-unique, critical for cohesion analysis |
| **Capabilities** | `wint.capabilities` | None | **WINT** | WINT-unique, maps features to high-level capabilities |
| **Cohesion Rules** | `wint.cohesion_rules` | None | **WINT** | WINT-unique, defines architectural rules |
| **Vector Embeddings** | None (to be added) | `embedding vector(1536)` | **Merge** | Add pgvector to WINT, migrate embeddings from LangGraph |

**Decision**: **WINT is source of truth for all feature-related data.**

**Migration Path**:
1. WINT-1080: Add `embedding vector(1536)` column to `wint.features`
2. WINT-1110: Migrate LangGraph feature embeddings to WINT database
3. Post-migration: Deprecate LangGraph `features` table

---

### 1.3 Workflow Events Domain

| Aspect | WINT Schema | LangGraph Schema | Source of Truth | Rationale |
|--------|-------------|------------------|----------------|-----------|
| **State Transitions** | `wint.state_transitions` (generic) | `public.workflow_events` (state_changed events) | **WINT** | WINT has dedicated state transition tracking with from/to state |
| **Audit Log** | `wint.workflow_audit_log` (workflow-specific) | `public.workflow_events` (generic audit) | **WINT** | WINT has workflow-specific audit log with rich metadata |
| **Agent Telemetry** | `wint.agent_invocations`, `wint.agent_decisions`, `wint.agent_outcomes` | None | **WINT** | WINT-unique, critical for observability and ML pipeline |

**Decision**: **WINT is source of truth for all workflow event and audit data.**

**Migration Path**:
1. WINT-1090: Update LangGraph code to log events to WINT tables
2. WINT-1110: Migrate historical LangGraph workflow_events to WINT tables
3. Post-migration: Deprecate LangGraph `workflow_events` table

---

### 1.4 Context Cache Domain

| Aspect | WINT Schema | LangGraph Schema | Source of Truth | Rationale |
|--------|-------------|------------------|----------------|-----------|
| **Context Packs** | `wint.context_packs` | None | **WINT** | WINT-unique feature, no equivalent in LangGraph |
| **Context Sessions** | `wint.context_sessions` | None | **WINT** | WINT-unique feature |
| **Cache Hits** | `wint.context_cache_hits` | None | **WINT** | WINT-unique feature |
| **Token Usage** | `wint.context_sessions` (tracks tokens) | `public.token_usage` | **Merge** | Consolidate token tracking in WINT `context_sessions` |

**Decision**: **WINT owns context caching. Merge LangGraph token usage into WINT.**

**Migration Path**:
1. WINT-1080: Document mapping from `public.token_usage` to `wint.context_sessions`
2. WINT-1110: Migrate LangGraph token usage data to WINT `context_sessions`
3. Post-migration: Deprecate LangGraph `token_usage` table

---

### 1.5 Elaboration, Verification, and Proof Domain

| Aspect | WINT Schema | LangGraph Schema | Source of Truth | Rationale |
|--------|-------------|------------------|----------------|-----------|
| **Elaborations** | None | `public.elaborations` | **LangGraph** | Specific to LangGraph elaboration workflow, not part of WINT core |
| **Gaps** | None | `public.gaps` | **LangGraph** | Elaboration artifacts, specific to LangGraph |
| **Follow-ups** | `wint.story_dependencies` (normalized) | `public.follow_ups` | **Merge** | Map to WINT `story_dependencies` with `dependency_type = 'follow_up'` |
| **Implementation Plans** | None | `public.implementation_plans` | **LangGraph** | Specific to LangGraph planning workflow |
| **Verifications** | None | `public.verifications` | **LangGraph** | Specific to LangGraph QA workflow |
| **Proofs** | None | `public.proofs` | **LangGraph** | Specific to LangGraph proof-of-completion workflow |

**Decision**: **LangGraph retains ownership of elaboration, verification, and proof tables. These are workflow-specific artifacts, not core platform data.**

**Migration Path**:
1. WINT-1080: Document that these tables remain in LangGraph database
2. WINT-1090: Ensure LangGraph code continues to query these tables from knowledge-base DB
3. Future (Wave 4+): Evaluate if these tables should migrate to WINT for unified querying

---

### 1.6 Feedback and ADRs Domain

| Aspect | WINT Schema | LangGraph Schema | Source of Truth | Rationale |
|--------|-------------|------------------|----------------|-----------|
| **Feedback** | None | `public.feedback` | **Evaluate** | Could map to WINT telemetry or remain in LangGraph KB |
| **ADRs** | None | `public.adrs` | **LangGraph** | ADRs are knowledge base entities, not workflow entities - keep in LangGraph KB |

**Decision**: **ADRs remain in LangGraph KB. Feedback to be evaluated (may migrate to WINT telemetry).**

**Migration Path**:
1. WINT-1080: Document that ADRs remain in LangGraph KB (knowledge base, not workflow data)
2. Future: Evaluate if feedback should map to WINT `agent_outcomes` or remain separate

---

### 1.7 Telemetry and ML Pipeline Domain

| Aspect | WINT Schema | LangGraph Schema | Source of Truth | Rationale |
|--------|-------------|------------------|----------------|-----------|
| **Agent Invocations** | `wint.agent_invocations` | None | **WINT** | WINT-unique, core platform feature |
| **Agent Decisions** | `wint.agent_decisions` | None | **WINT** | WINT-unique, ML training data source |
| **Agent Outcomes** | `wint.agent_outcomes` | None | **WINT** | WINT-unique, quality analysis |
| **Training Data** | `wint.training_data` | None | **WINT** | WINT-unique, ML pipeline |
| **ML Models** | `wint.ml_models` | None | **WINT** | WINT-unique, ML pipeline |
| **Model Predictions** | `wint.model_predictions` | None | **WINT** | WINT-unique, ML pipeline |
| **Model Metrics** | `wint.model_metrics` | None | **WINT** | WINT-unique, ML pipeline |

**Decision**: **WINT owns all telemetry and ML pipeline data. No overlap with LangGraph.**

---

### 1.8 Graph Relational Domain

| Aspect | WINT Schema | LangGraph Schema | Source of Truth | Rationale |
|--------|-------------|------------------|----------------|-----------|
| **Features** | `wint.features` | `public.features` | **WINT** | See section 1.2 |
| **Capabilities** | `wint.capabilities` | None | **WINT** | WINT-unique, maps features to capabilities |
| **Feature Relationships** | `wint.feature_relationships` | None | **WINT** | WINT-unique, graph model for dependencies |
| **Cohesion Rules** | `wint.cohesion_rules` | None | **WINT** | WINT-unique, architectural rules |

**Decision**: **WINT owns all graph relational data. No overlap with LangGraph.**

---

### 1.9 Workflow Tracking Domain

| Aspect | WINT Schema | LangGraph Schema | Source of Truth | Rationale |
|--------|-------------|------------------|----------------|-----------|
| **Workflow Executions** | `wint.workflow_executions` | None | **WINT** | WINT-unique, LangGraph will integrate |
| **Workflow Checkpoints** | `wint.workflow_checkpoints` | None | **WINT** | WINT-unique, LangGraph will integrate |
| **Workflow Audit Log** | `wint.workflow_audit_log` | None | **WINT** | WINT-unique, LangGraph will integrate |

**Decision**: **WINT owns workflow tracking. LangGraph will integrate with WINT workflow tables in future.**

---

## 2. Ownership Summary Matrix

| Domain | WINT Schema | LangGraph Schema | Source of Truth | Migration Action |
|--------|-------------|------------------|----------------|------------------|
| **Stories** | ✅ 4 tables | ✅ 1 table + ACs/risks | **WINT** | Migrate to WINT |
| **Features** | ✅ 4 tables | ✅ 1 table | **WINT** | Migrate to WINT, add pgvector |
| **Workflow Events** | ✅ 2 tables + telemetry | ✅ 1 table | **WINT** | Migrate to WINT |
| **Context Cache** | ✅ 3 tables | ❌ None | **WINT** | WINT-unique |
| **Telemetry** | ✅ 4 tables | ❌ None | **WINT** | WINT-unique |
| **ML Pipeline** | ✅ 4 tables | ❌ None | **WINT** | WINT-unique |
| **Graph Relational** | ✅ 4 tables | ❌ None | **WINT** | WINT-unique |
| **Workflow Tracking** | ✅ 3 tables | ❌ None | **WINT** | WINT-unique |
| **Elaborations** | ❌ None | ✅ 4 tables | **LangGraph** | Keep in LangGraph |
| **Verifications/Proofs** | ❌ None | ✅ 2 tables | **LangGraph** | Keep in LangGraph |
| **Feedback** | ❌ None | ✅ 1 table | **Evaluate** | TBD |
| **ADRs** | ❌ None | ✅ 1 table | **LangGraph** | Keep in LangGraph KB |

---

## 3. Dual Database Coexistence Strategy (AC-008)

### 3.1 Current State (Pre-WINT-1080)

**Main App Database** (port 5432, `wint` schema):
- WINT platform stories and workflow data
- Context caching, telemetry, ML pipeline, graph relational
- Managed by Drizzle ORM

**Knowledge Base Database** (port 5433, `public` schema):
- LangGraph workflow stories and elaboration artifacts
- pgvector embeddings for semantic search
- Managed by raw SQL migrations

**Problem**: Stories exist in both databases with no synchronization mechanism.

---

### 3.2 Coexistence Phase Timeline (AC-008)

| Phase | Timeline | Story | Description | Source of Truth |
|-------|----------|-------|-------------|----------------|
| **Phase 1: Schema Definition** | Current | WINT-1080 | Define unified schema, generate migration scripts | N/A (planning phase) |
| **Phase 2: Code Updates** | After WINT-1080 | WINT-1090 | Update LangGraph code to use unified schema | **Dual: WINT for new, LangGraph for legacy** |
| **Phase 3: Schema Deployment** | After WINT-1090 code | WINT-1090 | Deploy schema migration to knowledge-base DB | **Dual: WINT for new, LangGraph for legacy** |
| **Phase 4: Data Migration** | After schema deployment | WINT-1110 | Migrate LangGraph stories to WINT database | **Transition: WINT becomes single source** |
| **Phase 5: Consolidation** | After WINT-1110 | Post-migration | Deprecate LangGraph story tables, use WINT only | **WINT** |

**Coexistence Duration**: From WINT-1080 completion (current) to WINT-1110 completion (estimated 2-3 waves).

---

### 3.3 Coexistence Rules During Migration Phase

#### 3.3.1 Story Creation

| When | Where Created | Source of Truth | Rationale |
|------|---------------|----------------|-----------|
| **Before WINT-1090** | LangGraph database (knowledge-base) | LangGraph | LangGraph code not yet updated |
| **After WINT-1090, Before WINT-1110** | WINT database (main app) | WINT | LangGraph code updated to write to WINT |
| **After WINT-1110** | WINT database (main app) | WINT | All data migrated to WINT |

#### 3.3.2 Story State Updates

| When | Where Updated | Source of Truth | Rationale |
|------|---------------|----------------|-----------|
| **Before WINT-1090** | LangGraph database | LangGraph | LangGraph code not yet updated |
| **After WINT-1090, Before WINT-1110** | **Dual write**: Update both WINT and LangGraph | **WINT is authoritative** | Maintain backward compatibility during transition |
| **After WINT-1110** | WINT database only | WINT | LangGraph stories migrated to WINT |

**Dual Write Pattern** (WINT-1090):
```typescript
async function updateStoryState(storyId: string, newState: StoryState) {
  // Write to WINT (authoritative)
  await wintDb.update(wintStories)
    .set({ state: newState })
    .where(eq(wintStories.storyId, storyId))

  // Write to LangGraph (backward compatibility)
  try {
    await langGraphDb.query(
      `UPDATE stories SET state = $1 WHERE story_id = $2`,
      [newState, storyId]
    )
  } catch (error) {
    logger.warn(`Failed to update LangGraph story ${storyId}:`, error)
    // Don't fail - WINT is source of truth
  }
}
```

#### 3.3.3 Story Queries

| When | Where Queried | Fallback | Rationale |
|------|---------------|----------|-----------|
| **Before WINT-1090** | LangGraph database | None | LangGraph code not yet updated |
| **After WINT-1090, Before WINT-1110** | **WINT first, LangGraph fallback** | Query LangGraph if not found in WINT | Support legacy stories during migration |
| **After WINT-1110** | WINT database only | None | All data migrated to WINT |

**Query with Fallback Pattern** (WINT-1090):
```typescript
async function getStory(storyId: string): Promise<Story | null> {
  // Query WINT first (authoritative)
  const wintStory = await wintDb.query.stories.findFirst({
    where: eq(wintStories.storyId, storyId)
  })

  if (wintStory) {
    return wintStory
  }

  // Fallback to LangGraph for legacy stories
  const langGraphStory = await langGraphDb.query(
    `SELECT * FROM stories WHERE story_id = $1`,
    [storyId]
  )

  if (langGraphStory.rows[0]) {
    logger.warn(`Story ${storyId} found only in LangGraph (not yet migrated)`)
    return mapLangGraphStoryToWint(langGraphStory.rows[0])
  }

  return null
}
```

#### 3.3.4 Cross-Database Story Resolution

**Scenario**: Story `WINT-1080` exists in both WINT and LangGraph databases with different state values.

**Resolution**:
1. **WINT is source of truth** - always use WINT state value
2. Log warning if states differ
3. Schedule reconciliation during WINT-1110 data migration

**Example**:
- WINT database: `WINT-1080` state = `in_progress`
- LangGraph database: `WINT-1080` state = `ready-to-work`
- **Resolved value**: `in_progress` (from WINT)
- **Action**: Log discrepancy, investigate during WINT-1110

---

### 3.4 Coexistence Implementation Checklist

#### Phase 2: Code Updates (WINT-1090)

- [ ] Update story creation to write to WINT database
- [ ] Implement dual write for story state updates (WINT + LangGraph)
- [ ] Implement query with fallback (WINT first, LangGraph fallback)
- [ ] Add logging for cross-database discrepancies
- [ ] Update enum values to underscored convention
- [ ] Test with both databases in coexistence mode

#### Phase 3: Schema Deployment (WINT-1090)

- [ ] Deploy schema migration to knowledge-base database
- [ ] Validate backward compatibility with LangGraph queries
- [ ] Monitor for cross-database query errors
- [ ] Document any schema migration issues

#### Phase 4: Data Migration (WINT-1110)

- [ ] Migrate LangGraph stories to WINT database
- [ ] Reconcile duplicate stories (cross-database conflicts)
- [ ] Migrate embeddings, acceptance criteria, risks
- [ ] Validate data integrity after migration
- [ ] Update queries to use WINT only (remove fallback)
- [ ] Deprecate LangGraph story tables (mark as read-only or drop)

---

### 3.5 Database Consolidation Strategy (Future - Wave 4+)

**Current Decision**: **Maintain two separate databases** (main app on 5432, knowledge-base on 5433).

**Rationale**:
1. **Isolation**: LangGraph workflow data isolated from main app
2. **Performance**: Separate connection pools, no contention
3. **Scalability**: Independent scaling of each database
4. **Migration Safety**: Staged migration reduces risk

**Future Consolidation Evaluation Criteria**:
- [ ] Performance impact acceptable (query latency, connection pool contention)
- [ ] Operational burden of two databases exceeds benefits
- [ ] LangGraph workflow fully integrated with WINT platform
- [ ] Cross-database queries become frequent and complex

**If Consolidation Approved**:
1. Migrate LangGraph tables to main app database (port 5432)
2. Migrate to `wint` schema namespace or separate `langgraph` namespace
3. Update connection strings in LangGraph code
4. Decommission knowledge-base database (port 5433)

**Estimated Effort**: 8-13 story points (complex migration, high risk)

---

## 4. Schema Namespace Strategy

### 4.1 Current Namespace Isolation

**WINT Schema**:
- Namespace: `wint` (PostgreSQL schema)
- Database: Main app database (port 5432)
- Pattern: `wint.stories`, `wint.features`, `wint.context_packs`, etc.

**LangGraph Schema**:
- Namespace: `public` (default PostgreSQL schema)
- Database: Knowledge-base database (port 5433)
- Pattern: `public.stories`, `public.elaborations`, `public.adrs`, etc.

### 4.2 Namespace Strategy During Migration

**Decision**: **Keep LangGraph tables in `public` namespace during migration.**

**Rationale**:
1. Reduces migration complexity (no namespace changes)
2. Avoids breaking LangGraph queries (no schema prefix updates)
3. Namespace migration can happen later if databases merge

**Future**: If databases consolidate, consider migrating LangGraph tables to `langgraph` schema namespace for isolation.

---

## 5. Ownership Boundary Principles

### 5.1 Core Principles

| Principle | Description | Example |
|-----------|-------------|---------|
| **1. Normalization over Denormalization** | WINT's normalized approach is preferred for source of truth | `story_dependencies` table (WINT) > `depends_on` array (LangGraph) |
| **2. Platform Data in WINT** | Core platform data (stories, features, telemetry) belongs in WINT | Stories, features, workflow events → WINT |
| **3. Workflow Artifacts in LangGraph** | LangGraph-specific workflow artifacts stay in LangGraph | Elaborations, proofs, verifications → LangGraph |
| **4. Knowledge Base in LangGraph** | Knowledge base entities (ADRs, lessons) stay in LangGraph | ADRs, feedback → LangGraph KB |
| **5. Rich Metadata in WINT** | WINT provides richer metadata and relationships | Features with graph model, stories with state tracking → WINT |

### 5.2 Decision Heuristic

**Question**: Should table `X` be in WINT or LangGraph?

**Decision Tree**:
1. **Is `X` core platform data** (stories, features, workflow events)?
   - Yes → **WINT**
   - No → Continue to step 2

2. **Is `X` specific to LangGraph workflow** (elaboration, verification, proof)?
   - Yes → **LangGraph**
   - No → Continue to step 3

3. **Is `X` knowledge base data** (ADRs, lessons learned, feedback)?
   - Yes → **LangGraph**
   - No → Continue to step 4

4. **Is `X` telemetry or ML data** (agent invocations, training data)?
   - Yes → **WINT**
   - No → **Evaluate case-by-case**

---

## 6. Cross-Database Query Patterns

### 6.1 Join Across Databases (Not Supported)

**Problem**: PostgreSQL does not support cross-database JOINs.

**Example** (invalid):
```sql
-- ❌ Cannot JOIN across databases
SELECT s.story_id, e.verdict
FROM wint.stories s
JOIN public.elaborations e ON e.story_id = s.id;  -- Different databases!
```

**Solution**: Application-layer JOIN (query both databases, merge in code).

### 6.2 Application-Layer JOIN Pattern

```typescript
async function getStoryWithElaboration(storyId: string) {
  // Query WINT database
  const story = await wintDb.query.stories.findFirst({
    where: eq(wintStories.storyId, storyId)
  })

  // Query LangGraph database
  const elaboration = await langGraphDb.query(
    `SELECT * FROM elaborations WHERE story_id = (
      SELECT id FROM stories WHERE story_id = $1
    )`,
    [storyId]
  )

  // Merge in application layer
  return {
    ...story,
    elaboration: elaboration.rows[0] || null
  }
}
```

### 6.3 Denormalization Strategy

For frequent cross-database queries, consider denormalizing data:

**Option 1**: Cache LangGraph data in WINT (e.g., elaboration verdict in story metadata)
**Option 2**: Cache WINT data in LangGraph (e.g., story state in elaborations table)

**Trade-off**: Reduces cross-database queries, increases data staleness risk.

---

## 7. Migration Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Story state mismatch** (WINT vs. LangGraph) | Medium | High | Dual write pattern, reconciliation during WINT-1110 |
| **Cross-database query performance** | Medium | Medium | Application-layer JOIN, denormalization where needed |
| **Data loss during migration** | High | Low | Rollback script, database snapshots, dry-run testing |
| **Breaking LangGraph functionality** | High | Medium | Backward compatibility testing (AC-006), staged deployment |
| **Enum migration errors** | Medium | Medium | Test migration on cloned database, validate all queries |

---

## 8. Summary

### 8.1 Ownership Decisions

| Domain | WINT Ownership | LangGraph Ownership | Migration Action |
|--------|---------------|-------------------|------------------|
| **Stories** | ✅ Source of truth | ❌ Migrate to WINT | Migrate in WINT-1110 |
| **Features** | ✅ Source of truth | ❌ Migrate to WINT | Migrate in WINT-1110 |
| **Workflow Events** | ✅ Source of truth | ❌ Migrate to WINT | Migrate in WINT-1110 |
| **Context Cache** | ✅ WINT-unique | N/A | No migration |
| **Telemetry/ML** | ✅ WINT-unique | N/A | No migration |
| **Graph Relational** | ✅ WINT-unique | N/A | No migration |
| **Elaborations/Proofs** | N/A | ✅ LangGraph-specific | Keep in LangGraph |
| **ADRs/Feedback** | N/A | ✅ Knowledge base | Keep in LangGraph |

### 8.2 Coexistence Timeline

- **Current → WINT-1090**: Dual database coexistence, LangGraph is source of truth for LangGraph stories
- **WINT-1090 → WINT-1110**: Dual write to both databases, WINT is authoritative, LangGraph is fallback
- **After WINT-1110**: WINT is single source of truth, LangGraph story tables deprecated
- **Future (Wave 4+)**: Evaluate database consolidation

### 8.3 Next Steps

1. ✅ Document ownership boundaries (this document)
2. ⏭️ AC-004: Create unified schema specification with ownership-driven design
3. ⏭️ AC-005: Generate migration script for schema alignment
4. ⏭️ AC-006: Validate backward compatibility with LangGraph queries
5. ⏭️ WINT-1090: Implement dual write and query fallback patterns
6. ⏭️ WINT-1110: Execute data migration, deprecate LangGraph story tables

---

**Document Status**: ✅ Complete  
**Next Steps**: Proceed to AC-004 (Unified Schema Specification)
