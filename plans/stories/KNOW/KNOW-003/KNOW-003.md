---
story_id: KNOW-003
title: "Core CRUD Operations"
status: backlog
created: 2026-01-25
updated: 2026-01-25
assignee: null
story_points: 5
priority: P0
depends_on: []
blocks: [KNOW-004]
tags:
  - knowledge-base
  - crud
  - backend
  - mcp-server
---

# KNOW-003: Core CRUD Operations

## Context

The knowledge base infrastructure (KNOW-001) and embedding client (KNOW-002) are complete. We now need the core CRUD operations to add, retrieve, update, delete, and list knowledge entries. These operations will form the foundation for the MCP server tools (KNOW-005) and enable basic knowledge management.

The embedding client provides content-hash based deduplication, which means multiple knowledge entries can have identical content but will only generate embeddings once (cached). This is a cost optimization, not duplicate content prevention.

## Goal

Implement five core CRUD operations for the knowledge base:

1. **kb_add** - Add new knowledge entry with automatic embedding generation
2. **kb_get** - Retrieve knowledge entry by ID
3. **kb_update** - Update existing knowledge entry with conditional re-embedding
4. **kb_delete** - Delete knowledge entry (idempotent)
5. **kb_list** - List knowledge entries with filtering by role, tags, and pagination

All operations must:
- Use Zod validation for inputs
- Integrate with EmbeddingClient for embedding generation/caching
- Use Drizzle ORM for type-safe database operations
- Follow ports & adapters architecture
- Log all operations with @repo/logger

## Non-Goals

- ❌ Semantic search (KNOW-004)
- ❌ Keyword search or full-text search (KNOW-004)
- ❌ MCP server integration (KNOW-005)
- ❌ Bulk import operations (KNOW-006)
- ❌ Cache cleanup/maintenance (KNOW-007)
- ❌ Optimistic locking or version fields
- ❌ Automatic content chunking for large text
- ❌ Duplicate content prevention (deduplication is caching-only)
- ❌ Audit logging (KNOW-018)
- ❌ Rate limiting (KNOW-010)

## Scope

### Packages Affected

**Primary:**
- `apps/api/knowledge-base/src/crud-operations/` (new directory)
  - `kb-add.ts`
  - `kb-get.ts`
  - `kb-update.ts`
  - `kb-delete.ts`
  - `kb-list.ts`
  - `index.ts` (barrel exports)
  - `__tests__/` (test suite)

**Secondary:**
- `apps/api/knowledge-base/src/__types__/index.ts` (additional Zod schemas if needed)

### Database Tables

- `knowledge_entries` (read/write)
- `embedding_cache` (read/write via EmbeddingClient)

### External Dependencies

- OpenAI API (via EmbeddingClient)
- PostgreSQL with pgvector extension

## Acceptance Criteria

### AC1: kb_add - Add Knowledge Entry

**Given** valid content, role, and tags
**When** kb_add is called
**Then**:
- ✅ Validates input with Zod schema (content non-empty, role enum, tags array)
- ✅ Generates embedding via EmbeddingClient BEFORE database insert
- ✅ If embedding generation fails, no database write occurs
- ✅ Creates entry in `knowledge_entries` table with UUID id
- ✅ Sets `createdAt` and `updatedAt` timestamps
- ✅ Returns UUID string of created entry
- ✅ Logs success at info level

**Signature:**
```typescript
async function kb_add(input: {
  content: string
  role: 'pm' | 'dev' | 'qa' | 'all'
  tags?: string[] | null
}): Promise<string>
```

**Deduplication Behavior:**
- Multiple calls with identical content create separate entries (different IDs)
- Embedding is generated once and cached by content hash
- Subsequent adds with same content reuse cached embedding (cache hit)

---

### AC2: kb_get - Retrieve Knowledge Entry

**Given** a knowledge entry ID
**When** kb_get is called
**Then**:
- ✅ Validates ID is valid UUID format
- ✅ Queries `knowledge_entries` table by ID
- ✅ Returns full entry object including embedding vector
- ✅ Returns `null` if entry does not exist (NOT an error)
- ✅ Logs query at debug level

**Signature:**
```typescript
async function kb_get(input: {
  id: string
}): Promise<KnowledgeEntry | null>
```

**Error Handling:**
- Invalid UUID format throws ZodError
- Non-existent entry returns null (not an error)

---

### AC3: kb_update - Update Knowledge Entry

**Given** entry ID and fields to update
**When** kb_update is called
**Then**:
- ✅ Validates input with Zod schema (at least one field must be provided)
- ✅ Supports partial updates (only provided fields are changed)
- ✅ If content is updated:
  - Compares new content hash with existing
  - If content changed: generates new embedding BEFORE database update
  - If content unchanged: skips re-embedding
- ✅ If only tags/role updated: no re-embedding
- ✅ Updates `updatedAt` timestamp
- ✅ `createdAt` remains unchanged
- ✅ Returns updated KnowledgeEntry object
- ✅ Throws NotFoundError if entry does not exist
- ✅ Logs update at info level

**Signature:**
```typescript
async function kb_update(input: {
  id: string
  content?: string
  role?: 'pm' | 'dev' | 'qa' | 'all'
  tags?: string[] | null
}): Promise<KnowledgeEntry>
```

**Content Update Logic:**
- If `content` provided and differs from existing → generate new embedding
- If `content` provided but identical to existing → skip re-embedding
- If `content` not provided → skip re-embedding

---

### AC4: kb_delete - Delete Knowledge Entry

**Given** a knowledge entry ID
**When** kb_delete is called
**Then**:
- ✅ Validates ID is valid UUID format
- ✅ Deletes entry from `knowledge_entries` table
- ✅ Does NOT delete cached embeddings (acceptable cache orphaning)
- ✅ Is idempotent (deleting non-existent entry succeeds without error)
- ✅ Returns void or success boolean
- ✅ Logs deletion at info level

**Signature:**
```typescript
async function kb_delete(input: {
  id: string
}): Promise<void>
```

**Idempotency:**
- Deleting a non-existent entry is a successful no-op
- Goal is "ensure entry doesn't exist" not "prove it existed before deletion"

---

### AC5: kb_list - List Knowledge Entries

**Given** optional filters (role, tags, limit)
**When** kb_list is called
**Then**:
- ✅ Returns array of knowledge entries
- ✅ Filters by role if provided (uses `role_idx` index)
- ✅ Filters by tags if provided (ANY match semantics: entry has at least one tag from filter)
- ✅ Orders results by `createdAt` DESC (newest first)
- ✅ Enforces maximum limit of 100 results
- ✅ Default limit is 10 if not specified
- ✅ Returns empty array if no matches (not an error)
- ✅ Logs query at debug level

**Signature:**
```typescript
async function kb_list(input?: {
  role?: 'pm' | 'dev' | 'qa' | 'all'
  tags?: string[]
  limit?: number
}): Promise<KnowledgeEntry[]>
```

**Filter Behavior:**
- No filters → returns all entries (up to limit)
- `role` filter → only entries with matching role
- `tags` filter → entries with at least one matching tag (OR logic)
- Both filters → entries matching role AND having at least one matching tag

**Tag Filtering Semantics:**
- Uses PostgreSQL array overlap operator: `tags && ARRAY['tag1', 'tag2']`
- Entry with tags=['a', 'b'] matches filter tags=['b', 'c'] (because 'b' matches)

---

### AC6: Error Handling

**All operations must:**
- ✅ Validate inputs with Zod schemas before any side effects
- ✅ Throw ZodError with descriptive messages for validation failures
- ✅ Throw NotFoundError for update/delete of non-existent entries (except kb_get returns null)
- ✅ Propagate database errors with sanitized messages (no SQL injection exposure)
- ✅ Propagate OpenAI API errors from EmbeddingClient with retry context
- ✅ Log all errors at error level with @repo/logger
- ✅ No console.log usage

---

### AC7: Null/Undefined Tags Handling

- ✅ `tags: null`, `tags: undefined`, and omitted tags are stored as NULL in database
- ✅ `tags: []` (empty array) is stored as empty array (NOT NULL)
- ✅ kb_list with no tags filter returns entries regardless of tags value

---

### AC8: Concurrent Operations

- ✅ PostgreSQL row-level locking prevents data corruption
- ✅ Last-write-wins semantics acceptable for concurrent updates
- ✅ No deadlocks under concurrent load
- ✅ Concurrent adds with identical content may generate embedding once or more (race acceptable)

---

### AC9: Performance Targets

- ✅ kb_add with typical content (500 chars) completes in <3 seconds (including embedding)
- ✅ kb_get completes in <100ms
- ✅ kb_list with 100 results completes in <1 second
- ✅ kb_update with content change completes in <3 seconds (re-embedding)
- ✅ kb_delete completes in <100ms

---

### AC10: Test Coverage

- ✅ Minimum 80% line coverage for `crud-operations/` directory
- ✅ All happy path scenarios tested
- ✅ All error cases tested (validation, not found, API failure)
- ✅ Edge cases tested (large content, null tags, concurrent operations)
- ✅ Tests use real database (Docker PostgreSQL with pgvector)
- ✅ Tests properly isolated (no cross-test pollution)

---

## Reuse Plan

### Existing Packages to Reuse

1. **@repo/logger** (`packages/core/logger`)
   - Use for all logging (no console.log)
   - Log levels: info (CRUD success), debug (queries), warn (retries), error (failures)

2. **Database Client** (`apps/api/knowledge-base/src/db`)
   - Drizzle ORM client already configured (KNOW-001)
   - Schema definitions in `src/db/schema.ts`
   - Connection pooling configured

3. **EmbeddingClient** (`apps/api/knowledge-base/src/embedding-client`)
   - Already implemented in KNOW-002
   - Handles caching, retry logic, batch processing
   - Methods: `generateEmbedding(text)` and `generateEmbeddingsBatch(texts[])`

4. **Zod Schemas** (`apps/api/knowledge-base/src/__types__`)
   - Existing schemas: KnowledgeEntrySchema, EmbeddingSchema, KnowledgeRoleSchema
   - May need to add: CRUDInputSchemas for each operation

### No New Shared Packages Needed

All functionality is specific to the knowledge-base app and should remain within `apps/api/knowledge-base/src/crud-operations/`.

---

## Architecture Notes

### Ports & Adapters Pattern

```
┌─────────────────────────────────────────┐
│         CRUD Operations (Domain)         │
│  ┌─────────────────────────────────┐   │
│  │  kb_add, kb_get, kb_update,     │   │
│  │  kb_delete, kb_list              │   │
│  │  - Input validation (Zod)       │   │
│  │  - Business logic               │   │
│  └─────────────────────────────────┘   │
│              ↓           ↓               │
│    ┌─────────────┐  ┌─────────────┐    │
│    │  Database   │  │  Embedding  │    │
│    │  Adapter    │  │  Adapter    │    │
│    │  (Drizzle)  │  │  (Client)   │    │
│    └─────────────┘  └─────────────┘    │
│         ↓                   ↓            │
└─────────────────────────────────────────┘
          ↓                   ↓
   PostgreSQL            OpenAI API
  (pgvector)
```

### Dependency Injection

CRUD functions are pure functions that accept database client and embedding client as dependencies:

```typescript
export async function kb_add(
  input: KbAddInput,
  deps: {
    db: DrizzleClient
    embeddingClient: EmbeddingClient
  }
): Promise<string>
```

This enables:
- Easy testing with mocks
- No global state
- Clear dependency graph

### Error Handling Strategy

1. **Validation Layer**: Zod schemas catch invalid inputs immediately
2. **Business Layer**: CRUD operations throw domain-specific errors (NotFoundError)
3. **Infrastructure Layer**: Database and API errors propagate with context
4. **Logging Layer**: All errors logged before propagating

### Transaction Boundaries

- **kb_add**: Generate embedding → insert row (single operation, no transaction needed)
- **kb_update**: Fetch existing → generate embedding if needed → update row
- **kb_delete**: Delete row (idempotent, single operation)
- **kb_list**: Read-only query (no transaction)

For KNOW-003, explicit transactions are not required. Future stories may add multi-step operations requiring Drizzle transactions.

---

## Infrastructure Notes

### Database Indexes Used

- `knowledge_entries_role_idx` (on role) - used by kb_list role filter
- `knowledge_entries_created_at_idx` (on created_at) - used by kb_list ordering
- `knowledge_entries_embedding_idx` (IVFFlat on embedding) - NOT used in KNOW-003 (semantic search in KNOW-004)

### Tag Filtering Performance

kb_list tag filtering uses PostgreSQL array overlap operator without index (acceptable for MVP).

Future optimization (KNOW-007): Add GIN index on tags array if performance issues arise at scale.

---

## HTTP Contract Plan

**N/A** - No HTTP endpoints in this story. These are internal functions that will be exposed as MCP tools in KNOW-005.

---

## Seed Requirements

**Optional** - Seed data for testing can be added with kb_add calls:

```typescript
// Seed sample knowledge entries
await kb_add({
  content: 'Always use Zod schemas for types - never use TypeScript interfaces',
  role: 'dev',
  tags: ['typescript', 'best-practice']
})

await kb_add({
  content: 'Use @repo/logger for all logging, never console.log',
  role: 'dev',
  tags: ['logging', 'best-practice']
})

await kb_add({
  content: 'All stories must have acceptance criteria that are testable',
  role: 'pm',
  tags: ['process', 'story-writing']
})
```

Formal seed script is out of scope for KNOW-003 (see KNOW-006 for parsers and seeding).

---

## Test Plan

### Test Strategy

- **Unit tests**: Test each CRUD function in isolation with real database
- **Integration tests**: Test CRUD operations with real EmbeddingClient (or mocked for speed)
- **Coverage target**: 80% line coverage minimum
- **Test isolation**: Each test cleans up data in afterEach hook or uses transactions

### Test Files

```
apps/api/knowledge-base/src/crud-operations/__tests__/
├── kb-add.test.ts
├── kb-get.test.ts
├── kb-update.test.ts
├── kb-delete.test.ts
├── kb-list.test.ts
└── test-helpers.ts (shared fixtures and cleanup)
```

### Happy Path Tests

**kb_add:**
1. Add entry with valid content, role, tags → returns UUID
2. Verify entry exists in database
3. Verify embedding cached
4. Add same content twice → 2 entries, 1 cache entry (deduplication)

**kb_get:**
1. Get existing entry → returns full object
2. Get non-existent entry → returns null

**kb_update:**
1. Update content → new embedding generated
2. Update tags only → no new embedding
3. Update non-existent entry → throws NotFoundError

**kb_delete:**
1. Delete existing entry → entry removed
2. Delete non-existent entry → succeeds (idempotent)

**kb_list:**
1. List all entries → returns all (up to limit)
2. List with role filter → returns only matching role
3. List with tags filter → returns entries with ANY matching tag
4. List with no matches → returns empty array

### Error Cases

1. **Validation errors:**
   - Empty content → ZodError
   - Invalid role → ZodError
   - Invalid UUID → ZodError

2. **Not found errors:**
   - Update non-existent entry → NotFoundError
   - kb_get non-existent → returns null (not error)
   - Delete non-existent → success (idempotent)

3. **API failures:**
   - OpenAI API error during kb_add → error propagated, no DB write
   - Retry logic verified

4. **Database errors:**
   - Connection failure → error propagated with sanitized message

### Edge Cases

1. Large content (10k characters) → succeeds
2. Null tags → stored as NULL
3. Empty tags array → stored as []
4. Concurrent adds with same content → no deadlock
5. kb_list with limit=1000 → capped at 100
6. kb_update content with no actual change → skips re-embedding

### Test Fixtures

```typescript
// test-helpers.ts
export const sampleEntries = {
  dev1: {
    content: 'Use Zod for validation',
    role: 'dev' as const,
    tags: ['typescript', 'validation']
  },
  pm1: {
    content: 'Write testable acceptance criteria',
    role: 'pm' as const,
    tags: ['process', 'stories']
  },
  qa1: {
    content: 'Test all error cases',
    role: 'qa' as const,
    tags: ['testing', 'quality']
  }
}

export async function cleanupTestEntries() {
  // Delete all test entries
  await db.delete(knowledgeEntries).where(...)
}
```

### Performance Tests

1. Measure kb_add time with 500 char content → <3s
2. Measure kb_get time → <100ms
3. Measure kb_list(100 results) → <1s
4. Stress test: 100 concurrent kb_add calls → no crashes

### Example Test

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { kb_add, kb_get } from '../index.js'
import { cleanupTestEntries } from './test-helpers.js'

describe('kb_add', () => {
  afterEach(async () => {
    await cleanupTestEntries()
  })

  it('should add knowledge entry and return UUID', async () => {
    const id = await kb_add({
      content: 'Test content',
      role: 'dev',
      tags: ['test']
    })

    // Validate UUID format
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)

    // Verify entry exists
    const entry = await kb_get({ id })
    expect(entry).not.toBeNull()
    expect(entry?.content).toBe('Test content')
    expect(entry?.role).toBe('dev')
    expect(entry?.tags).toEqual(['test'])
  })

  it('should reuse cached embedding for duplicate content', async () => {
    // Add same content twice
    const id1 = await kb_add({
      content: 'Duplicate content',
      role: 'dev',
      tags: ['test']
    })

    const id2 = await kb_add({
      content: 'Duplicate content',
      role: 'dev',
      tags: ['test']
    })

    // Verify different IDs
    expect(id1).not.toBe(id2)

    // Verify both entries exist
    const entry1 = await kb_get({ id: id1 })
    const entry2 = await kb_get({ id: id2 })
    expect(entry1).not.toBeNull()
    expect(entry2).not.toBeNull()

    // Verify embeddings are identical (cache hit)
    expect(entry1?.embedding).toEqual(entry2?.embedding)
  })

  it('should throw ZodError for empty content', async () => {
    await expect(kb_add({
      content: '',
      role: 'dev',
      tags: []
    })).rejects.toThrow() // ZodError
  })
})
```

See `_pm/TEST-PLAN.md` for complete test plan with all scenarios.

---

## UI/UX Notes

**N/A** - This story implements backend operations with no UI components.

See `_pm/UIUX-NOTES.md` for details (verdict: SKIPPED).

---

## Risks and Mitigations

### Risk 1: Embedding Generation Failures

**Risk**: OpenAI API failures during kb_add or kb_update could leave database in inconsistent state.

**Mitigation**:
- Generate embedding BEFORE database operation
- If embedding fails, throw error before any DB write
- No partial writes (single INSERT/UPDATE query)
- Rely on EmbeddingClient's retry logic (3 attempts with backoff)

---

### Risk 2: Content Hash Collision

**Risk**: SHA-256 collision (astronomically unlikely) could cause incorrect cache hits.

**Mitigation**:
- Accept the risk (probability is negligible: ~1 in 2^256)
- Document as known limitation
- Future enhancement: Check content equality in addition to hash

---

### Risk 3: Large Content Performance

**Risk**: Very large content (10k+ characters) may slow embedding generation and database operations.

**Mitigation**:
- OpenAI API supports up to 8191 tokens (~30k characters)
- PostgreSQL TEXT type has no practical limit
- Test with realistic large content (10k characters)
- Accept that large content takes longer (<3s is acceptable)

---

### Risk 4: Tag Filtering Performance at Scale

**Risk**: kb_list with tag filtering may be slow without GIN index on tags array.

**Mitigation**:
- Acceptable for MVP with <1000 entries
- Add GIN index in KNOW-007 if performance issues arise
- Current implementation uses PostgreSQL array overlap (not indexed)

---

### Risk 5: Test Database Isolation

**Risk**: Tests may interfere with each other if not properly isolated.

**Mitigation**:
- Use unique content for each test
- Clean up test data in afterEach hooks
- Run tests with Vitest (parallel by default, handles isolation)
- Consider using database transactions for test isolation

---

### Risk 6: OpenAI Token Limits

**Risk**: Content exceeding 8191 tokens (OpenAI limit) will fail embedding generation.

**Mitigation**:
- Throw descriptive error if token limit exceeded
- No automatic truncation (caller must handle long content)
- Document limitation in error message
- Future enhancement (out of scope): Automatic chunking for long content

---

## Definition of Done

- [ ] All 5 CRUD operations implemented (kb_add, kb_get, kb_update, kb_delete, kb_list)
- [ ] All acceptance criteria met
- [ ] Zod validation for all inputs
- [ ] Integration with EmbeddingClient working
- [ ] Database operations using Drizzle ORM
- [ ] Error handling consistent across all operations
- [ ] Logging with @repo/logger (no console.log)
- [ ] Test suite passing with ≥80% coverage
- [ ] All happy path tests passing
- [ ] All error case tests passing
- [ ] All edge case tests passing
- [ ] Performance targets met
- [ ] No unhandled exceptions
- [ ] TypeScript compilation clean (no errors)
- [ ] Code follows monorepo conventions (Zod-first types, no barrel files)
- [ ] PROOF-KNOW-003.md document created with evidence
- [ ] Story status updated to "ready-for-code-review"

---

## Related Stories

- **KNOW-001**: Package Infrastructure Setup (prerequisite ✅)
- **KNOW-002**: Embedding Client Implementation (prerequisite ✅)
- **KNOW-004**: Search Implementation (depends on KNOW-003)
- **KNOW-005**: MCP Server Setup (depends on KNOW-003)
- **KNOW-006**: Parsers and Seeding (depends on KNOW-003)

---

## Agent Log

| Timestamp | Agent | Action | Notes |
|-----------|-------|--------|-------|
| 2026-01-25 | pm-story-generation-leader | Story generated | Synthesized from index entry + worker artifacts |

---

## Token Budget

Phase tracking will be added during implementation.

<!-- Token usage will be logged here via /token-log command -->
