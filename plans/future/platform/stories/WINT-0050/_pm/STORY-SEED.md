---
generated: "2026-02-14"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-0050

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No ADR-LOG.md found, no knowledge base lessons loaded (KB infrastructure pending)

### Relevant Existing Features

| Feature | Status | Location | Relevance |
|---------|--------|----------|-----------|
| WINT Core Schemas | Completed | `packages/backend/database-schema/src/schema/wint.ts` | WINT-0010 completed - provides foundation tables |
| ML Pipeline Schema Tables | Exists | Lines 752-933 of `wint.ts` | Already implemented in WINT-0010 (schema group #4) |
| Drizzle ORM v0.44.3 | Active | `packages/backend/database-schema` | ORM framework for schema definitions |
| drizzle-zod | Active | npm package | Auto-generates Zod schemas for validation |
| @repo/db client | Active | `packages/backend/db` | Connection pooling (max 1 per Lambda) |

### Active In-Progress Work

| Story ID | Title | Status | Potential Overlap |
|----------|-------|--------|-------------------|
| WINT-0020 | Create Story Management Tables | in-progress | No overlap - different schema group |
| None | — | — | No other platform stories in-progress |

### Constraints to Respect

1. **Zod-first types** - All database schemas use Drizzle ORM with Zod inference (no TypeScript interfaces)
2. **Schema isolation** - Use `pgSchema('wint')` for namespace isolation (already established in WINT-0010)
3. **Drizzle ORM version** - Must use v0.44.3
4. **Connection pooling** - Respect `@repo/db` client pattern (max 1 connection per Lambda)
5. **Migration strategy** - Use Drizzle Kit for all migrations (no manual SQL)
6. **Protected features** - Do not modify production schemas (Gallery, MOCs, Sets, Wishlist, Umami)

---

## Retrieved Context

### Related Endpoints
None - This is a database schema story (backend-only, no API endpoints)

### Related Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `wint.ts` | `packages/backend/database-schema/src/schema/wint.ts` | ML Pipeline schema already defined (lines 752-933) |
| `index.ts` | `packages/backend/database-schema/src/schema/index.ts` | Schema re-exports |
| `wint-schema.test.ts` | `packages/backend/database-schema/src/schema/__tests__/wint-schema.test.ts` | Existing test file for WINT schemas |

### Reuse Candidates

| Candidate | Type | Location | Application |
|-----------|------|----------|-------------|
| ML Pipeline tables | Database schema | `wint.ts` lines 752-933 | Already implemented - story may be duplicate or misunderstood |
| Zod schema generation | Pattern | `wint.ts` lines 1540-1559 | ML models already have Zod schemas auto-generated |
| Index patterns | Pattern | `wint.ts` lines 807-933 | Composite indexes already defined for ML tables |
| Test structure | Pattern | `wint-schema.test.ts` | Add ML Pipeline schema tests if missing |

---

## Knowledge Context

### Lessons Learned
No lessons loaded (KB infrastructure not yet operational).

### Blockers to Avoid
- None identified (no historical data available)

### Architecture Decisions (ADRs)
No ADR-LOG.md found at expected location `plans/stories/ADR-LOG.md`.

**Assumed constraints from codebase patterns**:
- Use Drizzle ORM for all database schemas
- Use `pgSchema('wint')` for namespace isolation
- Auto-generate Zod schemas via `drizzle-zod`
- Follow UUID primary key pattern
- Include `created_at` and `updated_at` timestamps

### Patterns to Follow
- **pgSchema isolation** - From `umami.ts` and `wint.ts`
- **UUID primary keys** - `uuid('id').primaryKey().defaultRandom()`
- **Timestamps** - `timestamp('created_at', { withTimezone: true }).notNull().defaultNow()`
- **JSONB for metadata** - Flexible fields use JSONB type
- **Composite indexes** - Multi-column indexes for common query patterns
- **Drizzle relations** - `relations()` API for lazy loading

### Patterns to Avoid
- Manual SQL migrations (use Drizzle Kit)
- TypeScript interfaces without Zod (Zod-first types required)
- Modifying production schemas directly
- Skipping test coverage (80% minimum for infrastructure stories)

---

## Conflict Analysis

### Conflict: Story Already Implemented
- **Severity**: blocking
- **Description**: The ML Pipeline schema (group #4) was already implemented in WINT-0010 (completed UAT). The `wint.ts` file contains:
  - `training_data` table (lines 771-813)
  - `ml_models` table (lines 820-856)
  - `model_predictions` table (lines 863-899)
  - `model_metrics` table (lines 906-933)
  - Corresponding Zod schemas (lines 1540-1559)
  - Drizzle relations (lines 1389-1407)
- **Resolution Hint**: This story may be a duplicate or the index is outdated. Options:
  1. **Cancel story** - ML Pipeline tables already exist (most likely)
  2. **Redefine story** - If the intent was to add *additional* ML tables beyond those in WINT-0010
  3. **Convert to test story** - Add comprehensive unit tests for ML Pipeline schema if missing

---

## Story Seed

### Title
Create ML Pipeline Tables

### Description

**CRITICAL DISCOVERY**: The ML Pipeline schema was already implemented in WINT-0010 (completed UAT story). The `wint.ts` file contains all 4 ML Pipeline tables defined in WINT-0010's AC-005:
1. `training_data` - Stores training examples for ML models
2. `ml_models` - Tracks trained models and versions
3. `model_predictions` - Stores predictions for tracking and analysis
4. `model_metrics` - Tracks performance metrics for deployed models

**Possible interpretations of WINT-0050**:

**Option A: Story is Duplicate (Most Likely)**
- WINT-0010 already created all ML Pipeline tables as part of its 6-schema-group scope
- WINT-0050 may be an artifact of story planning before WINT-0010 was executed
- **Recommendation**: Mark story as duplicate/cancelled, no work needed

**Option B: Story Targets Missing Tests**
- WINT-0010 implemented ML schemas but may lack comprehensive tests
- WINT-0050 could add focused unit tests for ML Pipeline schema group
- **Recommendation**: Convert to test story: "Add comprehensive unit tests for ML Pipeline schema"

**Option C: Story Targets Additional Tables**
- WINT-0010 created foundational ML tables
- WINT-0050 could add advanced ML tables (e.g., feature stores, experiment tracking)
- **Recommendation**: Clarify scope, add new tables beyond WINT-0010's 4 base tables

**Current State (2026-02-13)**:
- WINT-0010: Completed UAT (status: completed)
- ML Pipeline schema exists in `packages/backend/database-schema/src/schema/wint.ts`
- Schema includes: training data, models, predictions, metrics
- Zod schemas auto-generated via drizzle-zod
- Drizzle relations defined for lazy loading
- Migration files generated via Drizzle Kit

**Blocker**: Story appears to be a duplicate of work already completed in WINT-0010. Requires clarification before implementation can proceed.

### Initial Acceptance Criteria

**WARNING**: These ACs assume the story is NOT a duplicate. If WINT-0050 is a duplicate, all ACs below are already satisfied by WINT-0010.

- [ ] AC-001: Verify ML Pipeline tables exist in `wint.ts`
  - Tables: `training_data`, `ml_models`, `model_predictions`, `model_metrics`
  - All tables in `wint` schema namespace
  - All tables have UUID primary keys

- [ ] AC-002: Verify Zod schemas exist for all ML Pipeline tables
  - Insert schemas: `insertTrainingDataSchema`, `insertMlModelSchema`, `insertModelPredictionSchema`, `insertModelMetricSchema`
  - Select schemas: `selectTrainingDataSchema`, `selectMlModelSchema`, `selectModelPredictionSchema`, `selectModelMetricSchema`
  - Types inferred via `z.infer<typeof Schema>`

- [ ] AC-003: Verify Drizzle relations exist for ML Pipeline tables
  - `mlModelsRelations` - one-to-many to predictions and metrics
  - `modelPredictionsRelations` - many-to-one to models
  - `modelMetricsRelations` - many-to-one to models

- [ ] AC-004: Verify indexes exist for common query patterns
  - `model_id` index on predictions and metrics
  - `prediction_type` index on predictions
  - `metric_type` index on metrics
  - `created_at` indexes for time-series queries

- [ ] AC-005: Add comprehensive unit tests for ML Pipeline schema (if missing)
  - Test table structure and columns
  - Test constraint enforcement (PK, FK, NOT NULL)
  - Test index existence
  - Test Zod schema inference
  - Test relation navigation
  - Achieve 80%+ coverage for ML Pipeline schema

### Non-Goals

- Migration of existing orchestrator data to ML tables (deferred to WINT-0080+)
- Implementation of MCP tools for ML pipeline access (blocked by WINT-0140)
- Training actual ML models (deferred to WINT-5010+)
- ML model deployment infrastructure (out of scope)
- UI components for ML pipeline visualization (out of scope)
- API endpoints for ML pipeline (deferred to future stories)

**Critical Non-Goal**: Do NOT re-implement tables that already exist in `wint.ts`. Verify scope before proceeding.

### Reuse Plan

**Components**:
- ML Pipeline tables (ALREADY EXIST in `wint.ts` lines 752-933)
- Zod schemas (ALREADY EXIST in `wint.ts` lines 1540-1559)
- Drizzle relations (ALREADY EXIST in `wint.ts` lines 1389-1407)

**Patterns**:
- `pgSchema('wint')` isolation (ALREADY ESTABLISHED)
- UUID primary keys (ALREADY USED)
- Timestamp fields (ALREADY PRESENT)
- JSONB for metadata (ALREADY IMPLEMENTED)

**Packages**:
- `@repo/database-schema` - Target package for schemas (ALREADY CONTAINS ML TABLES)
- `drizzle-orm` v0.44.3 - ORM framework (ALREADY IN USE)
- `drizzle-zod` - Zod schema generation (ALREADY CONFIGURED)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
**Critical Context**: Verify whether WINT-0050 is a duplicate before writing test plan.

If story is NOT a duplicate:
- Review existing ML Pipeline schema in `wint.ts` (lines 752-933)
- Check if unit tests exist in `wint-schema.test.ts` for ML tables
- If tests are missing, focus test plan on comprehensive ML schema validation
- Target 80%+ coverage for ML Pipeline schema group
- Include constraint enforcement tests (FK cascades, unique constraints)
- Include Zod schema inference tests
- Include relation navigation tests

### For UI/UX Advisor
No UI/UX work needed - this is a backend database schema story.

**Note**: If story is a duplicate, no UI/UX input required.

### For Dev Feasibility
**Critical Feasibility Issue**: Story may be a duplicate of WINT-0010.

**Feasibility Assessment Steps**:
1. **Verify scope** - Review WINT-0010 completion artifacts
2. **Check `wint.ts`** - Confirm ML Pipeline tables exist (lines 752-933)
3. **Determine intent** - Is this:
   - A duplicate story (cancel)?
   - A test enhancement story (add tests)?
   - An extension story (add new tables)?
4. **Recommend path forward**:
   - **If duplicate**: Mark story as cancelled/completed (no work needed)
   - **If test enhancement**: Rename to "Add comprehensive ML Pipeline schema tests"
   - **If extension**: Clarify which additional tables are needed beyond WINT-0010's 4 base tables

**Implementation Risk**: HIGH - Proceeding without scope clarification risks duplicate work or test failures.

**Recommendation**: Pause implementation until story intent is clarified. Review WINT-0010 completion artifacts and consult with PM/product owner.
