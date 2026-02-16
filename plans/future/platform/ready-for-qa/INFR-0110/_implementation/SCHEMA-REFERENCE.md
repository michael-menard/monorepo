# Core Artifact Schemas - Schema Reference

Story: INFR-0110
Generated: 2026-02-15

## Overview

This document describes the database schema design for the 4 core workflow artifact types (story, checkpoint, scope, plan) in the `artifacts` PostgreSQL schema namespace.

## Schema Namespace

**Schema**: `artifacts`

**Isolation Rationale**:
- `kbar` schema: File sync state (artifacts table tracks file metadata like checksum, lastSyncedAt)
- `wint` schema: Workflow runtime state (stories, transitions, assignments)
- `artifacts` schema: Artifact relational data (denormalized content for querying)
- `telemetry` schema: Event tracking (INFR-0040)

This separation ensures clear domain boundaries:
- KBAR manages file sync coordination
- WINT manages workflow execution state
- Artifacts stores queryable content
- Telemetry captures events

## Enum Definitions

### artifact_type_enum

**Location**: `public` schema (NOT `artifacts` schema)

**Rationale** (ADR-INFR-110-002):
1. **Cross-namespace reusability**: KBAR sync tools need to reference artifact types from both `artifacts` and `kbar` schemas
2. **Forward compatibility**: All 7 types defined in INFR-0110 (using 4) to avoid ALTER TYPE in INFR-0120
3. **Precedent**: WINT and KBAR schemas follow this pattern for cross-namespace enums

**Values**:
- `'story'` - Story artifact (INFR-0110)
- `'checkpoint'` - Checkpoint artifact (INFR-0110)
- `'scope'` - Scope artifact (INFR-0110)
- `'plan'` - Plan artifact (INFR-0110)
- `'evidence'` - Evidence artifact (INFR-0120)
- `'review'` - Review artifact (INFR-0120)
- `'qa-verify'` - QA verification artifact (INFR-0120)

## Table Schemas

### 1. story_artifacts

**Purpose**: Stores denormalized story.yaml fields for queryable access.

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Artifact record ID |
| `story_id` | UUID | NOT NULL, FK → wint.stories.id ON DELETE CASCADE | Story reference |
| `title` | TEXT | NOT NULL | Story title |
| `story_type` | TEXT | NOT NULL | Type: 'feature', 'bug', 'infrastructure', etc. |
| `state` | TEXT | NOT NULL | Current story state |
| `scope_summary` | TEXT | NULL | Brief summary of changes |
| `acceptance_criteria` | JSONB | NULL | Array of AcceptanceCriterion objects |
| `risks` | JSONB | NULL | Array of Risk objects |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now() | Created timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now() | Updated timestamp |

**Indexes**:
- `idx_story_artifacts_story_id` (story_id) - For story-specific queries
- `idx_story_artifacts_created_at` (created_at) - For time-range queries

**Foreign Keys**:
- `story_id` → `wint.stories.id` ON DELETE CASCADE

**JSONB Structures**:

```typescript
// acceptance_criteria: AcceptanceCriterion[]
{
  id: string;           // 'AC-001', 'AC-002', etc.
  description: string;
  testable: boolean;
  automated: boolean;
}

// risks: Risk[]
{
  id: string;           // 'RISK-001', etc.
  description: string;
  severity: 'high' | 'medium' | 'low';
  mitigation: string | null;
}
```

### 2. checkpoint_artifacts

**Purpose**: Stores checkpoint.yaml fields for phase tracking and resume.

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Artifact record ID |
| `story_id` | UUID | NOT NULL, FK → wint.stories.id ON DELETE CASCADE | Story reference |
| `phase` | TEXT | NOT NULL | Current phase: 'setup', 'plan', 'execute', etc. |
| `substep` | TEXT | NULL | Optional substep within phase |
| `completed_steps` | JSONB | NULL | Array of completed step IDs |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now() | Created timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now() | Updated timestamp |

**Indexes**:
- `idx_checkpoint_artifacts_story_phase` (story_id, phase) - For checkpoint queries
- `idx_checkpoint_artifacts_created_at` (created_at) - For time-range queries

**Foreign Keys**:
- `story_id` → `wint.stories.id` ON DELETE CASCADE

**JSONB Structures**:

```typescript
// completed_steps: string[]
['step-1', 'step-2', 'step-3']
```

### 3. scope_artifacts

**Purpose**: Stores scope.yaml fields for surface tracking and risk flags.

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Artifact record ID |
| `story_id` | UUID | NOT NULL, FK → wint.stories.id ON DELETE CASCADE | Story reference |
| `packages_touched` | JSONB | NULL | Array of package names |
| `surfaces` | JSONB | NULL | ScopeTouches object |
| `risk_flags` | JSONB | NULL | RiskFlags object |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now() | Created timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now() | Updated timestamp |

**Indexes**:
- `idx_scope_artifacts_story_id` (story_id) - For story-specific queries
- `idx_scope_artifacts_created_at` (created_at) - For time-range queries

**Foreign Keys**:
- `story_id` → `wint.stories.id` ON DELETE CASCADE

**JSONB Structures**:

```typescript
// packages_touched: string[]
['@repo/ui', '@repo/api-client', '@repo/database-schema']

// surfaces: ScopeTouches
{
  backend: boolean;
  frontend: boolean;
  packages: boolean;
  db: boolean;
  contracts: boolean;
  ui: boolean;
  infra: boolean;
}

// risk_flags: RiskFlags
{
  auth: boolean;
  payments: boolean;
  migrations: boolean;
  external_apis: boolean;
  security: boolean;
  performance: boolean;
}
```

### 4. plan_artifacts

**Purpose**: Stores plan.yaml fields for implementation planning.

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Artifact record ID |
| `story_id` | UUID | NOT NULL, FK → wint.stories.id ON DELETE CASCADE | Story reference |
| `steps` | JSONB | NULL | Array of PlanStep objects |
| `file_changes` | JSONB | NULL | Array of FileChange objects |
| `commands` | JSONB | NULL | Array of Command objects |
| `ac_mapping` | JSONB | NULL | Array of AcceptanceCriteriaMap objects |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now() | Created timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now() | Updated timestamp |

**Indexes**:
- `idx_plan_artifacts_story_id` (story_id) - For story-specific queries
- `idx_plan_artifacts_created_at` (created_at) - For time-range queries

**Foreign Keys**:
- `story_id` → `wint.stories.id` ON DELETE CASCADE

**JSONB Structures**:

```typescript
// steps: PlanStep[]
{
  id: number;
  description: string;
  files: string[];
  dependencies: number[];
  slice?: 'backend' | 'frontend' | 'packages' | 'infra' | 'shared';
}

// file_changes: FileChange[]
{
  path: string;
  action: 'create' | 'modify' | 'delete';
  reason?: string;
}

// commands: Command[]
{
  command: string;
  when: string;
  required: boolean;
}

// ac_mapping: AcceptanceCriteriaMap[]
{
  ac_id: string;
  planned_evidence: string;
  evidence_type: 'test' | 'http' | 'manual' | 'command' | 'file';
}
```

## Design Decisions

### 1. JSONB Denormalization (ADR-INFR-110-001)

**Decision**: Use JSONB arrays for `acceptance_criteria`, `risks`, `file_changes`, `steps`, etc. instead of normalized tables.

**Rationale**:
- **Co-location**: Acceptance criteria, risks, file changes always loaded together with parent artifact
- **Size**: Max ~20 ACs per story, ~50 file changes per plan → fits JSONB performance profile (<100KB)
- **Query patterns**: Most queries filter by story_id, not individual AC fields
- **Schema evolution**: Zod schemas can evolve without migration for new JSONB fields

**When to normalize instead?**
- Individual items queried frequently (e.g., "show all AC-3 across all stories")
- Items have many-to-many relationships
- Items need separate lifecycle/permissions
- Size exceeds 1MB per JSONB field

**Future opportunity**: If queries like "find all stories with failing AC-3" become common, normalize to separate tables (tracked in FUTURE-OPPORTUNITIES.md for INFR-0020+).

### 2. ON DELETE CASCADE (ADR-INFR-110-003)

**Decision**: Add `ON DELETE CASCADE` to all `story_id` foreign keys.

**Rationale**:
- When a story is deleted from `wint.stories`, all related artifacts should be automatically deleted
- Prevents orphaned artifact records
- Story deletion is a rare, intentional operation (not accidental)
- Simplifies cleanup logic in INFR-0020

**Risk**: Story deletion is destructive and irreversible.

**Mitigation**: Document in this file (SCHEMA-REFERENCE.md), add confirmation prompts in future story deletion tools.

**WARNING**: Deleting a story from `wint.stories` will cascade delete all related artifacts in `artifacts.story_artifacts`, `artifacts.checkpoint_artifacts`, `artifacts.scope_artifacts`, and `artifacts.plan_artifacts`.

### 3. Index Strategy (ADR-INFR-110-004)

**Decision**: Add composite indexes on `(story_id, artifact_type)`, `(created_at DESC)`, `(story_id, phase)`.

**Rationale**:
- Supports common query patterns: filter by story + type, time-range queries, checkpoint phase queries
- Avoid GIN indexes on JSONB fields until performance optimization needed

**Deferred**:
- GIN indexes on JSONB fields (e.g., `acceptance_criteria`, `risks`)
- Partitioning by `created_at`
- Materialized views for common aggregates

**Future opportunity**: Add GIN indexes if queries on JSONB content become frequent (tracked in FUTURE-OPPORTUNITIES.md).

### 4. Field Naming Convention

**Challenge**: Postgres uses snake_case, TypeScript uses camelCase.

**Solution**:
- Database columns: `snake_case` (PostgreSQL convention)
- TypeScript types: `camelCase` (JavaScript convention)
- Drizzle ORM handles transformation automatically via column aliases

**Example**:

```typescript
// Drizzle schema definition
export const storyArtifacts = artifactsSchema.table('story_artifacts', {
  storyId: uuid('story_id').notNull(),  // DB: story_id, TS: storyId
  acceptanceCriteria: jsonb('acceptance_criteria').$type<AC[]>(),
})

// Auto-generated Zod schema
const StoryArtifactInsertSchema = createInsertSchema(storyArtifacts)
// Type: { storyId: string, acceptanceCriteria: AC[], ... }
```

## Schema Alignment with Orchestrator

All database schemas align with existing Zod artifact schemas in `packages/backend/orchestrator/src/artifacts/`:

| Artifact Type | Zod Schema | DB Table | Alignment |
|---------------|------------|----------|-----------|
| Story | `StoryArtifactSchema` | `story_artifacts` | Field names match |
| Checkpoint | `CheckpointSchema` | `checkpoint_artifacts` | Field names match |
| Scope | `ScopeSchema` | `scope_artifacts` | Field names match |
| Plan | `PlanSchema` | `plan_artifacts` | Field names match |

**Field Mapping** (snake_case DB ↔ camelCase TS):

| DB Column | TS Property | Type |
|-----------|-------------|------|
| `story_id` | `storyId` | UUID |
| `story_type` | `storyType` | TEXT |
| `scope_summary` | `scopeSummary` | TEXT |
| `acceptance_criteria` | `acceptanceCriteria` | JSONB |
| `completed_steps` | `completedSteps` | JSONB |
| `packages_touched` | `packagesTouched` | JSONB |
| `risk_flags` | `riskFlags` | JSONB |
| `file_changes` | `fileChanges` | JSONB |
| `ac_mapping` | `acMapping` | JSONB |

## Migration File

**Generated File**: `src/migrations/app/0021_wealthy_sunfire.sql`

**Size**: ~59 lines (artifacts schema + 4 tables + enum + indexes)

**Dependencies**:
- Requires `wint.stories` table to exist (WINT-0010 must be complete)
- Uses `wint.stories.id` as FK target (UUID, not `story_id` text field)

**Key Operations**:
1. Create `artifacts` schema namespace
2. Create `artifact_type_enum` in `public` schema (all 7 types)
3. Create 4 artifact tables with JSONB columns
4. Add foreign key constraints with ON DELETE CASCADE
5. Create composite indexes for query optimization

## Drizzle Relations

**Story → Artifacts** (one-to-many, lazy loading):

```typescript
// Enables lazy loading artifacts from story records
export const storiesRelations = relations(stories, ({ many }) => ({
  storyArtifacts: many(storyArtifacts),
  checkpointArtifacts: many(checkpointArtifacts),
  scopeArtifacts: many(scopeArtifacts),
  planArtifacts: many(planArtifacts),
}))
```

**Artifact → Story** (many-to-one, eager loading):

```typescript
export const storyArtifactsRelations = relations(storyArtifacts, ({ one }) => ({
  story: one(stories, {
    fields: [storyArtifacts.storyId],
    references: [stories.id],
  }),
}))
```

## Auto-Generated Zod Schemas

**Pattern**: Use `drizzle-zod` to auto-generate insert/select schemas for runtime validation.

**Example**:

```typescript
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

export const insertStoryArtifactSchema = createInsertSchema(storyArtifacts)
export const selectStoryArtifactSchema = createSelectSchema(storyArtifacts)

export type InsertStoryArtifact = z.infer<typeof insertStoryArtifactSchema>
export type SelectStoryArtifact = z.infer<typeof selectStoryArtifactSchema>
```

**Benefits**:
- Runtime validation before database insert
- Type safety aligned with database schema
- Automatic updates when schema changes

## Testing Strategy

### Unit Tests

**File**: `packages/backend/database-schema/src/schema/__tests__/core-artifacts-schema.test.ts`

**Coverage**:
- Schema validation (insert valid artifact, reject invalid artifact)
- JSONB field structure matches Zod schemas
- Required field validation
- Type coercion and defaults

### Integration Tests

**File**: `packages/backend/db/src/__tests__/core-artifact-schema-integration.test.ts`

**Coverage**:
- Migration apply/rollback
- Foreign key constraints
- Drizzle relations
- Index usage (EXPLAIN ANALYZE)
- ON DELETE CASCADE behavior

**Test Data**: Load actual YAML artifacts from completed stories (INFR-0040, MODL-0010, LNGG-0010).

## Future Opportunities

### Performance Optimization (Deferred)

1. **GIN Indexes on JSONB**: If queries on JSONB content (e.g., "find stories with risk severity = high") become frequent
2. **Partitioning**: Partition by `created_at` if table grows beyond 10M rows
3. **Materialized Views**: For common aggregates (e.g., "count of stories by type")

### Normalization (Deferred)

1. **Acceptance Criteria Table**: If queries like "show all AC-3 across all stories" become common
2. **File Changes Table**: If need to query individual file changes across plans

### Query Enhancements (Deferred to KBAR-0110+)

1. **Full-text search**: Add tsvector columns for title/description search
2. **JSON Path Queries**: Optimize JSONB queries with dedicated indexes

## References

- **Story**: INFR-0110
- **Sibling Story**: INFR-0120 (evidence, review, qa-verify artifact schemas)
- **Follow-up Story**: INFR-0020 (Artifact Writer/Reader Service)
- **Precedents**: WINT-0010 (wint schema), KBAR-0010 (kbar schema), INFR-0040 (telemetry schema)
