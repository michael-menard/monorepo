---
generated: "2026-02-13"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-0010

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No lesson-learned KB entries found (this is a new epic)

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| Drizzle ORM v0.44.3 | `packages/backend/database-schema/` | Active | Core database framework to use |
| PostgreSQL Aurora | Production database | Active | Target database platform |
| `@repo/db` client | `packages/backend/db/` | Active | Database connection package |
| Zod schema generation | `drizzle-zod` | Active | Auto-generate Zod schemas from Drizzle |
| Umami schema (pgSchema) | `packages/backend/database-schema/src/schema/umami.ts` | Active | Example of pgSchema namespace usage |
| Orchestrator artifact schemas | `packages/backend/orchestrator/src/artifacts/` | Active | Existing YAML artifact validation patterns |

### Active In-Progress Work

| Story ID | Title | Status | Overlap Risk |
|----------|-------|--------|--------------|
| None | N/A | N/A | No active platform stories |

### Constraints to Respect

1. **Zod-first types** - All database schemas must use Drizzle ORM with Zod inference (no TypeScript interfaces)
2. **Protected schemas** - Do NOT modify production schemas in `packages/backend/database-schema/src/schema/index.ts` (Gallery, MOCs, Sets, Wishlist, etc.)
3. **Schema isolation** - Use `pgSchema()` for WINT schemas to avoid namespace conflicts with production tables
4. **Drizzle ORM version** - Must use Drizzle ORM v0.44.3 (current version)
5. **Connection pooling** - Must respect `@repo/db` client pattern (max 1 connection per Lambda)

---

## Retrieved Context

### Related Endpoints
No existing endpoints related to WINT infrastructure (this is foundational work).

### Related Components
No UI components involved - this is a pure database/infrastructure story.

### Reuse Candidates

| Component | Location | Purpose |
|-----------|----------|---------|
| Drizzle schema pattern | `packages/backend/database-schema/src/schema/` | Follow existing schema organization |
| `pgSchema()` pattern | `umami.ts` | Use for namespace isolation |
| Migration scripts | `packages/backend/database-schema/scripts/` | Database migration tooling |
| Schema validation | `packages/backend/database-schema/scripts/validate-schema-changes.ts` | Validate schema changes |
| Impact analysis | `packages/backend/database-schema/scripts/impact-analysis/` | AST-based impact analysis |
| `@repo/db` exports | `packages/backend/db/src/` | Connection pooling and client setup |

---

## Knowledge Context

### Lessons Learned
No lessons loaded - this is the first story in the WINT epic.

### Blockers to Avoid (from past stories)
None identified - foundational database schema story.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-002 | Infrastructure-as-Code Strategy | Use standalone CloudFormation templates; avoid framework lock-in |
| ADR-005 | Testing Strategy | Unit tests required for all database schemas |

### Patterns to Follow
1. **Drizzle ORM schema pattern**: Define tables with `pgTable()`, add indexes, relations, and constraints
2. **Zod-first types**: Use `z.infer<>` for type inference from Drizzle schemas
3. **Schema namespace isolation**: Use `pgSchema('wint')` to isolate WINT tables from production schemas
4. **Index strategy**: Add performance indexes for common query patterns
5. **Timestamps**: Include `created_at` and `updated_at` for all tables
6. **UUID primary keys**: Use `uuid('id').primaryKey().defaultRandom()` pattern
7. **Relations**: Define Drizzle relations for lazy loading support

### Patterns to Avoid
1. **No barrel files** - Import directly from source files
2. **No TypeScript interfaces** - All types must come from Zod schemas
3. **No namespace pollution** - Don't add WINT tables to public schema alongside production tables
4. **No manual migrations** - Use Drizzle Kit for all migrations

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Create Core Database Schemas (6 schemas)

### Description

**Context**: The WINT (Workflow Intelligence) epic requires a comprehensive database foundation to track story management, context caching, telemetry, ML pipelines, graph relationships, and workflow execution. This foundational story creates 6 core PostgreSQL schemas that will support the entire WINT infrastructure.

**Problem**: Currently, there is no database infrastructure to support workflow intelligence features. The orchestrator uses file-based YAML artifacts, which lack queryability, scalability, and real-time analytics capabilities. To build autonomous development features, we need persistent, queryable storage for:
- Story metadata and lifecycle tracking
- Context cache for reducing token usage
- Telemetry and observability data
- ML pipeline data for model selection and quality prediction
- Graph relationships between features/capabilities
- Workflow execution state and tracking

**Solution**: Create 6 isolated database schemas using Drizzle ORM and PostgreSQL, leveraging `pgSchema()` for namespace isolation. Each schema will be self-contained with appropriate indexes, relations, and constraints. The schemas will follow established patterns from existing production schemas (Gallery, MOCs, Wishlist) but remain isolated to avoid conflicts.

The 6 schemas are:
1. **Story Management Schema** - Story metadata, lifecycle states, dependencies
2. **Context Cache Schema** - Cached context packs to reduce token usage
3. **Telemetry Schema** - Agent invocations, decisions, outcomes, events
4. **ML Pipeline Schema** - Training data, model metadata, predictions
5. **Graph Relational Schema** - Feature capabilities, relationships, cohesion rules
6. **Workflow Tracking Schema** - Execution state, checkpoints, transitions

### Initial Acceptance Criteria

- [ ] **AC-001**: Create `wint` pgSchema namespace to isolate WINT tables from production schemas
- [ ] **AC-002**: Define Story Management Schema with tables for stories, states, transitions, dependencies
- [ ] **AC-003**: Define Context Cache Schema with tables for cached context packs and session management
- [ ] **AC-004**: Define Telemetry Schema with tables for invocations, decisions, outcomes, state transitions
- [ ] **AC-005**: Define ML Pipeline Schema with tables for training data, models, predictions
- [ ] **AC-006**: Define Graph Relational Schema with tables for features, capabilities, relationships, cohesion rules
- [ ] **AC-007**: Define Workflow Tracking Schema with tables for executions, checkpoints, audit trails
- [ ] **AC-008**: Add appropriate indexes for common query patterns (by story_id, by state, by timestamp, etc.)
- [ ] **AC-009**: Define Drizzle relations for lazy loading between related tables
- [ ] **AC-010**: Auto-generate Zod schemas using `drizzle-zod` for runtime validation
- [ ] **AC-011**: Write unit tests validating schema structure and constraints
- [ ] **AC-012**: Generate initial migration files using Drizzle Kit
- [ ] **AC-013**: Document schema design decisions and relationships in schema comments

### Non-Goals

- Migration of existing orchestrator YAML artifacts to database (deferred to future stories)
- Implementation of MCP tools for database access (blocked by WINT-0090 through WINT-0140)
- Database seeding with initial workflow data (blocked by WINT-0080)
- LangGraph integration (blocked by WINT-1080)
- UI components for schema visualization (out of scope - backend only)
- API endpoints for schema access (deferred to future stories)
- Data migration from file-based artifacts (deferred to WINT-0080+)

### Reuse Plan

- **Packages**:
  - `@repo/database-schema` - Add WINT schemas here
  - `@repo/db` - Reuse existing connection pooling
  - `drizzle-orm` - Use v0.44.3 ORM framework
  - `drizzle-zod` - Auto-generate Zod schemas
  - `zod` - Runtime validation

- **Patterns**:
  - Follow `umami.ts` pattern for `pgSchema()` usage
  - Follow `index.ts` pattern for table definitions (uuid PKs, timestamps, indexes)
  - Follow `sets.ts` pattern for relations
  - Follow existing migration patterns from Drizzle Kit

- **Components**:
  - Schema validation scripts from `scripts/validate-schema-changes.ts`
  - Impact analysis tooling from `scripts/impact-analysis/`
  - Test patterns from `__tests__/wishlist-schema.test.ts`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Testing Strategy**:
- **Unit tests required** for all 6 schemas (as per ADR-005)
- Test schema structure validation (all required fields present)
- Test index definitions (indexes created correctly)
- Test constraint enforcement (unique constraints, foreign keys)
- Test Zod schema generation (types inferred correctly from Drizzle schemas)
- Test relation definitions (lazy loading works as expected)

**Coverage Areas**:
- Schema structure validation
- Constraint enforcement (unique, foreign key, check constraints)
- Index creation verification
- Zod schema inference accuracy
- Relation navigation

**Tools**:
- Vitest for unit tests
- Drizzle Studio for manual schema inspection
- PostgreSQL introspection for validation

### For UI/UX Advisor

**Not Applicable** - This is a pure database/infrastructure story with no UI components.

### For Dev Feasibility

**Implementation Approach**:
1. Create new schema file `packages/backend/database-schema/src/schema/wint.ts`
2. Define `wintSchema = pgSchema('wint')` namespace
3. Implement 6 schema groups with tables, indexes, and relations
4. Export all tables and relations from `wint.ts`
5. Update `index.ts` to re-export WINT schemas
6. Generate Zod schemas using `drizzle-zod`
7. Write unit tests for schema validation
8. Generate migrations using `drizzle-kit generate`
9. Document schema design in inline comments

**Technical Considerations**:
- Schema isolation via `pgSchema()` prevents table name conflicts
- UUID primary keys for distributed system compatibility
- Timestamps on all tables for audit trail
- Indexes optimized for common query patterns (by story_id, by state, by timestamp)
- Relations defined for lazy loading support
- Zod schemas auto-generated for runtime validation

**Dependencies**:
- None - this is a Wave 1 story with no dependencies

**Risks**:
- **Schema complexity**: 6 schemas is a large surface area - suggest phased implementation
- **Migration size**: Initial migration may be large - consider splitting into multiple migrations
- **Index overhead**: Too many indexes can slow writes - balance read/write performance

**Estimated Complexity**: Medium-High (13 story points suggested due to 6 schema groups)
