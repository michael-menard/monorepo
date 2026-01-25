# DEV-FEASIBILITY - KNOW-004

## Feasibility Summary

**Feasible:** Yes
**Confidence:** Medium
**Why:** The search implementation is technically straightforward (pgvector + PostgreSQL FTS are well-established), but involves several interconnected pieces with tuning complexity. The RRF algorithm implementation is simple math, but weight tuning (0.7 semantic / 0.3 keyword) is empirical and may need adjustment. Fallback behavior adds resilience but also complexity. The dependency on KNOW-003 is appropriate - CRUD operations must exist before search can function.

## Likely Change Surface

### Packages/Areas Impacted

**Primary:**
- `apps/api/knowledge-base/src/search/` (new directory)
  - `hybrid.ts` - RRF merging logic
  - `semantic.ts` - pgvector cosine similarity queries
  - `keyword.ts` - PostgreSQL FTS queries
  - `kb-search.ts` - Main search function (validates input, orchestrates hybrid search)
  - `kb-get-related.ts` - Related entry lookup by tags/parent
  - `index.ts` - Barrel exports
  - `__tests__/` - Test suite

**Secondary:**
- `apps/api/knowledge-base/src/__types__/index.ts` - Zod schemas for search inputs/outputs
- `apps/api/knowledge-base/src/db/queries.ts` - May need query builder helpers for complex search queries

### Database Tables

**Read-only operations on:**
- `knowledge_entries` - All search queries
- `embedding_cache` - For query embedding generation (via EmbeddingClient from KNOW-002)

**Indexes Used:**
- `idx_entries_embedding` (IVFFlat) - Semantic search
- `idx_entries_content_fts` (GIN) - Keyword search
- `idx_entries_roles` (GIN) - Role filtering
- `idx_entries_tags` (GIN) - Tag filtering
- `idx_entries_type` - Entry type filtering
- `idx_entries_confidence` - Confidence filtering
- `idx_entries_parent` - Related entry lookup

### External Dependencies

- **OpenAI API** (via EmbeddingClient from KNOW-002)
  - Used for generating query embeddings
  - Retry logic already implemented in KNOW-002
  - Rate limits may trigger fallback behavior
- **PostgreSQL + pgvector**
  - Cosine similarity operator: `<=>` for vector distance
  - FTS functions: `to_tsvector`, `to_tsquery`, `ts_rank`

### Migration/Deploy Touchpoints

- **No new migrations required** - All indexes/schema created in KNOW-001
- **No deployment changes** - This is internal logic, MCP server integration happens in KNOW-005
- **Environment variables** - May add tuning parameters:
  - `KB_SEARCH_DEFAULT_LIMIT=10`
  - `KB_SEARCH_MAX_LIMIT=50`
  - `KB_RRF_SEMANTIC_WEIGHT=0.7` (tunable for future optimization)

## Risk Register

### Risk 1: RRF Weight Tuning Is Empirical
**Why risky:** The 0.7 semantic / 0.3 keyword weights are based on common practice, not this specific dataset. Different query types may favor different weights. Over-weighting semantic could miss exact keyword matches; over-weighting keyword could miss conceptually similar content.

**Mitigation PM should bake in:**
- Add to Non-Goals: "Weight optimization/tuning (use 0.7/0.3 default)"
- Make weights configurable constants (not hardcoded literals)
- Document weight tuning procedure for future stories
- Include in AC: "Document weight configuration for future adjustment"
- Per UX-003 finding: Plan future feedback loop for relevance rating

### Risk 2: Fallback Behavior Requires Transparent Signaling
**Why risky:** If OpenAI API is unavailable, search falls back to keyword-only. Agents receiving results need to know they're in fallback mode to adjust expectations. Silent fallback could lead to poor query reformulation.

**Mitigation PM should bake in:**
- AC: "Include `fallback_mode: boolean` in search response metadata"
- AC: "Log fallback events at warning level"
- Per UX-004 finding: Document fallback behavior in agent instructions/MCP tool descriptions
- Test plan must include explicit fallback test case

### Risk 3: RRF Algorithm Must Handle Edge Cases
**Why risky:** RRF merging requires both semantic and keyword results. Edge cases:
- Semantic search returns results but keyword search returns empty
- Keyword search returns results but semantic search fails (API down)
- Both return empty
- Overlap between result sets (same entry in both lists)

**Mitigation PM should bake in:**
- AC: "RRF merging handles partial result sets (one search empty)"
- AC: "Deduplicates entries appearing in both semantic and keyword results"
- Test plan includes edge cases for each scenario

### Risk 4: pgvector Index Performance May Not Scale
**Why risky:** IVFFlat index performance depends on `lists` parameter (set to 100 in KNOW-001). If entry count grows beyond 10k, query latency may degrade. Index tuning (re-indexing with different lists value) requires downtime.

**Mitigation PM should bake in:**
- AC: "Benchmark search latency with 100+ and 1,000+ entries"
- Document performance targets: <200ms p50, <500ms p95
- Per PLAT-006 finding: Test IVFFlat index with realistic dataset
- Include re-indexing procedure in documentation (out of scope for implementation)

### Risk 5: Query Embedding Generation Adds Latency
**Why risky:** Each search query requires embedding generation (OpenAI API call). Even with caching, this adds 100-300ms latency. Cache hit rate depends on query uniqueness - natural language queries are rarely identical.

**Mitigation PM should bake in:**
- AC: "Log embedding generation time for monitoring"
- Accept latency as inherent cost of semantic search
- Non-Goal: Query embedding caching (queries are unique, low cache hit rate expected)
- Future optimization: Batch query embeddings if multiple agents search concurrently (out of scope)

### Risk 6: Keyword Search Requires Query Parsing
**Why risky:** PostgreSQL FTS uses `to_tsquery` which has specific syntax. Natural language queries may contain special characters (`&`, `|`, `!`, parentheses) that break query parsing. Must sanitize or use `plainto_tsquery` instead.

**Mitigation PM should bake in:**
- AC: "Use `plainto_tsquery` for natural language query conversion (handles special characters)"
- Test plan includes edge case for special characters in query
- Avoid exposing raw FTS syntax to agents

### Risk 7: Role/Tag Filtering Reduces Result Set Size
**Why risky:** Applying role/tag filters BEFORE ranking may exclude relevant results. Applying AFTER ranking may return fewer than `limit` results. Need to decide filter order.

**Mitigation PM should bake in:**
- AC: "Apply role/tag/entry_type/confidence filters in SQL WHERE clause before semantic/keyword search"
- This is correct behavior - filters are constraints, not ranking factors
- Document in Architecture Notes: Filters reduce search space, not result count

### Risk 8: `kb_get_related` Tag Overlap Requires Threshold
**Why risky:** Requiring 2+ overlapping tags (as mentioned in PLAN.md) is arbitrary. If entry has only 1 tag, it will never find related entries. Need to clarify overlap threshold or make it configurable.

**Mitigation PM should bake in:**
- Clarify in AC: "Tag overlap threshold: 2+ shared tags for inclusion"
- OR "Tag overlap threshold: 1+ shared tags, ranked by overlap count descending"
- Recommend: 1+ threshold for broader results, ranked by count
- Add to edge case tests: Entry with single tag

### Risk 9: Parent-Child Relationships Complicate `kb_get_related`
**Why risky:** The PLAN.md specifies finding "siblings" (same parent_id) AND entries with tag overlap. Need to clarify:
- Are siblings always included regardless of tag overlap?
- Is parent entry included?
- How are results ranked when mixing siblings and tag-overlap entries?

**Mitigation PM should bake in:**
- AC: "kb_get_related returns: 1) sibling entries (same parent_id), 2) parent entry if exists, 3) entries with 2+ tag overlap, ranked by: parent first, then siblings, then tag overlap count descending"
- OR simplify: "kb_get_related returns only tag-overlap entries (siblings are implicit in normal search)"
- Recommend clarification in story scope

### Risk 10: Missing Pagination for Large Result Sets
**Why risky:** `kb_search` includes `limit` but no `offset`. If an agent wants to paginate through results, they must fetch all and paginate client-side. This is acceptable for small limits (10-50) but inefficient for large result sets.

**Mitigation PM should bake in:**
- Confirm in Non-Goals: "Pagination (offset parameter) - not required for v1"
- `kb_list` already supports offset for listing (from KNOW-003)
- Search results are top-N by relevance, pagination less common
- Future enhancement if needed

## Scope Tightening Suggestions (Non-breaking)

### Suggestion 1: Clarify RRF Weight Configuration
**Add to AC:** "RRF weights (0.7 semantic, 0.3 keyword) defined as constants at top of hybrid.ts for future tunability"

**Rationale:** Avoids magic numbers scattered in code. Makes future weight adjustment a one-line change.

### Suggestion 2: Limit Max Result Count
**Add to AC:** "Enforce maximum limit of 50 results to prevent unbounded queries"

**Rationale:** Protects database from expensive queries. Agents rarely need >50 results for context retrieval.

### Suggestion 3: Define Semantic Similarity Threshold
**Add to AC:** "Exclude semantic results with cosine similarity < 0.3 (low relevance)"

**Rationale:** pgvector can return distant matches. Filtering very low similarity results improves quality. Threshold is tunable like RRF weights.

### Suggestion 4: Specify Keyword Search Rank Function
**Add to AC:** "Use ts_rank_cd (cover density) for keyword ranking, normalized by document length"

**Rationale:** ts_rank_cd is more sophisticated than ts_rank. Normalization prevents long documents from dominating results.

### Suggestion 5: Clarify `kb_get_related` Parent Inclusion
**Add to AC:** "kb_get_related includes parent entry in results if parent_id is set"

**Rationale:** Parent summaries provide context for fact entries. Explicit inclusion clarifies behavior.

## Missing Requirements / Ambiguities

### Ambiguity 1: Confidence Filtering Default
**What's unclear:** Should `min_confidence` filter be applied by default, or only when explicitly specified? Index shows "Default 0.5" but unclear if this is applied automatically or only when parameter provided.

**Recommended decision:** "min_confidence defaults to 0.0 (no filtering) unless explicitly provided. Agents can override to 0.5 or higher for high-confidence results only."

**Rationale:** Allows agents to control quality threshold. Default 0.0 is most permissive (matches all).

### Ambiguity 2: Retry Behavior for Embedding Generation
**What's unclear:** KNOW-002 implements retry logic with exponential backoff for embedding generation. Does `kb_search` inherit this retry behavior, or does it fail immediately and fall back to keyword search?

**Recommended decision:** "kb_search uses EmbeddingClient retry logic (3 attempts, exponential backoff). If all retries fail, falls back to keyword-only search and sets fallback_mode=true."

**Rationale:** Matches KNOW-002 behavior. Retry increases reliability before falling back.

### Ambiguity 3: Empty Query Handling
**What's unclear:** Should empty query string be rejected (validation error) or treated as "match all"?

**Recommended decision:** "Reject empty query string with Zod validation error. Query must be non-empty."

**Rationale:** "Match all" behavior is better served by `kb_list` (pagination-friendly). Search implies intent to filter.

### Ambiguity 4: Tag Filtering AND vs OR Logic
**What's unclear:** If tags filter is `["routing", "vercel"]`, does the entry need BOTH tags (AND) or EITHER tag (OR)?

**Recommended decision:** "Tags filter uses OR logic: entry matches if it has ANY of the specified tags. To require all tags, agent can post-filter results or use multiple search calls."

**Rationale:** OR logic is more permissive and common in search UIs. AND logic overly restrictive for tag-based filtering.

### Ambiguity 5: Result Ordering for Equal Scores
**What's unclear:** When multiple entries have identical RRF scores, what determines ordering?

**Recommended decision:** "Tie-breaking: entries with equal RRF scores ordered by updated_at descending (most recently updated first)."

**Rationale:** Recency is a reasonable tie-breaker. Ensures stable, predictable ordering.

## Evidence Expectations

### What Proof/Dev Should Capture

**Test Coverage:**
- Unit tests for RRF algorithm (score calculation, merging, deduplication)
- Unit tests for semantic search query builder
- Unit tests for keyword search query builder
- Integration tests for full `kb_search` flow with test database
- Integration tests for `kb_get_related` with various parent/tag scenarios
- Edge case tests for fallback behavior (OpenAI unavailable)
- Edge case tests for empty results, single result, limit enforcement
- Edge case tests for special characters in queries

**Performance Benchmarks:**
- Search latency with 100 entries: <200ms p50
- Search latency with 1,000 entries: <500ms p50
- Embedding generation time logged for each query
- RRF merging time logged

**Logging Evidence:**
- Info: Successful searches with result count and latency
- Warning: Fallback to keyword-only search (OpenAI unavailable)
- Error: Validation errors, database errors
- Debug: Semantic scores, keyword scores, RRF final scores

**Integration Test Artifacts:**
- Test database seeded with controlled fixtures (per QA-004 finding)
- Document expected ranking for test queries
- Assertion output showing pass/fail for each test case

### What Might Fail in CI/Deploy

**CI Failures:**
- Test database not started (Docker Compose dependency)
- pgvector extension not enabled in test DB
- OpenAI API key not configured in CI environment (causes all tests to use fallback mode)
- Test fixtures not seeded before running integration tests

**Deploy Failures:**
- Production database missing pgvector extension (should be caught in KNOW-001)
- Production indexes not built (should be caught in KNOW-001 migration)
- OpenAI API key not configured in production environment (MCP server will start but all searches will use fallback mode)

**Recommended Pre-Deploy Checks:**
- Verify pgvector extension: `SELECT * FROM pg_extension WHERE extname = 'vector';`
- Verify FTS index exists: `SELECT indexname FROM pg_indexes WHERE indexname = 'idx_entries_content_fts';`
- Verify IVFFlat index exists: `SELECT indexname FROM pg_indexes WHERE indexname = 'idx_entries_embedding';`
- Test OpenAI API connectivity: `curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models/text-embedding-3-small`
