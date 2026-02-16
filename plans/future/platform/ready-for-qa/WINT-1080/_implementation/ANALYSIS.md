# Elaboration Analysis - WINT-1080

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Scope matches stories.index entry exactly - schema analysis, unified design, migration strategy |
| 2 | Internal Consistency | PASS | — | Goals, non-goals, and ACs are internally consistent |
| 3 | Reuse-First | PASS | — | Extensive reuse of Drizzle ORM, existing schema patterns, LangGraph functions |
| 4 | Ports & Adapters | N/A | — | Database schema story - no API endpoints involved |
| 5 | Local Testability | CONDITIONAL | Medium | Test plan covers migrations but lacks concrete .sql test fixtures for rollback validation |
| 6 | Decision Completeness | CONDITIONAL | Medium | Enum reconciliation strategy proposed but requires stakeholder alignment before implementation |
| 7 | Risk Disclosure | PASS | — | Comprehensive risk disclosure in DEV-FEASIBILITY.md and story body |
| 8 | Story Sizing | CONDITIONAL | Medium | 13 points is appropriate but AC-004 (unified schema specification) is the largest single task and may need time-boxing |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Enum reconciliation requires stakeholder decision before proceeding | Medium | Document decision-making process and timeline in AC-002 - recommend early alignment meeting |
| 2 | Test plan lacks concrete SQL fixtures for rollback testing | Medium | Add sample test data SQL scripts to TEST-PLAN.md for migration dry-run validation |
| 3 | AC-004 unified schema specification is 12-16 hours - largest single AC | Medium | Recommend time-boxing to 16 hours with clear scope boundaries and documenting incomplete areas if time exceeded |
| 4 | Story mentions "create migration scripts" but deployment is deferred | Low | Clarify in AC-005 that migration scripts are generated and tested but NOT deployed to production |
| 5 | No explicit validation of pgvector extension availability in knowledge-base DB | Low | Add pre-migration check in AC-005 to verify pgvector extension is installed |

## Split Recommendation

**No split required.** This is a spike/analysis story with clear deliverables. While 13 points is substantial, the work is cohesive and splitting would introduce coordination overhead without clear benefit.

## Preliminary Verdict

**CONDITIONAL PASS**: Proceed with implementation after addressing the following:

1. **Early Stakeholder Alignment**: Schedule alignment meeting for enum reconciliation (AC-002) before starting AC-004
2. **Test Plan Enhancement**: Add concrete SQL test fixtures for migration validation
3. **AC-004 Time-Boxing**: Document time-box strategy and incomplete area handling
4. **Migration Deployment Clarity**: Explicit documentation that migration scripts are tested but not deployed

---

## MVP-Critical Gaps

### Schema Overlap Analysis

**GAP-001: Missing explicit handling of duplicate story tracking across two databases**
- **Blocks**: Core schema reconciliation (AC-001, AC-003)
- **Finding**: Both WINT and LangGraph schemas track stories, but story is silent on how to handle stories that exist in both databases during migration phase
- **Required Fix**: Document strategy in AC-003 for handling stories that exist in both databases:
  - Are LangGraph stories migrated to WINT schema? (No - per Non-Goals, data migration deferred to WINT-1110)
  - Do we allow duplicate story records during migration phase? (Yes - two databases can coexist)
  - Which is source of truth for story state during migration? (Clarify in AC-003)

**GAP-002: No explicit validation of LangGraph database connection in migration script**
- **Blocks**: Migration testing (AC-005)
- **Required Fix**: Migration script must include connection validation to knowledge-base database (port 5433) before attempting schema changes. Add to AC-005 deliverable.

**GAP-003: Missing explicit handling of pgvector extension migration**
- **Blocks**: Features table migration (AC-004, AC-005)
- **Finding**: LangGraph uses pgvector(1536) for embeddings on features, stories, gaps, feedback, and adrs tables. WINT schema currently has no pgvector support. AC-004 mentions "add pgvector support to WINT" but details are vague.
- **Required Fix**: Clarify in AC-004:
  - Which WINT tables will get pgvector columns? (features, stories at minimum per ownership model)
  - How are embeddings generated for existing WINT records without embeddings?
  - Is pgvector extension already installed in main app database (port 5432)?
  - If not, migration must document extension installation as prerequisite

**GAP-004: Enum naming convention decision not finalized**
- **Blocks**: Enum reconciliation (AC-002), unified schema (AC-004)
- **Finding**: Story proposes underscored naming (`ready_to_work`) but doesn't document rationale or alternatives considered
- **Required Fix**: AC-002 should document:
  - Why underscores are preferred over hyphens (TypeScript enum compatibility, existing WINT pattern)
  - Impact on existing LangGraph queries (all hyphenated enum values must be updated)
  - Migration strategy for SQL functions that reference enum values

---

## Codebase Analysis Findings

### WINT Schema (packages/backend/database-schema/src/schema/wint.ts)

**Strengths**:
- Clean separation of concerns with 6 schema groups
- Comprehensive use of Drizzle ORM features (relations, indexes, Zod generation)
- Strong naming conventions (underscored enums, camelCase TypeScript, snake_case SQL)
- Excellent index strategy (composite, partial, uniqueness constraints)
- Auto-generated Zod schemas with TypeScript type inference

**Patterns to Preserve**:
- UUID primary keys with `defaultRandom()`
- Timestamps with `withTimezone: true` and `defaultNow()`
- JSONB for flexible metadata with typed schemas (`.$type<>()`)
- Enum definitions using `pgEnum()`
- Relations using Drizzle relations API
- `pgSchema('wint')` namespace isolation

**Current State Enum** (WINT):
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

### LangGraph Schema (apps/api/knowledge-base/src/db/migrations/002_workflow_tables.sql)

**Strengths**:
- Rich semantic search with pgvector embeddings on 5 tables
- Well-designed views (`workable_stories`, `feature_progress`) for common queries
- PostgreSQL functions for state transitions and workflow logic
- Comprehensive audit trail with `workflow_events` table
- Trigger-based timestamp auto-update

**Patterns to Migrate**:
- pgvector embeddings for semantic search
- Views for common queries (may need translation to Drizzle)
- State transition functions (preserve logic, integrate with WINT telemetry)
- Trigger patterns (Drizzle supports triggers via raw SQL)

**Current State Enum** (LangGraph):
```sql
CREATE TYPE story_state AS ENUM ('draft', 'backlog', 'ready-to-work', 'in-progress', 'ready-for-qa', 'uat', 'done');
```

### Orchestrator Repository Usage (packages/backend/orchestrator/src/db/)

**Current Dependencies**:
- `story-repository.ts` uses raw SQL queries against LangGraph schema
- Expects hyphenated enum values ('ready-to-work', 'in-progress')
- No Drizzle ORM usage - direct pg client queries
- Schema defined in Zod schemas rather than Drizzle

**Migration Impact**:
- WINT-1090 will need to update all enum value references in repository code
- Migration from raw SQL to Drizzle ORM is out of scope (not mentioned in WINT-1090)
- Backward compatibility testing (AC-006) must validate all repository queries

### Enum Reconciliation Analysis

**Semantic Mapping**:
| WINT Enum | LangGraph Enum | Semantic Equivalence | Migration Path |
|-----------|----------------|----------------------|----------------|
| `backlog` | `backlog` | Exact match | Direct map |
| `ready_to_work` | `ready-to-work` | Exact match | Normalize to underscores |
| `in_progress` | `in-progress` | Exact match | Normalize to underscores |
| `ready_for_qa` | `ready-for-qa` | Exact match | Normalize to underscores |
| `in_qa` | `uat` | Semantic match | Map `uat` → `in_qa` |
| `blocked` | *(missing)* | N/A | Add to unified enum |
| `done` | `done` | Exact match | Direct map |
| `cancelled` | *(missing)* | N/A | Add to unified enum |
| *(missing)* | `draft` | N/A | Add to unified enum |

**New Unified Enum** (Proposed):
```typescript
export const unifiedStoryStateEnum = pgEnum('story_state', [
  'draft',       // From LangGraph
  'backlog',     // Both
  'ready_to_work',  // Normalized from ready-to-work
  'in_progress',    // Normalized from in-progress
  'ready_for_qa',   // Normalized from ready-for-qa
  'in_qa',          // Normalized from uat (semantic mapping)
  'blocked',     // From WINT
  'done',        // Both
  'cancelled',   // From WINT
])
```

**Migration Strategy**:
1. Create unified enum with all 9 states in knowledge-base database
2. LangGraph data migration (WINT-1110): Update all `uat` → `in_qa`, apply naming normalization
3. LangGraph code migration (WINT-1090): Update all enum references in repository queries
4. Dual enum period: Both databases support unified enum (no backward breaking change)
5. Cutover: LangGraph switches to unified enum exclusively
6. Cleanup: Remove old enum after migration complete

### Table Overlap Analysis

**Stories Table**:
| Feature | WINT | LangGraph | Reconciliation |
|---------|------|-----------|----------------|
| Primary Key | UUID | UUID | Compatible |
| Story ID | `storyId` (text) | `story_id` (varchar) | Compatible - normalize to snake_case |
| State Enum | `story_state` (underscored) | `story_state` (hyphenated) | Requires enum migration |
| Priority | `priority_enum` (P0-P4) | `priority_level` (p0-p3) | WINT has P4, LangGraph does not - merge to P0-P4 |
| Metadata | Separate tables for states, transitions, dependencies | Embedded arrays/JSONB | WINT more normalized - source of truth |
| Embeddings | No embeddings | `embedding vector(1536)` | Add to WINT schema |

**Features Table**:
| Feature | WINT | LangGraph | Reconciliation |
|---------|------|-----------|----------------|
| Schema | Complex graph relational model | Simple name/description/embedding | WINT is source of truth - richer model |
| Embeddings | No embeddings | `embedding vector(1536)` | Add to WINT schema |
| Capabilities | WINT has capabilities table | LangGraph does not | Keep WINT capabilities |

**Workflow Events**:
| Feature | WINT | LangGraph | Reconciliation |
|---------|------|-----------|----------------|
| WINT Tables | `workflowExecutions`, `workflowCheckpoints`, `workflowAuditLog` | N/A | WINT specific |
| LangGraph Table | N/A | `workflow_events` (generic audit log) | LangGraph specific |
| Telemetry | WINT has dedicated telemetry schema | LangGraph has basic event log | WINT is source of truth for telemetry |

**Unique to LangGraph** (Keep Separate):
- `elaborations` - LangGraph workflow specific
- `gaps` - LangGraph workflow specific
- `follow_ups` - LangGraph workflow specific
- `implementation_plans` - LangGraph workflow specific
- `verifications` - LangGraph workflow specific
- `proofs` - LangGraph workflow specific
- `token_usage` - LangGraph workflow specific (WINT has richer telemetry)
- `feedback` - LangGraph workflow specific
- `adrs` - Architecture decisions (may migrate to WINT in future)
- `acceptance_criteria` - LangGraph workflow specific
- `story_risks` - LangGraph workflow specific (WINT has risk fields in metadata)

**Ownership Model** (Validated):
- **Stories**: WINT schema is source of truth (more normalized, supports context caching, ML pipeline)
- **Features**: WINT schema is source of truth (graph relational model more flexible)
- **Workflow Events**: WINT schema is source of truth (dedicated telemetry, ML pipeline support)
- **Elaborations/Proofs**: LangGraph schema (specific to LangGraph workflow, keep separate)
- **Vector Embeddings**: Migrate to WINT (add pgvector support to features and stories tables)

### Architecture Validation

**Two Database Strategy** (Validated):
- Main App Database (port 5432): WINT schema in `wint` namespace ✅
- Knowledge Base Database (port 5433): LangGraph schema in `public` namespace ✅
- Rationale: Isolation, performance, scalability, migration safety ✅
- Future consolidation deferred (out of scope) ✅

**Schema Namespace Strategy** (Validated):
- WINT uses `pgSchema('wint')` namespace ✅
- LangGraph uses `public` namespace ✅
- Migration keeps LangGraph in `public` initially (no namespace change) ✅
- Future migration to `wint` namespace if databases merge (deferred) ✅

**Database Connection Pattern**:
- WINT: Via `@repo/db` package (Drizzle ORM) ✅
- LangGraph: Direct PostgreSQL client (raw SQL) ✅
- Migration: No change to connection patterns (WINT-1090 handles code updates) ✅

---

## Test Plan Validation

### Coverage Analysis

**Well Covered**:
- Schema diff validation (TC-001 to TC-004)
- Enum reconciliation (TC-005 to TC-007)
- Type generation (TC-012 to TC-014)
- Backward compatibility (TC-015 to TC-019)
- Database coexistence (TC-020 to TC-022)

**Gaps in Test Plan**:
1. **Missing concrete SQL fixtures**: Test plan mentions "sample stories in all states" but doesn't provide SQL scripts for seeding test data
2. **No explicit rollback test case**: TC-010 mentions rollback but lacks step-by-step rollback validation procedure
3. **No pgvector extension validation**: No test case for verifying pgvector extension is available before migration
4. **No dual enum period test**: No test case for validating both old and new enums work during migration phase
5. **No view/function update test**: TC-017/TC-018 test existing views/functions but no test for updated view/function logic

### Test Data Requirements (Enhancement Needed)

**Recommendation**: Add SQL seed scripts to TEST-PLAN.md:
- `test-data-wint.sql`: Sample WINT schema data (stories, features, workflow events)
- `test-data-langgraph.sql`: Sample LangGraph schema data (stories, elaborations, proofs, embeddings)
- `test-data-migration.sql`: Edge cases for migration testing (all story states, complex relationships)

### Test Tooling Validation

**Adequate**:
- Drizzle Kit for schema diff ✅
- PostgreSQL for test databases ✅
- Vitest for unit tests ✅
- Integration tests for live database migration ✅

**Missing**:
- SQL script execution tooling (psql, or programmatic via pg client)
- Test database cloning strategy (Docker, or pgdump/pgrestore)

---

## Risk Assessment Validation

### Primary Risks (from DEV-FEASIBILITY.md)

**Risk 1: Backward Compatibility**
- **Severity**: Critical
- **Mitigation in Story**: AC-006 comprehensive backward compatibility testing ✅
- **Additional Mitigation Needed**: Document all breaking changes in LANGGRAPH-MIGRATION-GUIDE.md with before/after code examples

**Risk 2: Timeline Delays (40-51 hours)**
- **Severity**: High
- **Mitigation in Story**: Documentation-first approach reduces implementation risk ✅
- **Additional Mitigation Needed**: Time-box AC-004 to 16 hours, document incomplete areas if exceeded

**Risk 3: Stakeholder Alignment on Enum Reconciliation**
- **Severity**: Medium
- **Mitigation in Story**: Early stakeholder alignment recommended in DEV-FEASIBILITY.md ✅
- **Additional Mitigation Needed**: Schedule alignment meeting BEFORE starting AC-004

**Risk 4: Data Loss During Migration**
- **Severity**: Critical
- **Mitigation in Story**: Dry-run testing, rollback script, database snapshots in AC-005 ✅
- **Additional Mitigation Needed**: Document snapshot creation procedure in AC-005

### Downstream Impact Validation

**Blocks**:
- WINT-1090: Update LangGraph Repos (blocked until schema alignment strategy finalized) ✅
- WINT-1100: Create Shared TypeScript Types (blocked until unified schema specification complete) ✅

**Impact**: Critical path confirmed. Delays cascade to 2+ P0 stories in Wave 3. ✅

---

## Deliverables Validation

### AC-001: Schema Diff Analysis
- **Deliverable**: `SCHEMA-DIFF-ANALYSIS.md` (Markdown table comparing schemas table-by-table)
- **Validation**: Adequate specification, clear structure ✅
- **Gap**: No sample structure provided - recommend adding template to AC

### AC-002: Enum Reconciliation
- **Deliverable**: `ENUM-RECONCILIATION.md` (Unified enum design and mapping strategy)
- **Validation**: Adequate specification ✅
- **Gap**: Missing decision-making process documentation

### AC-003: Ownership Model
- **Deliverable**: `SCHEMA-OWNERSHIP-MODEL.md` (Source of truth for each domain)
- **Validation**: Adequate specification ✅
- **Enhancement**: Add decision rationale for each ownership decision (already in verification criteria)

### AC-004: Unified Schema Specification
- **Deliverable**: `packages/backend/database-schema/src/schema/unified-wint.ts` (Drizzle ORM code)
- **Validation**: Adequate specification ✅
- **Gap**: Largest single AC (12-16 hours) - recommend time-boxing strategy

### AC-005: Migration Script Generation
- **Deliverables**:
  - `packages/backend/database-schema/migrations/knowledge-base/0001_unify_with_wint_schema.sql`
  - `packages/backend/database-schema/migrations/knowledge-base/0001_rollback.sql`
- **Validation**: Adequate specification ✅
- **Gap**: No pre-migration checks documented (pgvector extension, database connection)

### AC-006: Backward Compatibility Validation
- **Deliverables**:
  - `BACKWARD-COMPATIBILITY-REPORT.md` (Query inventory and test results)
  - `LANGGRAPH-MIGRATION-GUIDE.md` (Code update guide for WINT-1090)
- **Validation**: Adequate specification ✅
- **Enhancement**: Add code examples to migration guide

### AC-007: TypeScript Types Foundation
- **Deliverables**:
  - `packages/backend/database-schema/src/types/zod-schemas.ts` (Auto-generated Zod schemas)
  - `TYPE-FOUNDATION-SPEC.md` (Type export structure documentation)
- **Validation**: Adequate specification ✅
- **Note**: Leverages drizzle-zod auto-generation - low risk

---

## Reuse Plan Validation

### From WINT Schema ✅
- Enum patterns (`pgEnum()`) - Extensively used, well-documented
- Index strategies (composite, partial) - Comprehensive examples in wint.ts
- Relations (Drizzle relations API) - Multiple examples across all schema groups
- UUID primary keys (`defaultRandom()`) - Consistent pattern across all tables
- Timestamps (`defaultNow()`) - Consistent pattern across all tables

### From LangGraph Schema ✅
- State transition functions - Well-implemented, preserve logic
- Triggers - Auto-update timestamps pattern
- Views - `workable_stories`, `feature_progress` provide value
- Event logging - `workflow_events` table pattern

### From Drizzle ORM ✅
- Schema namespace isolation (`pgSchema('wint')`) - Already in use
- Zod schema generation (`drizzle-zod`) - Already in use
- Migration generation (`drizzle-kit`) - Already in use

**Validation**: Reuse plan is comprehensive and leverages existing patterns effectively.

---

## Non-Goals Validation

**Correctly Excluded from Scope**:
1. ✅ Data Migration - Deferred to WINT-1110 (correct)
2. ✅ Code Updates - Deferred to WINT-1090 (correct)
3. ✅ MCP Tool Integration - Deferred to WINT-0090+ (correct)
4. ✅ Database Consolidation - May remain separate for performance (correct)
5. ✅ Deprecating LangGraph Schema - May continue to exist during migration (correct)
6. ✅ Creating Shared Types Package - Type generation is WINT-1100 (correct)

**Validation**: Non-goals are appropriate and prevent scope creep.

---

## Documentation Quality Assessment

**Story Body**: Excellent
- Clear context and problem statement
- Well-structured sections
- Comprehensive constraints documentation
- Realistic approach and deliverables

**TEST-PLAN.md**: Good
- 22 test cases across 6 categories
- Clear test strategy
- Adequate tools and environments
- **Gap**: Missing concrete SQL fixtures

**DEV-FEASIBILITY.md**: Excellent
- Thorough feasibility analysis
- Realistic effort estimates (40-51 hours)
- Comprehensive risk assessment
- Clear recommendations

**STORY-SEED.md**: Excellent
- Reality context well-documented
- No conflicts found
- Clear recommendations for subsequent phases

---

## Final Recommendations

### Before Starting Implementation

1. **Schedule Enum Alignment Meeting** (1-2 hours):
   - Stakeholders: Backend engineer, LangGraph maintainer, Platform lead
   - Agenda: Finalize enum naming convention, semantic mapping decisions
   - Output: Documented decision in AC-002

2. **Enhance Test Plan** (2-3 hours):
   - Create SQL seed scripts for test data
   - Document rollback validation procedure
   - Add pgvector extension check

3. **Document AC-004 Time-Boxing Strategy**:
   - Set 16-hour maximum for unified schema specification
   - Define incomplete area handling (document in FUTURE-OPPORTUNITIES.md if time exceeded)
   - Prioritize core tables (stories, features, workflow events) over ML pipeline tables

4. **Clarify Migration Deployment**:
   - Explicitly state in AC-005 that migration scripts are generated and tested but NOT deployed to production
   - Deployment happens in WINT-1090 after LangGraph code updates

### During Implementation

1. **AC-001 First** (3-4 hours):
   - Complete schema diff analysis
   - Use output to validate assumptions in subsequent ACs

2. **AC-002 Second** (2-3 hours):
   - Finalize enum reconciliation after stakeholder meeting
   - Document decision rationale

3. **AC-003 Third** (2 hours):
   - Document ownership model with rationale
   - Reference AC-001 diff analysis

4. **AC-004 Fourth** (12-16 hours, time-boxed):
   - Prioritize core tables
   - Document incomplete areas if time-boxed

5. **AC-005 Fifth** (8-10 hours):
   - Generate migration scripts
   - Add pre-migration checks
   - Test on cloned database

6. **AC-006 Sixth** (10-12 hours):
   - Inventory all LangGraph queries
   - Test backward compatibility
   - Create migration guide with code examples

7. **AC-007 Last** (3-4 hours):
   - Generate Zod schemas
   - Document type export structure

---

## Worker Token Summary

- **Input**: ~82k tokens (files read: story, test plan, dev feasibility, wint.ts, LangGraph SQL, orchestrator repository)
- **Output**: ~12k tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
- **Total**: ~94k tokens
