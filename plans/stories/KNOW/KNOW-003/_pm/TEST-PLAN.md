# Test Plan: KNOW-003 Core CRUD Operations

**Story**: KNOW-003
**Feature**: Core CRUD Operations (kb_add, kb_get, kb_update, kb_delete, kb_list)
**Generated**: 2026-01-25

---

## Scope Summary

**Endpoints Touched:**
- None (MCP tools, not HTTP endpoints)

**MCP Tools Implemented:**
- `kb_add` - Add new knowledge entry
- `kb_get` - Retrieve knowledge entry by ID
- `kb_update` - Update existing knowledge entry
- `kb_delete` - Delete knowledge entry
- `kb_list` - List knowledge entries with filtering

**UI Touched:** No

**Data/Storage Touched:** Yes
- `knowledge_entries` table (PostgreSQL)
- `embedding_cache` table (via EmbeddingClient)
- pgvector operations

---

## Happy Path Tests

### Test 1: Add Knowledge Entry (kb_add)

**Setup:**
- Database initialized with schema
- OpenAI API key configured
- No existing entry with the test content

**Action:**
```typescript
const result = await kb_add({
  content: 'Always use Zod schemas for types - never use TypeScript interfaces',
  role: 'dev',
  tags: ['typescript', 'best-practice']
})
```

**Expected Outcome:**
- Returns knowledge entry ID (UUID format)
- Entry saved to `knowledge_entries` table
- Embedding generated via EmbeddingClient and cached
- `createdAt` and `updatedAt` timestamps set

**Evidence:**
- Validate returned ID is valid UUID
- Query database to confirm entry exists
- Verify `embedding` field is VECTOR(1536)
- Verify `role` = 'dev'
- Verify `tags` = ['typescript', 'best-practice']
- Check `embedding_cache` table has new entry with content hash

---

### Test 2: Retrieve Knowledge Entry (kb_get)

**Setup:**
- Knowledge entry exists from Test 1

**Action:**
```typescript
const entry = await kb_get({ id: '<uuid-from-test-1>' })
```

**Expected Outcome:**
- Returns full knowledge entry object
- All fields match original values
- Embedding vector included

**Evidence:**
- Validate returned object structure matches KnowledgeEntrySchema
- Verify `content` matches original
- Verify `role` = 'dev'
- Verify `tags` array matches
- Verify `embedding` is array of 1536 numbers

---

### Test 3: Update Knowledge Entry (kb_update)

**Setup:**
- Knowledge entry exists from Test 1

**Action:**
```typescript
const updated = await kb_update({
  id: '<uuid-from-test-1>',
  content: 'UPDATED: Always use Zod schemas for runtime validation',
  tags: ['typescript', 'validation', 'zod']
})
```

**Expected Outcome:**
- Entry updated in database
- New embedding generated for updated content
- `updatedAt` timestamp changed
- `createdAt` timestamp unchanged

**Evidence:**
- Verify `content` contains "UPDATED:"
- Verify `tags` = ['typescript', 'validation', 'zod']
- Verify `updatedAt` > `createdAt`
- Verify new embedding in `embedding_cache` with new content hash
- Old cache entry may remain (cache doesn't auto-expire)

---

### Test 4: List Knowledge Entries (kb_list)

**Setup:**
- Multiple knowledge entries exist with different roles and tags
- At least 3 entries with role='dev'
- At least 2 entries with tag='typescript'

**Action:**
```typescript
const results = await kb_list({
  role: 'dev',
  tags: ['typescript'],
  limit: 10
})
```

**Expected Outcome:**
- Returns array of knowledge entries
- All entries have role='dev'
- All entries have 'typescript' in tags
- Ordered by `createdAt` DESC (newest first)
- Maximum 10 results

**Evidence:**
- Validate result count ≤ 10
- Verify every entry has role='dev'
- Verify every entry has 'typescript' in tags array
- Verify ordering (compare createdAt timestamps)

---

### Test 5: Delete Knowledge Entry (kb_delete)

**Setup:**
- Knowledge entry exists from Test 1 (or create new one)

**Action:**
```typescript
const result = await kb_delete({ id: '<uuid>' })
```

**Expected Outcome:**
- Entry removed from `knowledge_entries` table
- Returns success confirmation
- Subsequent kb_get returns null or error

**Evidence:**
- Query database to confirm entry no longer exists
- Attempt kb_get with same ID → should fail
- Embedding cache entry may remain (cache doesn't auto-delete)

---

### Test 6: Deduplication (Content Hash)

**Setup:**
- No existing entry with test content

**Action:**
```typescript
// Add same content twice
const id1 = await kb_add({
  content: 'Deduplication test content',
  role: 'dev',
  tags: ['test']
})

const id2 = await kb_add({
  content: 'Deduplication test content',  // Same content
  role: 'dev',
  tags: ['test']
})
```

**Expected Outcome:**
- Two separate entries created (IDs are different)
- BUT embedding generated only once (cache hit on second)
- Both entries have same embedding vector

**Evidence:**
- Verify id1 ≠ id2
- Query database: 2 entries with same content exist
- Check embedding_cache: only 1 cache entry for this content hash
- Verify both DB entries have identical embedding vectors
- Check logs for cache hit on second add

---

## Error Cases

### Error 1: Add Entry with Empty Content

**Setup:**
- Database initialized

**Action:**
```typescript
await kb_add({
  content: '',
  role: 'dev',
  tags: []
})
```

**Expected:**
- Throws validation error (ZodError)
- Error message: "Content cannot be empty"
- No database write

**Evidence:**
- Catch error and validate error.name === 'ZodError'
- Verify database entry count unchanged

---

### Error 2: Add Entry with Invalid Role

**Setup:**
- Database initialized

**Action:**
```typescript
await kb_add({
  content: 'Test content',
  role: 'invalid-role',  // Not 'pm', 'dev', 'qa', or 'all'
  tags: []
})
```

**Expected:**
- Throws validation error (ZodError)
- Error indicates invalid role enum value
- No database write

**Evidence:**
- Catch error and validate it's a ZodError
- Verify error.issues includes role field
- Database unchanged

---

### Error 3: Get Non-Existent Entry

**Setup:**
- Database initialized
- Generate random UUID that doesn't exist

**Action:**
```typescript
const entry = await kb_get({ id: '00000000-0000-0000-0000-000000000000' })
```

**Expected:**
- Returns null OR throws NotFoundError
- No crash or unhandled exception

**Evidence:**
- Validate result is null or error is caught
- Error message should be user-friendly

---

### Error 4: Update Non-Existent Entry

**Setup:**
- Database initialized
- Random UUID that doesn't exist

**Action:**
```typescript
await kb_update({
  id: '00000000-0000-0000-0000-000000000000',
  content: 'Updated content'
})
```

**Expected:**
- Throws NotFoundError
- Error message indicates entry not found
- Database unchanged

**Evidence:**
- Catch error and validate error type
- Database entry count unchanged

---

### Error 5: Delete Non-Existent Entry

**Setup:**
- Database initialized

**Action:**
```typescript
await kb_delete({ id: '00000000-0000-0000-0000-000000000000' })
```

**Expected:**
- Returns success (idempotent) OR throws NotFoundError
- No crash

**Evidence:**
- Validate response or error handling
- Database unchanged

---

### Error 6: OpenAI API Failure During Add

**Setup:**
- Mock OpenAI API to return 500 error
- Database initialized

**Action:**
```typescript
await kb_add({
  content: 'Test content',
  role: 'dev',
  tags: []
})
```

**Expected:**
- EmbeddingClient retry logic kicks in (3 attempts)
- After retries exhausted, throws error
- No partial database write (transaction rolled back)

**Evidence:**
- Check logs for retry attempts
- Verify database has no entry with this content
- Error message indicates embedding generation failure

---

## Edge Cases

### Edge 1: Add Entry with Maximum Content Length

**Setup:**
- Generate content with 10,000+ characters
- Database initialized

**Action:**
```typescript
const longContent = 'x'.repeat(10000)
await kb_add({
  content: longContent,
  role: 'dev',
  tags: ['test']
})
```

**Expected:**
- Entry created successfully
- Embedding generated (OpenAI supports up to 8191 tokens for text-embedding-3-small)
- Database stores full content

**Evidence:**
- Verify entry exists in database
- Verify `content.length` === 10000
- Verify embedding is valid VECTOR(1536)

---

### Edge 2: List with Large Limit

**Setup:**
- Database has 50 entries

**Action:**
```typescript
const results = await kb_list({ limit: 1000 })
```

**Expected:**
- Returns maximum allowed results (cap at 100 per SimilaritySearchParamsSchema)
- Query doesn't crash database

**Evidence:**
- Validate results.length ≤ 100
- Verify pagination limit enforced

---

### Edge 3: Update Entry Content (Re-embedding)

**Setup:**
- Entry exists with original content and embedding

**Action:**
```typescript
// Update only content (not tags)
await kb_update({
  id: '<uuid>',
  content: 'Completely different content'
})
```

**Expected:**
- New embedding generated for new content
- Old embedding replaced in database
- New cache entry created with new content hash

**Evidence:**
- Query database: verify embedding changed
- Compare old vs new embedding vectors (should be different)
- Verify embedding_cache has 2 entries (old and new content hashes)

---

### Edge 4: List with No Matches

**Setup:**
- Database has entries but none match filter

**Action:**
```typescript
const results = await kb_list({
  role: 'pm',
  tags: ['nonexistent-tag']
})
```

**Expected:**
- Returns empty array
- No error thrown

**Evidence:**
- Validate results === []
- No database errors

---

### Edge 5: Add Entry with Null Tags

**Setup:**
- Database initialized

**Action:**
```typescript
await kb_add({
  content: 'Test content',
  role: 'dev',
  tags: null  // Explicitly null
})
```

**Expected:**
- Entry created successfully
- `tags` stored as NULL in database

**Evidence:**
- Query database: verify tags IS NULL
- Subsequent kb_get returns tags: null

---

### Edge 6: Concurrent Add Operations (Same Content)

**Setup:**
- Database initialized
- No cache entry for test content

**Action:**
```typescript
// Fire 5 concurrent kb_add calls with identical content
const promises = Array(5).fill(null).map(() =>
  kb_add({
    content: 'Concurrent test content',
    role: 'dev',
    tags: ['concurrency']
  })
)

const ids = await Promise.all(promises)
```

**Expected:**
- 5 separate entries created (different IDs)
- Embedding generated once or more (race condition acceptable)
- No deadlocks or crashes
- All entries have valid embeddings

**Evidence:**
- Verify ids.length === 5
- Verify all IDs are unique
- Query database: 5 entries exist
- All entries have valid embedding vectors
- embedding_cache may have 1-5 entries (race acceptable)

---

## Required Tooling Evidence

### Backend Testing

**Vitest Test Suite:**
- Location: `apps/api/knowledge-base/src/crud-operations/__tests__/`
- Files:
  - `kb-add.test.ts`
  - `kb-get.test.ts`
  - `kb-update.test.ts`
  - `kb-delete.test.ts`
  - `kb-list.test.ts`

**Test Setup Requirements:**
- Docker container running (pgvector/pgvector:0.5.1-pg16)
- Database initialized with schema
- Test database cleanup between tests (or use transactions)

**Required Assertions:**
- Zod schema validation works correctly
- Database operations succeed/fail as expected
- Embedding client integration works
- Transaction rollback on errors
- Content hash deduplication logic

**Coverage Target:**
- Minimum 80% line coverage for CRUD operations
- All error paths must be tested

**Example Test Pattern:**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { kb_add, kb_get, kb_update, kb_delete, kb_list } from '../index.js'

describe('kb_add', () => {
  it('should add knowledge entry with valid input', async () => {
    const id = await kb_add({
      content: 'Test content',
      role: 'dev',
      tags: ['test']
    })

    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)

    // Verify in database
    const entry = await kb_get({ id })
    expect(entry.content).toBe('Test content')
  })

  it('should throw ZodError for empty content', async () => {
    await expect(kb_add({
      content: '',
      role: 'dev',
      tags: []
    })).rejects.toThrow()
  })
})
```

---

### Frontend

**N/A** - This story does not touch UI. All operations are backend/MCP server.

---

## Risks to Call Out

### Risk 1: Embedding Generation Failures

**Description:**
OpenAI API may fail or be rate-limited, causing kb_add and kb_update to fail.

**Mitigation:**
- EmbeddingClient already has retry logic (3 attempts with exponential backoff)
- Cache prevents redundant API calls
- Tests should mock OpenAI failures to verify error handling

**Test Coverage Required:**
- Mock OpenAI 500 error
- Mock OpenAI rate limit (429)
- Verify graceful failure

---

### Risk 2: Transaction Rollback on Embedding Failure

**Description:**
If embedding generation fails, we must ensure no partial write to knowledge_entries.

**Mitigation:**
- Generate embedding BEFORE database insert
- If embedding fails, throw error before DB operation
- Alternatively: Use database transactions to rollback

**Test Coverage Required:**
- Simulate embedding failure
- Verify no entry in knowledge_entries
- Verify cache unchanged

---

### Risk 3: Content Hash Collision (Theoretical)

**Description:**
SHA-256 collision is astronomically unlikely but theoretically possible.

**Mitigation:**
- Accept the risk (SHA-256 collision probability is negligible)
- Document limitation in KNOW-003 story
- Future enhancement could check content equality in addition to hash

**Test Coverage Required:**
- Document as known limitation
- No test needed (infeasible to simulate SHA-256 collision)

---

### Risk 4: Large Content Performance

**Description:**
Very large content (10k+ characters) may slow embedding generation and database operations.

**Mitigation:**
- OpenAI API supports up to 8191 tokens for text-embedding-3-small
- PostgreSQL TEXT type has no practical limit
- Test with realistic large content (5-10k characters)

**Test Coverage Required:**
- Add test with 10k character content
- Verify reasonable performance (<5 seconds)

---

### Risk 5: Concurrent Updates to Same Entry

**Description:**
Two processes updating the same entry concurrently may cause race conditions.

**Mitigation:**
- PostgreSQL row-level locking will handle this
- Last-write-wins semantics acceptable for MVP
- Future: Add optimistic locking with version field if needed

**Test Coverage Required:**
- Test concurrent updates to same entry
- Verify no deadlocks
- Verify one update wins (either order acceptable)

---

### Risk 6: Test Database Isolation

**Description:**
Tests may interfere with each other if not properly isolated.

**Mitigation:**
- Use separate test database or test transactions
- Clean up test data in afterEach hooks
- Use unique content for each test to avoid collisions

**Test Coverage Required:**
- Verify tests can run in parallel (Vitest default)
- Verify no test pollution

---

## Dependencies

**Required for Testing:**
- Docker Desktop running
- PostgreSQL container with pgvector
- OpenAI API key (or mock for some tests)
- EmbeddingClient implemented (KNOW-002 ✅)
- Database schema initialized (KNOW-001 ✅)

**Test Data:**
- Sample knowledge entries with varied roles and tags
- Test content strings of different lengths
- Valid and invalid UUIDs

---

## Success Criteria

All tests pass with:
- ✅ Happy path tests (6 tests)
- ✅ Error cases (6 tests)
- ✅ Edge cases (6 tests)
- ✅ Minimum 80% code coverage
- ✅ No unhandled exceptions
- ✅ Clean test database state after each run
