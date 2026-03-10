---
generated: "2026-02-15"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-0090

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: ADR-LOG.md not found (no architecture decision constraints to reference)

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| WINT Core Database Schemas | packages/backend/database-schema/src/schema/wint.ts | Completed (WINT-0010) | Foundation for story management tables |
| Story Management Tables | wint schema (stories, storyStates, storyTransitions, etc.) | Ready for QA (WINT-0020) | Tables that MCP tools will query |
| Session Management MCP Tools | packages/backend/mcp-tools/src/session-management/ | Completed (WINT-0110) | Reference implementation for MCP tool patterns |
| Drizzle ORM | packages/backend/database-schema/, packages/backend/db/ | Active (v0.44.3) | Type-safe database access layer |
| @repo/db client | packages/backend/db/src/index.ts | Active | Database connection pooling |

### Active In-Progress Work

| Story | Status | Overlap Risk | Notes |
|-------|--------|--------------|-------|
| None | N/A | None | No active platform stories with direct conflicts |

### Constraints to Respect

1. **Database Layer Constraints**:
   - Must use Drizzle ORM v0.44.3 for all database queries
   - Must use @repo/db client with connection pooling (max 1 per Lambda)
   - All tables are in wint PostgreSQL schema namespace
   - WINT-0010 tables are protected (read-only access via MCP tools)

2. **Code Conventions**:
   - Zod-first types (REQUIRED) - no TypeScript interfaces
   - Functional components only, named exports
   - No barrel files - import directly from source
   - @repo/logger for logging, never console.log
   - Prettier: no semicolons, single quotes, trailing commas, 100 char width

3. **MCP Tool Patterns** (from WINT-0110):
   - Zod schema validation for all inputs
   - JSDoc documentation for all exported functions
   - Error handling with graceful degradation
   - Type-safe database queries with Drizzle ORM
   - Comprehensive test coverage (≥80%)

---

## Retrieved Context

### Related Endpoints
None - this is a backend-only MCP tools story with no API endpoints.

### Related Components

| Component | Location | Purpose | Reuse Opportunity |
|-----------|----------|---------|-------------------|
| sessionCreate | packages/backend/mcp-tools/src/session-management/session-create.ts | MCP tool with Zod validation | Pattern for story_get_status implementation |
| sessionQuery | packages/backend/mcp-tools/src/session-management/session-query.ts | MCP tool with filtering/pagination | Pattern for story_get_by_status, story_get_by_feature |
| sessionUpdate | packages/backend/mcp-tools/src/session-management/session-update.ts | MCP tool with update logic | Pattern for story_update_status implementation |
| SessionInputSchemas | packages/backend/mcp-tools/src/session-management/__types__/index.ts | Zod schemas with validation rules | Pattern for story MCP tool schemas |
| wint.stories table | packages/backend/database-schema/src/schema/wint.ts | Story data model | Table to query/update |
| wint.storyStates table | packages/backend/database-schema/src/schema/wint.ts | Story state history | Table for state transitions |

### Reuse Candidates

1. **MCP Tool Structure** (from WINT-0110):
   - Input validation with Zod schemas in __types__/index.ts
   - Function implementations in individual files (story-get-status.ts, etc.)
   - Comprehensive test suites in __tests__/ (120 tests, 100% passing)
   - JSDoc documentation pattern
   - Error handling with @repo/logger

2. **Database Patterns**:
   - Drizzle ORM query builders (type-safe, no raw SQL)
   - Connection pooling via @repo/db
   - Prepared statements for SQL injection prevention

3. **Testing Patterns** (from WINT-0110):
   - Unit tests for schema validation
   - Integration tests for database operations
   - Mock strategy with vi.hoisted() pattern
   - Edge case coverage (validation errors, concurrent updates, cleanup safety)

---

## Knowledge Context

### Lessons Learned

**[WINT-0110]** Zod schema validation prevents runtime errors
- *Applies because*: Story MCP tools need robust input validation for storyId, status, feature filters
- *Pattern*: Use Zod with .default() instead of .optional().default() for type inference

**[WINT-0110]** dryRun safety mechanisms prevent accidental data loss
- *Applies because*: story_update_status changes critical workflow state, needs safety guardrails
- *Pattern*: Consider default dryRun=true for destructive operations, require explicit override

**[WINT-0110]** Incremental vs absolute update modes handle concurrent access
- *Applies because*: Multiple agents may query/update story status concurrently
- *Pattern*: Use database-level operations for race condition safety

**[WINT-0110]** Comprehensive test coverage (120 tests, 100% passing) catches edge cases
- *Applies because*: Story status is critical workflow state, failures break entire autonomous dev system
- *Pattern*: Test all validation rules, error paths, concurrent scenarios, boundary conditions

**[WINT-0010]** Protected schemas require read-only access patterns
- *Applies because*: WINT-0020 tables are protected, MCP tools must not modify schema
- *Pattern*: Query-only access, FK constraints enforce referential integrity

### Blockers to Avoid (from past stories)

- **Missing Zod validation** → Runtime errors from invalid inputs (WINT-0110 addressed this)
- **Raw SQL injection risks** → Use parameterized queries, Drizzle ORM builders (WINT-0110 pattern)
- **Incomplete test coverage** → Edge cases discovered in production (WINT-0110 achieved ≥80%)
- **Concurrent update race conditions** → Use database-level atomic operations (WINT-0110 pattern)

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| N/A | ADR-LOG.md not found | No active ADR constraints for this story |

### Patterns to Follow

1. **Zod-First Types** (CLAUDE.md requirement):
   - Define Zod schemas in __types__/index.ts
   - Infer TypeScript types with z.infer<typeof Schema>
   - Never use TypeScript interfaces

2. **MCP Tool Structure** (WINT-0110 pattern):
   - One file per tool function (story-get-status.ts, story-update-status.ts, etc.)
   - Zod input schemas with validation
   - JSDoc documentation
   - Error handling with @repo/logger
   - Comprehensive unit and integration tests

3. **Database Access** (WINT-0010/0020 pattern):
   - Use Drizzle ORM type-safe builders
   - Query wint.stories and wint.storyStates tables
   - Respect FK constraints (cascade delete, referential integrity)
   - Connection pooling via @repo/db.getPool()

4. **Testing** (WINT-0110 pattern):
   - Schema validation tests (Zod edge cases)
   - Function unit tests (happy path + error cases)
   - Integration tests (database round-trips)
   - ≥80% coverage requirement

### Patterns to Avoid

- **console.log** → Use @repo/logger (CLAUDE.md requirement)
- **TypeScript interfaces** → Use Zod schemas (CLAUDE.md requirement)
- **Barrel files** → Direct imports from source files (CLAUDE.md requirement)
- **Mutable query chains with type assertions** → Use ternary operators (WINT-0110 fix)
- **Record<string, any>** → Use proper Drizzle types like Partial<InsertStories> (WINT-0110 fix)

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Create Story Management MCP Tools

### Description

**Context**:
WINT-0020 created the Story Management tables (stories, storyStates, storyTransitions, storyDependencies, storyArtifacts, etc.) in the wint PostgreSQL schema. WINT-0110 established the MCP tool pattern with session management tools (sessionCreate, sessionUpdate, sessionQuery, sessionCleanup, sessionComplete) achieving 100% test pass rate with comprehensive Zod validation.

**Problem**:
Agents currently have no programmatic way to query or update story status in the wint database. Story lifecycle operations (checking status, updating state, querying by feature/status) require direct database access, which violates the MCP abstraction layer and creates tight coupling to database implementation details.

**Solution**:
Extend the postgres-knowledgebase MCP server with 4 new tools:

1. **story_get_status(storyId)** - Returns current status and metadata for a single story
2. **story_update_status(storyId, newStatus, metadata?)** - Updates story state with transition tracking
3. **story_get_by_status(status, limit?, offset?)** - Queries stories filtered by current status
4. **story_get_by_feature(feature, limit?, offset?)** - Queries stories filtered by epic/feature

These tools will follow the WINT-0110 pattern: Zod validation, type-safe Drizzle queries, comprehensive tests, JSDoc documentation, and graceful error handling. They will provide a stable interface for story management that abstracts database implementation details and enables autonomous workflow automation.

### Initial Acceptance Criteria

- [ ] **AC-1**: story_get_status tool with Zod validation
  - Input: StoryGetStatusInputSchema with storyId (UUID or story ID format like "WINT-0090")
  - Output: Story data with current state, metadata, timestamps
  - Handles both UUID and human-readable story ID formats
  - Returns null if story not found (graceful degradation)
  - JSDoc documentation with examples

- [ ] **AC-2**: story_update_status tool with state transition tracking
  - Input: StoryUpdateStatusInputSchema with storyId, newStatus, optional metadata
  - Updates stories.state field
  - Creates storyStates record for transition tracking
  - Validates state transitions (e.g., cannot go from 'done' to 'backlog' without explicit flag)
  - Returns updated story data
  - JSDoc documentation

- [ ] **AC-3**: story_get_by_status tool with pagination
  - Input: StoryGetByStatusInputSchema with status enum, limit (default 50, max 1000), offset (default 0)
  - Queries stories filtered by current state
  - Supports pagination with limit/offset
  - Orders by priority DESC, createdAt ASC
  - Returns array of story data
  - JSDoc documentation

- [ ] **AC-4**: story_get_by_feature tool with epic/feature filtering
  - Input: StoryGetByFeatureInputSchema with feature (string), limit, offset
  - Queries stories filtered by epic field
  - Supports pagination
  - Orders by priority DESC, wave ASC, createdAt ASC
  - Returns array of story data
  - JSDoc documentation

- [ ] **AC-5**: Zod schemas with runtime validation
  - Define input schemas in __types__/index.ts
  - Validate storyId format (UUID or WINT-XXXX pattern)
  - Validate status enum values against storyStateEnum
  - Validate pagination limits (1-1000)
  - All inputs validated before execution

- [ ] **AC-6**: Unit and integration tests with ≥80% coverage
  - Schema validation tests (valid/invalid inputs)
  - Function unit tests (query logic, error handling)
  - Integration tests (database round-trips with test data)
  - Edge cases: missing stories, invalid status transitions, pagination boundaries
  - All tests passing with Vitest

- [ ] **AC-7**: JSDoc documentation for all exported functions
  - Description of purpose
  - Parameter types and descriptions
  - Return type and structure
  - Usage examples with code snippets
  - Error handling notes

- [ ] **AC-8**: Error handling with graceful degradation
  - Try-catch blocks around all database operations
  - Log errors with @repo/logger.warn()
  - Return safe defaults (null for get, false for update, empty array for queries)
  - Never throw exceptions to MCP caller

- [ ] **AC-9**: Type-safe database queries with Drizzle ORM
  - All queries use Drizzle builders (eq, and, or, inArray, etc.)
  - No raw SQL strings
  - Use @repo/db.getPool() for connection management
  - Proper transaction handling for state updates

- [ ] **AC-10**: Import @repo/logger for all logging (no console.log)
  - All functions use logger.warn() for errors
  - No console.log, console.error, or console.warn usage
  - Structured logging with context (storyId, operation, error details)

### Non-Goals

- **MCP server registration/deployment** - Assumes postgres-knowledgebase server already exists and is running (prerequisite)
- **Story creation tools** - Only read and update existing stories, not create new ones (deferred to future story)
- **Complex workflow validation** - Basic state transition validation only, not full workflow FSM (deferred)
- **Story deletion or archival** - Only status updates, not deletion (deferred)
- **Story dependency management** - No tools for managing storyDependencies table (deferred to WINT-1030+)
- **Story artifact synchronization** - No filesystem sync, only database access (deferred to KBAR-0030+)
- **LangGraph integration** - MCP tools only, not LangGraph node adapters (deferred to WINT-9XXX)
- **Real-time change notifications** - No pub/sub or websocket updates (deferred)
- **Batch story operations** - Single-story operations only, no bulk updates (deferred)

### Reuse Plan

**Components**:
- Session management MCP tool structure (WINT-0110) - Same directory layout, file naming, test structure
- Zod schema validation pattern (WINT-0110) - Input validation with .default() approach
- Error handling pattern (WINT-0110) - Try-catch with @repo/logger, safe defaults
- Test suite pattern (WINT-0110) - Schema tests, unit tests, integration tests, 100% pass rate

**Patterns**:
- Drizzle ORM query builders (WINT-0010, WINT-0020) - Type-safe database access
- Pagination with limit/offset (WINT-0110 sessionQuery) - Standard query pattern
- JSDoc documentation (WINT-0110) - Consistent format with examples

**Packages**:
- @repo/db - Database connection pooling
- @repo/logger - Structured logging
- drizzle-orm - Type-safe ORM
- zod - Schema validation
- vitest - Testing framework

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Testing Scope**:
- Focus on story status transitions (valid and invalid state changes)
- Test pagination edge cases (limit=0, offset > total, limit > max)
- Test both UUID and human-readable story ID formats (WINT-0090 vs uuid)
- Test concurrent updates (two agents updating same story status)
- Test missing story scenarios (graceful null/empty returns)

**Test Data Requirements**:
- Seed test database with stories in various states (backlog, in_progress, done, etc.)
- Include stories with different epics/features for filtering tests
- Include edge cases: stories with no state history, stories with multiple transitions

**Coverage Targets**:
- Minimum 80% coverage (infrastructure story standard)
- 100% pass rate required for merge
- All Zod validation rules exercised (invalid UUIDs, out-of-range limits, etc.)

### For UI/UX Advisor

Not applicable - this is a backend-only MCP tools story with no UI surface.

### For Dev Feasibility

**Implementation Approach**:
1. Create __types__/index.ts with Zod input schemas (follow WINT-0110 pattern)
2. Implement story-get-status.ts (simple SELECT query)
3. Implement story-update-status.ts (UPDATE + INSERT for state transition)
4. Implement story-get-by-status.ts (SELECT with WHERE + pagination)
5. Implement story-get-by-feature.ts (SELECT with epic filter + pagination)
6. Write comprehensive test suite (schema, unit, integration)
7. Add JSDoc documentation to all exports
8. Register tools with postgres-knowledgebase MCP server (if not auto-discovered)

**Technical Risks**:
- **State transition validation complexity** - Keep simple for MVP (allow all transitions with flag), defer FSM logic to future story
- **Story ID format handling** - Need to support both UUID (database PK) and human-readable ID (WINT-0090)
- **Concurrent update safety** - Use database transactions for update + state insert atomicity
- **Pagination performance** - Add indexes on state and epic columns if not present (check WINT-0020 migration)

**Estimated Complexity**: Low-Medium
- Similar to WINT-0110 (5 functions, Zod schemas, tests)
- Slightly simpler than session management (fewer concurrent access concerns)
- Well-defined scope with clear reuse patterns

**Dependencies**:
- WINT-0020 must be in production (story management tables exist)
- postgres-knowledgebase MCP server must be running
- @repo/db connection pooling must be configured
