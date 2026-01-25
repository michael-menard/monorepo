# Dev Feasibility for KNOW-005: MCP Server Setup

## Feasibility Summary

**Feasible:** Yes

**Confidence:** Medium

**Why:**
- CRUD operations (KNOW-003) and search (KNOW-004) are complete and tested
- @modelcontextprotocol/sdk is official package with stable API
- Pattern is well-established: register tools → implement handlers → test via Claude Code
- Primary risk is MCP SDK integration complexity (limited documentation)
- Secondary risk is Claude Code spawning/lifecycle management (unclear topology)

**Confidence rationale:**
- Medium (not High) due to MCP SDK being new territory for this team
- No prior MCP server implementations in this codebase
- Documentation for MCP SDK is limited (mostly examples, not comprehensive API docs)
- Claude Code server spawning behavior needs experimentation

---

## Likely Change Surface

### Areas/Packages Likely Impacted

**Primary:**
- `apps/api/knowledge-base/src/mcp-server/` (new directory)
  - `server.ts` - MCP server initialization and lifecycle
  - `tool-handlers.ts` - Tool handler implementations
  - `tool-schemas.ts` - MCP tool schema definitions (derived from Zod)
  - `index.ts` - Entry point for MCP server process
  - `__tests__/` - Integration test suite

**Secondary:**
- `apps/api/knowledge-base/package.json` - Add @modelcontextprotocol/sdk dependency
- `apps/api/knowledge-base/src/crud-operations/index.ts` - Export for MCP handlers
- `apps/api/knowledge-base/src/search/index.ts` - Export for MCP handlers
- `~/.claude/mcp.json` - Register knowledge-base server (user config, not in repo)

**No changes to:**
- Existing CRUD operations (KNOW-003)
- Existing search implementation (KNOW-004)
- Database schema
- Frontend applications

### Endpoints Likely Impacted

**None.** This story implements MCP tools, not HTTP endpoints.

MCP protocol uses stdio (standard input/output) for communication, not HTTP. Claude Code spawns the MCP server as a subprocess and communicates via JSON-RPC over stdio.

### Migration/Deploy Touchpoints

**Local Development:**
- Add `pnpm mcp:server` script to start MCP server locally
- Document `~/.claude/mcp.json` registration process
- Ensure Docker Compose (PostgreSQL) is running

**CI/CD:**
- No deployment infrastructure needed (MCP server runs locally)
- CI should run MCP server tests (integration test harness)
- No AWS infrastructure changes

**Future Production Deployment (Post-MVP):**
- If MCP server needs to run as standalone service (not embedded):
  - Containerize MCP server (Dockerfile)
  - Deploy to ECS or Lambda (if supported)
  - Add health check endpoint
  - Configure connection pooling for multiple instances

---

## Risk Register

### Risk 1: MCP SDK Integration Patterns Unclear

**Why it's risky:**
- @modelcontextprotocol/sdk has limited documentation
- No comprehensive API reference (mostly example code)
- Error handling patterns across MCP boundary not well-documented
- Unknown edge cases with stdio communication

**Mitigation PM should bake into AC or testing plan:**
- AC: Include integration test that simulates MCP client requests (per QA-002 finding)
- AC: Document all MCP SDK usage patterns in Architecture Notes
- AC: Create example tool handler with full error handling
- Test Plan: Integration test for MCP spawning errors (per ENG-004 finding)

---

### Risk 2: Claude Code Server Lifecycle Management

**Why it's risky:**
- Unclear how Claude Code spawns MCP server (embedded? separate process? restart on crash?)
- Unknown whether multiple Claude Code sessions spawn multiple server instances
- Connection pooling implications if multiple instances
- Server crash recovery behavior unknown

**Mitigation PM should bake into AC or testing plan:**
- AC: Document MCP server deployment topology (per PLAT-003 finding)
- AC: Add deployment architecture diagram showing Claude Code → MCP Server → PostgreSQL
- AC: Document server startup/shutdown lifecycle
- Test Plan: Test MCP server restart during long-running operation (edge case)
- Test Plan: Test concurrent tool invocations from multiple sessions

---

### Risk 3: Tool Schema Validation Mismatch

**Why it's risky:**
- MCP tool schemas must match Zod input schemas exactly
- Manual schema duplication risks drift
- Runtime validation failures if schemas mismatch
- TypeScript type safety doesn't prevent JSON schema errors

**Mitigation PM should bake into AC or testing plan:**
- AC: Generate MCP tool schemas programmatically from Zod schemas (don't duplicate manually)
- AC: Integration test verifies schema parity (Zod validates → MCP validates)
- AC: Use zod-to-json-schema library or equivalent for automatic conversion
- Test Plan: Test invalid input for each tool (verify Zod error messages propagate correctly)

---

### Risk 4: Error Serialization Across MCP Boundary

**Why it's risky:**
- Stack traces, Zod errors, database errors must serialize correctly
- Client must receive sanitized errors (no SQL, no secrets) per SEC-005 finding
- Full errors must log server-side for debugging
- Unknown whether MCP SDK handles error serialization consistently

**Mitigation PM should bake into AC or testing plan:**
- AC: Implement error sanitization layer for all tool responses
- AC: Log full errors server-side with @repo/logger at error level
- AC: Structured error response format (code, message, field for validation errors)
- Test Plan: All 6 error cases verify client receives sanitized errors
- Test Plan: All error cases verify server logs show full stack traces

---

### Risk 5: Performance Overhead of MCP Protocol

**Why it's risky:**
- MCP protocol adds stdio serialization/deserialization overhead
- JSON-RPC message size may be large for embedding vectors (1536 dimensions × float32)
- Unknown latency impact compared to direct function calls
- Tool invocations may feel sluggish if protocol is slow

**Mitigation PM should bake into AC or testing plan:**
- AC: Log query_time_ms for all tool invocations (measure end-to-end latency)
- AC: Performance targets: kb_search < 500ms p95 (per KNOW-004 performance target)
- AC: Performance targets: kb_add < 3s (embedding generation + MCP overhead)
- Test Plan: Benchmark all tools with realistic data
- Test Plan: Measure protocol overhead vs direct function call

---

### Risk 6: OpenAI API Key Management

**Why it's risky:**
- MCP server needs OPENAI_API_KEY environment variable
- Unclear how Claude Code passes environment to spawned MCP server
- Key rotation procedure unclear
- Local .env file security (committed to git by accident)

**Mitigation PM should bake into AC or testing plan:**
- AC: Document environment variable requirements in README
- AC: MCP server startup validates OPENAI_API_KEY is set (fail fast)
- AC: .gitignore includes .env files
- AC: KNOW-028 (Environment Variable Documentation) already addresses MVP security
- Non-Goal: AWS Secrets Manager (deferred to KNOW-011, post-launch)

---

### Risk 7: Database Connection Pool Exhaustion

**Why it's risky:**
- Multiple Claude Code sessions may spawn multiple MCP server instances
- Each instance creates database connection pool
- Default pool size (10-20 connections) × N instances could exhaust PostgreSQL max_connections
- No documented strategy for connection pooling across instances

**Mitigation PM should bake into AC or testing plan:**
- AC: Configure connection pool size (suggest 5 connections per MCP server instance)
- AC: Document deployment topology: single shared instance vs per-session
- AC: Monitor connection usage during concurrent test (edge case: 10 parallel sessions)
- Test Plan: Verify 10 concurrent tool invocations don't exhaust connections
- Reference: PLAT-002 finding on connection pooling already flagged

---

### Risk 8: Rate Limiting Not Implemented (KNOW-010 Deferred)

**Why it's risky:**
- No per-agent query rate limiting in this story (deferred to KNOW-010)
- Malicious or buggy agent could spam kb_search and exhaust OpenAI quota
- No circuit breaker or throttling
- Cost implications if uncontrolled

**Mitigation PM should bake into AC or testing plan:**
- Non-Goal: Rate limiting is explicitly out of scope for KNOW-005
- AC: Document that rate limiting is NOT implemented (reference KNOW-010)
- AC: Log all tool invocations at info level for usage tracking
- Note: KNOW-010 (API Rate Limiting) is P0 and must be completed before production

---

### Risk 9: No Role-Based Access Control (KNOW-009 Deferred)

**Why it's risky:**
- All agents can call all tools with all roles (no authorization)
- kb_search can retrieve PM-only content via dev agent
- kb_delete can be called by any agent
- Security implication for production deployment

**Mitigation PM should bake into AC or testing plan:**
- Non-Goal: Role-based access control is explicitly out of scope for KNOW-005
- AC: Document that RBAC is NOT implemented (reference KNOW-009)
- AC: All tools accessible to all agents in MVP
- Note: KNOW-009 (MCP Tool Authorization) is P0 and must be completed before production

---

### Risk 10: Integration Test Harness Complexity

**Why it's risky:**
- Need to simulate MCP client for integration testing
- MCP protocol is JSON-RPC over stdio (not trivial to mock)
- Alternative: test tool handlers directly (bypasses MCP protocol layer)
- Trade-off: direct testing is simpler but doesn't validate MCP integration

**Mitigation PM should bake into AC or testing plan:**
- AC: Integration test harness simulates MCP client (per QA-002 finding)
- AC: Alternative approach: test tool handlers directly for 80% of tests, MCP integration for smoke tests
- AC: Document testing strategy: unit tests (handlers) + integration tests (MCP protocol)
- Test Plan: At least 2-3 tests via actual MCP protocol (end-to-end smoke tests)

---

## Scope Tightening Suggestions (Non-breaking)

### Suggestion 1: Start with Core CRUD Tools Only

**Current scope:** 10 tools (kb_add, kb_get, kb_update, kb_delete, kb_list, kb_search, kb_get_related, kb_bulk_import, kb_rebuild_embeddings, kb_stats)

**Suggestion:** Phase 1: Implement 5 core CRUD tools (kb_add, kb_get, kb_update, kb_delete, kb_list). Phase 2: Add search (kb_search, kb_get_related). Phase 3: Add admin tools (kb_bulk_import, kb_rebuild_embeddings, kb_stats).

**Rationale:**
- Core CRUD tools are simpler (no search complexity)
- Validates MCP integration patterns before adding complex tools
- Admin tools (bulk import, rebuild embeddings) are lower priority for MVP
- Reduces risk of scope creep

**PM Decision:** Accept or defer to single-phase implementation?

---

### Suggestion 2: Generate MCP Schemas from Zod Programmatically

**Current approach:** Likely manual schema creation

**Suggestion:** Use `zod-to-json-schema` library to convert Zod schemas to JSON Schema for MCP tools automatically.

**Rationale:**
- Eliminates schema duplication
- Ensures MCP schemas stay in sync with Zod validation
- Reduces risk of validation mismatch (Risk 3)
- Single source of truth for all schemas

**PM Decision:** Include as explicit AC?

---

### Suggestion 3: Add Health Check Endpoint

**Current scope:** No health check

**Suggestion:** Add simple health check function (returns { status: 'ok', db_connected: boolean, openai_available: boolean })

**Rationale:**
- Helps diagnose MCP server issues
- Claude Code can verify server is healthy
- Useful for debugging connection problems
- Low complexity addition

**PM Decision:** Add as AC or defer?

---

### Suggestion 4: Document Deployment Topology Explicitly

**Current scope:** Deployment topology unclear

**Suggestion:** Add Architecture Notes section documenting:
- Single shared MCP server instance vs per-session instances
- How Claude Code spawns server (command, environment, stdio)
- Connection pooling strategy
- Restart behavior on crash

**Rationale:**
- Addresses PLAT-003 finding on deployment topology
- Critical for understanding operational behavior
- Prevents future confusion

**PM Decision:** Include as explicit AC?

---

## Missing Requirements / Ambiguities

### Ambiguity 1: MCP Server Startup Command

**What's unclear:** How does Claude Code know how to start the MCP server?

**Recommendation:** Document in `~/.claude/mcp.json`:
```json
{
  "mcpServers": {
    "knowledge-base": {
      "command": "pnpm",
      "args": ["--filter", "knowledge-base", "mcp:server"],
      "env": {
        "DATABASE_URL": "postgresql://...",
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

**PM should include:** Example `~/.claude/mcp.json` configuration in story AC or Non-Goals.

---

### Ambiguity 2: Tool Response Format

**What's unclear:** Should tool responses match existing function return types exactly, or should they wrap in { success: true, data: ... }?

**Recommendation:** Use existing function return types directly (no wrapper). Errors propagate as MCP protocol errors (separate channel).

**PM should include:** Explicit AC stating tool response format matches existing CRUD/search return types.

---

### Ambiguity 3: Logging Context for Tool Invocations

**What's unclear:** Should logs include agent ID, session ID, or other context?

**Recommendation:** Log tool name, input parameters (sanitized), result count, and execution time. No agent ID (not available in MCP protocol).

**PM should include:** Explicit AC defining required log fields for each tool invocation.

---

### Ambiguity 4: Error Code Conventions

**What's unclear:** Should errors use specific codes (e.g., VALIDATION_ERROR, NOT_FOUND, DB_ERROR)?

**Recommendation:** Use structured error format: { code: string, message: string, field?: string }.

**PM should include:** Explicit AC defining error response schema with examples.

---

### Ambiguity 5: kb_bulk_import and kb_rebuild_embeddings Scope

**What's unclear:** Are kb_bulk_import and kb_rebuild_embeddings in scope for KNOW-005, or deferred to KNOW-006/KNOW-007?

**Recommendation:** Check index entry. If in scope, these tools are more complex and increase story points significantly.

**PM should clarify:** Are these tools MVP-critical, or can they be deferred?

---

## Evidence Expectations

### What Dev/Proof Should Capture

**1. MCP Server Registration:**
- Screenshot or code snippet of `~/.claude/mcp.json` with knowledge-base server entry
- Claude Code tool list showing all 10 kb_* tools

**2. Tool Invocation Evidence:**
- For each of 10 tools:
  - Example request JSON
  - Example response JSON
  - Log output showing tool invocation and success

**3. Error Handling Evidence:**
- For each error case:
  - Example request triggering error
  - Error response (sanitized)
  - Server logs showing full error

**4. Integration Test Coverage:**
- Vitest coverage report showing >80% for mcp-server/ directory
- Test logs showing all happy path tests passing
- Test logs showing all error cases handled

**5. Performance Metrics:**
- Log output showing query_time_ms for each tool
- Benchmark results for kb_search, kb_add, kb_bulk_import (if in scope)

**6. Architecture Diagram:**
- Visual diagram: Claude Code → MCP Server → CRUD/Search → PostgreSQL + OpenAI
- Document server lifecycle (startup, shutdown, restart)

---

### What Might Fail in CI/Deploy

**CI Failures:**
- MCP SDK integration tests require PostgreSQL (Docker Compose)
- Tests require OPENAI_API_KEY (mock or real API key in CI)
- MCP server process may not terminate cleanly (zombie processes)
- Stdio communication in CI environment may behave differently

**Mitigations:**
- Ensure CI has Docker Compose setup
- Use mock OpenAI API or test API key with low quota
- Add timeout and cleanup for MCP server tests
- Test stdio communication explicitly

**Deploy Failures:**
- N/A (MCP server runs locally, not deployed)
- Future deployment (if standalone service): container startup, connection pooling, health checks

---

## Recommendations for PM

### High Priority Additions to Story

1. **Add explicit AC for MCP schema generation:** "Generate MCP tool schemas programmatically from Zod schemas using zod-to-json-schema or equivalent."

2. **Add explicit AC for deployment topology documentation:** "Document MCP server deployment topology (embedded vs separate service) and Claude Code spawning behavior in Architecture Notes section."

3. **Add explicit AC for integration test harness:** "Create integration test harness that simulates MCP client requests (per QA-002 finding)."

4. **Add explicit AC for tool invocation logging:** "Log all tool invocations at info level with tool name, input parameters (sanitized), result count, and execution time."

5. **Clarify scope for kb_bulk_import and kb_rebuild_embeddings:** Are these tools in KNOW-005 scope or deferred to KNOW-006/KNOW-007? Verify against index entry.

### Medium Priority Clarifications

6. **Document example `~/.claude/mcp.json` configuration:** Include in Non-Goals or Infrastructure Notes.

7. **Define error response schema explicitly:** Include structured format with code, message, field.

8. **Add health check function:** Consider adding simple health check tool for diagnostics.

### Low Priority (Nice to Have)

9. **Performance targets:** Explicit AC for kb_search < 500ms p95, kb_add < 3s.

10. **Connection pool configuration:** Document recommended pool size per MCP server instance.

---

## Feasibility Confidence Factors

### Increases Confidence (Good News)

- CRUD operations (KNOW-003) and search (KNOW-004) are complete and tested
- Zod schemas already defined (easy to convert to JSON Schema)
- @repo/logger already integrated (consistent logging)
- Ports & Adapters pattern established (tool handlers are adapters)

### Decreases Confidence (Concerns)

- @modelcontextprotocol/sdk is new dependency (limited team experience)
- MCP protocol documentation is sparse (mostly examples)
- Claude Code spawning behavior unknown (requires experimentation)
- No prior MCP server implementations in codebase (greenfield)

### Overall Assessment

**Feasible with Medium Confidence.** Story is achievable but expect 1-2 days of experimentation with MCP SDK integration. Success depends on:
1. MCP SDK behaving as documented (no major undocumented quirks)
2. Claude Code spawning working reliably (may need troubleshooting)
3. Scope clarification on kb_bulk_import and kb_rebuild_embeddings (impacts story points)

**Estimated Story Points:** 8-13 (depends on scope of admin tools and MCP SDK learning curve)
