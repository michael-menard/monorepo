---
generated: "2026-02-14"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-1080

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No knowledge base lessons found specific to schema reconciliation. No historical examples of database schema migration/unification stories in KB.

### Relevant Existing Features
| Feature | Location | Notes |
|---------|----------|-------|
| WINT Core Schema | `packages/backend/database-schema/src/schema/wint.ts` | 6 schema groups created in WINT-0010 (completed) |
| LangGraph Workflow Tables | `apps/api/knowledge-base/src/db/migrations/002_workflow_tables.sql` | Separate PostgreSQL instance (port 5433) with pgvector |
| Drizzle ORM | `packages/backend/database-schema/` | v0.44.3 active, Zod schema generation via drizzle-zod |
| @repo/db Client | `packages/backend/db/` | Connection pooling, max 1 per Lambda |

### Active In-Progress Work
No active platform stories that overlap with this scope. WINT-0010 is marked as completed, satisfying the dependency.

### Constraints to Respect
1. **Protected Features**: Do not modify the knowledge-base PostgreSQL instance schema directly - this is a separate database on port 5433
2. **Schema Isolation**: WINT uses `pgSchema('wint')` namespace in main app database (port 5432), LangGraph uses default `public` schema in knowledge-base database (port 5433)
3. **Two Databases**: Main app database vs. knowledge-base database are physically separate instances
4. **Drizzle ORM**: All schema changes must use Drizzle ORM v0.44.3 with drizzle-zod for Zod schema generation
5. **Migration Strategy**: Use Drizzle Kit for all migrations, no manual SQL
6. **Backward Compatibility**: LangGraph is actively used - any schema changes must preserve existing functionality

---

## Retrieved Context

### Related Schemas

#### WINT Schema (Main App Database - Port 5432, `wint` schema)
Located: `packages/backend/database-schema/src/schema/wint.ts`

**Schema Groups (from WINT-0010)**:
1. **Story Management** - `stories`, `storyStates`, `storyTransitions`, `storyDependencies`
2. **Context Cache** - `contextPacks`, `contextSessions`, `contextCacheHits`
3. **Telemetry** - `agentInvocations`, `agentDecisions`, `agentOutcomes`, `stateTransitions`
4. **ML Pipeline** - `trainingData`, `mlModels`, `modelPredictions`, `modelMetrics`
5. **Graph Relational** - `features`, `capabilities`, `featureRelationships`, `cohesionRules`
6. **Workflow Tracking** - `workflowExecutions`, `workflowCheckpoints`, `workflowAuditLog`

**Key Features**:
- UUID primary keys with `defaultRandom()`
- Timestamps: `created_at`, `updated_at` on all tables
- JSONB for flexible metadata
- Comprehensive indexing strategy
- Drizzle relations for lazy loading
- Auto-generated Zod schemas

#### LangGraph Schema (Knowledge Base Database - Port 5433, `public` schema)
Located: `apps/api/knowledge-base/src/db/migrations/002_workflow_tables.sql`

**Tables**:
1. **Story Management** - `stories`, `acceptance_criteria`, `story_risks`
2. **Elaborations** - `elaborations`, `gaps`, `follow_ups`
3. **Implementation** - `implementation_plans`
4. **Verification** - `verifications`, `proofs`
5. **Telemetry** - `token_usage`, `feedback`
6. **Architecture** - `adrs`
7. **Audit** - `workflow_events`
8. **Supporting** - `features` (with vector embeddings)

**Key Features**:
- UUID primary keys with `gen_random_uuid()`
- Timestamps: `created_at`, `updated_at`
- pgvector embeddings (1536 dimensions) for semantic search
- PostgreSQL enums for constrained values
- Views for common queries (`workable_stories`, `feature_progress`)
- Functions for state transitions and workflow logic
- Triggers for auto-updating timestamps

### Overlap Analysis

#### Conceptual Overlap
Both schemas track:
- **Stories** - Core story metadata, state, relationships
- **Features** - Feature tracking and relationships
- **Workflow Events/Audit** - State transitions and audit trails
- **Telemetry** - Agent invocations, decisions, outcomes

#### Key Differences

| Aspect | WINT Schema | LangGraph Schema |
|--------|-------------|------------------|
| **Database** | Main app (5432) | Knowledge base (5433) |
| **Schema Namespace** | `wint` | `public` |
| **ORM** | Drizzle ORM (TypeScript) | Raw SQL migrations |
| **Story State** | Enum: backlog, ready_to_work, in_progress, ready_for_qa, in_qa, blocked, done, cancelled | Enum: draft, backlog, ready-to-work, in-progress, ready-for-qa, uat, done |
| **Embeddings** | Not present | pgvector(1536) on stories, features, gaps, feedback, adrs |
| **Context Focus** | Context caching, ML pipeline, graph relationships | Story elaboration, verification, proofs, token tracking |
| **Granularity** | More normalized (separate states, transitions tables) | More denormalized (JSONB for flexibility) |
| **Relations** | Drizzle relations API | PostgreSQL foreign keys |
| **Purpose** | Future autonomous workflow infrastructure | Current LangGraph workflow tracking |

### Reuse Candidates
| Component | Location | Application |
|-----------|----------|-------------|
| WINT schema patterns | `wint.ts` | Enum definitions, timestamp patterns, index strategies |
| LangGraph functions | `002_workflow_tables.sql` | State transition logic, event logging |
| Drizzle migration tools | `drizzle-kit` | Schema diff generation, migration creation |
| Zod schema generation | `drizzle-zod` | Runtime validation for unified types |

---

## Knowledge Context

### Lessons Learned
No KB entries found for schema migration or unification stories. This is a novel pattern in the codebase.

### Blockers to Avoid (from past stories)
- **Schema conflicts**: Ensure no table name collisions between schemas
- **Data migration risks**: This story is schema definition only - no data migration required
- **Breaking changes**: Must preserve existing LangGraph functionality
- **Type mismatches**: Story state enums differ between schemas

### Architecture Decisions (ADRs)
| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks - integration tests required |

### Patterns to Follow
- **Zod-first types**: Use Drizzle ORM with Zod schema inference (REQUIRED)
- **Schema isolation**: Use `pgSchema()` for namespace separation
- **Migration strategy**: Use Drizzle Kit for all migrations
- **Index strategy**: Balance read performance vs. write overhead
- **UUID primary keys**: Use `defaultRandom()` for distributed system compatibility

### Patterns to Avoid
- **Manual SQL**: Do not write migrations by hand
- **TypeScript interfaces**: All types must be Zod schemas with inference
- **Schema changes without migrations**: Always use Drizzle Kit

---

## Conflict Analysis

**No conflicts detected.**

- ✅ WINT-0010 is completed (dependency satisfied)
- ✅ No active platform stories overlap this scope
- ✅ Two separate databases (no table name conflicts)
- ✅ Different schema namespaces (`wint` vs. `public`)
- ✅ No protected features will be modified

---

## Story Seed

### Title
Reconcile WINT Schema with LangGraph

### Description

**Context**: The WINT platform (Wave 1, WINT-0010) created 6 schema groups in the main app database under the `wint` PostgreSQL schema namespace. Meanwhile, LangGraph operates on a separate knowledge-base PostgreSQL instance (port 5433) with its own workflow tables defined in raw SQL migrations. Both systems track stories, workflow events, and telemetry, but use different database instances, schema designs, and tooling (Drizzle ORM vs. raw SQL).

**Problem**: The current state creates several issues:
1. **Dual Maintenance Burden** - Schema changes require updates in two places with different patterns
2. **Type Fragmentation** - WINT uses Drizzle+Zod types, LangGraph uses raw SQL - no shared TypeScript types
3. **Data Silos** - Story data is split across two databases, making cross-system queries difficult
4. **Inconsistent Enums** - Story state enums differ (`in_qa` vs. `uat`, etc.)
5. **Migration Risk** - Future LangGraph integration (WINT-1090) requires schema alignment
6. **Blocked Dependencies** - WINT-1090 (Update LangGraph Repos) and WINT-1100 (Create Shared TypeScript Types) are both blocked by this story

**Proposed Solution**: Perform a comprehensive schema diff analysis between WINT and LangGraph schemas, then create a unified schema design that:
1. Identifies overlapping tables and reconciles differences
2. Determines which schema serves as the source of truth for each domain
3. Proposes a migration path to align both systems
4. Documents the unified schema with clear ownership boundaries
5. Ensures backward compatibility with existing LangGraph functionality
6. Creates a foundation for WINT-1100 to generate shared TypeScript types

**Approach**:
- Analyze both schemas table-by-table to identify overlap and divergence
- Create a unified schema specification document
- Define migration strategy (align LangGraph to WINT, merge, or maintain separation)
- Generate migration scripts for schema alignment
- Validate that existing LangGraph queries/functions remain compatible

**Non-Code Deliverable**: This is primarily an analysis and design story. The output is documentation and a migration plan, not immediate code changes.

### Initial Acceptance Criteria

- [ ] **AC-001**: Document complete schema diff analysis
  - Verify: Markdown table comparing WINT vs. LangGraph schemas table-by-table
  - Verify: Identify overlapping tables (stories, features, workflow events, etc.)
  - Verify: Document differences in column definitions, constraints, indexes
  - Verify: Identify unique tables in each schema (context cache vs. elaborations, etc.)

- [ ] **AC-002**: Reconcile story state enums
  - Verify: Document differences between `story_state` enum in both schemas
  - Verify: Propose unified enum that covers all states
  - Verify: Map existing LangGraph states to unified enum (migration path)

- [ ] **AC-003**: Define unified schema ownership model
  - Verify: For each table domain, specify which schema is the source of truth
  - Verify: Document rationale for each ownership decision
  - Verify: Specify which tables should be merged, which should remain separate

- [ ] **AC-004**: Create unified schema specification
  - Verify: Document all tables in unified schema (Drizzle ORM format)
  - Verify: Include all columns, constraints, indexes, relations
  - Verify: Preserve all functionality from both schemas
  - Verify: Use Drizzle relations API for foreign keys

- [ ] **AC-005**: Generate migration script for LangGraph schema alignment
  - Verify: Drizzle Kit migration script to align LangGraph tables with WINT schema
  - Verify: Script preserves existing data (or documents data migration requirements)
  - Verify: Script includes rollback strategy
  - Verify: Migration tested on local knowledge-base database instance

- [ ] **AC-006**: Validate backward compatibility
  - Verify: Document all existing LangGraph SQL queries and functions
  - Verify: Test that queries remain functional after schema alignment
  - Verify: Update or deprecate incompatible views/functions
  - Verify: Create migration guide for LangGraph code updates

- [ ] **AC-007**: Document unified TypeScript types foundation
  - Verify: Specify Zod schemas for all unified tables
  - Verify: Document how drizzle-zod will generate types
  - Verify: Create type export structure for WINT-1100
  - Verify: Ensure types are usable by both Claude Code and LangGraph

### Non-Goals

- **Data Migration** - This story defines the schema, but does not migrate existing LangGraph data (deferred to WINT-1110)
- **Code Updates** - Do not update LangGraph repository code (deferred to WINT-1090)
- **MCP Tool Integration** - Do not create or update MCP tools (deferred to WINT-0090+)
- **Database Consolidation** - Do not merge the two PostgreSQL instances (they may remain separate for performance/isolation)
- **Deprecating LangGraph Schema** - The LangGraph schema may continue to exist during migration phase
- **Creating Shared Types Package** - Type generation is WINT-1100 (this story creates the foundation)

### Reuse Plan

- **Components**:
  - WINT schema patterns from `wint.ts` (enums, indexes, relations)
  - LangGraph state transition functions and triggers
  - Drizzle ORM relation patterns from existing schemas

- **Patterns**:
  - `pgSchema()` for namespace isolation
  - UUID primary keys with `defaultRandom()`
  - Timestamp auto-update patterns
  - JSONB for flexible metadata
  - Composite indexes for multi-column queries

- **Packages**:
  - `drizzle-orm` v0.44.3
  - `drizzle-zod` for Zod schema generation
  - `drizzle-kit` for migration generation
  - `@repo/database-schema` for unified schema location

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- Focus on schema compatibility tests (validate existing LangGraph queries work post-migration)
- Create test suite for enum migration (story state mapping)
- Test migration script rollback scenario
- Validate Zod schema generation produces correct types
- Test that both databases can coexist during migration phase

### For UI/UX Advisor
- This is a backend/database story with no UI components
- Skip UI/UX analysis phase

### For Dev Feasibility
- **Critical Consideration**: Two separate PostgreSQL databases (main app vs. knowledge-base)
- **Migration Complexity**: LangGraph uses raw SQL, WINT uses Drizzle ORM - requires careful conversion
- **Enum Alignment**: Story state enums differ - may require data transformation
- **Backward Compatibility**: Existing LangGraph functions/views must remain functional
- **Testing Strategy**: Requires both unit tests (schema structure) and integration tests (query compatibility)
- **Estimated Effort**: High complexity (13 story points suggested) due to cross-database analysis and migration planning
- **Risk Factors**:
  - Breaking existing LangGraph functionality
  - Data loss during migration
  - Type conflicts in shared TypeScript types
  - Incomplete schema coverage (missing tables in diff analysis)

---

**Generated**: 2026-02-14
**Baseline Used**: /Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md
