# Enum Reconciliation: Unified `story_state` Enum Design

**Story**: WINT-1080  
**Created**: 2026-02-14  
**Purpose**: Define unified enum design for `story_state`, reconcile differences between WINT and LangGraph, document naming convention rationale and migration strategy.

---

## Executive Summary

The WINT and LangGraph schemas use incompatible `story_state` enums:

- **WINT**: Underscored naming (`ready_to_work`, `in_progress`, `in_qa`)
- **LangGraph**: Hyphenated naming (`ready-to-work`, `in-progress`, `uat`)

This document proposes a **unified enum with underscored naming** and documents the rationale, migration mapping, and query update requirements.

**Unified Enum**:
```typescript
story_state: ['draft', 'backlog', 'ready_to_work', 'in_progress', 'ready_for_qa', 'in_qa', 'blocked', 'done', 'cancelled']
```

**Migration Impact**:
- **5 enum values** require normalization (hyphen → underscore)
- **1 enum value** requires semantic mapping (`uat` → `in_qa`)
- **3 new enum values** added (`draft`, `blocked`, `cancelled`)
- **Estimated query updates**: ~25 SQL functions, views, and application queries

---

## 1. Current State Analysis

### 1.1 WINT `story_state` Enum

**Definition** (Drizzle ORM):
```typescript
export const storyStateEnum = pgEnum('story_state', [
  'backlog',
  'ready_to_work',
  'in_progress',
  'ready_for_qa',
  'in_qa',
  'blocked',
  'done',
  'cancelled',
])
```

**Location**: `packages/backend/database-schema/src/schema/wint.ts`  
**Naming Convention**: Underscored (snake_case)  
**States**: 8 values  
**Usage**: WINT platform stories, agent workflow tracking

---

### 1.2 LangGraph `story_state` Enum

**Definition** (Raw SQL):
```sql
CREATE TYPE story_state AS ENUM (
  'draft',
  'backlog',
  'ready-to-work',
  'in-progress',
  'ready-for-qa',
  'uat',
  'done'
);
```

**Location**: `apps/api/knowledge-base/src/db/migrations/002_workflow_tables.sql`  
**Naming Convention**: Hyphenated (kebab-case)  
**States**: 7 values  
**Usage**: LangGraph workflow tracking, story lifecycle

---

## 2. Enum Comparison Matrix

| State | WINT | LangGraph | Semantic Match | Migration Path |
|-------|------|-----------|----------------|----------------|
| **Draft** | ❌ Missing | ✅ `draft` | - | Add to WINT |
| **Backlog** | ✅ `backlog` | ✅ `backlog` | ✅ Exact | Direct map |
| **Ready to Work** | ✅ `ready_to_work` | ✅ `ready-to-work` | ✅ Exact (different naming) | Normalize: `ready-to-work` → `ready_to_work` |
| **In Progress** | ✅ `in_progress` | ✅ `in-progress` | ✅ Exact (different naming) | Normalize: `in-progress` → `in_progress` |
| **Ready for QA** | ✅ `ready_for_qa` | ✅ `ready-for-qa` | ✅ Exact (different naming) | Normalize: `ready-for-qa` → `ready_for_qa` |
| **In QA / UAT** | ✅ `in_qa` | ✅ `uat` | ✅ Semantic equivalent | Map: `uat` → `in_qa` |
| **Blocked** | ✅ `blocked` | ❌ Missing | - | Add to LangGraph |
| **Done** | ✅ `done` | ✅ `done` | ✅ Exact | Direct map |
| **Cancelled** | ✅ `cancelled` | ❌ Missing | - | Add to LangGraph |

---

## 3. Unified Enum Proposal

### 3.1 Unified Enum Definition

**PostgreSQL Enum** (for LangGraph migration):
```sql
CREATE TYPE story_state_unified AS ENUM (
  'draft',
  'backlog',
  'ready_to_work',
  'in_progress',
  'ready_for_qa',
  'in_qa',
  'blocked',
  'done',
  'cancelled'
);
```

**Drizzle ORM Definition** (for WINT integration):
```typescript
export const storyStateEnum = pgEnum('story_state', [
  'draft',
  'backlog',
  'ready_to_work',
  'in_progress',
  'ready_for_qa',
  'in_qa',
  'blocked',
  'done',
  'cancelled',
])
```

### 3.2 Enum Value Order Rationale

The enum values are ordered by typical story lifecycle progression:

1. `draft` - Story seed created, not yet elaborated
2. `backlog` - Story elaborated, waiting to be scheduled
3. `ready_to_work` - Story ready for implementation
4. `in_progress` - Story actively being developed
5. `ready_for_qa` - Implementation complete, waiting for QA
6. `in_qa` - Story in QA/UAT testing
7. `blocked` - Story blocked by dependency or issue
8. `done` - Story completed and verified
9. `cancelled` - Story cancelled (out of scope, duplicate, etc.)

**Note**: `blocked` can occur at any stage, but is ordered here for logical grouping with terminal states.

---

## 4. Naming Convention Rationale (AC-010)

### 4.1 Why Underscores (`ready_to_work`) Over Hyphens (`ready-to-work`)?

| Criterion | Underscores (`ready_to_work`) | Hyphens (`ready-to-work`) | Winner |
|-----------|-------------------------------|---------------------------|--------|
| **TypeScript Enum Compatibility** | ✅ Valid enum member name | ❌ Requires quoting: `"ready-to-work"` | Underscores |
| **JavaScript Object Key Compatibility** | ✅ No quotes required: `{ ready_to_work: true }` | ❌ Requires quotes: `{ "ready-to-work": true }` | Underscores |
| **Consistency with WINT Pattern** | ✅ Matches existing WINT enums | ❌ Conflicts with WINT pattern | Underscores |
| **SQL Compatibility** | ✅ Both work in SQL | ✅ Both work in SQL | Tie |
| **PostgreSQL Convention** | ✅ Common in PostgreSQL schemas | ❌ Less common | Underscores |
| **Code Readability** | ✅ Familiar to TypeScript/JavaScript developers | ❌ More common in CSS/HTML | Underscores |

**Decision**: **Use underscores (`ready_to_work`)** for TypeScript/PostgreSQL compatibility and consistency with existing WINT patterns.

### 4.2 Impact on TypeScript Enums

**With Underscores** (valid TypeScript):
```typescript
enum StoryState {
  draft = 'draft',
  backlog = 'backlog',
  ready_to_work = 'ready_to_work',
  in_progress = 'in_progress',
  // ...
}
```

**With Hyphens** (requires quoting):
```typescript
enum StoryState {
  draft = 'draft',
  backlog = 'backlog',
  "ready-to-work" = 'ready-to-work',  // ❌ Awkward, requires quoting
  "in-progress" = 'in-progress',
  // ...
}
```

**Conclusion**: Hyphens create friction in TypeScript, underscores are more ergonomic.

### 4.3 Impact on SQL Functions

Both naming conventions work in SQL. Example:

**With Underscores**:
```sql
SELECT * FROM stories WHERE state = 'ready_to_work';
```

**With Hyphens**:
```sql
SELECT * FROM stories WHERE state = 'ready-to-work';
```

**Conclusion**: No difference in SQL. Naming convention choice is driven by application layer (TypeScript).

---

## 5. Migration Mapping Strategy

### 5.1 Data Transformation Rules

| LangGraph Value | Transformation | Unified Value | Notes |
|-----------------|----------------|---------------|-------|
| `draft` | Direct map | `draft` | No transformation |
| `backlog` | Direct map | `backlog` | No transformation |
| `ready-to-work` | Replace hyphens with underscores | `ready_to_work` | Regex: `s/-/_/g` |
| `in-progress` | Replace hyphens with underscores | `in_progress` | Regex: `s/-/_/g` |
| `ready-for-qa` | Replace hyphens with underscores | `ready_for_qa` | Regex: `s/-/_/g` |
| `uat` | Semantic mapping | `in_qa` | **Manual mapping** |
| `done` | Direct map | `done` | No transformation |

### 5.2 Migration SQL (Conceptual)

```sql
-- Step 1: Create new enum type
CREATE TYPE story_state_unified AS ENUM (
  'draft', 'backlog', 'ready_to_work', 'in_progress',
  'ready_for_qa', 'in_qa', 'blocked', 'done', 'cancelled'
);

-- Step 2: Add temporary column with new type
ALTER TABLE stories ADD COLUMN state_new story_state_unified;

-- Step 3: Migrate data with transformations
UPDATE stories SET state_new = CASE
  WHEN state = 'draft' THEN 'draft'::story_state_unified
  WHEN state = 'backlog' THEN 'backlog'::story_state_unified
  WHEN state = 'ready-to-work' THEN 'ready_to_work'::story_state_unified
  WHEN state = 'in-progress' THEN 'in_progress'::story_state_unified
  WHEN state = 'ready-for-qa' THEN 'ready_for_qa'::story_state_unified
  WHEN state = 'uat' THEN 'in_qa'::story_state_unified
  WHEN state = 'done' THEN 'done'::story_state_unified
  ELSE NULL
END;

-- Step 4: Drop old column, rename new column
ALTER TABLE stories DROP COLUMN state;
ALTER TABLE stories RENAME COLUMN state_new TO state;

-- Step 5: Drop old enum type
DROP TYPE story_state;

-- Step 6: Rename new enum type to original name
ALTER TYPE story_state_unified RENAME TO story_state;
```

**Note**: Actual migration script will be generated by Drizzle Kit (AC-005).

---

## 6. Query Update Requirements (AC-010)

### 6.1 Estimated Impact

| Category | Affected Queries | Update Required |
|----------|------------------|-----------------|
| **SQL Views** | 2 views (`workable_stories`, `feature_progress`) | Update WHERE clauses with new enum values |
| **SQL Functions** | 2 functions (`get_story_next_action`, `transition_story_state`) | Update CASE statements with new enum values |
| **Application Queries** | ~15 queries in `packages/backend/orchestrator/src/db/story-repository.ts` | Update WHERE clauses, enum literals |
| **Tests** | ~8 test files with enum assertions | Update test fixtures with new enum values |

**Total Estimated Updates**: ~25 files

### 6.2 SQL View Updates

**View**: `workable_stories`  
**Current**:
```sql
CREATE VIEW workable_stories AS
SELECT s.story_id, s.title, s.points, s.priority, f.name as feature
FROM stories s
LEFT JOIN features f ON s.feature_id = f.id
WHERE s.state = 'ready-to-work'  -- ❌ Old enum value
  AND s.blocked_by IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM stories dep
    WHERE dep.story_id = ANY(s.depends_on)
      AND dep.state != 'done'
  )
ORDER BY s.priority NULLS LAST, s.created_at;
```

**Updated**:
```sql
CREATE VIEW workable_stories AS
SELECT s.story_id, s.title, s.points, s.priority, f.name as feature
FROM stories s
LEFT JOIN features f ON s.feature_id = f.id
WHERE s.state = 'ready_to_work'  -- ✅ New enum value
  AND s.blocked_by IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM stories dep
    WHERE dep.story_id = ANY(s.depends_on)
      AND dep.state != 'done'
  )
ORDER BY s.priority NULLS LAST, s.created_at;
```

**Changes**: 1 enum value (`ready-to-work` → `ready_to_work`)

---

**View**: `feature_progress`  
**Current**:
```sql
CREATE VIEW feature_progress AS
SELECT
  f.name as feature,
  COUNT(*) FILTER (WHERE s.state = 'draft') as draft,
  COUNT(*) FILTER (WHERE s.state = 'backlog') as backlog,
  COUNT(*) FILTER (WHERE s.state = 'ready-to-work') as ready,  -- ❌ Old enum
  COUNT(*) FILTER (WHERE s.state = 'in-progress') as in_progress,  -- ❌ Old enum
  COUNT(*) FILTER (WHERE s.state = 'ready-for-qa') as ready_for_qa,  -- ❌ Old enum
  COUNT(*) FILTER (WHERE s.state = 'uat') as uat,  -- ❌ Old enum
  COUNT(*) FILTER (WHERE s.state = 'done') as done,
  COUNT(*) as total
FROM features f
LEFT JOIN stories s ON s.feature_id = f.id
GROUP BY f.name;
```

**Updated**:
```sql
CREATE VIEW feature_progress AS
SELECT
  f.name as feature,
  COUNT(*) FILTER (WHERE s.state = 'draft') as draft,
  COUNT(*) FILTER (WHERE s.state = 'backlog') as backlog,
  COUNT(*) FILTER (WHERE s.state = 'ready_to_work') as ready,  -- ✅ Updated
  COUNT(*) FILTER (WHERE s.state = 'in_progress') as in_progress,  -- ✅ Updated
  COUNT(*) FILTER (WHERE s.state = 'ready_for_qa') as ready_for_qa,  -- ✅ Updated
  COUNT(*) FILTER (WHERE s.state = 'in_qa') as in_qa,  -- ✅ Updated (uat → in_qa)
  COUNT(*) FILTER (WHERE s.state = 'blocked') as blocked,  -- ✅ New state
  COUNT(*) FILTER (WHERE s.state = 'done') as done,
  COUNT(*) FILTER (WHERE s.state = 'cancelled') as cancelled,  -- ✅ New state
  COUNT(*) as total
FROM features f
LEFT JOIN stories s ON s.feature_id = f.id
GROUP BY f.name;
```

**Changes**: 4 enum values updated, 2 new columns added

---

### 6.3 SQL Function Updates

**Function**: `get_story_next_action`  
**Current**:
```sql
CREATE OR REPLACE FUNCTION get_story_next_action(p_story_id VARCHAR(30))
RETURNS TEXT AS $$
DECLARE
  v_state story_state;
  v_blocked_by VARCHAR(30);
BEGIN
  SELECT state, blocked_by INTO v_state, v_blocked_by
  FROM stories WHERE story_id = p_story_id;

  IF v_blocked_by IS NOT NULL THEN
    RETURN 'Blocked by: ' || v_blocked_by;
  END IF;

  CASE v_state
    WHEN 'draft' THEN RETURN 'Run /pm-story generate';
    WHEN 'backlog' THEN RETURN 'Run /elab-story';
    WHEN 'ready-to-work' THEN RETURN 'Run /dev-implement-story';  -- ❌ Old enum
    WHEN 'in-progress' THEN RETURN 'Complete implementation';  -- ❌ Old enum
    WHEN 'ready-for-qa' THEN RETURN 'Run /qa-verify-story';  -- ❌ Old enum
    WHEN 'uat' THEN RETURN 'Run UAT tests';  -- ❌ Old enum
    WHEN 'done' THEN RETURN 'No action needed';
    ELSE RETURN 'Unknown state';
  END CASE;
END;
$$ LANGUAGE plpgsql;
```

**Updated**:
```sql
CREATE OR REPLACE FUNCTION get_story_next_action(p_story_id VARCHAR(30))
RETURNS TEXT AS $$
DECLARE
  v_state story_state;
  v_blocked_by VARCHAR(30);
BEGIN
  SELECT state, blocked_by INTO v_state, v_blocked_by
  FROM stories WHERE story_id = p_story_id;

  IF v_blocked_by IS NOT NULL THEN
    RETURN 'Blocked by: ' || v_blocked_by;
  END IF;

  CASE v_state
    WHEN 'draft' THEN RETURN 'Run /pm-story generate';
    WHEN 'backlog' THEN RETURN 'Run /elab-story';
    WHEN 'ready_to_work' THEN RETURN 'Run /dev-implement-story';  -- ✅ Updated
    WHEN 'in_progress' THEN RETURN 'Complete implementation';  -- ✅ Updated
    WHEN 'ready_for_qa' THEN RETURN 'Run /qa-verify-story';  -- ✅ Updated
    WHEN 'in_qa' THEN RETURN 'Run UAT tests';  -- ✅ Updated (uat → in_qa)
    WHEN 'blocked' THEN RETURN 'Resolve blocking issue';  -- ✅ New state
    WHEN 'done' THEN RETURN 'No action needed';
    WHEN 'cancelled' THEN RETURN 'No action needed';  -- ✅ New state
    ELSE RETURN 'Unknown state';
  END CASE;
END;
$$ LANGUAGE plpgsql;
```

**Changes**: 4 enum values updated, 2 new states added

---

**Function**: `transition_story_state`  
**Current**:
```sql
CREATE OR REPLACE FUNCTION transition_story_state(
  p_story_id VARCHAR(30),
  p_new_state story_state,
  p_actor VARCHAR(100)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_state story_state;
  v_story_uuid UUID;
BEGIN
  -- Function body (no enum literals, only enum variables)
  -- No changes required
END;
$$ LANGUAGE plpgsql;
```

**Updated**: No changes required (function uses enum variables, not literals)

---

### 6.4 Application Query Updates

**Location**: `packages/backend/orchestrator/src/db/story-repository.ts`

**Example Current Query**:
```typescript
export async function getWorkableStories() {
  return db.query.stories.findMany({
    where: eq(stories.state, 'ready-to-work'),  // ❌ Old enum
  })
}
```

**Updated Query**:
```typescript
export async function getWorkableStories() {
  return db.query.stories.findMany({
    where: eq(stories.state, 'ready_to_work'),  // ✅ Updated enum
  })
}
```

**Estimated Updates**:
- ~15 query functions in `story-repository.ts`
- ~5 queries in LangGraph agent code (WINT-1090)
- ~8 test files with enum assertions

**Migration Strategy** (WINT-1090):
1. Find all enum value usages: `rg "ready-to-work|in-progress|ready-for-qa|uat" --type ts --type sql`
2. Replace with underscored equivalents: `ready-to-work` → `ready_to_work`, etc.
3. Map `uat` → `in_qa`
4. Run tests to validate

---

## 7. Semantic Mapping: `uat` → `in_qa`

### 7.1 Rationale

**LangGraph `uat`**:
- User Acceptance Testing phase
- Story is deployed to UAT environment for validation
- QA team or stakeholders are actively testing

**WINT `in_qa`**:
- Story is in QA/UAT testing phase
- QA team is actively verifying acceptance criteria
- Semantically equivalent to LangGraph's `uat`

**Decision**: Map `uat` → `in_qa` to unify terminology. WINT's `in_qa` encompasses both QA and UAT testing.

### 7.2 Alternative Considered

**Alternative**: Add separate `uat` state to WINT schema

**Rejected because**:
- Creates unnecessary distinction between QA and UAT phases
- WINT workflow does not separate QA from UAT (both are verification)
- Would require adding new state to WINT (breaking change)
- `in_qa` already captures the semantic intent of `uat`

---

## 8. New States Added to Unified Enum

### 8.1 `draft` (from LangGraph)

**Purpose**: Story seed created, not yet elaborated  
**Source**: LangGraph schema  
**Usage**: Stories created by PM agent before elaboration  
**Add to WINT**: ✅ Yes

**Rationale**: WINT workflows may have stories in "draft" state before elaboration. Currently, WINT defaults to `backlog`, but `draft` provides clearer intent.

---

### 8.2 `blocked` (from WINT)

**Purpose**: Story blocked by dependency or issue  
**Source**: WINT schema  
**Usage**: Stories with unresolved dependencies, technical blockers, or external dependencies  
**Add to LangGraph**: ✅ Yes

**Rationale**: LangGraph currently uses `blocked_by` text field, but explicit `blocked` state is more expressive. Allows queries like "all blocked stories" without parsing text field.

---

### 8.3 `cancelled` (from WINT)

**Purpose**: Story cancelled (out of scope, duplicate, etc.)  
**Source**: WINT schema  
**Usage**: Stories that are no longer valid, duplicate of other stories, or out of scope  
**Add to LangGraph**: ✅ Yes

**Rationale**: LangGraph currently marks cancelled stories as `done` or deletes them. Explicit `cancelled` state preserves history and allows analysis of why stories were cancelled.

---

## 9. Migration Timeline

| Phase | Activity | Story | Timeline |
|-------|----------|-------|----------|
| **1. Schema Definition** | Define unified enum, document mapping strategy | WINT-1080 (this story) | Current |
| **2. Migration Script Generation** | Generate SQL migration script with enum transformation | WINT-1080 (AC-005) | Current |
| **3. LangGraph Code Updates** | Update LangGraph repository queries, functions, views | WINT-1090 | After WINT-1080 |
| **4. Schema Deployment** | Deploy migration to knowledge-base database | WINT-1090 | After code updates |
| **5. Data Migration** | Migrate LangGraph story data to WINT database | WINT-1110 | After schema deployment |
| **6. Validation** | Verify all queries work with new enum values | WINT-1090, WINT-1110 | After deployment |

---

## 10. Rollback Strategy

### 10.1 Rollback Migration SQL (Conceptual)

```sql
-- Step 1: Create old enum type
CREATE TYPE story_state_old AS ENUM (
  'draft', 'backlog', 'ready-to-work', 'in-progress',
  'ready-for-qa', 'uat', 'done'
);

-- Step 2: Add temporary column with old type
ALTER TABLE stories ADD COLUMN state_old story_state_old;

-- Step 3: Reverse data transformation
UPDATE stories SET state_old = CASE
  WHEN state = 'draft' THEN 'draft'::story_state_old
  WHEN state = 'backlog' THEN 'backlog'::story_state_old
  WHEN state = 'ready_to_work' THEN 'ready-to-work'::story_state_old
  WHEN state = 'in_progress' THEN 'in-progress'::story_state_old
  WHEN state = 'ready_for_qa' THEN 'ready-for-qa'::story_state_old
  WHEN state = 'in_qa' THEN 'uat'::story_state_old
  WHEN state = 'blocked' THEN NULL  -- ❌ No equivalent in old schema
  WHEN state = 'done' THEN 'done'::story_state_old
  WHEN state = 'cancelled' THEN NULL  -- ❌ No equivalent in old schema
  ELSE NULL
END;

-- Step 4: Drop new column, rename old column
ALTER TABLE stories DROP COLUMN state;
ALTER TABLE stories RENAME COLUMN state_old TO state;

-- Step 5: Drop new enum type
DROP TYPE story_state;

-- Step 6: Rename old enum type to original name
ALTER TYPE story_state_old RENAME TO story_state;
```

**Data Loss Warning**: Stories in `blocked` or `cancelled` state will have `NULL` state after rollback. These states do not exist in LangGraph's original enum.

**Mitigation**: Before deploying migration, document all stories in `blocked` or `cancelled` state (if any). After rollback, manually restore these stories' states.

---

## 11. Testing Strategy

### 11.1 Pre-Migration Testing

| Test | Description | Pass Criteria |
|------|-------------|---------------|
| **Enum Validation** | Verify new enum type can be created | Enum created successfully |
| **Data Transformation** | Test CASE statement on sample data | All values map correctly |
| **Query Compatibility** | Run existing queries against migrated schema | No errors, results match |
| **Function Compatibility** | Test SQL functions with new enum values | Functions return correct results |
| **View Compatibility** | Test SQL views with new enum values | Views return correct results |

### 11.2 Post-Migration Testing

| Test | Description | Pass Criteria |
|------|-------------|---------------|
| **Data Integrity** | Verify no data loss during migration | All stories have valid state |
| **Query Performance** | Compare query performance before/after | No significant regression |
| **Application Integration** | Test LangGraph application against migrated schema | All workflows pass |
| **Rollback Testing** | Test rollback script on cloned database | Rollback successful, data preserved |

---

## 12. Stakeholder Alignment Checklist

**Recommendation**: Schedule alignment meeting before AC-004 implementation to confirm:

- [ ] Underscored naming convention approved
- [ ] `uat` → `in_qa` semantic mapping approved
- [ ] New states (`draft`, `blocked`, `cancelled`) approved for LangGraph
- [ ] Migration timeline approved
- [ ] Rollback strategy approved
- [ ] Query update effort estimated and resourced

**Participants**:
- Platform Engineering Lead
- LangGraph Repository Maintainer
- QA Lead (for UAT → in_qa mapping validation)
- Product Manager (for new states approval)

---

## 13. Summary

### 13.1 Key Decisions

| Decision | Rationale |
|----------|-----------|
| **Use underscores** (`ready_to_work`) | TypeScript compatibility, consistency with WINT patterns |
| **Map `uat` → `in_qa`** | Semantically equivalent, unifies terminology |
| **Add `draft`, `blocked`, `cancelled`** | Improve story lifecycle expressiveness |

### 13.2 Migration Impact

| Metric | Value |
|--------|-------|
| **Enum values to normalize** | 5 (hyphen → underscore) |
| **Enum values to map** | 1 (`uat` → `in_qa`) |
| **New enum values** | 3 (`draft`, `blocked`, `cancelled`) |
| **SQL queries to update** | ~25 (views, functions, application code) |
| **Estimated effort** | 4-6 hours (WINT-1090) |

### 13.3 Next Steps

1. ✅ Document unified enum design (this document)
2. ⏭️ AC-003: Define schema ownership model
3. ⏭️ AC-004: Create unified schema specification with new enum
4. ⏭️ AC-005: Generate migration script with enum transformation
5. ⏭️ AC-006: Validate backward compatibility and document query updates
6. ⏭️ WINT-1090: Update LangGraph repository code with new enum values

---

**Document Status**: ✅ Complete  
**Next Steps**: Schedule stakeholder alignment meeting, proceed to AC-003 (Schema Ownership Model)
