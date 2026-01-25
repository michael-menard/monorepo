# Dev Feasibility Review: KNOW-003 Core CRUD Operations

## Feasibility Summary

**Feasible:** Yes
**Confidence:** High
**Why:** This story implements standard CRUD operations on a PostgreSQL database with well-established patterns. The embedding integration from KNOW-002 is already implemented, and CRUD logic follows conventional repository patterns compatible with our monorepo architecture.

## Likely Change Surface

### Areas/Packages Likely Impacted

**New Implementation:**
- `apps/api/knowledge-base/crud/` (new directory)
  - `kb-add.ts` - Add operation with deduplication
  - `kb-get.ts` - Get by ID operation
  - `kb-update.ts` - Update operation with re-embedding
  - `kb-delete.ts` - Delete operation
  - `kb-list.ts` - List with pagination
  - `__types__/index.ts` - Zod schemas for CRUD operations
  - `__tests__/` - Vitest test suite

**Database Schema:**
- `apps/api/knowledge-base/schema/`
  - `knowledge_entries` table definition
  - Migration script for table creation
  - Indexes: primary key (id), unique constraint (content_hash), created_at index

**Shared Package Reuse:**
- `@repo/logger` - All logging operations
- `apps/api/knowledge-base/embedding-client/` (KNOW-002) - Embedding generation
- PostgreSQL client from `apps/api/core/database/client.ts` (if exists)

### Endpoints Likely Impacted

**None** - This story implements internal CRUD functions that will be exposed as MCP tools in KNOW-005. No API Gateway endpoints are involved.

### Migration/Deploy Touchpoints

**Database Migration:**
- New migration file: `001_create_knowledge_entries_table.sql`
- Must run before KNOW-003 code can execute
- Migration includes:
  - `knowledge_entries` table with columns: id, content, content_hash, tags, source, embedding, created_at, updated_at
  - Unique constraint on content_hash for deduplication
  - GIN index on tags array for filtering performance
  - Index on created_at for list sorting

**Environment Variables:**
- Inherits from KNOW-001 and KNOW-002 (PostgreSQL connection, OpenAI API key)
- No new environment variables required

**Deployment:**
- No Lambda deployment changes (code only runs locally for now)
- Docker Compose must include knowledge_entries table schema

## Risk Register (Top 10)

### Risk 1: Transaction Boundary Management
**Why it's risky:** CRUD operations must coordinate between knowledge_entries table and embedding generation. If embedding fails after DB insert, we risk orphaned entries. If DB fails after embedding, we risk wasted API calls.

**Mitigation PM should bake into AC:**
- AC must specify transaction rollback behavior on embedding failure
- Test plan must include "embedding fails mid-add" scenario
- Document transaction boundaries explicitly in story

---

### Risk 2: Content Hash Deduplication Race Conditions
**Why it's risky:** Two concurrent kb_add calls with identical content could both check for duplicates, find none, then both insert. This creates duplicate content_hash entries, violating unique constraint.

**Mitigation PM should bake into AC:**
- Add AC for concurrent add scenario with identical content
- Specify database-level unique constraint on content_hash
- Test concurrent requests explicitly (Promise.all test case)

---

### Risk 3: Embedding Re-generation Cost on Update
**Why it's risky:** Every kb_update triggers new embedding generation, even for minor content changes. This could become expensive at scale.

**Mitigation PM should bake into AC:**
- Document in Non-Goals: "Smart update diffing is out of scope"
- AC should explicitly state: "Updates ALWAYS re-generate embeddings"
- Log estimated cost for each update operation

---

### Risk 4: Large Content Handling
**Why it's risky:** PostgreSQL text columns can store gigabytes, but OpenAI has 8191 token limit. Large content must be truncated before embedding, creating inconsistency between stored content and embedding.

**Mitigation PM should bake into AC:**
- AC must specify truncation behavior for large content
- Test plan must include "near token limit" test case
- Log warnings when truncation occurs

---

### Risk 5: Tag Array Query Performance
**Why it's risky:** PostgreSQL array queries (e.g., "WHERE 'dev' = ANY(tags)") can be slow without proper indexing. Performance degrades with large knowledge bases.

**Mitigation PM should bake into AC:**
- Specify GIN index on tags column in schema
- Include pagination limits in kb_list (max 100 per page)
- Defer "tag-based search optimization" to KNOW-007 if needed

---

### Risk 6: Soft Delete vs Hard Delete Ambiguity
**Why it's risky:** Story says "Delete operation" but doesn't specify hard vs soft delete. Soft delete requires additional schema (deleted_at column) and impacts all queries. Hard delete simplifies implementation but loses data permanently.

**Mitigation PM should bake into AC:**
- Explicitly state: "kb_delete performs HARD delete from database"
- Clarify: "Embeddings remain in cache for potential reuse"
- Document in Non-Goals if soft delete is not required

---

### Risk 7: Missing Database Client Abstraction
**Why it's risky:** KNOW-001 may not have created a shared PostgreSQL client utility. Each CRUD operation might duplicate connection logic, leading to inconsistent error handling and connection pooling issues.

**Mitigation PM should bake into AC:**
- Add to Reuse Plan: "Use existing PostgreSQL client from apps/api/core/database/ or create one"
- Specify connection pooling requirements
- Test plan must include "database connection failure" scenarios

---

### Risk 8: Whitespace Normalization Inconsistency
**Why it's risky:** Content hashing requires normalization (trim, collapse spaces), but rules are ambiguous. Should we preserve newlines? Preserve tabs? Normalize Unicode? Inconsistent normalization breaks deduplication.

**Mitigation PM should bake into AC:**
- AC8 must specify exact normalization rules (trim edges, collapse spaces, preserve newlines)
- Include test case with weird whitespace
- Use standard library for normalization (no custom regex)

---

### Risk 9: Embedding Vector Storage Overhead
**Why it's risky:** Storing 1536-dimensional vectors directly in knowledge_entries duplicates data from embedding_cache. This doubles storage and complicates updates (must update both tables).

**Mitigation PM should bake into AC:**
- Clarify if embeddings are stored in knowledge_entries OR retrieved from embedding_cache via join
- Prefer join approach to avoid duplication
- Document foreign key relationship if using join

---

### Risk 10: kb_list Pagination Without Total Count
**Why it's risky:** Pagination requires total count for UI (e.g., "Showing 1-50 of 1000"). Without total count query, clients can't implement pagination controls. But COUNT(*) queries on large tables are expensive.

**Mitigation PM should bake into AC:**
- kb_list AC must specify: "Returns { entries: [], total: N }"
- Document performance implication of COUNT(*) query
- Defer "optimized total count caching" to KNOW-007 if needed

---

## Scope Tightening Suggestions (Non-breaking)

### Suggestion 1: Explicitly Defer Tag Filtering
kb_list currently has no tag filtering specified. Adding "filter by tags" adds complexity (array queries, index considerations). Suggest deferring to KNOW-004 (search story) where semantic + tag filtering is more appropriate.

**Proposed AC clarification:**
"kb_list returns ALL entries with pagination. Tag filtering is OUT OF SCOPE (deferred to kb_search in KNOW-004)."

---

### Suggestion 2: Hard-Code Sort Order
Story doesn't specify sort order for kb_list. Allowing custom sort adds complexity (SQL injection risk, multiple indexes). Suggest hard-coding to `created_at DESC` for MVP.

**Proposed AC clarification:**
"kb_list always sorts by created_at DESC (newest first). Custom sort order is OUT OF SCOPE."

---

### Suggestion 3: Limit kb_list Max Page Size
Unbounded limit parameter allows clients to request 10,000 entries in one query, risking memory/performance issues. Suggest max limit of 100.

**Proposed AC clarification:**
"kb_list limit parameter has max value of 100. Requests exceeding 100 are clamped to 100."

---

### Suggestion 4: Explicit NULL Handling for Optional Fields
Story doesn't clarify if `source` field is required or optional. If optional, NULL handling must be explicit.

**Proposed AC clarification:**
"source field is REQUIRED (non-null). If caller provides empty string, validation error is thrown."

---

## Missing Requirements / Ambiguities

### Ambiguity 1: Embedding Storage Location
**What's unclear:** Does knowledge_entries table store embeddings directly, or join to embedding_cache?

**Recommended decision text PM should include:**
"Embeddings are stored in knowledge_entries.embedding column (vector(1536)) for fast retrieval. This duplicates data from embedding_cache but avoids join complexity. Cache remains source of truth for deduplication."

---

### Ambiguity 2: Update Partial vs Full
**What's unclear:** Does kb_update allow partial updates (e.g., change tags only, keep content), or require full replacement?

**Recommended decision text PM should include:**
"kb_update requires all fields (content, tags, source). Partial updates are NOT supported. Omitting a field results in validation error."

---

### Ambiguity 3: Duplicate Content Error vs Warning
**What's unclear:** When deduplication detects duplicate content, should kb_add throw error or return existing entry?

**Recommended decision text PM should include:**
"kb_add throws error on duplicate content_hash. Error response includes existing_id for caller reference. This is NOT idempotent - callers must handle duplicate error explicitly."

---

### Ambiguity 4: Content Normalization Before Hashing
**What's unclear:** Exact whitespace normalization rules before SHA-256 hashing.

**Recommended decision text PM should include:**
"Before hashing, content is normalized: (1) trim leading/trailing whitespace, (2) collapse consecutive spaces to single space, (3) preserve newlines and tabs. Use JavaScript `.trim()` and `.replace(/\s+/g, ' ')` pattern."

---

### Ambiguity 5: Tag Validation Rules
**What's unclear:** Are there constraints on tag format? Max length? Allowed characters? Case sensitivity?

**Recommended decision text PM should include:**
"Tags must be: (1) lowercase alphanumeric plus hyphens, (2) max 50 characters, (3) unique within entry (no duplicates). Zod schema: `z.string().regex(/^[a-z0-9-]+$/).max(50)`.array().min(1)`"

---

### Ambiguity 6: kb_list Default Limit
**What's unclear:** If caller omits limit parameter, how many results are returned?

**Recommended decision text PM should include:**
"kb_list default limit is 50 if not specified. Default offset is 0."

---

## Evidence Expectations

### What Proof/Dev Should Capture

**Database Evidence:**
1. SQL dump of knowledge_entries table schema
2. Screenshot/output of `\d knowledge_entries` in psql showing columns, types, constraints
3. SQL query demonstrating unique constraint on content_hash (INSERT duplicate should fail)

**CRUD Operation Evidence:**
4. Vitest test output showing >80% code coverage
5. Example MCP tool invocation and response JSON for each operation (add, get, update, delete, list)
6. @repo/logger output showing key operations (add success, duplicate detected, update re-embedding, delete)

**Deduplication Evidence:**
7. Test output showing concurrent add scenario (5 parallel requests, only 1 succeeds)
8. Test output showing cache hit when adding duplicate content (no OpenAI API call)

**Transaction Evidence:**
9. Test output showing rollback on embedding failure (no orphaned DB entry)

**Performance Evidence:**
10. kb_list response time with 1000 entries (should be <200ms)

---

### What Might Fail in CI/Deploy

**CI Failures:**
1. **Database not running** - Tests require PostgreSQL with pgvector. CI must spin up Docker container before tests.
2. **Missing OPENAI_API_KEY** - Tests that mock embedding client will pass, but integration tests need real API key.
3. **Race condition in concurrent tests** - Parallel test execution might create flaky deduplication tests without proper cleanup.
4. **Coverage below 80%** - If error paths not fully tested, coverage gate fails.

**Deploy Failures:**
1. **Migration not applied** - knowledge_entries table doesn't exist, all operations fail.
2. **Embedding client not initialized** - KNOW-002 dependencies missing, kb_add fails on embedding generation.
3. **Connection pool exhausted** - If connection pooling not configured, concurrent operations deadlock.

**Recommended CI Setup:**
- Docker Compose in CI with PostgreSQL + pgvector
- Mock OpenAI API in unit tests, use real API in integration tests (separate job)
- Sequential test execution for deduplication scenarios
- Pre-test cleanup script (truncate knowledge_entries before each test file)
