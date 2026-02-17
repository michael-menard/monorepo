# Review/QA Artifact Schemas - Schema Reference

Story: INFR-0120
Generated: 2026-02-15

## Overview

This document describes the database schema design for the 3 review/QA artifact types (evidence, review, qa-verify) in the `artifacts` PostgreSQL schema namespace.

**Parent Story**: INFR-0110 created the `artifacts` schema namespace and `artifact_type_enum` with all 7 types (including evidence, review, qa-verify).

**This Story**: INFR-0120 adds 3 tables to the existing `artifacts` schema for evidence, review, and qa-verify artifacts.

## Schema Namespace

**Schema**: `artifacts` (reused from INFR-0110)

**Isolation Rationale**: See INFR-0110 SCHEMA-REFERENCE.md for full details.

## Enum Definitions

### artifact_type_enum

**Location**: `public` schema (NOT `artifacts` schema)

**Defined in**: INFR-0110 migration (all 7 types upfront)

**INFR-0120 Uses**:
- `'evidence'` - Evidence artifact (INFR-0120)
- `'review'` - Review artifact (INFR-0120)
- `'qa-verify'` - QA verification artifact (INFR-0120)

**Note**: No enum modification needed - INFR-0110 defined all types upfront per ADR-INFR-110-002.

## Table Schemas

### 1. evidence_artifacts

**Purpose**: Stores evidence.yaml fields for acceptance criteria validation.

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Artifact record ID |
| `story_id` | UUID | NOT NULL, FK → wint.stories.id ON DELETE CASCADE | Story reference |
| `ac_evidence` | JSONB | NULL | Array of AcEvidence objects |
| `touched_files` | JSONB | NULL | Array of TouchedFile objects |
| `commands_run` | JSONB | NULL | Array of CommandRun objects |
| `e2e_tests` | JSONB | NULL | E2eTest object (single) |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now() | Created timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now() | Updated timestamp |

**Indexes**:
- `idx_evidence_artifacts_story_id` (story_id) - For story-specific queries
- `idx_evidence_artifacts_created_at` (created_at) - For time-range queries

**Foreign Keys**:
- `story_id` → `wint.stories.id` ON DELETE CASCADE

**JSONB Structures**:

```typescript
// ac_evidence: AcEvidence[]
{
  ac_id: string;
  ac_text: string;
  status: 'PASS' | 'MISSING' | 'PARTIAL';
  evidence_items: Array<{
    type: 'test' | 'command' | 'e2e' | 'http' | 'file';
    path?: string;
    command?: string;
    description: string;
    result?: string;
  }>;
}

// touched_files: TouchedFile[]
{
  path: string;
  action: 'created' | 'modified' | 'deleted';
  lines?: number;
  description?: string;
}

// commands_run: CommandRun[]
{
  command: string;
  result: 'SUCCESS' | 'FAILURE';
  output?: string;
  timestamp: string; // ISO timestamp
}

// e2e_tests: E2eTest
{
  status: 'pass' | 'fail' | 'exempt';
  exempt_reason: string | null;
  config: string | null;
  project: string | null;
  mode: string | null;
  tests_written: boolean;
  results: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  failed_tests: Array<{ name: string; error: string }>;
  config_issues: Array<{
    type: string;
    description: string;
    expected?: string;
    actual?: string;
    files?: string[];
    resolution?: string;
  }>;
}
```

### 2. review_artifacts

**Purpose**: Stores review.yaml fields for code review findings.

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Artifact record ID |
| `story_id` | UUID | NOT NULL, FK → wint.stories.id ON DELETE CASCADE | Story reference |
| `findings` | JSONB | NULL | Array of ReviewFinding objects |
| `worker_results` | JSONB | NULL | Array of WorkerResult objects |
| `ranked_patches` | JSONB | NULL | Array of RankedPatch objects |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now() | Created timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now() | Updated timestamp |

**Indexes**:
- `idx_review_artifacts_story_id` (story_id) - For story-specific queries
- `idx_review_artifacts_created_at` (created_at) - For time-range queries

**Foreign Keys**:
- `story_id` → `wint.stories.id` ON DELETE CASCADE

**JSONB Structures**:

```typescript
// findings: ReviewFinding[]
{
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  file?: string;
  line?: number;
  description: string;
  suggestion?: string;
}

// worker_results: WorkerResult[]
{
  worker: string;
  status: 'success' | 'failure' | 'blocked';
  files_changed: string[];
  tests_passed?: boolean;
  notes?: string;
}

// ranked_patches: RankedPatch[]
{
  id: string;
  rank: number;
  file: string;
  description: string;
  diff?: string;
  rationale: string;
}
```

### 3. qa_verify_artifacts

**Purpose**: Stores qa-verify.yaml fields for QA validation results.

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Artifact record ID |
| `story_id` | UUID | NOT NULL, FK → wint.stories.id ON DELETE CASCADE | Story reference |
| `ac_verifications` | JSONB | NULL | Array of AcVerification objects |
| `test_results` | JSONB | NULL | Array of TestResult objects |
| `qa_issues` | JSONB | NULL | Array of QaIssue objects |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now() | Created timestamp |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now() | Updated timestamp |

**Indexes**:
- `idx_qa_verify_artifacts_story_id` (story_id) - For story-specific queries
- `idx_qa_verify_artifacts_created_at` (created_at) - For time-range queries

**Foreign Keys**:
- `story_id` → `wint.stories.id` ON DELETE CASCADE

**JSONB Structures**:

```typescript
// ac_verifications: AcVerification[]
{
  ac_id: string;
  status: 'verified' | 'failed' | 'skipped';
  verification_method: string;
  notes?: string;
}

// test_results: TestResult[]
{
  test_suite: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration_ms?: number;
}

// qa_issues: QaIssue[]
{
  id: string;
  severity: 'blocker' | 'critical' | 'major' | 'minor';
  category: string;
  description: string;
  steps_to_reproduce?: string;
  resolution?: string;
}
```

## Design Decisions

### 1. Reuse artifacts Schema and Enum (ADR-INFR-120-001)

**Decision**: Use existing `artifacts` schema namespace and `artifact_type_enum` from INFR-0110.

**Rationale**:
- INFR-0110 defined all 7 artifact types upfront (story, checkpoint, scope, plan, evidence, review, qa-verify)
- No ALTER TYPE needed for enum expansion
- Consistent namespace for all artifact tables
- Follows same patterns as INFR-0110 (UUID PKs, ON DELETE CASCADE, timestamps)

**Migration Simplicity**: INFR-0120 migration is ~150 lines (3 tables only), INFR-0110 was ~250 lines (pgSchema + enum + 4 tables + indexes).

### 2. No Composite Indexes (ADR-INFR-120-003)

**Decision**: Reuse INFR-0110's `idx_story_artifact` composite index for evidence/review/qa-verify queries.

**Rationale**:
- INFR-0110 created `idx_story_artifact (story_id, artifact_type)` covering all 7 artifact types
- Query patterns are similar across all artifact types (filter by story + type)
- No need for duplicate indexes

**INFR-0120 Indexes**:
- Simple indexes on `story_id` and `created_at` for each table
- No composite indexes (rely on INFR-0110's shared index)

### 3. JSONB Denormalization (ADR-INFR-120-002)

**Decision**: Store ac_evidence, findings, test_results as JSONB arrays.

**Rationale**:
- **Co-location**: Evidence items, review findings, QA issues always loaded together with parent artifact
- **Size**: Max ~20 ACs per story, ~50 findings per review, ~30 QA issues → fits JSONB performance profile
- **Query patterns**: Most queries filter by story_id, not individual evidence items
- **Schema evolution**: Matches INFR-0110 pattern for consistency

**Alternative Rejected**: Normalize to separate `evidence_items`, `review_findings`, `qa_issues` tables.
- **Rejected Reason**: Over-engineering for current query patterns - no need to query individual evidence items.

### 4. Field Naming Convention

**Inherited from INFR-0110**:
- Database columns: `snake_case` (PostgreSQL convention)
- TypeScript types: `camelCase` (JavaScript convention)
- Drizzle ORM handles transformation automatically

**Example**:

```typescript
// Drizzle schema definition
export const evidenceArtifacts = artifactsSchema.table('evidence_artifacts', {
  storyId: uuid('story_id').notNull(),  // DB: story_id, TS: storyId
  acEvidence: jsonb('ac_evidence').$type<AcEvidence[]>(),  // DB: ac_evidence, TS: acEvidence
})
```

## Schema Alignment with Orchestrator

All database schemas align with existing Zod artifact schemas in `packages/backend/orchestrator/src/artifacts/`:

| Artifact Type | Zod Schema | DB Table | Alignment |
|---------------|------------|----------|-----------|
| Evidence | `EvidenceSchema` | `evidence_artifacts` | Field names match |
| Review | `ReviewSchema` | `review_artifacts` | Field names match |
| QA Verify | `QaVerifySchema` | `qa_verify_artifacts` | Field names match |

**Field Mapping** (snake_case DB ↔ camelCase TS):

| DB Column | TS Property | Type |
|-----------|-------------|------|
| `story_id` | `storyId` | UUID |
| `ac_evidence` | `acEvidence` | JSONB |
| `touched_files` | `touchedFiles` | JSONB |
| `commands_run` | `commandsRun` | JSONB |
| `e2e_tests` | `e2eTests` | JSONB |
| `worker_results` | `workerResults` | JSONB |
| `ranked_patches` | `rankedPatches` | JSONB |
| `ac_verifications` | `acVerifications` | JSONB |
| `test_results` | `testResults` | JSONB |
| `qa_issues` | `qaIssues` | JSONB |

## Migration File

**Generated File**: `src/migrations/app/0022_needy_ender_wiggin.sql`

**Size**: ~40 lines (3 tables + foreign keys + indexes)

**Dependencies**:
- Requires `artifacts` schema to exist (INFR-0110 must be complete)
- Requires `wint.stories` table to exist (WINT-0010 must be complete)
- Uses `wint.stories.id` as FK target (UUID, not `story_id` text field)

**Key Operations**:
1. Create 3 artifact tables in existing `artifacts` schema
2. Add foreign key constraints with ON DELETE CASCADE
3. Create indexes for query optimization (story_id, created_at)

**No Operations** (inherited from INFR-0110):
- pgSchema creation (already exists)
- Enum creation (already exists with all 7 types)
- Composite indexes (reuse INFR-0110's shared index)

## Drizzle Relations

**Story → Artifacts** (one-to-many, lazy loading):

```typescript
// Updated in INFR-0120 to include evidence, review, qa-verify artifacts
export const storiesRelations = relations(stories, ({ many }) => ({
  storyArtifacts: many(storyArtifacts),              // INFR-0110
  checkpointArtifacts: many(checkpointArtifacts),    // INFR-0110
  scopeArtifacts: many(scopeArtifacts),              // INFR-0110
  planArtifacts: many(planArtifacts),                // INFR-0110
  evidenceArtifacts: many(evidenceArtifacts),        // INFR-0120
  reviewArtifacts: many(reviewArtifacts),            // INFR-0120
  qaVerifyArtifacts: many(qaVerifyArtifacts),        // INFR-0120
}))
```

**Artifact → Story** (many-to-one, eager loading):

```typescript
// Evidence Artifact → Story
export const evidenceArtifactsRelations = relations(evidenceArtifacts, ({ one }) => ({
  story: one(stories, {
    fields: [evidenceArtifacts.storyId],
    references: [stories.id],
  }),
}))

// Review Artifact → Story
export const reviewArtifactsRelations = relations(reviewArtifacts, ({ one }) => ({
  story: one(stories, {
    fields: [reviewArtifacts.storyId],
    references: [stories.id],
  }),
}))

// QA Verify Artifact → Story
export const qaVerifyArtifactsRelations = relations(qaVerifyArtifacts, ({ one }) => ({
  story: one(stories, {
    fields: [qaVerifyArtifacts.storyId],
    references: [stories.id],
  }),
}))
```

## Auto-Generated Zod Schemas

**Pattern**: Use `drizzle-zod` to auto-generate insert/select schemas for runtime validation.

**Example**:

```typescript
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

// Evidence Artifact Schemas
export const insertEvidenceArtifactSchema = createInsertSchema(evidenceArtifacts)
export const selectEvidenceArtifactSchema = createSelectSchema(evidenceArtifacts)

export type InsertEvidenceArtifact = z.infer<typeof insertEvidenceArtifactSchema>
export type SelectEvidenceArtifact = z.infer<typeof selectEvidenceArtifactSchema>

// Review Artifact Schemas
export const insertReviewArtifactSchema = createInsertSchema(reviewArtifacts)
export const selectReviewArtifactSchema = createSelectSchema(reviewArtifacts)

export type InsertReviewArtifact = z.infer<typeof insertReviewArtifactSchema>
export type SelectReviewArtifact = z.infer<typeof selectReviewArtifactSchema>

// QA Verify Artifact Schemas
export const insertQaVerifyArtifactSchema = createInsertSchema(qaVerifyArtifacts)
export const selectQaVerifyArtifactSchema = createSelectSchema(qaVerifyArtifacts)

export type InsertQaVerifyArtifact = z.infer<typeof insertQaVerifyArtifactSchema>
export type SelectQaVerifyArtifact = z.infer<typeof selectQaVerifyArtifactSchema>
```

## Testing Strategy

### Unit Tests

**File**: `packages/backend/database-schema/src/schema/__tests__/review-qa-artifacts-schema.test.ts`

**Coverage**:
- Schema validation (insert valid artifact, reject invalid artifact)
- JSONB field structure matches Zod schemas
- Required field validation (storyId)
- Zod schema validation for all 10 JSONB type schemas
- Relations definitions

### Integration Tests

**Deferred to**: INFR-0020 (Artifact Writer/Reader Service)

**Future Coverage**:
- Migration apply/rollback
- Foreign key constraints
- Drizzle relations with eager/lazy loading
- Index usage (EXPLAIN ANALYZE)
- ON DELETE CASCADE behavior

## Risks

### RISK-001: Schema Alignment Drift

**Description**: Schema alignment drift between Zod artifacts (packages/backend/orchestrator) and Postgres schema.

**Severity**: Medium

**Mitigation**: AC-7 unit tests validate JSONB field structure matches Zod schemas for evidence/review/qa-verify.

### RISK-002: JSONB Type Safety

**Description**: JSONB type safety not enforced at database level.

**Severity**: Low

**Mitigation**: Use drizzle-zod createInsertSchema for runtime validation before insert.

## References

- **Story**: INFR-0120
- **Parent Story**: INFR-0110 (artifacts schema namespace, artifact_type_enum)
- **Dependencies**: WINT-0010 (wint.stories table), INFR-0110 (artifacts schema)
- **Follow-up Story**: INFR-0020 (Artifact Writer/Reader Service)
