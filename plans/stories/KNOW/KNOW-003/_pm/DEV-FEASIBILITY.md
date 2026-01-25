# Dev Feasibility Review: KNOW-003 Core CRUD Operations

**Story**: KNOW-003
**Feature**: Core CRUD Operations (kb_add, kb_get, kb_update, kb_delete, kb_list)
**Generated**: 2026-01-25

---

## Feasibility Summary

**Feasible:** Yes

**Confidence:** High

**Why:**
- Database schema already exists (KNOW-001 ✅)
- EmbeddingClient already implemented (KNOW-002 ✅)
- Drizzle ORM provides type-safe database operations
- All dependencies are in place
- Straightforward CRUD implementation following established patterns
- No novel technical challenges

This is a well-scoped, implementable story with clear acceptance criteria.

---

## Likely Change Surface

### Packages Impacted

**Primary:**
- `apps/api/knowledge-base/src/crud-operations/` (new directory)
  - `kb-add.ts`
  - `kb-get.ts`
  - `kb-update.ts`
  - `kb-delete.ts`
  - `kb-list.ts`
  - `index.ts` (exports)
  - `__tests__/` (test files)

**Secondary:**
- `apps/api/knowledge-base/src/__types__/index.ts` (may need additional schemas)
- `apps/api/knowledge-base/src/db/client.ts` (already exists, may need minor updates)

### Database Tables

- `knowledge_entries` (read/write)
- `embedding_cache` (read/write via EmbeddingClient)

### External Dependencies

- OpenAI API (via EmbeddingClient for kb_add and kb_update)
- PostgreSQL with pgvector extension

---

## Risk Register

### Risk 1: Embedding Generation Before Database Insert

**Why it's risky:**
If embedding generation fails after database insert, we have an orphaned entry with no embedding.

**Mitigation PM should bake into AC:**
- **AC**: "kb_add and kb_update MUST generate embeddings BEFORE database insert"
- **AC**: "If embedding generation fails, no database write occurs"
- Test case: Mock OpenAI failure and verify no database entry created

---

### Risk 2: Content Hash Deduplication Logic

**Why it's risky:**
The story mentions "deduplication" but it's unclear what behavior is expected:
- Should duplicate content be rejected?
- Should it create separate entries but reuse cached embedding?
- What if content is identical but role/tags differ?

**Mitigation PM should bake into AC:**
- **CLARIFICATION NEEDED**: Deduplication means:
  - ✅ Multiple entries CAN have identical content (different IDs)
  - ✅ BUT embedding is only generated once (cached by content hash)
  - ✅ This is cost optimization, NOT duplicate prevention
- **AC**: "kb_add with duplicate content creates new entry but reuses cached embedding"
- Test case: Add same content twice, verify 2 entries but 1 API call

---

### Risk 3: kb_update Content Change Semantics

**Why it's risky:**
When content is updated, do we:
- Always regenerate embedding (expensive)?
- Check if content actually changed first?
- What if only tags/role changed (no re-embedding needed)?

**Mitigation PM should bake into AC:**
- **AC**: "kb_update regenerates embedding ONLY if content field is provided and differs from existing"
- **AC**: "Updating only tags/role does NOT trigger re-embedding"
- **AC**: "Content hash comparison determines if re-embedding is needed"
- Test case: Update tags only → no new embedding
- Test case: Update content → new embedding generated

---

### Risk 4: kb_delete Cascade Behavior

**Why it's risky:**
When deleting a knowledge entry, what happens to:
- Cached embeddings in `embedding_cache`?
- Related search history (if KNOW-004 is implemented)?

**Mitigation PM should bake into AC:**
- **AC**: "kb_delete removes entry from knowledge_entries table only"
- **AC**: "Cached embeddings in embedding_cache are NOT deleted (cache orphaning is acceptable)"
- **JUSTIFICATION**: Cache cleanup is low priority; orphaned cache entries don't affect correctness
- Future enhancement (KNOW-007): Cache cleanup job

---

### Risk 5: kb_list Performance with Large Datasets

**Why it's risky:**
Without proper indexing, kb_list with role/tag filters could be slow on large datasets.

**Mitigation PM should bake into AC:**
- **AC**: "kb_list uses role_idx index for role filtering"
- **AC**: "kb_list enforces maximum limit of 100 results (per SimilaritySearchParamsSchema)"
- **AC**: "Results ordered by created_at DESC using existing index"
- **NOTE**: Tag filtering may be slower (no GIN index yet); acceptable for MVP
- Future enhancement (KNOW-007): Add GIN index on tags array if performance issues arise

---

### Risk 6: Error Handling Consistency

**Why it's risky:**
Different error types (validation, not found, database, OpenAI API) need consistent handling.

**Mitigation PM should bake into AC:**
- **AC**: "Validation errors throw ZodError with descriptive messages"
- **AC**: "Not found errors throw custom NotFoundError (or return null for kb_get)"
- **AC**: "Database errors propagate with sanitized messages (no SQL injection exposure)"
- **AC**: "OpenAI API errors propagate from EmbeddingClient with retry context"
- **AC**: "All errors are logged with @repo/logger"

---

### Risk 7: Concurrent Operations on Same Entry

**Why it's risky:**
Two processes updating/deleting the same entry simultaneously could cause race conditions.

**Mitigation PM should bake into AC:**
- **AC**: "Last-write-wins semantics acceptable for MVP"
- **AC**: "PostgreSQL row-level locking prevents data corruption"
- **AC**: "No optimistic locking or version field required for KNOW-003"
- **NOTE**: Optimistic locking is OUT OF SCOPE for this story
- Test case: Concurrent updates to same entry should not crash/deadlock

---

### Risk 8: kb_list Tag Filtering Semantics

**Why it's risky:**
Array filtering with PostgreSQL can be implemented multiple ways:
- ANY tag matches (OR logic)?
- ALL tags match (AND logic)?
- Exact array equality?

**Mitigation PM should bake into AC:**
- **CLARIFICATION NEEDED**: Tag filtering behavior:
  - Recommended: "Entry must have AT LEAST ONE matching tag (OR logic)"
  - Use PostgreSQL `tags && ARRAY['tag1', 'tag2']` operator
- **AC**: "kb_list tags filter uses ANY match semantics (entry has at least one tag from filter)"
- Test case: Entry with tags=['a', 'b'], filter tags=['b', 'c'] → should match

---

### Risk 9: Null/Undefined Tags Handling

**Why it's risky:**
Tags are optional (nullable). Need consistent behavior:
- `tags: null` vs `tags: []` vs `tags: undefined`

**Mitigation PM should bake into AC:**
- **AC**: "tags field accepts: array of strings, null, or undefined"
- **AC**: "null and undefined are stored as NULL in database"
- **AC**: "Empty array [] is stored as empty array (NOT NULL)"
- **AC**: "kb_list with no tags filter returns entries regardless of tags value"
- Test case: Add entry with tags=null, tags=[], tags=['a'] and verify all behaviors

---

### Risk 10: OpenAI Token Limits

**Why it's risky:**
OpenAI text-embedding-3-small has 8191 token limit. Very long content may exceed this.

**Mitigation PM should bake into AC:**
- **AC**: "Content exceeding OpenAI token limits throws descriptive error"
- **AC**: "No automatic truncation (caller must handle long content)"
- **OUT OF SCOPE**: Automatic chunking for long content (future enhancement)
- Test case: Add entry with 10k character content → should succeed (under token limit)
- Test case: Add entry with 50k character content → may fail (over token limit)

---

## Scope Tightening Suggestions (Non-breaking)

### Suggestion 1: Explicit Return Types

**Current ambiguity:**
Story doesn't specify return types for each operation.

**Recommendation:**
- `kb_add`: Returns `string` (UUID of created entry)
- `kb_get`: Returns `KnowledgeEntry | null` (null if not found)
- `kb_update`: Returns `KnowledgeEntry` (updated entry) OR throws NotFoundError
- `kb_delete`: Returns `void` OR `{ success: boolean }` (idempotent)
- `kb_list`: Returns `KnowledgeEntry[]` (empty array if no matches)

---

### Suggestion 2: Validation Early, Fail Fast

**Recommendation:**
- Validate all inputs with Zod schemas BEFORE any database/API calls
- This prevents partial operations and simplifies error handling
- Use existing schemas from `src/__types__/index.ts`

---

### Suggestion 3: Transaction Boundaries

**Current ambiguity:**
No mention of database transactions.

**Recommendation:**
- `kb_add` and `kb_update`: Generate embedding first, then single INSERT/UPDATE query (no transaction needed)
- If multi-step operations are added later, use Drizzle transactions
- For KNOW-003 MVP: Single-query operations, no explicit transactions

---

### Suggestion 4: Logging Standards

**Recommendation:**
- Use `@repo/logger` for all logging (no console.log)
- Log levels:
  - `info`: Successful CRUD operations (kb_add success, kb_delete success)
  - `debug`: Cache hits, query details
  - `warn`: API retry attempts, unexpected null results
  - `error`: Validation failures, database errors, API failures
- Include story ID in log context: `{ story: 'KNOW-003' }`

---

## Missing Requirements / Ambiguities

### Ambiguity 1: kb_get Return Value for Not Found

**What's unclear:**
Should kb_get return `null` or throw `NotFoundError` when entry doesn't exist?

**Recommended decision text PM should include:**

> **AC**: kb_get returns `null` if entry with given ID does not exist. This is NOT an error condition.
>
> **RATIONALE**: Returning null is more ergonomic for callers who may check existence. Throwing errors for not-found is reserved for update/delete operations where the caller expects the entry to exist.

---

### Ambiguity 2: kb_delete Idempotency

**What's unclear:**
Should deleting a non-existent entry succeed (idempotent) or throw error?

**Recommended decision text PM should include:**

> **AC**: kb_delete is idempotent. Deleting a non-existent entry returns success without error.
>
> **RATIONALE**: Idempotent deletes simplify caller logic and align with REST DELETE semantics. The goal is "ensure entry doesn't exist," not "prove entry existed before deletion."

---

### Ambiguity 3: kb_update Partial Updates

**What's unclear:**
Can caller update only some fields (partial update) or must all fields be provided?

**Recommended decision text PM should include:**

> **AC**: kb_update supports partial updates. Only provided fields are updated; omitted fields remain unchanged.
>
> **EXAMPLE**:
> ```typescript
> await kb_update({
>   id: '<uuid>',
>   tags: ['new-tag']  // Only tags updated; content and role unchanged
> })
> ```
>
> **VALIDATION**: At least one of (content, role, tags) must be provided. Updating with no fields throws validation error.

---

### Ambiguity 4: kb_list Default Behavior

**What's unclear:**
If no filters provided, what does kb_list return?

**Recommended decision text PM should include:**

> **AC**: kb_list with no filters returns all entries (up to limit) ordered by created_at DESC (newest first).
>
> **DEFAULT LIMIT**: 10 entries (per SimilaritySearchParamsSchema default)
>
> **MAXIMUM LIMIT**: 100 entries (enforced by schema)

---

### Ambiguity 5: Content Uniqueness Constraint

**What's unclear:**
Can multiple entries have identical content? (The story mentions deduplication but doesn't clarify this.)

**Recommended decision text PM should include:**

> **AC**: Multiple knowledge entries CAN have identical content. There is NO uniqueness constraint on the content field.
>
> **DEDUPLICATION**: Refers to caching embeddings by content hash, NOT preventing duplicate content entries.
>
> **USE CASE**: Same knowledge may be relevant for different roles/tags, justifying duplicate content with different metadata.

---

## Evidence Expectations

### What proof/dev should capture:

1. **Test Suite Output:**
   - Vitest test results showing all tests passing
   - Coverage report showing ≥80% line coverage for crud-operations directory

2. **Database State Verification:**
   - Before/after snapshots of knowledge_entries table
   - Proof that embeddings are cached (show embedding_cache table growth)
   - Show deduplication working (2 adds with same content → 1 cache entry)

3. **Error Handling Evidence:**
   - Log output showing ZodError for invalid input
   - Log output showing retry attempts for OpenAI API failure
   - Error messages are user-friendly (no stack traces in user-facing errors)

4. **Performance Baseline:**
   - Measure time for kb_add with typical content (should be <3 seconds)
   - Measure time for kb_list with 100 results (should be <1 second)

5. **Integration with EmbeddingClient:**
   - Show cache hit logs when adding duplicate content
   - Show embedding generation logs for new content

---

## What might fail in CI/deploy

### CI Failure Scenarios:

1. **Docker not running:**
   - Tests require PostgreSQL container
   - CI pipeline must start docker-compose before running tests
   - Ensure CI has Docker installed and running

2. **OpenAI API key not set:**
   - Tests that hit real OpenAI API will fail without key
   - Solution: Mock OpenAI in tests OR use test API key in CI secrets

3. **Database migration not applied:**
   - Tests assume schema is initialized
   - Solution: Run `pnpm db:init` in CI before tests

4. **Port conflicts:**
   - PostgreSQL default port 5433 may conflict in CI
   - Solution: Use random port or docker-compose in CI environment

5. **Test isolation failures:**
   - Tests may fail if run in parallel without proper cleanup
   - Solution: Use test database transactions or unique test data

---

## Ports & Adapters Architecture Notes

### Adapter Layer (Database):
- `src/db/client.ts` - Drizzle database client
- `src/db/schema.ts` - Database schema definitions
- CRUD operations use Drizzle ORM for type-safe queries

### Domain Layer (Business Logic):
- `src/crud-operations/` - Core CRUD functions
- Input validation using Zod schemas
- Business rules (deduplication, re-embedding on update)

### Infrastructure Layer (External Services):
- `src/embedding-client/` - OpenAI API adapter (KNOW-002)
- Isolates OpenAI API details from business logic

### Dependency Flow:
```
CRUD Operations → Embedding Client → OpenAI API
       ↓
   Drizzle ORM → PostgreSQL + pgvector
```

**Key principle**: CRUD operations are pure functions that orchestrate database and embedding operations. No side effects or global state.

---

## Reuse Verification Required

Per execution plan, proof document MUST include:

### Packages Reused:
- ✅ `@repo/logger` - All logging
- ✅ `apps/api/knowledge-base/src/db` - Database client (KNOW-001)
- ✅ `apps/api/knowledge-base/src/embedding-client` - Embedding generation (KNOW-002)
- ✅ `apps/api/knowledge-base/src/__types__` - Zod schemas

### Why no new packages needed:
- All required infrastructure already exists in workspace
- CRUD operations are specific to knowledge-base app (not shared)
- No new shared utilities needed

---

## Summary

This story is **highly feasible** with **high confidence**. The main risks are around clarifying requirements (deduplication semantics, error handling, partial updates) rather than technical challenges.

**Recommended next steps for PM:**
1. Clarify ambiguities listed above in story acceptance criteria
2. Add explicit AC for error handling consistency
3. Specify return types for all 5 operations
4. Document deduplication as "caching optimization" not "duplicate prevention"

Once these clarifications are in the story, implementation should be straightforward.
