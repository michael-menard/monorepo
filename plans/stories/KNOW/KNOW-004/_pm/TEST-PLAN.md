# TEST-PLAN - KNOW-004

## Scope Summary

**Endpoints touched:** N/A (MCP tools, not HTTP endpoints)
**UI touched:** No
**Data/storage touched:** Yes
- `knowledge_entries` table (read)
- `embedding_cache` table (read via EmbeddingClient)

**MCP Tools:**
- `kb_search` (primary tool - hybrid semantic + keyword search)
- `kb_get_related` (related entries via tags/parent)

## Happy Path Tests

### Test 1: Semantic Search Returns Relevant Results
**Setup:**
- Seed database with 10+ knowledge entries covering different topics
- Include at least 3 entries tagged with "vercel" and "routing"
- Ensure entries have embeddings generated

**Action:**
- Call `kb_search({ query: "how to order routes in vercel.json", limit: 5 })`

**Expected outcome:**
- Returns 5 results ranked by relevance
- Top results include entries about vercel routing
- Each result includes: id, content, roles, tags, similarity score
- Response metadata includes `fallback: false` (semantic search succeeded)

**Evidence:**
- Integration test assertion on result count
- Assertion on top result tags containing "vercel" or "routing"
- Log output showing semantic scores

### Test 2: Keyword Search Fallback When OpenAI Unavailable
**Setup:**
- Mock OpenAI embedding API to fail with 500 error
- Seed database with entries containing keyword "database" in content
- Ensure full-text search index is built

**Action:**
- Call `kb_search({ query: "database foreign key constraints", limit: 5 })`

**Expected outcome:**
- Falls back to keyword-only search after 3 retry attempts
- Returns results ranked by FTS ts_rank score
- Response metadata includes `fallback: true`
- Logs warning about OpenAI unavailability

**Evidence:**
- Integration test with mocked OpenAI failure
- Assert `fallback: true` in response metadata
- Assert results still returned (keyword fallback worked)
- Log output showing retry attempts and fallback

### Test 3: Hybrid Search with RRF Merging
**Setup:**
- Seed entries where semantic and keyword rankings differ
- Entry A: high semantic similarity, low keyword match
- Entry B: low semantic similarity, high keyword match
- Entry C: high both semantic and keyword

**Action:**
- Call `kb_search({ query: "test query", limit: 10 })`

**Expected outcome:**
- Results merged using RRF algorithm (0.7 semantic, 0.3 keyword weights)
- Entry C ranks highest (high on both signals)
- Final scores combine semantic and keyword contributions
- No duplicate entries in results

**Evidence:**
- Integration test with controlled seed data
- Assert Entry C appears first
- Assert no duplicates in result list
- Log RRF score calculations

### Test 4: Role-Based Filtering
**Setup:**
- Seed entries with different roles: ['dev'], ['pm'], ['qa'], ['all']

**Action:**
- Call `kb_search({ query: "patterns", role: "dev", limit: 10 })`

**Expected outcome:**
- Only returns entries where roles array contains "dev" or "all"
- Excludes entries tagged only ['pm'] or only ['qa']

**Evidence:**
- Integration test assertion on returned roles
- Assert no 'pm'-only or 'qa'-only entries in results

### Test 5: Tag Filtering
**Setup:**
- Seed entries with various tags: ["routing", "database"], ["testing"], etc.

**Action:**
- Call `kb_search({ query: "best practices", tags: ["routing"], limit: 10 })`

**Expected outcome:**
- Only returns entries where tags array contains "routing"
- Results still ranked by relevance

**Evidence:**
- Integration test assertion on returned tags
- Assert all results include "routing" tag

### Test 6: Minimum Confidence Filtering
**Setup:**
- Seed entries with varying confidence values: 1.0, 0.8, 0.5, 0.3

**Action:**
- Call `kb_search({ query: "patterns", min_confidence: 0.7, limit: 10 })`

**Expected outcome:**
- Only returns entries with confidence >= 0.7
- Excludes entries with confidence 0.5 and 0.3

**Evidence:**
- Integration test assertion on confidence values
- Assert no results with confidence < 0.7

### Test 7: Entry Type Filtering
**Setup:**
- Seed entries with types: 'fact', 'summary', 'template'

**Action:**
- Call `kb_search({ query: "test", entry_type: "fact", limit: 10 })`

**Expected outcome:**
- Only returns entries where entry_type = 'fact'
- Excludes 'summary' and 'template' entries

**Evidence:**
- Integration test assertion on entry_type field

### Test 8: Limit Parameter Enforcement
**Setup:**
- Seed 100+ entries

**Action:**
- Call `kb_search({ query: "test", limit: 5 })`

**Expected outcome:**
- Returns exactly 5 results (or fewer if insufficient matches)
- Results are top 5 by relevance

**Evidence:**
- Integration test assertion on result count

### Test 9: kb_get_related - Sibling Entries
**Setup:**
- Seed a summary entry with id = parent_id
- Seed 3 fact entries with parent_id = summary's id
- Seed 2 unrelated entries

**Action:**
- Call `kb_get_related({ entry_id: <first-fact-id>, limit: 5 })`

**Expected outcome:**
- Returns other 2 sibling facts (same parent_id)
- Returns parent summary
- Does not return unrelated entries

**Evidence:**
- Integration test assertion on result count
- Assert all results share parent_id or are the parent

### Test 10: kb_get_related - Tag Overlap
**Setup:**
- Seed entry A with tags: ["routing", "vercel", "api"]
- Seed entry B with tags: ["routing", "vercel", "pattern"]
- Seed entry C with tags: ["routing", "database"]
- Seed entry D with tags: ["testing"]

**Action:**
- Call `kb_get_related({ entry_id: <entry-A-id>, limit: 5 })`

**Expected outcome:**
- Entry B ranks highest (3 overlapping tags)
- Entry C ranks second (2 overlapping tags)
- Entry D not included (only 0 overlap)

**Evidence:**
- Integration test assertion on tag overlap ranking
- Assert results ordered by overlap count descending

## Error Cases

### Error 1: Invalid Query Parameter
**Setup:**
- N/A

**Action:**
- Call `kb_search({ query: "", limit: 5 })` (empty query)

**Expected outcome:**
- Returns Zod validation error
- Error message indicates query must be non-empty string
- No database queries executed

**Evidence:**
- Unit test on input validation
- Assert error type is ZodError
- Assert error message references "query" field

### Error 2: Invalid Role Filter
**Setup:**
- N/A

**Action:**
- Call `kb_search({ query: "test", role: "invalid-role", limit: 5 })`

**Expected outcome:**
- Returns Zod validation error
- Error message indicates role must be one of: 'pm', 'dev', 'qa', 'all'

**Evidence:**
- Unit test on input validation
- Assert error includes allowed enum values

### Error 3: Invalid Limit (Too High)
**Setup:**
- N/A

**Action:**
- Call `kb_search({ query: "test", limit: 1000 })`

**Expected outcome:**
- Returns Zod validation error or caps limit at max (e.g., 50)
- Prevents unbounded result sets

**Evidence:**
- Unit test on input validation
- Assert limit capped at maximum allowed value

### Error 4: Invalid Entry Type Filter
**Setup:**
- N/A

**Action:**
- Call `kb_search({ query: "test", entry_type: "invalid", limit: 5 })`

**Expected outcome:**
- Returns Zod validation error
- Error message indicates entry_type must be: 'fact', 'summary', or 'template'

**Evidence:**
- Unit test on input validation

### Error 5: kb_get_related with Non-Existent Entry
**Setup:**
- N/A (entry does not exist in database)

**Action:**
- Call `kb_get_related({ entry_id: "00000000-0000-0000-0000-000000000000", limit: 5 })`

**Expected outcome:**
- Returns empty array (no related entries found)
- Does not throw error (graceful handling)

**Evidence:**
- Integration test assertion on empty result set
- Assert no errors thrown

### Error 6: Database Connection Failure
**Setup:**
- Stop PostgreSQL or point to invalid connection string

**Action:**
- Call `kb_search({ query: "test", limit: 5 })`

**Expected outcome:**
- Returns database connection error
- Error logged at error level
- Does not expose connection string in error message

**Evidence:**
- Integration test with unavailable database
- Assert error type indicates database issue
- Assert no sensitive data in error message

## Edge Cases (Reasonable)

### Edge 1: Search Query with Special Characters
**Setup:**
- Seed entries with content containing special regex characters: `.*+?[]{}()`

**Action:**
- Call `kb_search({ query: "test (pattern) [array]", limit: 5 })`

**Expected outcome:**
- Special characters properly escaped in SQL queries
- No SQL injection or query syntax errors
- Results match literal characters

**Evidence:**
- Integration test with special character queries
- Assert no SQL errors
- Assert results are sensible

### Edge 2: Empty Result Set
**Setup:**
- Seed database with entries about "routing"

**Action:**
- Call `kb_search({ query: "quantum physics", limit: 5 })`

**Expected outcome:**
- Returns empty array
- Response metadata includes `fallback: false`
- No errors thrown

**Evidence:**
- Integration test assertion on empty result
- Assert response structure is valid

### Edge 3: Single Result
**Setup:**
- Seed database with only 1 entry matching filters

**Action:**
- Call `kb_search({ query: "unique content", limit: 10 })`

**Expected outcome:**
- Returns array with 1 entry
- No errors or padding

**Evidence:**
- Integration test assertion on single result

### Edge 4: Very Long Query Text
**Setup:**
- N/A

**Action:**
- Call `kb_search({ query: "<10,000 character string>", limit: 5 })`

**Expected outcome:**
- OpenAI embedding API accepts query (or truncates to model max tokens)
- Query completes without timeout
- Returns results or empty array

**Evidence:**
- Integration test with long query string
- Assert completion within reasonable time (<10s)

### Edge 5: All Entries Have Same Relevance Score
**Setup:**
- Seed entries with identical content but different IDs

**Action:**
- Call `kb_search({ query: "exact match text", limit: 5 })`

**Expected outcome:**
- Returns results in stable order (e.g., by created_at descending)
- No random ordering on each call

**Evidence:**
- Integration test with duplicate content
- Assert stable ordering

### Edge 6: RRF Weight Tuning (0.7 semantic, 0.3 keyword)
**Setup:**
- Seed controlled dataset where weight changes affect ranking

**Action:**
- Call `kb_search({ query: "specific test case", limit: 5 })`
- Compare results to alternative weight (e.g., 0.5/0.5)

**Expected outcome:**
- 0.7/0.3 weights produce expected ranking
- Document this weight as tunable if performance issues arise

**Evidence:**
- Unit test on RRF score calculation
- Document weight configuration for future adjustment

### Edge 7: Concurrent Search Requests
**Setup:**
- Seed database with entries
- Spawn 10 concurrent `kb_search` calls

**Action:**
- Execute 10 parallel searches with different queries

**Expected outcome:**
- All searches complete successfully
- No race conditions or lock contention
- Results are independent and correct

**Evidence:**
- Performance/load test with concurrent requests
- Assert all requests succeed
- Monitor database connection pool

### Edge 8: kb_get_related with Zero Tag Overlap
**Setup:**
- Seed entry A with tags: ["routing"]
- Seed entry B with tags: ["testing"]
- No other entries

**Action:**
- Call `kb_get_related({ entry_id: <entry-A-id>, limit: 5 })`

**Expected outcome:**
- Returns empty array (no related entries)
- No errors

**Evidence:**
- Integration test assertion on empty result

### Edge 9: kb_get_related Limit Boundary
**Setup:**
- Seed entry with 20 related sibling entries

**Action:**
- Call `kb_get_related({ entry_id: <entry-id>, limit: 5 })`

**Expected outcome:**
- Returns exactly 5 results (top 5 by tag overlap)
- Does not return all 20

**Evidence:**
- Integration test assertion on limit enforcement

## Required Tooling Evidence

### Backend Testing

**Unit Tests:**
- Vitest tests for RRF algorithm logic (`search/hybrid.ts`)
- Input validation tests (Zod schema validation)
- Score calculation tests (semantic, keyword, hybrid)

**Integration Tests:**
- Full MCP tool invocation tests against test database
- Docker Compose test database with pgvector
- Seed script for test fixtures

**Test Files Required:**
```
apps/api/knowledge-base/src/search/__tests__/
  hybrid.test.ts          # RRF algorithm, score merging
  semantic.test.ts        # pgvector cosine similarity queries
  keyword.test.ts         # PostgreSQL FTS queries
  integration.test.ts     # Full kb_search flow with DB
  kb-get-related.test.ts  # Related entry logic
```

**Test Fixtures:**
- Seed data file: `seed-data/test-fixtures.yaml`
- Known relevant/irrelevant entries for ranking tests
- Document expected ranking for specific test queries (per QA-004 finding)

**Assertions:**
- Result count matches limit
- Result structure matches schema (id, content, roles, tags, score)
- Scores are numeric and within valid range
- Fallback flag correctly set
- Role/tag/entry_type filters applied correctly
- RRF scores combine semantic and keyword correctly

**Evidence to Capture:**
- Test coverage report (target: >80%)
- Integration test logs showing:
  - Embedding generation calls
  - Database query execution
  - RRF score calculations
  - Fallback behavior triggers

### Performance Benchmarks

**Required:**
- Benchmark search latency with 100+ entries
- Benchmark search latency with 1,000+ entries
- Document latency targets: <200ms for p50, <500ms for p95

**Tools:**
- Vitest benchmark utilities or separate script
- Log execution time for each search phase:
  - Embedding generation time
  - Semantic search query time
  - Keyword search query time
  - RRF merging time
  - Total end-to-end time

## Risks to Call Out

### Risk 1: RRF Weight Tuning
**Description:** The 0.7 semantic / 0.3 keyword weights may not be optimal for all query types. Some queries may favor keyword precision over semantic similarity.

**Mitigation:**
- Make weights configurable (environment variable or constant)
- Document tuning procedure in README
- Include weight adjustment as explicit non-goal for v1
- Collect test cases for future tuning (KNOW-004 finding: UX-003)

### Risk 2: pgvector Index Performance at Scale
**Description:** IVFFlat index performance degrades with lists parameter mismatch at scale (1000+ entries).

**Mitigation:**
- Use lists=100 parameter as documented in KNOW-001
- Benchmark with realistic dataset (per PLAT-006 finding)
- Document re-indexing procedure if lists needs adjustment
- Monitor query latency in production

### Risk 3: OpenAI API Rate Limits
**Description:** High query volume could hit OpenAI rate limits, causing fallback to keyword-only search.

**Mitigation:**
- Implement embedding caching (already done in KNOW-002)
- Log rate limit events for monitoring
- Document fallback behavior transparently (per UX-004 finding)
- Consider batch query optimization for future enhancement

### Risk 4: Fallback Behavior Transparency
**Description:** Agents need to know when fallback mode is active to adjust expectations.

**Mitigation:**
- Include `fallback_mode` flag in all search responses (per UX-004 finding)
- Document fallback behavior in MCP tool descriptions
- Log fallback events at warning level
- Test fallback mode explicitly in test plan

### Risk 5: Test Fixture Relevance
**Description:** Without realistic test fixtures, relevance testing cannot validate search quality.

**Mitigation:**
- Create test fixtures with known relevant/irrelevant entries (per QA-004 finding)
- Document expected ranking for each test query
- Include edge cases in fixtures (exact matches, partial matches, no matches)
- Version control test fixtures for reproducibility

### Risk 6: Missing Error Handling for Malformed Queries
**Description:** Edge case queries (very long, special characters, unicode) might break query parsing.

**Mitigation:**
- Add explicit edge case tests for special characters
- Validate query length limits
- Test unicode content and queries
- Use parameterized SQL queries to prevent injection
