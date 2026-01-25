# Test Plan: KNOW-003 Core CRUD Operations

## Scope Summary

**Endpoints touched:** None (internal MCP tools)
**UI touched:** No
**Data/storage touched:** Yes (`knowledge_entries` table, `embedding_cache` table via KNOW-002)

## Happy Path Tests

### Test 1: Add Knowledge Entry (kb_add)
**Setup:**
- PostgreSQL running with knowledge_entries table
- Embedding client initialized (KNOW-002)
- No existing entry with same content

**Action:**
```typescript
kb_add({
  content: "Zod schemas MUST be used instead of TypeScript interfaces",
  tags: ["dev", "typescript", "zod"],
  source: "CLAUDE.md"
})
```

**Expected outcome:**
- Entry created with auto-generated UUID
- content_hash calculated as SHA-256 of normalized content
- Embedding generated and cached (via KNOW-002)
- Created timestamp set
- Returns: `{ id: "<uuid>", content_hash: "<sha256>" }`

**Evidence:**
- Query database: `SELECT * FROM knowledge_entries WHERE id = '<uuid>'`
- Verify embedding exists in embedding_cache
- Check @repo/logger output for "Knowledge entry added" message
- Verify response includes valid UUID and content_hash

---

### Test 2: Get Knowledge Entry by ID (kb_get)
**Setup:**
- Knowledge entry exists with known ID

**Action:**
```typescript
kb_get({ id: "<known-uuid>" })
```

**Expected outcome:**
- Returns full entry: `{ id, content, content_hash, tags, source, embedding, created_at, updated_at }`
- Embedding vector included (1536 dimensions)
- Response time < 100ms

**Evidence:**
- Validate response schema matches KnowledgeEntrySchema (Zod)
- Verify all fields populated correctly
- Check embedding dimensions = 1536

---

### Test 3: List Knowledge Entries (kb_list)
**Setup:**
- 5 knowledge entries exist in database

**Action:**
```typescript
kb_list({ limit: 10, offset: 0 })
```

**Expected outcome:**
- Returns array of up to 10 entries
- Sorted by created_at DESC (newest first)
- Each entry includes all fields
- Response includes total count: `{ entries: [...], total: 5 }`

**Evidence:**
- Verify array length ≤ limit
- Verify sorting order by created_at
- Verify total count matches database

---

### Test 4: Update Knowledge Entry (kb_update)
**Setup:**
- Existing entry with ID and known content

**Action:**
```typescript
kb_update({
  id: "<uuid>",
  content: "Updated Zod schemas rule with examples",
  tags: ["dev", "typescript", "zod", "examples"]
})
```

**Expected outcome:**
- Entry updated with new content and tags
- New content_hash calculated
- New embedding generated (old embedding NOT reused)
- updated_at timestamp changed
- Returns: `{ id, content_hash, updated: true }`

**Evidence:**
- Query database: verify content and tags updated
- Verify content_hash changed
- Verify new embedding in cache
- Verify updated_at > created_at

---

### Test 5: Delete Knowledge Entry (kb_delete)
**Setup:**
- Entry exists with known ID

**Action:**
```typescript
kb_delete({ id: "<uuid>" })
```

**Expected outcome:**
- Entry removed from knowledge_entries table
- Embedding cache NOT deleted (still available for deduplication)
- Returns: `{ id, deleted: true }`

**Evidence:**
- Query database: entry does not exist
- Verify embedding still in cache (for potential reuse)
- kb_get returns "not found" error

---

### Test 6: Deduplication on Add (Same Content Hash)
**Setup:**
- Entry A exists with content "Test content"

**Action:**
```typescript
kb_add({
  content: "Test content",  // Identical to Entry A
  tags: ["different", "tags"],
  source: "different-source.md"
})
```

**Expected outcome:**
- Deduplication detected via content_hash match
- Returns error: `{ error: "Duplicate content detected", existing_id: "<uuid-of-A>" }`
- No new entry created
- No new embedding generated (cache hit)

**Evidence:**
- Verify database count unchanged
- Verify error response includes existing_id
- Verify no OpenAI API call made

---

## Error Cases

### Test 7: Get Non-Existent Entry (kb_get)
**Setup:**
- No entry with UUID "00000000-0000-0000-0000-000000000000"

**Action:**
```typescript
kb_get({ id: "00000000-0000-0000-0000-000000000000" })
```

**Expected outcome:**
- Returns error: `{ error: "Knowledge entry not found", id: "<uuid>" }`
- Response time < 50ms

**Evidence:**
- Verify error message structure
- No database exception thrown

---

### Test 8: Add with Invalid Input (kb_add)
**Setup:**
- Valid database connection

**Action:**
```typescript
kb_add({
  content: "",  // Empty content
  tags: [],
  source: "test.md"
})
```

**Expected outcome:**
- Validation error: `{ error: "Validation failed: content cannot be empty" }`
- No database write
- No embedding generated

**Evidence:**
- Zod schema validation catches error before DB
- No entry created in database

---

### Test 9: Update Non-Existent Entry (kb_update)
**Setup:**
- No entry with given UUID

**Action:**
```typescript
kb_update({
  id: "00000000-0000-0000-0000-000000000000",
  content: "New content"
})
```

**Expected outcome:**
- Error: `{ error: "Knowledge entry not found for update", id: "<uuid>" }`
- No database changes

**Evidence:**
- Verify error response
- No new embeddings generated

---

### Test 10: Delete Non-Existent Entry (kb_delete)
**Setup:**
- No entry with given UUID

**Action:**
```typescript
kb_delete({ id: "00000000-0000-0000-0000-000000000000" })
```

**Expected outcome:**
- Error: `{ error: "Knowledge entry not found for deletion", id: "<uuid>" }`

**Evidence:**
- Verify error response structure

---

### Test 11: Database Connection Failure
**Setup:**
- PostgreSQL stopped or connection refused

**Action:**
```typescript
kb_add({ content: "Test", tags: ["test"], source: "test.md" })
```

**Expected outcome:**
- Error: `{ error: "Database unavailable", retryable: true }`
- Logged error includes connection details (sanitized)
- No partial data written

**Evidence:**
- Check @repo/logger for connection error
- Verify error includes retryable flag
- No orphaned data in database

---

### Test 12: Embedding Generation Failure on Add
**Setup:**
- OpenAI API unavailable or returns 500

**Action:**
```typescript
kb_add({ content: "Test content", tags: ["test"], source: "test.md" })
```

**Expected outcome:**
- Error: `{ error: "Failed to generate embedding", cause: "OpenAI API error" }`
- No knowledge entry created (transaction rollback)
- No cache entry created

**Evidence:**
- Database remains unchanged
- KNOW-002 retry logic executes (3 attempts)
- Transaction correctly rolled back

---

## Edge Cases (Reasonable)

### Test 13: Large Content (Near Token Limit)
**Setup:**
- Content with ~8000 tokens (near OpenAI limit of 8191)

**Action:**
```typescript
kb_add({ content: <8000-token-string>, tags: ["large"], source: "big.md" })
```

**Expected outcome:**
- Content accepted and processed
- Embedding generated successfully
- Warning logged if content approaches limit
- Response time < 5s

**Evidence:**
- Verify entry created
- No truncation occurred (content < 8191 tokens)

---

### Test 14: Pagination Boundary (kb_list)
**Setup:**
- 100 knowledge entries exist

**Action:**
```typescript
kb_list({ limit: 50, offset: 50 })
kb_list({ limit: 50, offset: 100 })
```

**Expected outcome:**
- First call returns 50 entries (51-100)
- Second call returns empty array (offset beyond total)
- Total count = 100 in both responses

**Evidence:**
- Verify offset/limit SQL logic
- Verify empty result for out-of-bounds offset

---

### Test 15: Concurrent Add of Same Content
**Setup:**
- 5 parallel requests to add identical content (cold cache)

**Action:**
```typescript
Promise.all([
  kb_add({ content: "Test", tags: ["a"], source: "1.md" }),
  kb_add({ content: "Test", tags: ["b"], source: "2.md" }),
  kb_add({ content: "Test", tags: ["c"], source: "3.md" }),
  kb_add({ content: "Test", tags: ["d"], source: "4.md" }),
  kb_add({ content: "Test", tags: ["e"], source: "5.md" })
])
```

**Expected outcome:**
- First request succeeds
- Other 4 requests fail with deduplication error
- Only 1 entry created in database
- Only 1 embedding generated (KNOW-002 deduplication)

**Evidence:**
- Database count = 1
- All 4 failures include existing_id
- No race condition errors

---

### Test 16: Update with Identical Content (No-Op)
**Setup:**
- Entry exists with content "Original content"

**Action:**
```typescript
kb_update({
  id: "<uuid>",
  content: "Original content",  // Same as current
  tags: ["same"]
})
```

**Expected outcome:**
- Update succeeds (idempotent)
- content_hash unchanged
- No new embedding generated (cache hit via KNOW-002)
- updated_at timestamp still updated

**Evidence:**
- Verify content_hash unchanged
- Verify no OpenAI API call
- Verify updated_at changed

---

### Test 17: Special Characters and Whitespace Normalization
**Setup:**
- Various whitespace and special characters

**Action:**
```typescript
kb_add({
  content: "  Test    content\n\nwith\tweird   spacing  ",
  tags: ["test"],
  source: "test.md"
})
```

**Expected outcome:**
- Content normalized: "Test content\n\nwith weird spacing"
- Leading/trailing whitespace trimmed
- Multiple spaces collapsed (but preserve newlines)
- content_hash based on normalized version

**Evidence:**
- Query database: verify normalized content
- Duplicate with differently spaced content fails deduplication check

---

### Test 18: Empty Tags Array
**Setup:**
- Valid content but no tags

**Action:**
```typescript
kb_add({ content: "Test", tags: [], source: "test.md" })
```

**Expected outcome:**
- Entry created successfully
- tags field = empty array
- List filtering by tags excludes this entry

**Evidence:**
- Verify tags = [] in database
- Verify entry retrievable via kb_get

---

### Test 19: Very Long Tag Names
**Setup:**
- Tag with 200 characters

**Action:**
```typescript
kb_add({
  content: "Test",
  tags: ["a".repeat(200)],
  source: "test.md"
})
```

**Expected outcome:**
- Validation error OR truncation (depending on schema)
- Clear error message about tag length limits

**Evidence:**
- Zod schema enforces max tag length
- Error message indicates which tag failed

---

### Test 20: List with Zero Limit
**Setup:**
- Database has entries

**Action:**
```typescript
kb_list({ limit: 0, offset: 0 })
```

**Expected outcome:**
- Returns empty array
- Total count still provided

**Evidence:**
- Verify empty array returned
- Verify total count accurate

---

## Required Tooling Evidence

### Backend (MCP Tools)
Since these are MCP tools (not HTTP endpoints), testing requires:

**MCP Test Harness:**
- Use MCP SDK to simulate Claude Code client
- Invoke each tool via MCP protocol
- Capture tool responses and validate schemas

**Database Verification:**
- Direct PostgreSQL queries via `psql` or SQL client
- Verify data integrity after each operation
- Check embedding_cache entries

**Integration Tests (Vitest):**
- Mock MCP tool invocations
- Test CRUD logic directly
- Assert Zod schema compliance
- Coverage target: >80%

**Required Assertions:**
- Response schemas match Zod definitions
- Database state matches expected after each operation
- Embeddings generated/cached correctly
- Deduplication logic prevents duplicates
- Error responses are consistent and descriptive

### Artifacts to Capture
1. Vitest test output (coverage report)
2. Database schema dump showing knowledge_entries table
3. Sample SQL queries demonstrating CRUD operations
4. MCP tool response samples (JSON)
5. @repo/logger output for key operations

---

## Risks to Call Out

### Risk 1: Content Hash Collision (Low Probability)
SHA-256 collisions are theoretically possible but astronomically unlikely. If a collision occurs, deduplication will incorrectly reject unique content.

**Mitigation:** Log content_hash on add failures for manual review. Document collision handling procedure.

---

### Risk 2: Embedding Re-generation on Update
Updates always generate new embeddings, even if content changes are minor. This increases OpenAI API costs.

**Mitigation:** Document this behavior clearly. Consider future enhancement for semantic diff detection.

---

### Risk 3: Transaction Rollback Complexity
If embedding generation fails mid-transaction, must ensure database entry is NOT created. Requires proper transaction boundary management.

**Mitigation:** Wrap all CRUD operations in database transactions. Test rollback scenarios explicitly.

---

### Risk 4: Tag Filtering Performance
kb_list with tag filters may require full table scan if tags are not indexed. Performance degrades with large knowledge bases.

**Mitigation:** Add database index on tags column (PostgreSQL GIN index for arrays). Benchmark with 10k+ entries.

---

### Risk 5: Concurrent Update Race Conditions
Two simultaneous updates to same entry could result in lost updates without proper locking.

**Mitigation:** Use optimistic locking (version field) or row-level locks in PostgreSQL. Test concurrent update scenarios.
