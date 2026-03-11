---
generated: "2026-02-16"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-0100

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No ADR-LOG.md found (ADRs not loaded)

### Relevant Existing Features

| Feature | Status | Source |
|---------|--------|--------|
| wint.contextPacks table | ✅ Deployed | WINT-0010 |
| wint.contextSessions table | ✅ Deployed | WINT-0010 |
| Session Management MCP Tools | ✅ Completed | WINT-0110 |
| Drizzle ORM v0.44.3 | ✅ Active | Baseline |
| @repo/db package | ✅ Active | Baseline |
| Zod-first validation patterns | ✅ Active | CLAUDE.md |

### Active In-Progress Work

| Story | Status | Potential Overlap |
|-------|--------|-------------------|
| None | - | No conflicts detected |

### Constraints to Respect

| Constraint | Source | Impact |
|------------|--------|--------|
| wint.contextPacks table schema | WINT-0010 (protected) | DO NOT MODIFY - use as-is |
| Zod-first types (no TypeScript interfaces) | CLAUDE.md | MUST use z.infer<> for all types |
| No barrel files | CLAUDE.md | Import directly from source |
| @repo/logger for logging | CLAUDE.md | Never use console.log |
| Drizzle ORM patterns | Baseline | Use auto-generated Zod schemas |

---

## Retrieved Context

### Related Endpoints
- None (backend MCP tools only, no HTTP endpoints)

### Related Components

**Database Schema** (`packages/backend/database-schema/src/schema/wint.ts`):
- `contextPacks` table (lines 489-522)
  - Fields: id, packType, packKey, content (JSONB), version, expiresAt, hitCount, lastHitAt, tokenCount
  - Indexes: (packType, packKey) unique, expiresAt, lastHitAt, packType
  - Purpose: Stores cached context to reduce token usage

**MCP Tools Package** (`packages/backend/mcp-tools/`):
- Session Management tools (WINT-0110 completed)
  - Pattern: `session-management/__types__/index.ts` for Zod schemas
  - Pattern: `session-management/session-create.ts` for tool implementation
  - Pattern: `session-management/__tests__/session-create.test.ts` for tests
  - Resilient error handling: logs warnings, returns null on DB errors

### Reuse Candidates

**Strong Reuse from WINT-0110**:
1. **Zod Schema Pattern** - Input validation with UUID, JSONB, enums
2. **Database Access Pattern** - Drizzle ORM with @repo/db
3. **Error Handling Pattern** - Try/catch with @repo/logger warnings, return null on errors
4. **Test Structure** - Vitest with real PostgreSQL database
5. **Auto-generated Types** - `SelectContextPack` from drizzle-zod

**Packages to Leverage**:
- `@repo/db` - Database connection pooling and schema exports
- `@repo/logger` - Structured logging
- `drizzle-orm` - Type-safe queries
- `drizzle-zod` - Auto-generated Zod schemas
- `zod` - Input validation

---

## Knowledge Context

### Lessons Learned

**From WINT-0110 (Session Management MCP Tools - Completed)**:

- **[WINT-0110]** Resilient error handling prevents tool failures from crashing workflows (pattern: database)
  - *Applies because*: Context cache tools will also perform database operations that may fail

- **[WINT-0110]** Zod validation at entry point with fail-fast pattern catches invalid inputs early (pattern: validation)
  - *Applies because*: Context cache tools need similar input validation

- **[WINT-0110]** MCP tool pattern not yet fully established - focus on database operations as standalone functions (blocker: architecture)
  - *Applies because*: Same approach needed for context cache tools - defer MCP server integration

- **[WINT-0110]** Default safe behavior (dryRun=true) prevents accidental data loss (pattern: safety)
  - *Applies because*: Context cache invalidation/cleanup needs similar safety mechanisms

- **[WINT-0110]** Auto-generated Zod schemas from drizzle-zod reduce duplication (pattern: codegen)
  - *Applies because*: Can reuse `SelectContextPack` type from @repo/db

### Blockers to Avoid (from past stories)
- **Don't modify protected schemas** - wint.contextPacks is deployed and protected (WINT-0010)
- **Don't create TypeScript interfaces** - use Zod schemas with z.infer<> only
- **Don't implement MCP server infrastructure yet** - focus on database operations only

### Architecture Decisions (ADRs)
No ADR-LOG.md found in codebase. No ADR constraints identified.

### Patterns to Follow
- **Zod-first validation**: All inputs validated via Zod schemas before database operations
- **Resilient error handling**: Try/catch with logger warnings, return null/empty arrays on errors
- **Drizzle ORM queries**: Use type-safe queries with proper indexing
- **Auto-generated types**: Import `SelectContextPack` from @repo/db
- **Directory structure**: `__types__/index.ts`, `__tests__/*.test.ts`, tool files at root

### Patterns to Avoid
- **Console.log for logging** - use @repo/logger instead
- **Barrel files** - import directly from source files
- **TypeScript interfaces** - use Zod schemas only
- **Throwing errors from tools** - log warnings and return null/empty gracefully

---

## Conflict Analysis

No conflicts detected.

**Validation Checks**:
- ✅ No overlapping active work
- ✅ No protected area violations
- ✅ Dependency WINT-0030 tables exist (contextPacks deployed in WINT-0010)
- ✅ Similar pattern story WINT-0110 completed successfully
- ✅ No blocking dependencies

---

## Story Seed

### Title
Create Context Cache MCP Tools

### Description

**Context**:
The WINT autonomous development workflow uses the `wint.contextPacks` table (deployed in WINT-0010) to cache frequently-used context (codebase summaries, architecture decisions, lessons learned, test patterns) and reduce token consumption across agent invocations. The table stores JSONB content with versioning, TTL expiration, and hit tracking.

However, no MCP tools currently exist to:
1. Store context packs when agents generate reusable context
2. Retrieve context packs to inject into agent prompts
3. Invalidate stale context when dependencies change
4. Query cache hit rates for optimization analysis

This blocks context cache population (WINT-2030-2060), cache warming strategies (WINT-2070), and token reduction efforts (target: 80% reduction per WINT-2120).

**Problem Statement**:
Agents and orchestrator workflows cannot programmatically:
- Create or update context packs in the cache
- Retrieve cached context by type and key
- Invalidate stale cache entries when underlying data changes
- Track cache effectiveness via hit counts and last access times

**Proposed Solution**:
Create 4 MCP tools that provide type-safe, validated access to context cache operations:

1. **context_cache_get** - Retrieve cached context by pack type and key
2. **context_cache_put** - Create or update context pack with content
3. **context_cache_invalidate** - Mark context as expired or delete stale entries
4. **context_cache_stats** - Query cache hit rates and effectiveness metrics

Following the established pattern from WINT-0110 (Session Management MCP Tools):
- Zod schemas for input validation
- Drizzle ORM for type-safe database access
- Resilient error handling (log warnings, return null on errors)
- Auto-generated types from drizzle-zod
- Comprehensive test coverage with real PostgreSQL database

### Initial Acceptance Criteria

- [ ] **AC-1**: Implement `context_cache_get` tool
  - Input: `packType`, `packKey`
  - Output: Context pack object or null if not found/expired
  - Validation: Check `expiresAt` timestamp, increment `hitCount` on success
  - Test: Cache hit, cache miss, expired entry, hit count increment

- [ ] **AC-2**: Implement `context_cache_put` tool
  - Input: `packType`, `packKey`, `content` (JSONB), `ttl` (optional seconds), `version` (optional)
  - Output: Created/updated context pack object
  - Behavior: Upsert pattern - create if not exists, update if exists
  - Validation: Ensure content is valid JSONB, calculate `expiresAt` from TTL
  - Test: New pack creation, existing pack update, versioning, TTL calculation

- [ ] **AC-3**: Implement `context_cache_invalidate` tool
  - Input: `packType` (optional), `packKey` (optional), `olderThan` (optional date)
  - Output: `{ invalidatedCount: number }`
  - Behavior: Update `expiresAt` to past date or delete matching entries
  - Safety: Default to update (soft delete) unless `hardDelete: true`
  - Test: Invalidate by type, by key, by age, soft vs hard delete

- [ ] **AC-4**: Implement `context_cache_stats` tool
  - Input: `packType` (optional), `since` (optional date)
  - Output: `{ totalPacks, hitCount, avgHitsPerPack, expiredCount }`
  - Query: Aggregate statistics from contextPacks table
  - Test: Overall stats, filtered by type, filtered by date range

- [ ] **AC-5**: Create Zod validation schemas
  - `ContextCacheGetInputSchema`
  - `ContextCachePutInputSchema`
  - `ContextCacheInvalidateInputSchema`
  - `ContextCacheStatsInputSchema`
  - Test: Validate all required fields, enum values, optional fields

- [ ] **AC-6**: Write unit tests
  - Test coverage ≥80%
  - Happy path, error cases, edge cases for all 4 tools
  - Real PostgreSQL database with WINT schema
  - Integration test: put → get → invalidate workflow

- [ ] **AC-7**: Document tool usage
  - Tool signatures with TypeScript interfaces
  - Usage examples for common scenarios
  - Error handling patterns
  - Integration guide for orchestrator workflows

### Non-Goals

**Explicitly Out of Scope**:
- ❌ **MCP server infrastructure** - Deferred to separate story (focus on database operations)
- ❌ **Context pack content generation** - Deferred to WINT-2030-2060 (cache population stories)
- ❌ **Cache warming strategies** - Deferred to WINT-2070, WINT-2080
- ❌ **Token reduction measurement** - Deferred to WINT-2120
- ❌ **Real-time cache monitoring UI** - Backend-only story
- ❌ **Modification of contextPacks table schema** - Schema is protected (WINT-0010), use as-is
- ❌ **Automatic cache invalidation triggers** - Deferred to future observability stories

### Reuse Plan

**Components**:
- Session Management MCP tools (WINT-0110) - pattern template for all 4 tools
- `SelectContextPack` type from @repo/db - auto-generated Zod schema
- Error handling pattern from session-create.ts - resilient try/catch with logger

**Patterns**:
- Zod-first validation at entry point
- Drizzle ORM with upsert, aggregate queries
- Test structure with real database setup
- Directory structure: `__types__/`, `__tests__/`, tool files

**Packages**:
- @repo/db (database access)
- @repo/logger (structured logging)
- drizzle-orm (queries)
- drizzle-zod (schema generation)
- zod (validation)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- **Reuse WINT-0110 test infrastructure** - Same PostgreSQL setup, Vitest patterns
- **Focus on cache expiration logic** - Test TTL calculation, `expiresAt` validation
- **Test upsert behavior** - Ensure put creates or updates correctly
- **Test aggregate queries** - Stats calculation accuracy
- **Coverage target**: ≥80% line coverage (same as WINT-0110)

### For UI/UX Advisor
- **Not applicable** - Backend MCP tools only, no UI surface

### For Dev Feasibility
- **Verify upsert pattern in Drizzle** - Ensure `.onConflictDoUpdate()` works with composite unique index (packType, packKey)
- **Assess JSONB query performance** - May need additional indexes if content querying becomes common
- **Consider cache size limits** - No limits defined yet, may need future story for cache eviction policy
- **Validate soft delete approach** - Setting `expiresAt` to past vs actual DELETE for invalidation
- **Estimate effort**: 10-14 hours (similar to WINT-0110: 12-16 hours)
  - 4 tools vs 5 tools
  - Upsert logic slightly more complex than CRUD
  - Stats aggregation adds complexity

---

**STORY-SEED COMPLETE**
