# Test Plan for KNOW-005: MCP Server Setup

## Scope Summary

**Endpoints touched:** None (MCP tools, not HTTP endpoints)

**UI touched:** No

**Data/storage touched:** No (reads from knowledge base via CRUD operations from KNOW-003)

**MCP Tools implemented:**
- `kb_add` - Add knowledge entry
- `kb_get` - Retrieve entry by ID
- `kb_update` - Update entry
- `kb_delete` - Delete entry
- `kb_list` - List entries with filters
- `kb_search` - Hybrid semantic + keyword search (from KNOW-004)
- `kb_get_related` - Find related entries (from KNOW-004)
- `kb_bulk_import` - Bulk import knowledge entries
- `kb_rebuild_embeddings` - Rebuild embeddings for entries
- `kb_stats` - Get knowledge base statistics

---

## Happy Path Tests

### Test 1: MCP Server Registration

**Setup:**
- Clean `~/.claude/mcp.json` (backup existing)
- Ensure PostgreSQL is running (Docker Compose)
- Set environment variables: `OPENAI_API_KEY`, `DATABASE_URL`

**Action:**
1. Run MCP server registration script
2. Verify `~/.claude/mcp.json` contains knowledge-base server entry

**Expected Outcome:**
- MCP server registered with correct command and environment
- Claude Code can discover the server

**Evidence:**
- `~/.claude/mcp.json` contents showing knowledge-base server
- Claude Code server list includes knowledge-base

---

### Test 2: kb_add Tool Invocation via MCP

**Setup:**
- MCP server running
- Database seeded with test data

**Action:**
Call `kb_add` tool via Claude Code:
```json
{
  "content": "Always validate inputs with Zod before any side effects",
  "role": "dev",
  "tags": ["validation", "zod", "best-practice"]
}
```

**Expected Outcome:**
- Returns UUID of created entry
- Entry exists in database
- Logs show tool invocation at info level

**Evidence:**
- UUID returned (format validated)
- Database query confirms entry exists
- Log output showing tool invocation and success

---

### Test 3: kb_get Tool Invocation

**Setup:**
- Entry exists in database from Test 2

**Action:**
Call `kb_get` with UUID from Test 2

**Expected Outcome:**
- Returns full KnowledgeEntry object
- All fields present (id, content, role, tags, embedding, created_at, updated_at)

**Evidence:**
- JSON response with all fields
- Embedding vector present and valid (1536 dimensions for text-embedding-3-small)

---

### Test 4: kb_search Tool with Role Filter

**Setup:**
- Database has entries with role='dev' and role='pm'

**Action:**
Call `kb_search`:
```json
{
  "query": "validation best practices",
  "role": "dev",
  "limit": 5
}
```

**Expected Outcome:**
- Returns entries with role='dev' only
- Results ranked by relevance (hybrid semantic + keyword)
- Metadata includes `fallback_mode: false`, `query_time_ms`, `total`

**Evidence:**
- All returned entries have role='dev' or role='all'
- Results ordered by relevance score
- Metadata fields present and valid

---

### Test 5: kb_list Tool with Tag Filter

**Setup:**
- Database has entries with various tags

**Action:**
Call `kb_list`:
```json
{
  "tags": ["typescript", "validation"],
  "limit": 10
}
```

**Expected Outcome:**
- Returns entries with ANY of the specified tags (OR logic)
- Ordered by created_at DESC (newest first)
- Limit enforced

**Evidence:**
- Each returned entry has at least one matching tag
- Results ordered correctly
- Result count ≤ 10

---

### Test 6: kb_update Tool

**Setup:**
- Entry exists from Test 2

**Action:**
Call `kb_update`:
```json
{
  "id": "<UUID from Test 2>",
  "content": "Always validate inputs with Zod schemas before any side effects",
  "tags": ["validation", "zod", "best-practice", "critical"]
}
```

**Expected Outcome:**
- Returns updated KnowledgeEntry
- Content and tags updated
- `updated_at` timestamp changed
- `created_at` unchanged
- New embedding generated (content changed)

**Evidence:**
- Updated entry retrieved via kb_get
- Timestamps verify update
- Database embedding vector differs from original

---

### Test 7: kb_delete Tool

**Setup:**
- Entry exists from Test 2

**Action:**
Call `kb_delete`:
```json
{
  "id": "<UUID from Test 2>"
}
```

**Expected Outcome:**
- Tool returns success (void or boolean)
- Entry no longer exists in database
- Idempotent: calling again succeeds without error

**Evidence:**
- kb_get returns null for deleted entry
- Database query confirms deletion
- Second kb_delete call succeeds

---

### Test 8: kb_bulk_import Tool

**Setup:**
- YAML file with 10 test entries

**Action:**
Call `kb_bulk_import`:
```json
{
  "file_path": "/path/to/test-entries.yaml"
}
```

**Expected Outcome:**
- All entries imported successfully
- Returns array of created UUIDs
- Logs show batch progress

**Evidence:**
- 10 UUIDs returned
- All entries exist in database
- Logs show "Imported 10 entries"

---

### Test 9: kb_rebuild_embeddings Tool

**Setup:**
- Database has 5 entries with embeddings

**Action:**
Call `kb_rebuild_embeddings`:
```json
{
  "entry_ids": ["<UUID1>", "<UUID2>"]
}
```

**Expected Outcome:**
- Embeddings regenerated for specified entries
- Returns success count
- Logs show OpenAI API calls

**Evidence:**
- Embedding vectors differ from original
- Cache updated with new embeddings
- Log confirms "Rebuilt 2 embeddings"

---

### Test 10: kb_stats Tool

**Setup:**
- Database has mixed entries (various roles, tags, types)

**Action:**
Call `kb_stats` with no parameters

**Expected Outcome:**
- Returns statistics object:
  - `total_entries`: number
  - `by_role`: object with counts per role
  - `by_type`: object with counts per type
  - `top_tags`: array of most used tags

**Evidence:**
- All fields present
- Counts match database queries
- Top tags ordered by frequency

---

## Error Cases

### Error 1: MCP Tool Validation Failure

**Setup:**
- MCP server running

**Action:**
Call `kb_add` with empty content:
```json
{
  "content": "",
  "role": "dev"
}
```

**Expected Outcome:**
- Returns Zod validation error
- Error message indicates "content must be non-empty"
- No database write occurs

**Evidence:**
- Error response with field name and constraint
- Database unchanged

---

### Error 2: OpenAI API Unavailable

**Setup:**
- Remove `OPENAI_API_KEY` from environment
- MCP server running

**Action:**
Call `kb_add` with valid input

**Expected Outcome:**
- Returns error after 3 retry attempts
- Error message indicates "OpenAI API unavailable"
- No database write occurs

**Evidence:**
- Error response with retry context
- Logs show 3 retry attempts
- Database unchanged

---

### Error 3: Database Connection Failure

**Setup:**
- Stop PostgreSQL container

**Action:**
Call `kb_list`

**Expected Outcome:**
- Returns database connection error
- Error message sanitized (no connection string exposed)

**Evidence:**
- Error response with sanitized message
- Logs show full error with connection details (server-side only)

---

### Error 4: Invalid MCP Tool Schema

**Setup:**
- MCP server running

**Action:**
Call `kb_search` with invalid role:
```json
{
  "query": "test",
  "role": "invalid-role"
}
```

**Expected Outcome:**
- Returns Zod validation error
- Error lists valid role values: ['pm', 'dev', 'qa', 'all']

**Evidence:**
- Error response with enum values
- No database query executed

---

### Error 5: MCP Server Not Running

**Setup:**
- Stop MCP server

**Action:**
Attempt to call any kb_* tool via Claude Code

**Expected Outcome:**
- Claude Code reports "MCP server unavailable"
- Tool invocation fails gracefully

**Evidence:**
- Error message from Claude Code UI
- No server logs (server not running)

---

### Error 6: Tool Handler Exception

**Setup:**
- MCP server running
- Inject database query that throws exception

**Action:**
Call `kb_list` (trigger exception)

**Expected Outcome:**
- Returns 500-level error
- Error logged server-side with full stack trace
- Client receives sanitized error message

**Evidence:**
- Error response
- Server logs show stack trace
- No sensitive information in client error

---

## Edge Cases

### Edge 1: Large Content (10k characters)

**Setup:**
- MCP server running

**Action:**
Call `kb_add` with 10,000 character content

**Expected Outcome:**
- Succeeds (content within OpenAI token limit ~30k chars)
- Embedding generated
- Entry stored

**Evidence:**
- UUID returned
- Entry retrieved via kb_get has full content
- Performance < 5 seconds

---

### Edge 2: Concurrent Tool Invocations

**Setup:**
- MCP server running

**Action:**
Spawn 10 parallel Claude Code sessions calling `kb_add` simultaneously

**Expected Outcome:**
- All 10 calls succeed
- 10 separate entries created
- No database deadlocks or corruption

**Evidence:**
- 10 UUIDs returned
- Database has 10 entries
- No error logs

---

### Edge 3: Special Characters in Content

**Setup:**
- MCP server running

**Action:**
Call `kb_add` with content containing special characters:
```json
{
  "content": "Use regex: /^[a-z]+$/ for validation. Don't use console.log().",
  "role": "dev"
}
```

**Expected Outcome:**
- Succeeds
- Special characters stored correctly (no escaping issues)
- Search can find entry

**Evidence:**
- Entry retrieved with exact content
- kb_search with query "regex validation" returns entry

---

### Edge 4: Null vs Undefined Tags

**Setup:**
- MCP server running

**Action:**
Call `kb_add` with `tags: null`

**Expected Outcome:**
- Succeeds
- Tags stored as NULL in database
- kb_list without tag filter returns entry

**Evidence:**
- Entry retrieved shows tags: null
- kb_list includes entry

---

### Edge 5: Empty Result Set

**Setup:**
- Database empty or no matches

**Action:**
Call `kb_search` with query that has no matches

**Expected Outcome:**
- Returns empty results array
- Metadata shows total: 0
- No error thrown

**Evidence:**
- Response: `{ results: [], metadata: { total: 0, ... } }`

---

### Edge 6: kb_update with No Changes

**Setup:**
- Entry exists

**Action:**
Call `kb_update` with identical content

**Expected Outcome:**
- Succeeds
- No new embedding generated (content hash unchanged)
- `updated_at` timestamp still updated

**Evidence:**
- Updated entry retrieved
- Embedding vector unchanged
- `updated_at` timestamp differs

---

### Edge 7: kb_rebuild_embeddings on Large Dataset

**Setup:**
- Database has 1,000 entries

**Action:**
Call `kb_rebuild_embeddings` with all 1,000 entry IDs

**Expected Outcome:**
- Batch processing completes
- All embeddings regenerated
- OpenAI API rate limits not exceeded (EmbeddingClient handles batching)

**Evidence:**
- Success count: 1000
- Logs show batch progress
- No rate limit errors

---

### Edge 8: MCP Server Restart During Tool Call

**Setup:**
- MCP server running
- Call long-running tool (kb_rebuild_embeddings)

**Action:**
Restart MCP server mid-execution

**Expected Outcome:**
- Claude Code receives connection error
- Partial work may be committed (acceptable)
- No database corruption

**Evidence:**
- Error response from Claude Code
- Database integrity verified
- Logs show interrupted execution

---

### Edge 9: kb_search Fallback Mode

**Setup:**
- OpenAI API key invalid or quota exceeded

**Action:**
Call `kb_search` with valid query

**Expected Outcome:**
- Falls back to keyword-only search
- Returns results ranked by keyword relevance
- Metadata shows `fallback_mode: true`

**Evidence:**
- Results returned (not empty)
- Metadata field confirms fallback
- Logs show "OpenAI API unavailable, using keyword-only fallback"

---

## Required Tooling Evidence

### MCP Protocol Testing

**Required tools:**
- Claude Code CLI or MCP Inspector tool
- `~/.claude/mcp.json` configuration

**Required assertions:**
- MCP server discoverable by Claude Code
- All 10 tools listed in server capabilities
- Tool schemas match Zod input schemas
- Tool invocations logged with request/response

**Artifacts:**
- Screenshots of Claude Code tool list
- MCP protocol request/response logs
- `~/.claude/mcp.json` file contents

---

### Backend Testing

**Required .http requests:**
- Direct database queries to verify CRUD operations
- Not applicable (MCP tools, not HTTP)

**Required test harness:**
- Integration test suite simulating MCP client
- Mock MCP protocol requests/responses
- Vitest test files calling tool handlers directly

**Assertions:**
- All tool handlers return correct response shapes
- All Zod schemas validate correctly
- All database queries execute successfully
- All error cases handled gracefully

**Artifacts:**
- Vitest coverage report (>80% target)
- Test logs showing all scenarios passing

---

### Logging Evidence

**Required @repo/logger output:**
- Tool invocation logs at info level: `kb_add called with role=dev`
- Success logs: `kb_add succeeded: entry_id=<UUID>`
- Error logs: `kb_add failed: <error message>`
- Performance logs: `kb_search completed in 234ms`

**Log levels:**
- `info`: Tool invocations, success, performance
- `warn`: Fallback mode, retries
- `error`: Failures, exceptions
- `debug`: Internal details (embedding generation, query execution)

---

## Risks to Call Out

### Risk 1: MCP SDK Integration Complexity

**Description:** The @modelcontextprotocol/sdk is a new dependency with limited documentation. Integration patterns may require experimentation.

**Mitigation:**
- Review official MCP SDK examples
- Start with simplest tool (kb_get)
- Test incrementally

**Test Coverage:**
- Integration test that simulates MCP client requests
- All 10 tools tested via MCP protocol

---

### Risk 2: Claude Code Spawning and Communication

**Description:** Unclear how Claude Code spawns and manages MCP server lifecycle. Server may crash or not restart properly.

**Mitigation:**
- Document deployment topology (embedded vs separate service)
- Add health check endpoint
- Test server restart scenarios

**Test Coverage:**
- Edge case: MCP server restart during tool call
- Error case: MCP server not running

---

### Risk 3: Error Handling Across MCP Boundary

**Description:** Errors must cross MCP protocol boundary correctly. Stack traces, validation errors, and database errors need consistent serialization.

**Mitigation:**
- Sanitize all error messages (no SQL, no secrets)
- Use structured error responses
- Log full errors server-side

**Test Coverage:**
- All 6 error cases in test plan
- Verify client sees sanitized errors
- Verify server logs show full errors

---

### Risk 4: Tool Schema Validation

**Description:** MCP tool schemas must match Zod input schemas. Mismatch will cause runtime validation failures.

**Mitigation:**
- Generate MCP schemas from Zod schemas programmatically
- Add integration test verifying schema parity
- Use TypeScript types to ensure consistency

**Test Coverage:**
- Error case: Invalid MCP tool schema
- Validation errors return correct field names

---

### Risk 5: Performance at Scale

**Description:** MCP protocol overhead may add latency to tool invocations. Acceptable latency depends on usage patterns.

**Mitigation:**
- Benchmark all tools with realistic data
- Log performance metrics (query_time_ms)
- Set performance targets (e.g., kb_search < 500ms p95)

**Test Coverage:**
- Edge case: Large content (10k characters)
- Edge case: kb_rebuild_embeddings on 1,000 entries
- Performance logs in all happy path tests

---

### Risk 6: Database Connection Pooling

**Description:** Multiple Claude Code sessions may spawn multiple MCP server instances, exhausting database connections.

**Mitigation:**
- Configure connection pool limits
- Monitor connection usage
- Document deployment topology

**Test Coverage:**
- Edge case: Concurrent tool invocations (10 parallel)
- Monitor connection pool metrics during test

---

## Test Execution Notes

**Prerequisites:**
- Docker Compose running (PostgreSQL with pgvector)
- OpenAI API key set in environment
- MCP server registered in `~/.claude/mcp.json`
- Database seeded with test fixtures

**Test order:**
1. Happy path tests (establish baseline functionality)
2. Error cases (verify resilience)
3. Edge cases (verify robustness)

**Evidence collection:**
- Vitest coverage report
- Claude Code screenshots showing tool list
- MCP protocol logs (request/response)
- Database query results
- Server logs (@repo/logger output)

**Success criteria:**
- All happy path tests pass
- All error cases handled gracefully
- All edge cases covered
- Test coverage >80%
- No console.log usage (all @repo/logger)
