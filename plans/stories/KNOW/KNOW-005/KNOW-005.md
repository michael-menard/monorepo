---
story_id: KNOW-005
title: "MCP Server Setup"
status: backlog
created: 2026-01-25
updated: 2026-01-25
assignee: null
story_points: 8
priority: P0
depends_on: []
blocks: [KNOW-006]
tags:
  - knowledge-base
  - mcp
  - backend
  - infrastructure
---

# KNOW-005: MCP Server Setup

## Context

The knowledge base infrastructure (KNOW-001), embedding client (KNOW-002), CRUD operations (KNOW-003), and search implementation (KNOW-004) are complete. We now need to expose this functionality to AI agents via the Model Context Protocol (MCP).

MCP is a protocol that allows Claude Code to discover and invoke tools provided by external servers. By implementing an MCP server, we enable agents to access the knowledge base through a standardized interface without requiring HTTP endpoints or authentication setup.

**Findings Applied from Epic Elaboration:**
- **SEC-001**: Implement role-based access control for MCP tools before production deployment (defer to KNOW-009)
- **PLAT-003**: Document MCP server deployment topology (embedded vs separate service); clarify how Claude Code spawns and manages MCP server lifecycle
- **ENG-004**: Add integration tests for MCP spawning errors; test tool invocation failure scenarios
- **SEC-006**: Implement per-agent query rate limiting (defer to KNOW-010)
- **UX-001**: Document kb_search usage examples in agent instructions template
- **QA-002**: Create integration test harness that simulates Claude Code MCP client
- **PLAT-004**: Set up CloudWatch alerts for KB unavailability (defer to KNOW-016)

## Goal

Configure MCP server using @modelcontextprotocol/sdk, register all 10 knowledge base tools with schemas, implement handlers, and integrate @repo/logger to expose all knowledge base functionality as MCP tools accessible to Claude Code.

**Primary deliverables:**
1. MCP server setup with @modelcontextprotocol/sdk
2. Tool registration for 10 knowledge base operations
3. Tool handler implementations (wrappers around existing CRUD/search functions)
4. Integration test harness simulating MCP client
5. Documentation of deployment topology and Claude Code spawning behavior
6. Registration in `~/.claude/mcp.json` for Claude Code discovery

## Non-Goals

- ❌ HTTP endpoints (MCP uses stdio, not HTTP)
- ❌ Authentication/authorization (defer to KNOW-009)
- ❌ Rate limiting (defer to KNOW-010)
- ❌ AWS deployment (MCP server runs locally for MVP)
- ❌ Bulk import implementation beyond basic wrapper (defer complex logic to KNOW-006)
- ❌ Rebuild embeddings implementation beyond basic wrapper (defer to KNOW-007)
- ❌ Stats dashboard or visualization (defer to KNOW-023)
- ❌ CloudWatch alerting (defer to KNOW-016)
- ❌ Agent instruction templates (defer to KNOW-008)
- ❌ Health check endpoint (nice-to-have, not MVP-critical)

## Scope

### Packages Affected

**Primary:**
- `apps/api/knowledge-base/src/mcp-server/` (new directory)
  - `server.ts` - MCP server initialization and lifecycle
  - `tool-handlers.ts` - Tool handler implementations
  - `tool-schemas.ts` - MCP tool schema definitions (generated from Zod)
  - `error-handling.ts` - Error sanitization layer
  - `index.ts` - Entry point for MCP server process
  - `__tests__/` - Integration test suite
    - `mcp-integration.test.ts` - Full MCP protocol tests
    - `tool-handlers.test.ts` - Tool handler unit tests
    - `test-helpers.ts` - Test fixtures and utilities

**Secondary:**
- `apps/api/knowledge-base/package.json` - Add @modelcontextprotocol/sdk, zod-to-json-schema
- `apps/api/knowledge-base/src/crud-operations/index.ts` - Ensure exports for MCP handlers
- `apps/api/knowledge-base/src/search/index.ts` - Ensure exports for MCP handlers
- `~/.claude/mcp.json` - Register knowledge-base server (user config, not in repo)

### MCP Tools Implemented

**1. kb_add** - Add knowledge entry
```typescript
kb_add({
  content: string,
  role: 'pm' | 'dev' | 'qa' | 'all',
  tags?: string[] | null
})
// Returns: UUID string
```

**2. kb_get** - Retrieve entry by ID
```typescript
kb_get({
  id: string
})
// Returns: KnowledgeEntry | null
```

**3. kb_update** - Update entry
```typescript
kb_update({
  id: string,
  content?: string,
  role?: 'pm' | 'dev' | 'qa' | 'all',
  tags?: string[] | null
})
// Returns: KnowledgeEntry
```

**4. kb_delete** - Delete entry (idempotent)
```typescript
kb_delete({
  id: string
})
// Returns: void
```

**5. kb_list** - List entries with filters
```typescript
kb_list({
  role?: 'pm' | 'dev' | 'qa' | 'all',
  tags?: string[],
  limit?: number
})
// Returns: KnowledgeEntry[]
```

**6. kb_search** - Hybrid semantic + keyword search
```typescript
kb_search({
  query: string,
  role?: 'pm' | 'dev' | 'qa' | 'all',
  tags?: string[],
  entry_type?: 'fact' | 'summary' | 'template',
  limit?: number,
  min_confidence?: number
})
// Returns: { results: KnowledgeEntry[], metadata: { total, fallback_mode, query_time_ms } }
```

**7. kb_get_related** - Find related entries
```typescript
kb_get_related({
  entry_id: string,
  limit?: number
})
// Returns: { results: KnowledgeEntry[], metadata: { total, relationship_types } }
```

**8. kb_bulk_import** - Bulk import from YAML
```typescript
kb_bulk_import({
  file_path: string
})
// Returns: { created_ids: string[], failed: { content: string, error: string }[] }
```

**9. kb_rebuild_embeddings** - Rebuild embeddings for entries
```typescript
kb_rebuild_embeddings({
  entry_ids?: string[]  // If omitted, rebuilds all
})
// Returns: { success_count: number, failed_count: number }
```

**10. kb_stats** - Get knowledge base statistics
```typescript
kb_stats()
// Returns: { total_entries, by_role, by_type, top_tags }
```

### Database Tables

**Read-only operations:**
- All MCP tools operate via existing CRUD (KNOW-003) and search (KNOW-004) functions
- No direct database queries in MCP layer
- Database access delegated to CRUD/search modules

## Acceptance Criteria

### AC1: MCP Server Registration and Discovery

**Given** Claude Code is installed and configured
**When** MCP server is registered in `~/.claude/mcp.json`
**Then**:
- ✅ Server entry includes command, args, and environment variables
- ✅ Claude Code discovers knowledge-base server at startup
- ✅ All 10 kb_* tools appear in Claude Code tool list
- ✅ Tool descriptions are clear and actionable

**Example `~/.claude/mcp.json` configuration:**
```json
{
  "mcpServers": {
    "knowledge-base": {
      "command": "node",
      "args": ["dist/mcp-server/index.js"],
      "cwd": "${workspaceFolder}/apps/api/knowledge-base",
      "env": {
        "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/knowledge_base",
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

---

### AC2: Tool Schema Generation from Zod

**Given** Zod schemas exist for all CRUD and search operations
**When** MCP tool schemas are generated
**Then**:
- ✅ Use `zod-to-json-schema` library to convert Zod schemas to JSON Schema
- ✅ MCP tool schemas match Zod validation schemas exactly
- ✅ No manual schema duplication
- ✅ Single source of truth for all input validation

---

### AC3: Tool Handlers Wrap Existing Functions

**Given** CRUD operations (KNOW-003) and search (KNOW-004) are implemented
**When** MCP tool handlers are implemented
**Then**:
- ✅ Each tool handler calls corresponding CRUD/search function
- ✅ Tool handlers add logging (tool invocation, success, error)
- ✅ Tool handlers sanitize errors before returning to client
- ✅ Tool handlers measure and log query_time_ms
- ✅ No business logic in tool handlers (thin adapter layer)

**Example tool handler structure:**
```typescript
async function kb_add_handler(input: KbAddInput): Promise<string> {
  const startTime = Date.now()
  logger.info('kb_add tool invoked', { role: input.role, tags: input.tags })

  try {
    const entryId = await kb_add(input, { db, embeddingClient })
    const elapsed = Date.now() - startTime
    logger.info('kb_add succeeded', { entry_id: entryId, query_time_ms: elapsed })
    return entryId
  } catch (error) {
    logger.error('kb_add failed', { error, input })
    throw sanitizeError(error)
  }
}
```

---

### AC4: Error Sanitization Layer

**Given** errors occur during tool execution
**When** errors are returned to MCP client
**Then**:
- ✅ Zod validation errors include field name and constraint violated
- ✅ Database errors sanitized (no SQL, no connection strings)
- ✅ OpenAI API errors sanitized (no API keys, include retry context)
- ✅ Full errors logged server-side at error level
- ✅ Structured error format: `{ code: string, message: string, field?: string }`

**Error code conventions:**
- `VALIDATION_ERROR` - Zod validation failure
- `NOT_FOUND` - Resource not found (kb_update, kb_get non-existent)
- `DATABASE_ERROR` - Database connection or query failure
- `API_ERROR` - OpenAI API failure
- `INTERNAL_ERROR` - Unhandled exception

---

### AC5: Logging with @repo/logger

**Given** all tool invocations are logged
**When** reviewing log output
**Then**:
- ✅ Log at `info` level: Tool name, input parameters (sanitized), result count, query_time_ms
- ✅ Log at `warn` level: Fallback mode (kb_search), retries, degraded performance
- ✅ Log at `error` level: All failures with full error context
- ✅ Log at `debug` level: Internal details (embedding generation, query execution)
- ✅ No `console.log` usage

**Example log output:**
```
[INFO] kb_search tool invoked: { query: "validation best practices", role: "dev", limit: 5 }
[INFO] kb_search succeeded: { result_count: 3, fallback_mode: false, query_time_ms: 234 }
```

---

### AC6: Environment Variable Validation

**Given** MCP server starts
**When** validating environment
**Then**:
- ✅ `DATABASE_URL` must be set and valid PostgreSQL connection string
- ✅ `OPENAI_API_KEY` must be set and non-empty
- ✅ Fail fast with descriptive error if env vars missing
- ✅ Log environment validation at startup (info level)

---

### AC7: Integration Test Harness

**Given** integration tests are executed
**When** simulating MCP client
**Then**:
- ✅ Test harness simulates MCP JSON-RPC protocol over stdio
- ✅ Test harness sends tool invocation requests
- ✅ Test harness receives and validates responses
- ✅ At least 2-3 end-to-end tests via MCP protocol (smoke tests)
- ✅ Remaining tests call tool handlers directly (faster, simpler)

**Test coverage:**
- Happy path: All 10 tools invoked successfully
- Error cases: Validation errors, database errors, API errors
- Edge cases: Concurrent invocations, large content, server restart

---

### AC8: Deployment Topology Documentation

**Given** MCP server implementation is complete
**When** documenting architecture
**Then**:
- ✅ Document: Claude Code spawns MCP server as subprocess
- ✅ Document: stdio communication (not HTTP)
- ✅ Document: Single shared instance vs per-session instances (clarify which)
- ✅ Document: Server startup command and environment requirements
- ✅ Document: Connection pooling strategy (5 connections per instance recommended)
- ✅ Document: Server lifecycle (startup, shutdown, restart on crash)
- ✅ Include architecture diagram: Claude Code → MCP Server → CRUD/Search → PostgreSQL + OpenAI

---

### AC9: Performance Logging and Targets

**Given** tools are invoked
**When** measuring performance
**Then**:
- ✅ Log `query_time_ms` for all tool invocations at info level
- ✅ Performance targets: kb_search < 500ms p95 (inherited from KNOW-004)
- ✅ Performance targets: kb_add < 3s (embedding generation + MCP overhead)
- ✅ Performance targets: kb_get < 100ms
- ✅ Performance targets: kb_list < 1s
- ✅ Benchmark results documented in proof

---

### AC10: Test Coverage

**Given** test suite is executed
**When** measuring coverage
**Then**:
- ✅ Minimum 80% line coverage for `mcp-server/` directory
- ✅ All happy path scenarios tested (10 tools × basic invocation)
- ✅ All error cases tested (validation, not found, API failure, database failure)
- ✅ Edge cases tested (concurrent invocations, large content, server restart)
- ✅ Integration tests verify MCP protocol communication
- ✅ Unit tests verify tool handler logic

---

## Reuse Plan

### Reusing from Existing Packages

**1. CRUD Operations (KNOW-003)**
- Location: `apps/api/knowledge-base/src/crud-operations`
- Usage: All kb_add, kb_get, kb_update, kb_delete, kb_list tools
- Benefits: Proven implementation, full test coverage

**2. Search Implementation (KNOW-004)**
- Location: `apps/api/knowledge-base/src/search`
- Usage: kb_search, kb_get_related tools
- Benefits: Hybrid semantic + keyword search with fallback, comprehensive tests

**3. EmbeddingClient (KNOW-002)**
- Usage: Via CRUD operations (no direct usage in MCP layer)
- Benefits: Content-hash caching, retry logic, batch processing

**4. @repo/logger**
- Location: `packages/core/logger`
- Usage: All logging in MCP server
- Benefits: Structured logging, consistent format

**5. Zod Schemas**
- Location: `apps/api/knowledge-base/src/__types__`
- Usage: Input validation for all tools
- Benefits: Runtime validation, type safety

**6. Drizzle ORM**
- Usage: Via CRUD operations (no direct usage in MCP layer)
- Benefits: Type-safe database queries

### New Dependencies Required

**1. @modelcontextprotocol/sdk**
- Purpose: MCP server implementation
- Version: Latest stable (^1.0.0)
- Install: `pnpm add @modelcontextprotocol/sdk`

**2. zod-to-json-schema**
- Purpose: Convert Zod schemas to JSON Schema for MCP tools
- Version: Latest stable (^3.0.0)
- Install: `pnpm add zod-to-json-schema`

### No New Shared Packages Required

All functionality is specific to the knowledge-base MCP server. No new shared packages needed.

---

## Architecture Notes

### Ports & Adapters Pattern

```
┌──────────────────────────────────────────────────────────────────┐
│                       Claude Code (Client)                        │
└──────────────────────────────────────────────────────────────────┘
                              ↓ (stdio)
┌──────────────────────────────────────────────────────────────────┐
│                    MCP Server (Adapter Layer)                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Tool Handlers (10 tools)                       │ │
│  │  - Input validation (Zod)                                   │ │
│  │  - Error sanitization                                       │ │
│  │  - Logging                                                  │ │
│  │  - Performance measurement                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                  ↓                            ↓
    ┌─────────────────────┐      ┌─────────────────────┐
    │  CRUD Operations    │      │  Search Functions   │
    │   (KNOW-003)        │      │   (KNOW-004)        │
    └─────────────────────┘      └─────────────────────┘
                  ↓                            ↓
         ┌─────────────────────────────────────────┐
         │     Database (PostgreSQL + pgvector)    │
         │     EmbeddingClient (OpenAI API)        │
         └─────────────────────────────────────────┘
```

### MCP Server Lifecycle

**Startup:**
1. Claude Code reads `~/.claude/mcp.json`
2. Spawns MCP server subprocess with command and environment
3. Server initializes: validates env vars, connects to database
4. Server registers 10 tools with MCP SDK
5. Server listens for JSON-RPC messages on stdin

**Tool Invocation:**
1. Claude Code sends JSON-RPC request via stdin
2. MCP SDK deserializes request and validates schema
3. Tool handler executes (validates with Zod, calls CRUD/search, logs, sanitizes errors)
4. MCP SDK serializes response
5. Server sends JSON-RPC response via stdout

**Shutdown:**
1. Claude Code sends shutdown signal (SIGTERM)
2. Server closes database connections
3. Server exits gracefully

**Crash Recovery:**
- If server crashes, Claude Code detects and restarts
- Partial tool executions may be committed (database transactions not implemented in MVP)
- No state lost (server is stateless, all state in database)

### Deployment Topology

**MVP (Local Development):**
- Single MCP server instance per Claude Code session
- Server runs as subprocess of Claude Code
- stdio communication (stdin/stdout)
- No HTTP, no authentication

**Future Production (Post-MVP):**
- Containerize MCP server (Docker)
- Deploy to ECS or Lambda (if MCP supports)
- Shared instance across multiple Claude Code sessions (requires connection pooling)
- Add health check endpoint
- Add CloudWatch metrics and alerting (KNOW-016)

### Error Handling Strategy

1. **Validation Layer**: Zod schemas catch invalid inputs immediately
2. **Adapter Layer**: Tool handlers add logging and error sanitization
3. **Domain Layer**: CRUD/search functions throw domain-specific errors
4. **Infrastructure Layer**: Database and API errors propagate with context

**Error flow:**
```
Tool Handler (MCP Layer)
  ↓ try-catch
CRUD/Search Function (Domain Layer)
  ↓ throws NotFoundError, ValidationError, etc.
Database/API (Infrastructure Layer)
  ↓ throws DatabaseError, APIError
Tool Handler catches, logs full error, sanitizes, returns to MCP client
```

---

## Infrastructure Notes

### No New Infrastructure Required

All infrastructure provisioned in KNOW-001:
- PostgreSQL with pgvector extension (Docker Compose)
- Database schema with all necessary indexes
- Connection pooling configured

### Configuration

**Environment variables:**
```bash
# Required
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/knowledge_base
OPENAI_API_KEY=sk-...

# Optional (sensible defaults)
DB_POOL_SIZE=5              # Max connections per MCP server instance
KB_SEARCH_DEFAULT_LIMIT=10
KB_SEARCH_MAX_LIMIT=50
```

**MCP Server Registration:**
Create or update `~/.claude/mcp.json`:
```json
{
  "mcpServers": {
    "knowledge-base": {
      "command": "node",
      "args": ["dist/mcp-server/index.js"],
      "cwd": "/absolute/path/to/apps/api/knowledge-base",
      "env": {
        "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/knowledge_base",
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

**Package scripts:**
```json
{
  "scripts": {
    "mcp:server": "node dist/mcp-server/index.js",
    "mcp:build": "tsc -p tsconfig.mcp.json"
  }
}
```

---

## HTTP Contract Plan

**Not applicable.** This story implements MCP tools using stdio communication, not HTTP endpoints.

MCP tools are registered with JSON Schema definitions (generated from Zod) and invoked via JSON-RPC over stdin/stdout.

---

## Seed Requirements

**Not applicable.** MCP server setup does not require seed data.

Seed data for knowledge base entries is handled by:
- KNOW-003: Manual kb_add calls for testing
- KNOW-006: Parsers and bulk import from YAML
- KNOW-008: Migration of existing LESSONS-LEARNED.md content

---

## Test Plan

_Synthesized from `_pm/TEST-PLAN.md`_

### Test Coverage Summary

**Scope:**
- MCP server setup and lifecycle
- 10 MCP tools (kb_add, kb_get, kb_update, kb_delete, kb_list, kb_search, kb_get_related, kb_bulk_import, kb_rebuild_embeddings, kb_stats)
- Tool handler logic (validation, logging, error sanitization)
- Integration with CRUD (KNOW-003) and search (KNOW-004)

**Test Files:**
```
apps/api/knowledge-base/src/mcp-server/__tests__/
  mcp-integration.test.ts    # Full MCP protocol tests (end-to-end)
  tool-handlers.test.ts      # Tool handler unit tests
  error-handling.test.ts     # Error sanitization tests
  test-helpers.ts            # Test fixtures and MCP client mock
```

**Coverage targets:**
- Unit tests: >80% coverage for mcp-server/ directory
- Integration tests: All happy paths, error cases, edge cases
- MCP protocol tests: 2-3 smoke tests via actual MCP communication

### Happy Path Tests (10)

1. **MCP Server Registration** - Verify `~/.claude/mcp.json` entry and tool discovery
2. **kb_add Tool Invocation** - Add entry and verify UUID returned
3. **kb_get Tool Invocation** - Retrieve entry and verify all fields present
4. **kb_search Tool with Role Filter** - Search with role filter and verify results
5. **kb_list Tool with Tag Filter** - List with tag filter and verify ordering
6. **kb_update Tool** - Update entry and verify content/tags changed
7. **kb_delete Tool** - Delete entry and verify idempotency
8. **kb_bulk_import Tool** - Import 10 entries from YAML
9. **kb_rebuild_embeddings Tool** - Rebuild 2 embeddings and verify success
10. **kb_stats Tool** - Get statistics and verify counts

### Error Cases (6)

1. **MCP Tool Validation Failure** - Empty content rejected with Zod error
2. **OpenAI API Unavailable** - kb_add fails after retries, no DB write
3. **Database Connection Failure** - Sanitized error returned
4. **Invalid MCP Tool Schema** - Invalid role enum rejected
5. **MCP Server Not Running** - Claude Code reports unavailable
6. **Tool Handler Exception** - 500 error logged, sanitized message returned

### Edge Cases (9)

1. **Large Content (10k characters)** - kb_add succeeds, performance < 5s
2. **Concurrent Tool Invocations** - 10 parallel kb_add calls succeed
3. **Special Characters in Content** - Regex special chars handled correctly
4. **Null vs Undefined Tags** - kb_add with `tags: null` succeeds
5. **Empty Result Set** - kb_search with no matches returns empty array
6. **kb_update with No Changes** - Succeeds without re-embedding
7. **kb_rebuild_embeddings on Large Dataset** - 1,000 entries processed
8. **MCP Server Restart During Tool Call** - Graceful error, no corruption
9. **kb_search Fallback Mode** - Falls back to keyword search when OpenAI unavailable

### Test Execution

**Prerequisites:**
- Docker Compose running (PostgreSQL)
- OpenAI API key set in environment
- MCP server registered in `~/.claude/mcp.json`

**Evidence to capture:**
- Vitest coverage report (>80% target)
- Claude Code screenshots showing tool list
- MCP protocol logs (request/response)
- Database query results
- Server logs (@repo/logger output)

---

## UI/UX Notes

_Synthesized from `_pm/UIUX-NOTES.md`_

**Verdict: SKIPPED**

This story implements MCP server infrastructure with no user-facing interface. No UI components, pages, or accessibility concerns for human users.

Future stories with UI:
- **KNOW-023**: Search UI (optional web dashboard for debugging)
- **KNOW-024**: Management UI (knowledge base curation interface)

---

## Risks and Mitigations

### Risk 1: MCP SDK Integration Complexity

**Risk**: @modelcontextprotocol/sdk has limited documentation. Integration patterns may require experimentation.

**Mitigation**:
- Review official MCP SDK examples
- Start with simplest tool (kb_get)
- Test incrementally
- Document all usage patterns in code comments

---

### Risk 2: Claude Code Server Lifecycle Management

**Risk**: Unclear how Claude Code spawns and manages MCP server. Server may crash or not restart properly.

**Mitigation**:
- Document deployment topology explicitly (AC8)
- Add health check function (future enhancement)
- Test server restart scenarios (edge case 8)

---

### Risk 3: Tool Schema Validation Mismatch

**Risk**: MCP tool schemas must match Zod input schemas exactly. Manual duplication risks drift.

**Mitigation**:
- Generate MCP schemas programmatically from Zod (AC2)
- Integration test verifies schema parity
- Single source of truth for all schemas

---

### Risk 4: Error Serialization Across MCP Boundary

**Risk**: Stack traces, Zod errors, database errors must serialize correctly. Unknown whether MCP SDK handles consistently.

**Mitigation**:
- Implement error sanitization layer (AC4)
- Log full errors server-side
- Test all error cases (6 error tests)

---

### Risk 5: Performance Overhead of MCP Protocol

**Risk**: MCP protocol adds stdio serialization overhead. Unknown latency impact.

**Mitigation**:
- Log query_time_ms for all invocations (AC9)
- Benchmark all tools with realistic data
- Set performance targets (<500ms p95 for kb_search)

---

### Risk 6: Database Connection Pool Exhaustion

**Risk**: Multiple Claude Code sessions may spawn multiple MCP server instances, exhausting database connections.

**Mitigation**:
- Configure connection pool size (5 per instance)
- Document deployment topology
- Test concurrent invocations (edge case 2)

---

## Definition of Done

- [ ] MCP server setup with @modelcontextprotocol/sdk
- [ ] All 10 tools registered with JSON Schema definitions
- [ ] Tool handlers implemented (thin adapter layer)
- [ ] Error sanitization layer working
- [ ] Logging with @repo/logger (no console.log)
- [ ] Environment variable validation at startup
- [ ] MCP server registered in `~/.claude/mcp.json` (documented in README)
- [ ] Integration test harness simulating MCP client
- [ ] Test suite passing with ≥80% coverage
- [ ] All happy path tests passing
- [ ] All error case tests passing
- [ ] All edge case tests passing
- [ ] Performance targets met (kb_search < 500ms p95)
- [ ] Deployment topology documented with architecture diagram
- [ ] TypeScript compilation clean (no errors)
- [ ] Code follows monorepo conventions (Zod-first types, no barrel files)
- [ ] PROOF-KNOW-005.md document created with evidence
- [ ] Story status updated to "ready-for-code-review"

---

## Related Stories

- **KNOW-001**: Package Infrastructure Setup (prerequisite ✅)
- **KNOW-002**: Embedding Client Implementation (prerequisite ✅)
- **KNOW-003**: Core CRUD Operations (prerequisite ✅)
- **KNOW-004**: Search Implementation (prerequisite ✅)
- **KNOW-006**: Parsers and Seeding (depends on KNOW-005)
- **KNOW-007**: Admin Tools and Polish (depends on KNOW-005)
- **KNOW-008**: Workflow Integration (depends on KNOW-005)
- **KNOW-009**: MCP Tool Authorization (P0, deferred from KNOW-005)
- **KNOW-010**: API Rate Limiting (P0, deferred from KNOW-005)
- **KNOW-023**: Search UI (future)
- **KNOW-024**: Management UI (future)

---

## Agent Log

| Timestamp | Agent | Action | Notes |
|-----------|-------|--------|-------|
| 2026-01-25 | pm-story-generation-leader | Story generated | Synthesized from index entry + worker artifacts |

---

## Token Budget

Phase tracking will be added during implementation.

<!-- Token usage will be logged here via /token-log command -->

---

## References

- [MCP Protocol Documentation](https://modelcontextprotocol.io)
- [@modelcontextprotocol/sdk NPM Package](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [KNOW-003 Story](./KNOW-003/KNOW-003.md) - CRUD Operations
- [KNOW-004 Story](./KNOW-004/KNOW-004.md) - Search Implementation
