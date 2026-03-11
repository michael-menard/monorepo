---
generated: "2026-02-15"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-0110

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No ADR-LOG.md found (ADRs unavailable), Knowledge Base infrastructure not yet available for lesson extraction

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| Context Sessions Schema | `packages/backend/database-schema/src/schema/wint.ts` (lines 524-559) | Deployed (WINT-0010) | Complete session tracking table with token metrics |
| Context Cache Tables | `packages/backend/database-schema/src/schema/wint.ts` (lines 466-587) | Deployed (WINT-0010) | Full context cache system with sessions, packs, and hits tracking |
| Drizzle ORM Patterns | `packages/backend/database-schema/` | Active | UUID PKs, relations, Zod schemas via drizzle-zod |
| WINT Database Schemas | `packages/backend/database-schema/src/schema/wint.ts` | Active | 6 schema groups including Context Cache |
| @repo/db Client | `packages/backend/db/` | Active | Connection pooling, exports db, getPool(), closePool() |

### Active In-Progress Work

| Story | Status | Impact |
|-------|--------|--------|
| WINT-0020 | ready-for-qa | Story Management Tables - May inform MCP tool patterns for story lifecycle operations |
| WINT-0040 | in-progress | Telemetry Tables - Related MCP tool pattern, may share design approach |
| WINT-1080 | UAT | Reconcile WINT Schema with LangGraph - May affect schema structure, coordinate changes |
| WINT-0180 | in-progress | Examples Framework - Related to session context, may inform context management |

### Constraints to Respect

1. **Zod-first types** - All schemas must use Zod with inferred TypeScript types (CLAUDE.md)
2. **No barrel files** - Direct imports only (CLAUDE.md)
3. **Protected schemas** - Do not modify existing WINT database schemas without migration
4. **WINT schema isolation** - All WINT tables in 'wint' PostgreSQL schema namespace
5. **Drizzle ORM patterns** - Follow WINT-0010 patterns for UUIDs, timestamps, indexes, relations
6. **No MCP infrastructure exists** - This is Wave 3, MCP tooling patterns are not yet established

---

## Retrieved Context

### Related Endpoints

No API endpoints exist yet. This is infrastructure for future MCP server integration.

### Related Components

**Existing Database Tables** (from WINT-0010):
- `wint.contextSessions` - Session tracking with session_id, agent_name, story_id, phase, token metrics
- `wint.contextPacks` - Cached context packs with pack_type, pack_key, content (JSONB), TTL
- `wint.contextCacheHits` - Join table linking sessions to packs used

**Related Schema Files**:
- `packages/backend/database-schema/src/schema/wint.ts` - Core WINT schema definitions
- `packages/backend/database-schema/src/schema/index.ts` - Schema exports
- `packages/backend/db/src/generated-schemas.ts` - Auto-generated Zod schemas

### Reuse Candidates

**Database Access Patterns**:
- `@repo/db` package - Reuse for database connection pooling
- Drizzle ORM query patterns - Reuse for type-safe queries
- Auto-generated Zod schemas - Reuse drizzle-zod pattern for validation

**Schema Patterns from WINT-0010**:
- UUID primary keys with `defaultRandom()`
- Timestamp fields with `withTimezone: true` and `defaultNow()`
- Index patterns: single-column for FKs, composite for common queries
- Foreign key relations with `onDelete: 'cascade'`
- Drizzle relations for ORM queries

**Similar Stories**:
- WINT-0100: Create Context Cache MCP Tools (similar scope: MCP tools for WINT database)
- WINT-0090: Create Story Management MCP Tools (similar scope: MCP tools for story lifecycle)
- KBAR-0010: Database Schema Migrations (reference for artifact tracking patterns)

---

## Knowledge Context

### Lessons Learned

Knowledge Base infrastructure is not yet available (KBAR stories in-progress). No lessons learned retrieved.

### Blockers to Avoid (from past stories)

No historical data available via KB. Common pitfalls from similar stories:
- **Missing session lifecycle management** - Sessions must track start, end, and active status
- **Token metric calculation issues** - Ensure token counts are computed at application level, not database
- **Session cleanup strategy undefined** - Old sessions need archival or deletion policy

### Architecture Decisions (ADRs)

ADR-LOG.md not found. No architecture constraints available.

### Patterns to Follow

**From Codebase Analysis**:
- Zod-first types with `z.infer<>` (CLAUDE.md requirement)
- Drizzle ORM relations for query sugar
- Composite indexes: high-cardinality column first (from WINT-0040 patterns)
- JSONB for flexible metadata storage

**From WINT-0030 (Context Sessions Table)**:
- Session tracking: sessionId (unique), agentName, storyId, phase
- Token metrics: inputTokens, outputTokens, cachedTokens
- Lifecycle: startedAt, endedAt timestamps
- Composite index: `(agent_name, story_id)` for session queries

### Patterns to Avoid

**From WINT-0010 Implementation**:
- Don't modify existing tables inline - use migrations
- Don't hardcode enum values - use pgEnum for extensibility
- Don't skip foreign key cascade rules - orphaned records cause issues

---

## Conflict Analysis

No blocking conflicts detected.

### Non-Blocking Considerations

**WINT-1080 Schema Reconciliation (UAT):**
- **Risk**: Schema changes may affect session management table structure
- **Mitigation**: Coordinate with WINT-1080 completion, use flexible JSONB metadata for future-proofing
- **Severity**: warning

**No MCP Infrastructure Exists:**
- **Risk**: MCP tool patterns not yet established in codebase
- **Mitigation**: Focus on schema design and database operations, defer MCP server integration patterns to implementation
- **Severity**: info

---

## Story Seed

### Title

Create Session Management MCP Tools

### Description

**Context:**

The WINT autonomous development workflow tracks agent sessions via `wint.contextSessions` table (deployed in WINT-0010). This table stores:
- Session identification (session_id, agent_name)
- Story context (story_id, phase)
- Token metrics (input_tokens, output_tokens, cached_tokens)
- Lifecycle timestamps (started_at, ended_at)

However, no MCP (Model Context Protocol) tools exist to:
1. Create new sessions when agents start work on stories
2. Track session lifecycle (start, progress updates, completion)
3. Query active sessions to prevent duplicate work
4. Calculate token usage across sessions for cost optimization
5. Archive or clean up completed sessions

**Problem:**

Agents and orchestrator workflows cannot:
- Programmatically create session records when beginning story work
- Update session progress and token metrics during execution
- Query which sessions are active to detect conflicts
- Retrieve session history for analytics and cost tracking
- Manage session cleanup to prevent database bloat

This blocks autonomous workflow capabilities like:
- Parallel work conflict detection (WINT-1160)
- Cost tracking per story (WINT-0260)
- Session-based context caching (WINT-2090, WINT-2100)

**Proposed Solution:**

Create MCP tools that provide type-safe, validated access to session management operations:

1. **session_create** - Initialize new agent session with story context
2. **session_update** - Update token metrics and progress during execution
3. **session_complete** - Mark session as ended with final metrics
4. **session_query** - Retrieve active/historical sessions with filtering
5. **session_cleanup** - Archive or delete old sessions based on retention policy

These tools will:
- Use Zod schemas for input validation
- Integrate with `@repo/db` for database access
- Follow Drizzle ORM patterns for type safety
- Provide error handling and logging
- Support both single-session and batch operations

**Success Criteria:**
- All 5 MCP tools implemented with Zod validation
- Integration with `wint.contextSessions` table via Drizzle ORM
- Unit tests achieving 80%+ coverage
- Documentation for tool usage patterns
- Example usage in orchestrator context

### Initial Acceptance Criteria

- [ ] **AC-1: Implement session_create Tool**
  - Creates new record in `wint.contextSessions` table
  - Input: agentName (required), storyId (optional), phase (optional), sessionId (optional, auto-generated if not provided)
  - Output: Created session object with generated UUID if not provided
  - Validation: Zod schema ensures required fields present
  - Error handling: Duplicate sessionId returns clear error

- [ ] **AC-2: Implement session_update Tool**
  - Updates existing session with token metrics and progress
  - Input: sessionId (required), inputTokens (optional), outputTokens (optional), cachedTokens (optional), metadata (optional)
  - Output: Updated session object
  - Validation: Session must exist (fail if not found)
  - Token counts: Incremental (add to existing) or absolute (replace) mode configurable

- [ ] **AC-3: Implement session_complete Tool**
  - Marks session as ended with final token metrics
  - Input: sessionId (required), finalTokens (optional), endedAt (optional, defaults to now)
  - Output: Completed session object
  - Validation: Session must be active (endedAt is null)
  - Side effects: Calculates session duration, validates token totals

- [ ] **AC-4: Implement session_query Tool**
  - Retrieves sessions with flexible filtering
  - Input: agentName (optional), storyId (optional), active (optional boolean), limit (optional, default 50), offset (optional)
  - Output: Array of session objects matching filters
  - Query patterns: Active sessions (endedAt IS NULL), by agent, by story, paginated results
  - Performance: Uses composite index `(agent_name, story_id)` for efficient queries

- [ ] **AC-5: Implement session_cleanup Tool**
  - Archives or deletes old completed sessions
  - Input: retentionDays (required), dryRun (optional boolean, default true)
  - Output: Count of sessions affected
  - Cleanup logic: DELETE sessions where endedAt < (now - retentionDays) AND endedAt IS NOT NULL
  - Safety: dryRun=true returns count without deletion, requires explicit confirmation

- [ ] **AC-6: Create Zod Validation Schemas**
  - Define input schemas for all 5 tools
  - Reuse auto-generated Zod schemas from `@repo/db` for session objects
  - Validation rules: sessionId is UUID, token counts are non-negative integers, timestamps are ISO-8601
  - Export schemas for reuse in other MCP tools

- [ ] **AC-7: Write Unit Tests**
  - Test coverage ≥80% for all tool functions
  - Happy path: Create → Update → Complete → Query workflow
  - Error cases: Missing session, invalid input, duplicate sessionId
  - Edge cases: Session already completed, negative token counts, pagination edge cases
  - Integration: Test with real Drizzle queries against test database

- [ ] **AC-8: Document Tool Usage**
  - Create `SESSION-MANAGEMENT-TOOLS.md` with tool signatures, examples, error handling
  - Document integration with orchestrator workflow
  - Provide example usage: Session lifecycle from agent perspective
  - Include troubleshooting guide for common errors

### Non-Goals

- **MCP server infrastructure** - Deferred to separate story (MCP server setup not in scope)
- **Real-time session monitoring UI** - Out of scope (backend-only story)
- **Session-based locking mechanism** - Deferred to WINT-1160 (parallel work conflict prevention)
- **Cost calculation logic** - Deferred to WINT-0260 (model cost tracking)
- **Session analytics dashboard** - Deferred to WINT-3xxx (telemetry stories)
- **Modification of contextSessions table** - Schema is protected (WINT-0010), use as-is

### Reuse Plan

**Components:**
- `@repo/db` package - Reuse for database connection and Drizzle ORM access
- `wint.contextSessions` table - Reuse existing schema from WINT-0010
- Auto-generated Zod schemas - Reuse from `packages/backend/db/src/generated-schemas.ts`

**Patterns:**
- Drizzle query patterns - Reuse `.insert()`, `.update()`, `.select()`, `.delete()` patterns
- Input validation - Follow WINT-0040 Zod validation patterns for tool inputs
- Error handling - Follow `@repo/logger` patterns for logging
- UUID generation - Reuse `defaultRandom()` pattern from Drizzle

**Packages:**
- `packages/backend/database-schema/` - Reference Zod schemas
- `packages/backend/db/` - Use for database access
- `@repo/logger` - Use for logging
- `zod` - Use for input validation

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Context:**
- This is an infrastructure story with database operations
- Real database needed for integration tests (not mocks)
- Session lifecycle testing critical: create → update → complete flow
- Error handling important: missing sessions, invalid inputs

**Testing Requirements:**
- Unit tests for tool functions (80%+ coverage)
- Integration tests with real Drizzle queries
- Error case coverage: duplicate sessionId, missing session, invalid tokens
- Edge cases: pagination, session already completed, concurrent updates

**Test Data:**
- Need multiple test sessions with different agents, stories, phases
- Need completed vs active sessions for query filtering tests
- Need old sessions (>30 days) for cleanup testing

### For UI/UX Advisor

Not applicable. This is a backend-only infrastructure story with no user-facing UI.

### For Dev Feasibility

**Implementation Context:**
- No MCP server infrastructure exists yet - focus on database operations
- Schema already exists (WINT-0010), no migrations needed
- Tools are CRUD operations on existing table
- Drizzle ORM provides type safety

**Technical Risks:**
- MCP tool pattern not established - may need design iteration
- Concurrent session updates - need optimistic locking or last-write-wins strategy
- Token metric calculation - clarify incremental vs absolute update semantics
- Session cleanup safety - ensure dryRun mode prevents accidental data loss

**Change Surface:**
- New package or directory for MCP tools (location TBD)
- Integration with `@repo/db` package
- No changes to existing schemas (protected)
- No API endpoints (backend-only)

**Dependencies:**
- WINT-0010 (completed) - contextSessions table exists
- @repo/db package (active) - database client available
- Drizzle ORM v0.44.3 (active) - ORM patterns established
- No blocking dependencies

---

**Generated**: 2026-02-15
**Baseline Used**: /Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md
**Conflicts**: None detected
**Mode**: Autonomous generation with codebase analysis
