---
generated: "2026-02-14"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-0100

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No ADR-LOG.md found in codebase, no prior lessons learned available in KB (KB infrastructure exists but not populated with WINT lessons)

### Relevant Existing Features

| Feature | Location | Status |
|---------|----------|--------|
| Context Cache Tables | `packages/backend/database-schema/src/schema/wint.ts` lines 467-587 | Deployed (WINT-0030/WINT-0010) |
| Knowledge Base MCP Server | `apps/api/knowledge-base/src/mcp-server/` | Deployed |
| MCP Tool Patterns | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Active |
| Zod Tool Schemas | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | Active |
| @repo/db Client | `packages/backend/db/` | Active |
| Drizzle ORM v0.44.3 | All backend packages | Active |
| Auto-generated Zod schemas | `packages/backend/db/src/generated-schemas.ts` | Active |

### Active In-Progress Work

| Story | Title | Status | Overlap Risk |
|-------|-------|--------|--------------|
| None | - | - | No conflicts |

**Note:** Platform epic stories index was recently bootstrapped. No active work overlaps with context cache MCP tool development.

### Constraints to Respect

**Database Schema (Protected - WINT-0030):**
- `contextPacks` table: stores cached context with pack type, key, content (JSONB), version, TTL, hit tracking
- `contextSessions` table: tracks agent sessions with token metrics (input, output, cached tokens saved)
- `contextCacheHits` table: join table tracking which packs were used by which sessions
- `contextPackTypeEnum`: 7 pack types (codebase, story, feature, epic, architecture, lessons_learned, test_patterns)
- All tables use UUID primary keys with defaultRandom()
- Indexes on pack_type+pack_key, session_id, agent_name, story_id, expires_at
- Schema location: `packages/backend/database-schema/src/schema/wint.ts` lines 467-587
- Migration: `0015_messy_sugar_man.sql`

**Code Conventions (CLAUDE.md):**
- Zod-first types required (no TypeScript interfaces)
- Use `@repo/logger` for logging (never `console.log`)
- Functional components, named exports only
- No barrel files (import directly from source)
- Component directory structure: `index.tsx`, `__tests__/`, `__types__/`, `utils/`

**MCP Server Patterns (from KB MCP Server):**
- MCP SDK: `@modelcontextprotocol/sdk@1.26.0`
- Tool schemas via `zodToJsonSchema` for MCP compatibility
- Tool handlers are thin wrappers around CRUD operations
- Dependency injection via factory pattern
- Correlation IDs for request tracing
- Error sanitization for security
- Performance measurement and slow query logging

**@repo/db Client Patterns:**
- Connection pooling (max 1 per Lambda)
- Exports: `db`, `getPool()`, `closePool()`, `testConnection()`
- Auto-generated Zod schemas via drizzle-zod
- Schema exports from `packages/backend/db/src/schema.ts`

---

## Retrieved Context

### Related Endpoints

**Existing MCP Server (Knowledge Base):**
- Server implementation: `apps/api/knowledge-base/src/mcp-server/server.ts`
- Tool schemas: `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts`
- Tool handlers: `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts`
- 20+ tools implemented: kb_add, kb_get, kb_search, kb_health, etc.

**WINT Schema Access:**
- Schema definitions: `packages/backend/database-schema/src/schema/wint.ts`
- Generated Zod schemas: `packages/backend/db/src/generated-schemas.ts`
- Database client: `packages/backend/db/src/client.ts`

### Related Components

**KB MCP Server Architecture:**
- Tool registration via `server.setRequestHandler(ListToolsRequestSchema, ...)`
- Tool execution via `server.setRequestHandler(CallToolRequestSchema, ...)`
- Schema conversion via `zodToJsonSchema(inputSchema)` for MCP compatibility
- Handler pattern: validate → execute → log → return result
- Error handling: `MCPError` types for protocol compliance
- Timeout configuration: `KB_SEARCH_TIMEOUT_MS`, `KB_CRUD_TIMEOUT_MS`
- Correlation IDs: `generateCorrelationId()` for request tracing
- Audit logging: `AuditLogger` for all write operations

**Context Cache Table Structure (from wint.ts):**
- `contextPacks`:
  - Fields: id, packType, packKey, content (JSONB), version, expiresAt, hitCount, lastHitAt, tokenCount, createdAt, updatedAt
  - Unique index on (packType, packKey)
  - Content JSONB shape: `{ summary?, files?, lessons?, architecture? }`
- `contextSessions`:
  - Fields: id, sessionId, agentName, storyId, phase, inputTokens, outputTokens, cachedTokens, startedAt, endedAt, createdAt, updatedAt
  - Unique index on sessionId
  - Composite index on (agentName, storyId)
- `contextCacheHits`:
  - Fields: id, sessionId, packId, tokensSaved, createdAt
  - Foreign keys to contextSessions.id and contextPacks.id (cascade delete)

### Reuse Candidates

**Patterns from KB MCP Server:**
1. **Tool Schema Pattern**
   - Define Zod input schema
   - Convert to JSON Schema via `zodToJsonSchema()`
   - Register tool with `server.setRequestHandler(ListToolsRequestSchema, ...)`
   - Return tool list with name, description, inputSchema

2. **Tool Handler Pattern**
   - Validate input with Zod schema
   - Generate correlation ID
   - Execute CRUD operation
   - Log performance metrics
   - Sanitize errors before returning
   - Return MCP-compliant result

3. **Dependency Injection Pattern**
   - Factory function: `createServer(deps: { db, config })`
   - Optional dependencies with graceful degradation
   - Zod schema for config validation

4. **Error Handling Pattern**
   - Try-catch around all operations
   - `MCPError` for protocol compliance
   - Error sanitization (strip sensitive data)
   - Logging via `@repo/logger`

5. **Performance Measurement**
   - Track operation start time
   - Log slow queries (>1000ms default)
   - Include correlation ID in all logs

**Packages Available:**
- `@modelcontextprotocol/sdk@1.26.0` - MCP server SDK
- `zod` - Schema validation
- `zod-to-json-schema` - Zod → JSON Schema conversion
- `@repo/logger` - Logging
- `@repo/db` - Database client with WINT schema access
- `drizzle-orm` - ORM for database operations

---

## Knowledge Context

### Lessons Learned

**Note:** No lessons loaded from Knowledge Base (WINT epic hasn't written KB entries yet). Using patterns from KB MCP Server codebase analysis.

### Blockers to Avoid (from codebase patterns)

- **Missing MCP SDK types** - KB server imports from `@modelcontextprotocol/sdk/types.js` for protocol schemas
- **Hardcoding database connections** - Always use dependency injection
- **Skipping correlation IDs** - All operations need tracing
- **Not sanitizing errors** - MCP errors returned to clients must not leak sensitive data
- **Forgetting timeout configuration** - Tools can hang without timeouts
- **Missing slow query logging** - Performance issues hard to debug without metrics
- **Circular tool call detection** - Tools calling tools need depth tracking
- **Invalid JSON Schema conversion** - Not all Zod schemas convert cleanly, test thoroughly

### Architecture Decisions (ADRs)

No ADR-LOG.md file found in codebase. No architectural constraints specific to this story beyond general code conventions.

**Implicit Architecture Decisions (from existing MCP server):**
- **MCP Protocol Compliance**: Use `@modelcontextprotocol/sdk` for all MCP operations (not custom implementations)
- **Stdio Transport**: MCP servers use stdio for Claude Code integration (not HTTP)
- **Zod-First Validation**: All tool inputs validated via Zod before execution
- **Correlation IDs**: Required for distributed tracing and debugging
- **Error Sanitization**: Security requirement to prevent data leakage

### Patterns to Follow

- **Tool Schema Pattern**: Zod input schema → JSON Schema via `zodToJsonSchema()` → MCP tool registration
- **Handler Pattern**: Validate → Execute → Log → Return (thin wrappers around CRUD)
- **Factory Pattern**: `createContextCacheMcpServer(deps)` for dependency injection
- **Correlation IDs**: Generate UUID v4 for each request, include in all logs
- **Performance Metrics**: Track start time, log slow operations, include in result metadata
- **Error Sanitization**: Catch errors, log full details, return sanitized message to client
- **Graceful Degradation**: When DB unavailable, return clear error (don't crash)

### Patterns to Avoid

- **Direct database access in tool handlers** - Always inject db via factory
- **Synchronous operations without timeouts** - All DB operations need timeout protection
- **Global state in MCP server** - Use dependency injection for testability
- **Skipping Zod validation** - MCP protocol expects validated inputs
- **Hardcoded configuration** - Use environment variables with Zod validation
- **Missing audit logging for writes** - Context cache writes need tracking
- **Returning raw database errors** - Sanitize before sending to MCP client

---

## Conflict Analysis

**No conflicts detected.**

---

## Story Seed

### Title
Create Context Cache MCP Tools

### Description

**Context:**

WINT-0030 (completed as part of WINT-0010) established the database schema for context cache management with three tables: `contextPacks`, `contextSessions`, and `contextCacheHits`. These tables enable token optimization across agent invocations by caching frequently-used context (codebase structure, story metadata, architecture decisions, lessons learned, etc.).

The workflow intelligence system now needs MCP (Model Context Protocol) tools to interact with this context cache from Claude Code agents. These tools will enable agents to:
1. Read and write context packs during workflow execution
2. Track session-level token usage and cache hits
3. Query cache effectiveness metrics
4. Manage cache lifecycle (expiration, invalidation)

**Current State:**

- Context cache database schema deployed in WINT schema namespace
- Knowledge Base MCP server exists as reference implementation (`apps/api/knowledge-base/src/mcp-server/`)
- MCP SDK patterns established (stdio transport, Zod validation, correlation IDs, error sanitization)
- @repo/db client provides access to WINT schema with auto-generated Zod schemas
- No MCP tools yet exist for context cache operations

**Problem:**

Without context cache MCP tools:
- Agents cannot read/write context packs during workflow execution
- No way to track which context was used by which agent session
- Token savings from caching are invisible to agents
- Cache expiration must be managed manually
- Dependent stories (WINT-2030, 2040, 2050, 2060) blocked - they need these tools to populate caches
- Cache hit rate optimization impossible without query tools

**Proposed Solution:**

Create an MCP server at `apps/api/context-cache-mcp/` (or integrate into knowledge-base MCP server as additional tools) that provides:

1. **Context Pack Tools**:
   - `context_cache_get_pack`: Retrieve cached context by pack type and key
   - `context_cache_write_pack`: Store/update context pack with automatic versioning
   - `context_cache_delete_pack`: Remove context pack (respects TTL)
   - `context_cache_list_packs`: Query packs by type, with pagination

2. **Session Management Tools**:
   - `context_cache_create_session`: Initialize agent session tracking
   - `context_cache_update_session`: Update token metrics during execution
   - `context_cache_end_session`: Finalize session with summary metrics
   - `context_cache_record_hit`: Record when pack used by session

3. **Query Tools**:
   - `context_cache_get_hit_rate`: Calculate cache effectiveness by pack type/agent
   - `context_cache_get_token_savings`: Aggregate token savings from cache usage
   - `context_cache_get_expired_packs`: Find packs past TTL for cleanup

4. **Maintenance Tools**:
   - `context_cache_expire_packs`: Manual expiration trigger
   - `context_cache_health`: Check cache status and DB connectivity

### Initial Acceptance Criteria

- [ ] **AC-1**: Create MCP server project structure
  - Location: `apps/api/context-cache-mcp/` OR extend `apps/api/knowledge-base/src/mcp-server/`
  - Package.json with `@modelcontextprotocol/sdk@1.26.0` dependency
  - TypeScript configuration (strict mode, Zod-first types)
  - Server entry point with stdio transport
  - Environment schema: DATABASE_URL, LOG_LEVEL, timeouts

- [ ] **AC-2**: Define Zod schemas for all tool inputs/outputs
  - `ContextCacheGetPackInputSchema`: { packType, packKey }
  - `ContextCacheWritePackInputSchema`: { packType, packKey, content, ttlHours?, tokenCount? }
  - `ContextCacheDeletePackInputSchema`: { packType, packKey }
  - `ContextCacheListPacksInputSchema`: { packType?, limit?, offset? }
  - `ContextCacheCreateSessionInputSchema`: { sessionId, agentName, storyId?, phase? }
  - `ContextCacheUpdateSessionInputSchema`: { sessionId, inputTokens?, outputTokens?, cachedTokens? }
  - `ContextCacheRecordHitInputSchema`: { sessionId, packId, tokensSaved? }
  - Query and maintenance tool schemas

- [ ] **AC-3**: Implement context pack CRUD operations
  - `handleGetPack()`: Query contextPacks by (packType, packKey), return content or not_found
  - `handleWritePack()`: Upsert pack with version increment, update timestamps
  - `handleDeletePack()`: Soft delete (or hard delete if no hits tracked)
  - `handleListPacks()`: Filter by packType, paginate, return array with metadata
  - All operations include correlation ID logging

- [ ] **AC-4**: Implement session tracking operations
  - `handleCreateSession()`: Insert contextSessions record, validate uniqueness
  - `handleUpdateSession()`: Increment token counters, update endedAt if finalizing
  - `handleEndSession()`: Set endedAt, calculate final metrics, log summary
  - `handleRecordHit()`: Insert contextCacheHits record, update pack hitCount and lastHitAt
  - Validate foreign key references (sessionId, packId)

- [ ] **AC-5**: Implement query tools for cache analytics
  - `handleGetHitRate()`: Calculate cache hits / total queries by packType or agentName
  - `handleGetTokenSavings()`: Aggregate cachedTokens from sessions, group by agent/story/pack
  - `handleGetExpiredPacks()`: Query packs where expiresAt < NOW(), return list for cleanup
  - All queries support optional filters (date range, agent, story, pack type)

- [ ] **AC-6**: Implement maintenance tools
  - `handleExpirePacks()`: Bulk delete packs past expiresAt, return count deleted
  - `handleHealth()`: Check DB connectivity, return status + latency metrics
  - Log all maintenance operations via `@repo/logger`

- [ ] **AC-7**: Add comprehensive error handling
  - Validate all inputs with Zod schemas (return validation errors to client)
  - Try-catch around all DB operations (log full error, return sanitized message)
  - Use MCPError types for protocol compliance
  - Include correlation IDs in all error logs
  - Handle foreign key violations gracefully (session not found, pack not found)

- [ ] **AC-8**: Write unit tests (≥80% coverage)
  - Test all tool handlers with mocked DB
  - Test Zod schema validation (valid and invalid inputs)
  - Test error handling (DB errors, validation errors, not found errors)
  - Test correlation ID generation and logging
  - Test pack versioning logic (increment on update)
  - Test TTL expiration logic

- [ ] **AC-9**: Write integration tests with real DB
  - Test end-to-end pack write → read → update → delete flow
  - Test session creation → hit recording → token tracking → end session flow
  - Test query tools with realistic data (multiple packs, sessions, hits)
  - Test expiration cleanup (insert expired packs, run cleanup, verify deletion)
  - Test concurrent writes to same pack (optimistic locking via version)
  - Requires WINT schema deployed to test database

- [ ] **AC-10**: Add MCP server configuration
  - `claude_desktop_config.json` example for local testing
  - Environment variable documentation (DATABASE_URL, timeouts, pool size)
  - Stdio transport configuration
  - Correlation ID and audit logging setup

- [ ] **AC-11**: Document tool usage patterns
  - README.md with tool descriptions and examples
  - Example flows: "How to cache codebase context", "How to track session tokens"
  - Schema documentation for context pack JSONB content structure
  - Troubleshooting guide (DB connection, MCP protocol errors)

### Non-Goals

**Explicitly Out of Scope:**
- Data seeding for context packs (separate stories: WINT-2030, 2040, 2050, 2060)
- Cache warming strategies (separate story: WINT-2070)
- Agent integration to use cache (separate story: WINT-2110)
- Cache pre-population from KB (depends on KBAR-0030 Story Sync Functions)
- Cache compression for large packs (future enhancement)
- Multi-tenancy support (single workflow system for now)
- Custom cache eviction policies (LRU/LFU - future enhancement)
- Cache analytics dashboard UI (backend tools only)
- Migration of existing workflow context to cache (future migration story)

**Protected Features (Do Not Modify):**
- Context cache database schema (`packages/backend/database-schema/src/schema/wint.ts` lines 467-587)
- Migration `0015_messy_sugar_man.sql`
- @repo/db client package API surface
- Knowledge Base MCP server (can reference as pattern, but don't modify)

**Deferred Work:**
- Performance optimizations for large-scale cache (defer to performance story)
- Cache replication/backup strategies (defer to infrastructure story)
- Cache versioning conflict resolution (optimistic locking sufficient for MVP)
- Pack content schema validation beyond JSONB type (future enhancement)

### Reuse Plan

**Components to Reuse:**
- MCP SDK patterns from `apps/api/knowledge-base/src/mcp-server/`
  - Server initialization (`server.ts`)
  - Tool schema registration (`tool-schemas.ts`)
  - Handler pattern (`tool-handlers.ts`)
  - Error handling (`error-handling.ts`)
  - Correlation ID generation
  - Performance logging
- @repo/db client for WINT schema access
- Zod schemas from `packages/backend/db/src/generated-schemas.ts`
- Drizzle ORM query patterns

**Patterns to Reuse:**
- Factory pattern for dependency injection (`createServer(deps)`)
- Stdio transport configuration (same as KB MCP server)
- Environment validation via Zod (`EnvSchema`)
- Tool handler structure: validate → execute → log → return
- Correlation ID in request context (`ToolCallContext`)
- Slow query logging threshold (>1000ms)
- Error sanitization before returning to MCP client

**Packages to Leverage:**
- `@modelcontextprotocol/sdk@1.26.0` - MCP protocol implementation
- `zod` - Schema validation
- `zod-to-json-schema` - Zod → MCP JSON Schema conversion
- `@repo/logger` - Logging infrastructure
- `@repo/db` - Database client with WINT schema
- `drizzle-orm` - ORM for queries

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Testing Focus Areas:**

1. **Pack Versioning**:
   - Critical: Test version increment on update (concurrent writes)
   - Test optimistic locking (version mismatch → conflict error)
   - Test version rollback scenarios

2. **Session Lifecycle**:
   - Test session creation → multiple hit recordings → session end
   - Test token counter increments (inputTokens, outputTokens, cachedTokens)
   - Test session without hits (edge case: no cache used)

3. **Cache Expiration**:
   - Test pack with expiresAt in past (should appear in getExpiredPacks query)
   - Test manual expiration cleanup (bulk delete)
   - Test pack with no expiresAt (TTL null → never expires)

4. **Foreign Key Constraints**:
   - Test recording hit for non-existent session (should fail gracefully)
   - Test recording hit for non-existent pack (should fail gracefully)
   - Test cascade deletes (delete session → hits deleted)

5. **Query Performance**:
   - Test list packs with large result sets (pagination correctness)
   - Test token savings aggregation with 1000+ sessions
   - Test hit rate calculation accuracy (edge cases: 0 hits, 0 queries)

**Integration Testing:**
- Requires WINT schema deployed to test database (port 5432 or separate DB)
- Test MCP protocol end-to-end via stdio transport
- Test concurrent tool calls (multiple agents using cache simultaneously)
- Test DB connection pooling under load

**Performance Considerations:**
- Pack writes should be <100ms (single INSERT/UPDATE)
- Pack reads should be <50ms (indexed on packType+packKey)
- Session hit recording should be <50ms (simple INSERT)
- Query tools may be slower (aggregations over large datasets)
- Expiration cleanup scales with number of expired packs (batch delete)

### For UI/UX Advisor

**Note:** This story is backend-only (MCP server tools). No UI components. However, MCP tool naming and error messages affect developer UX in Claude Code.

**Tool Naming UX:**
- Use consistent prefix: `context_cache_*` (not `cc_*` or `cache_*`)
- Verb-first naming: `context_cache_get_pack` (not `context_cache_pack_get`)
- Clear distinctions: `list_packs` vs `get_pack` (list = array, get = single)

**Error Message UX:**
- Clear validation errors: "packType must be one of: codebase, story, feature, epic, architecture, lessons_learned, test_patterns"
- Helpful not-found errors: "Pack not found for type='story' key='WINT-0100'. Available keys: [WINT-0010, WINT-0020]"
- Actionable errors: "Session 'abc123' not found. Create session first with context_cache_create_session"

**Logging UX (for developers debugging):**
- `@repo/logger.info()` for successful operations (include pack key, session ID, tokens saved)
- `@repo/logger.warn()` for soft errors (pack not found, session already ended)
- `@repo/logger.error()` for hard errors (DB connection failed, invalid foreign key)
- Include correlation ID in every log line

### For Dev Feasibility

**Technical Risks:**

1. **MCP Protocol Complexity**
   - Risk: MCP SDK documentation limited, examples sparse
   - Mitigation: KB MCP server exists as complete reference implementation (copy patterns)
   - Mitigation: MCP protocol is stable (v1.26.0), stdio transport well-tested

2. **Database Connection Pooling**
   - Risk: MCP server long-running process (unlike Lambda), may exhaust connections
   - Mitigation: Use @repo/db client with max pool size = 5 (configurable via env)
   - Mitigation: Close connections gracefully on shutdown

3. **Concurrent Pack Updates**
   - Risk: Two agents writing same pack simultaneously → version conflict
   - Mitigation: Optimistic locking via version field (increment on update, check match)
   - Mitigation: Retry logic in client (MCP tools don't auto-retry)

4. **Cache Expiration Timing**
   - Risk: Expired packs accumulate, slow down queries
   - Mitigation: Index on expiresAt for fast cleanup queries
   - Mitigation: Manual cleanup tool + future automated job (not in this story)

5. **JSONB Content Schema Flexibility**
   - Risk: No enforced schema for pack content (any JSONB accepted)
   - Mitigation: Document expected shapes in tool descriptions
   - Mitigation: Future story can add content validation (defer for now)

**Implementation Notes:**

- **Server Location Decision**: Consider adding tools to existing KB MCP server vs new standalone server
  - **Option A** (Recommended): Extend KB MCP server with context cache tools
    - Pros: Single MCP server to configure in Claude Code, shared infrastructure, less boilerplate
    - Cons: KB server now has two domains (knowledge + context cache)
  - **Option B**: New standalone context-cache-mcp server
    - Pros: Clear separation of concerns, independent deployment
    - Cons: Two MCP servers to configure, more infrastructure overhead

- **Pack Versioning Strategy**:
  - Use `version` integer field (starts at 1, increments on update)
  - On write: `UPDATE ... SET version = version + 1 WHERE packType = ? AND packKey = ? AND version = ?`
  - If 0 rows updated → version conflict → return error
  - Client can retry with latest version

- **Session Tracking**:
  - Sessions should be created at workflow start, ended at workflow end
  - Hits recorded during workflow execution (each time pack accessed)
  - Tokens updated incrementally (inputTokens += delta, not absolute values)

- **Cache Expiration**:
  - expiresAt = NULL → never expires
  - expiresAt set via ttlHours parameter: `NOW() + INTERVAL '{ttlHours} hours'`
  - Default TTL recommendations: codebase (24h), story (1h), lessons_learned (never)

**File Structure:**

**Option A (Extend KB MCP Server):**
```
apps/api/knowledge-base/src/mcp-server/
├── context-cache-tools/
│   ├── index.ts              # Export all handlers and schemas
│   ├── __types__/
│   │   └── index.ts          # Zod schemas for context cache tools
│   ├── pack-handlers.ts      # Get, write, delete, list pack handlers
│   ├── session-handlers.ts   # Session lifecycle handlers
│   ├── query-handlers.ts     # Analytics and query handlers
│   ├── maintenance-handlers.ts # Expire, health handlers
│   └── __tests__/
│       ├── pack-handlers.test.ts
│       ├── session-handlers.test.ts
│       ├── query-handlers.test.ts
│       ├── maintenance-handlers.test.ts
│       └── integration.test.ts
├── server.ts                 # Register context cache tools
├── tool-schemas.ts           # Import context cache schemas
└── tool-handlers.ts          # Import context cache handlers
```

**Option B (Standalone Server):**
```
apps/api/context-cache-mcp/
├── src/
│   ├── server.ts             # MCP server entry point
│   ├── tool-schemas.ts       # Zod schemas → JSON schemas
│   ├── tool-handlers.ts      # Route tool calls to handlers
│   ├── handlers/
│   │   ├── pack-handlers.ts
│   │   ├── session-handlers.ts
│   │   ├── query-handlers.ts
│   │   └── maintenance-handlers.ts
│   ├── __types__/
│   │   └── index.ts          # Zod input/output schemas
│   ├── __tests__/
│   │   ├── pack-handlers.test.ts
│   │   ├── session-handlers.test.ts
│   │   ├── query-handlers.test.ts
│   │   ├── maintenance-handlers.test.ts
│   │   └── integration.test.ts
│   └── index.ts              # Server startup
├── package.json
├── tsconfig.json
└── README.md
```

**Dependencies:**
- Existing: `@modelcontextprotocol/sdk`, `zod`, `zod-to-json-schema`, `@repo/logger`, `@repo/db`, `drizzle-orm`
- No new packages needed (all available from KB MCP server dependencies)

**Decision Needed:**
- Option A (extend KB server) recommended for MVP to reduce configuration overhead
- Option B (standalone) better for long-term if context cache tools grow significantly

---

## Completion Signal

STORY-SEED COMPLETE
