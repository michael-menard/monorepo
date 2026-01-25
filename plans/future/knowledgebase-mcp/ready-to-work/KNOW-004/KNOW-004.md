---
story_id: KNOW-004
title: "Search Implementation"
status: ready-to-work
created: 2026-01-25
updated: 2026-01-25
elaborated: 2026-01-25
assignee: null
story_points: 13
priority: P0
depends_on: [KNOW-003]
blocks: [KNOW-005]
tags:
  - knowledge-base
  - search
  - pgvector
  - backend
  - mcp-server
---

# KNOW-004: Search Implementation

## Context

With the knowledge base infrastructure (KNOW-001), embedding client (KNOW-002), and core CRUD operations (KNOW-003) in place, we now need search capabilities to make the knowledge base useful for AI agents. Agents need to find relevant knowledge entries based on natural language queries, filtered by role, tags, and confidence levels.

This story implements a **hybrid search** approach combining:
1. **Semantic search** using pgvector cosine similarity on embeddings
2. **Keyword search** using PostgreSQL full-text search (FTS)
3. **Reciprocal Rank Fusion (RRF)** to merge and rank results from both approaches

The hybrid approach leverages the strengths of both methods: semantic search finds conceptually similar content even with different wording, while keyword search provides precise matching for exact terms and technical identifiers.

**Findings Applied from Epic Elaboration:**
- **UX-002:** Design human-readable JSON response format with field descriptions and semantic metadata
- **UX-003:** Plan future feedback loop for result relevance rating (documented as enhancement for post-MVP)
- **UX-004:** Include `fallback_mode` flag in search responses to document fallback behavior transparently
- **SEC-005:** Sanitize error responses to agents; log full errors server-side only
- **QA-004:** Create test fixtures with known relevant/irrelevant entries; document expected ranking for test queries

## Goal

Implement fast, relevant search across knowledge entries using hybrid semantic and keyword approaches with graceful fallback when OpenAI API is unavailable.

**Primary deliverables:**
1. `kb_search` - Hybrid semantic + keyword search with role/tag/confidence filtering
2. `kb_get_related` - Find related entries via parent_id and tag overlap
3. Fallback mechanism to keyword-only search when semantic search fails
4. Comprehensive test suite with realistic fixtures and relevance validation

## Non-Goals

- ❌ MCP server integration (KNOW-005)
- ❌ Admin tools (kb_bulk_import, kb_rebuild_embeddings, kb_stats) (KNOW-006, KNOW-007)
- ❌ Parsers for LESSONS-LEARNED.md or templates (KNOW-006)
- ❌ Workflow integration with agent files (KNOW-008)
- ❌ Web UI for human debugging (KNOW-023)
- ❌ RRF weight optimization/tuning (use 0.7 semantic / 0.3 keyword default)
- ❌ Query embedding caching (queries are unique, low cache hit rate expected)
- ❌ Pagination (offset parameter) for search results
- ❌ Role-based access control (KNOW-009)
- ❌ Rate limiting (KNOW-010)
- ❌ Audit logging (KNOW-018)

## Scope

### Packages Affected

**Primary:**
- `apps/api/knowledge-base/src/search/` (new directory)
  - `hybrid.ts` - RRF merging logic
  - `semantic.ts` - pgvector cosine similarity queries
  - `keyword.ts` - PostgreSQL FTS queries
  - `kb-search.ts` - Main search function
  - `kb-get-related.ts` - Related entry lookup
  - `index.ts` - Barrel exports
  - `__tests__/` - Test suite
    - `hybrid.test.ts`
    - `semantic.test.ts`
    - `keyword.test.ts`
    - `integration.test.ts`
    - `kb-get-related.test.ts`

**Secondary:**
- `apps/api/knowledge-base/src/__types__/index.ts` - Zod schemas for search inputs/outputs
- `apps/api/knowledge-base/seed-data/test-fixtures.yaml` - Test data with known relevance rankings

### Database Tables

**Read-only operations:**
- `knowledge_entries` - All search queries
- `embedding_cache` - Query embedding generation (via EmbeddingClient)

**Indexes used:**
- `idx_entries_embedding` (IVFFlat) - Semantic search
- `idx_entries_content_fts` (GIN) - Keyword search
- `idx_entries_roles` (GIN) - Role filtering
- `idx_entries_tags` (GIN) - Tag filtering
- `idx_entries_type` - Entry type filtering
- `idx_entries_confidence` - Confidence filtering
- `idx_entries_parent` - Related entry lookup

### MCP Tools Implemented

**1. kb_search**
```typescript
kb_search({
  query: string,           // Required: Natural language search query
  role?: 'pm' | 'dev' | 'qa' | 'all',  // Optional: Filter by role
  tags?: string[],         // Optional: Filter by tags (OR logic)
  entry_type?: 'fact' | 'summary' | 'template',
  limit?: number,          // Default 10, max 50
  min_confidence?: number, // Default 0.0 (no filtering)
})
// Returns: {
//   results: KnowledgeEntry[],
//   metadata: {
//     total: number,
//     fallback_mode: boolean,
//     query_time_ms: number
//   }
// }
```

**2. kb_get_related**
```typescript
kb_get_related({
  entry_id: string,        // Required: UUID of the entry
  limit?: number,          // Default 5, max 20
})
// Returns: {
//   results: KnowledgeEntry[],
//   metadata: {
//     total: number,
//     relationship_types: string[]  // e.g., ['sibling', 'parent', 'tag_overlap']
//   }
// }
```

## Acceptance Criteria

### AC1: Hybrid Search - Semantic + Keyword with RRF

**Given** a natural language query and knowledge entries in the database
**When** `kb_search` is called
**Then**:
- ✅ Generates embedding for query using EmbeddingClient (KNOW-002)
- ✅ Executes semantic search using pgvector `<=>` operator (cosine distance)
- ✅ Executes keyword search using PostgreSQL `to_tsvector` and `plainto_tsquery`
- ✅ Excludes semantic results with cosine similarity < 0.3 (low relevance threshold)
- ✅ Merges results using Reciprocal Rank Fusion algorithm
- ✅ RRF weights: 0.7 semantic, 0.3 keyword (defined as constants for future tunability)
- ✅ Deduplicates entries appearing in both semantic and keyword results
- ✅ Returns top N results ranked by combined RRF score
- ✅ Tie-breaking: entries with equal scores ordered by `updated_at` DESC
- ✅ Response includes `fallback_mode: false` in metadata
- ✅ Logs search execution time and result count at info level

**Signature:**
```typescript
import { z } from 'zod'

const SearchInputSchema = z.object({
  query: z.string().min(1, 'Query must be non-empty'),
  role: z.enum(['pm', 'dev', 'qa', 'all']).optional(),
  tags: z.array(z.string()).optional(),
  entry_type: z.enum(['fact', 'summary', 'template']).optional(),
  limit: z.number().int().min(1).max(50).default(10),
  min_confidence: z.number().min(0).max(1).default(0.0),
})

const SearchResultSchema = z.object({
  results: z.array(KnowledgeEntrySchema),
  metadata: z.object({
    total: z.number(),
    fallback_mode: z.boolean(),
    query_time_ms: z.number(),
  }),
})

async function kb_search(
  input: z.infer<typeof SearchInputSchema>
): Promise<z.infer<typeof SearchResultSchema>>
```

### AC2: Keyword-Only Fallback When OpenAI Unavailable

**Given** OpenAI API is unavailable or returns errors
**When** `kb_search` is called
**Then**:
- ✅ EmbeddingClient retries 3x with exponential backoff (inherited from KNOW-002)
- ✅ After all retries fail, skips semantic search
- ✅ Executes keyword-only search using PostgreSQL FTS
- ✅ Returns results ranked by `ts_rank_cd` (cover density, normalized by document length)
- ✅ Response includes `fallback_mode: true` in metadata
- ✅ Logs warning: "OpenAI API unavailable, using keyword-only fallback"
- ✅ No errors thrown - gracefully degrades to keyword search

### AC3: Role, Tag, Entry Type, and Confidence Filtering

**Given** search filters are specified
**When** `kb_search` is called with filters
**Then**:
- ✅ Role filter: Returns entries where `roles` array contains specified role OR 'all'
- ✅ Tags filter: Returns entries where `tags` array contains ANY of specified tags (OR logic)
- ✅ Entry type filter: Returns entries where `entry_type` matches exactly
- ✅ Confidence filter: Returns entries where `confidence >= min_confidence`
- ✅ All filters applied in SQL WHERE clause BEFORE semantic/keyword search (reduces search space)
- ✅ Filters do not affect ranking - they constrain the result set

### AC4: Input Validation with Zod

**Given** invalid input parameters
**When** `kb_search` is called
**Then**:
- ✅ Empty query string → Zod validation error
- ✅ Invalid role (not pm/dev/qa/all) → Zod validation error with enum values
- ✅ Invalid entry_type → Zod validation error with enum values
- ✅ Limit > 50 → Zod validation error
- ✅ Limit < 1 → Zod validation error
- ✅ min_confidence < 0 or > 1 → Zod validation error
- ✅ Error messages indicate field name and allowed values
- ✅ No database queries executed on validation failure

### AC5: kb_get_related - Parent and Sibling Entries

**Given** a knowledge entry with parent_id and siblings
**When** `kb_get_related` is called with entry_id
**Then**:
- ✅ Returns parent entry if parent_id is set (first in results)
- ✅ Returns sibling entries (entries with same parent_id)
- ✅ Returns entries with 2+ shared tags, ranked by tag overlap count descending
- ✅ Results ordered by: parent first, siblings second, tag-overlap entries third
- ✅ Respects limit parameter (max results returned)
- ✅ Response metadata includes relationship_types: ['parent', 'sibling', 'tag_overlap']
- ✅ If entry_id does not exist, returns empty results (no error)

### AC6: Performance and Logging

**Given** search queries are executed
**When** monitoring performance
**Then**:
- ✅ Search latency with 100 entries: <200ms p50, <500ms p95
- ✅ Search latency with 1,000 entries: <500ms p50, <1000ms p95
- ✅ Logs embedding generation time at debug level
- ✅ Logs semantic search query time at debug level
- ✅ Logs keyword search query time at debug level
- ✅ Logs RRF merging time at debug level
- ✅ Logs total query time at info level
- ✅ Uses @repo/logger for all logging (no console.log)

### AC7: Error Handling and Sanitization

**Given** errors occur during search execution
**When** errors are logged and returned
**Then**:
- ✅ Database errors logged at error level with full stack trace
- ✅ Returned error messages sanitized (no SQL, no connection strings)
- ✅ OpenAI API errors logged with retry attempt count
- ✅ Validation errors include field name and constraint violated
- ✅ All errors follow consistent error response structure

### AC8: RRF Algorithm Implementation

**Given** semantic and keyword search both return results
**When** merging results with RRF
**Then**:
- ✅ RRF formula: `score = (semantic_weight / (k + semantic_rank)) + (keyword_weight / (k + keyword_rank))`
- ✅ Weights: semantic_weight = 0.7, keyword_weight = 0.3
- ✅ k constant = 60 (standard RRF parameter)
- ✅ Weights defined as constants: `SEMANTIC_WEIGHT`, `KEYWORD_WEIGHT` for future tunability
- ✅ Handles partial result sets (one search returns empty, other returns results)
- ✅ Deduplicates entries appearing in both result sets (uses higher combined score)
- ✅ Unit tests verify RRF score calculation with known inputs

### AC9: Keyword Search with FTS

**Given** a natural language query with special characters
**When** keyword search is executed
**Then**:
- ✅ Uses `plainto_tsquery` to convert query (handles special characters safely)
- ✅ Uses `ts_rank_cd` for ranking (cover density, normalized by document length)
- ✅ Searches against `to_tsvector('english', content)` using GIN index
- ✅ Special characters in query do not break SQL syntax
- ✅ Returns results ranked by relevance score descending

### AC10: Test Coverage with Realistic Fixtures

**Given** the test suite is executed
**When** running integration tests
**Then**:
- ✅ Test fixtures include entries with known relevance for specific queries
- ✅ Document expected ranking for each test query in test comments
- ✅ Test cases cover: exact matches, partial matches, no matches, semantic-only matches, keyword-only matches
- ✅ Test coverage >80% for search module
- ✅ All edge cases from test plan covered (empty results, single result, special characters, concurrent requests)

## Reuse Plan

### Reusing from Existing Packages

**1. EmbeddingClient (KNOW-002)**
- Location: `apps/api/knowledge-base/src/embeddings/client.ts`
- Usage: Generate embeddings for search queries
- Benefits: Content-hash caching, retry logic, batch processing already implemented

**2. @repo/logger**
- Location: `packages/core/logger`
- Usage: All logging (info, warning, error, debug levels)
- Benefits: Structured logging, consistent format, filtering by level

**3. Zod**
- Already used in KNOW-001, KNOW-002, KNOW-003
- Usage: Input validation schemas for search parameters
- Benefits: Type safety, automatic validation, clear error messages

**4. Drizzle ORM**
- Already used in KNOW-001, KNOW-003
- Usage: Type-safe database queries for semantic and keyword search
- Benefits: Type inference, SQL builder, migration support

### Reusing Patterns from KNOW-002, KNOW-003

**Retry Logic Pattern:**
- KNOW-002 implements exponential backoff retry for OpenAI API
- Reuse same retry wrapper for embedding generation in kb_search
- Fallback to keyword-only when retries exhausted

**Content Hash Pattern:**
- KNOW-002 uses SHA-256 content hashing for embedding cache
- Not directly applicable to search queries (queries are unique)
- But demonstrates caching pattern for future query optimization

**Input Validation Pattern:**
- KNOW-003 uses Zod schemas for CRUD operation inputs
- Reuse same pattern for SearchInputSchema, GetRelatedInputSchema
- Consistent error handling across all operations

**Database Query Pattern:**
- KNOW-003 uses Drizzle query builders with type safety
- Reuse for semantic search (vector operators) and keyword search (FTS functions)
- Maintain separation of concerns: queries.ts for SQL builders

### No New Shared Packages Required

All dependencies satisfied by existing packages. No new shared packages needed.

## Architecture Notes

### Ports & Adapters

**Port (Interface):**
```typescript
// search/types.ts
export interface SearchPort {
  search(input: SearchInput): Promise<SearchResult>
  getRelated(entryId: string, limit: number): Promise<KnowledgeEntry[]>
}
```

**Adapter (Implementation):**
```typescript
// search/kb-search.ts
import { SearchPort } from './types'
import { EmbeddingClient } from '../embeddings/client'
import { semanticSearch } from './semantic'
import { keywordSearch } from './keyword'
import { mergeWithRRF } from './hybrid'

export class KnowledgeBaseSearch implements SearchPort {
  constructor(
    private embeddingClient: EmbeddingClient,
    private db: DrizzleClient
  ) {}

  async search(input: SearchInput): Promise<SearchResult> {
    const validatedInput = SearchInputSchema.parse(input)

    let semanticResults: ScoredEntry[] = []
    let fallbackMode = false

    try {
      const queryEmbedding = await this.embeddingClient.generate(validatedInput.query)
      semanticResults = await semanticSearch(this.db, queryEmbedding, validatedInput)
    } catch (error) {
      logger.warn('OpenAI API unavailable, using keyword-only fallback', { error })
      fallbackMode = true
    }

    const keywordResults = await keywordSearch(this.db, validatedInput)

    const mergedResults = mergeWithRRF(semanticResults, keywordResults, {
      semanticWeight: SEMANTIC_WEIGHT,
      keywordWeight: KEYWORD_WEIGHT,
    })

    return {
      results: mergedResults.slice(0, validatedInput.limit),
      metadata: {
        total: mergedResults.length,
        fallback_mode: fallbackMode,
        query_time_ms: elapsed,
      },
    }
  }

  async getRelated(entryId: string, limit: number): Promise<KnowledgeEntry[]> {
    // Implementation here
  }
}
```

**Dependency Injection:**
- `EmbeddingClient` injected via constructor
- `DrizzleClient` injected via constructor
- Testable: can inject mocks for unit tests
- Integration tests use real instances

### Hybrid Search Flow

```
┌────────────────────────────────────────────────────────────────┐
│                       kb_search(query)                          │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Validate Input  │
                    │ (Zod Schema)    │
                    └─────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
    ┌───────────────────────┐   ┌───────────────────────┐
    │ Generate Embedding    │   │ Parse Query for FTS   │
    │ (OpenAI API)          │   │ (plainto_tsquery)     │
    │ - 3 retries w/ backoff│   └───────────────────────┘
    │ - cache check         │               │
    └───────────────────────┘               │
                │                           │
        ┌───────┴────────┐                  │
        ▼                ▼                  ▼
    ┌───────┐   ┌─────────────┐   ┌─────────────────┐
    │Success│   │   Failure   │   │ Keyword Search  │
    └───────┘   │ (all retries│   │ (ts_rank_cd)    │
        │       │  exhausted) │   └─────────────────┘
        │       └─────────────┘            │
        │                │                 │
        ▼                ▼                 │
    ┌───────────────────────┐             │
    │ Semantic Search       │             │
    │ (pgvector <=> cosine) │             │
    │ - Filter similarity   │             │
    │   < 0.3 threshold     │             │
    └───────────────────────┘             │
                │                         │
                └────────┬────────────────┘
                         ▼
              ┌────────────────────────┐
              │   Merge with RRF       │
              │ - Deduplicate entries  │
              │ - Calculate scores     │
              │ - Sort by score DESC   │
              │ - Tie-break: updated_at│
              └────────────────────────┘
                         │
                         ▼
              ┌────────────────────────┐
              │ Apply Limit            │
              │ Return Top N Results   │
              │ + Metadata             │
              └────────────────────────┘
```

### RRF Algorithm

**Formula:**
```
For each entry in (semantic_results ∪ keyword_results):
  semantic_rank = position in semantic results (1-indexed), or ∞ if not present
  keyword_rank = position in keyword results (1-indexed), or ∞ if not present

  rrf_score = (semantic_weight / (k + semantic_rank)) + (keyword_weight / (k + keyword_rank))

Where:
  semantic_weight = 0.7
  keyword_weight = 0.3
  k = 60 (constant)
```

**Example:**
```typescript
// Entry A: rank 1 in semantic, rank 5 in keyword
score_A = (0.7 / (60 + 1)) + (0.3 / (60 + 5))
        = 0.0115 + 0.0046
        = 0.0161

// Entry B: rank 3 in semantic, not in keyword
score_B = (0.7 / (60 + 3)) + (0.3 / ∞)
        = 0.0111 + 0
        = 0.0111

// Entry C: not in semantic, rank 1 in keyword
score_C = (0.7 / ∞) + (0.3 / (60 + 1))
        = 0 + 0.0049
        = 0.0049

// Final ranking: A > B > C
```

### Database Queries

**Semantic Search:**
```sql
SELECT
  ke.*,
  1 - (ke.embedding <=> $queryEmbedding) as similarity_score
FROM knowledge_entries ke
WHERE
  ($role IS NULL OR ke.roles && ARRAY[$role, 'all'])
  AND ($tags IS NULL OR ke.tags && $tags)
  AND ($entry_type IS NULL OR ke.entry_type = $entry_type)
  AND ke.confidence >= $min_confidence
  AND 1 - (ke.embedding <=> $queryEmbedding) >= 0.3  -- similarity threshold
ORDER BY ke.embedding <=> $queryEmbedding ASC  -- lower distance = higher similarity
LIMIT 100;  -- Fetch more than limit for RRF merging
```

**Keyword Search:**
```sql
SELECT
  ke.*,
  ts_rank_cd(to_tsvector('english', ke.content), plainto_tsquery('english', $query)) as keyword_score
FROM knowledge_entries ke
WHERE
  ($role IS NULL OR ke.roles && ARRAY[$role, 'all'])
  AND ($tags IS NULL OR ke.tags && $tags)
  AND ($entry_type IS NULL OR ke.entry_type = $entry_type)
  AND ke.confidence >= $min_confidence
  AND to_tsvector('english', ke.content) @@ plainto_tsquery('english', $query)
ORDER BY keyword_score DESC
LIMIT 100;  -- Fetch more than limit for RRF merging
```

**Related Entries:**
```sql
-- Get entry details
WITH target_entry AS (
  SELECT id, parent_id, tags
  FROM knowledge_entries
  WHERE id = $entry_id
)
-- Get parent
SELECT ke.*, 'parent' as relationship
FROM knowledge_entries ke, target_entry te
WHERE ke.id = te.parent_id

UNION ALL

-- Get siblings
SELECT ke.*, 'sibling' as relationship
FROM knowledge_entries ke, target_entry te
WHERE ke.parent_id = te.parent_id
  AND ke.id != te.id
  AND te.parent_id IS NOT NULL

UNION ALL

-- Get tag overlap (2+ shared tags)
SELECT
  ke.*,
  'tag_overlap' as relationship,
  array_length(array(SELECT unnest(ke.tags) INTERSECT SELECT unnest(te.tags)), 1) as overlap_count
FROM knowledge_entries ke, target_entry te
WHERE array_length(array(SELECT unnest(ke.tags) INTERSECT SELECT unnest(te.tags)), 1) >= 2
  AND ke.id != te.id

ORDER BY
  CASE relationship
    WHEN 'parent' THEN 1
    WHEN 'sibling' THEN 2
    WHEN 'tag_overlap' THEN 3
  END,
  overlap_count DESC NULLS LAST
LIMIT $limit;
```

## Infrastructure Notes

**No new infrastructure required.**

All infrastructure provisioned in KNOW-001:
- PostgreSQL with pgvector extension
- Docker Compose for local development
- Database schema with all necessary indexes

**Configuration:**
```bash
# .env additions (optional - uses sensible defaults)
KB_SEARCH_DEFAULT_LIMIT=10
KB_SEARCH_MAX_LIMIT=50
KB_RRF_SEMANTIC_WEIGHT=0.7  # Tunable for future optimization
KB_RRF_KEYWORD_WEIGHT=0.3
KB_SEMANTIC_SIMILARITY_THRESHOLD=0.3
```

## HTTP Contract Plan

**Not applicable.** This story implements internal search functions that will be exposed as MCP tools in KNOW-005. No HTTP endpoints are created in this story.

The MCP tool contracts are:

**kb_search:**
```json
{
  "name": "kb_search",
  "description": "Search the knowledge base using hybrid semantic + keyword search. Falls back to keyword-only if OpenAI is unavailable.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Natural language search query"
      },
      "role": {
        "type": "string",
        "enum": ["pm", "dev", "qa", "all"],
        "description": "Filter by role (optional)"
      },
      "tags": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Filter by tags - OR logic (optional)"
      },
      "entry_type": {
        "type": "string",
        "enum": ["fact", "summary", "template"],
        "description": "Filter by entry type (optional)"
      },
      "limit": {
        "type": "number",
        "default": 10,
        "minimum": 1,
        "maximum": 50,
        "description": "Maximum results to return"
      },
      "min_confidence": {
        "type": "number",
        "default": 0.0,
        "minimum": 0,
        "maximum": 1,
        "description": "Minimum confidence threshold (optional)"
      }
    },
    "required": ["query"]
  }
}
```

**kb_get_related:**
```json
{
  "name": "kb_get_related",
  "description": "Find entries related to a specific entry via parent/sibling relationships or tag overlap.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "entry_id": {
        "type": "string",
        "format": "uuid",
        "description": "UUID of the entry to find related entries for"
      },
      "limit": {
        "type": "number",
        "default": 5,
        "minimum": 1,
        "maximum": 20,
        "description": "Maximum results to return"
      }
    },
    "required": ["entry_id"]
  }
}
```

## Seed Requirements

**Test fixtures required** for integration testing and relevance validation (per QA-004 finding).

**File:** `apps/api/knowledge-base/seed-data/test-fixtures.yaml`

**Required fixture categories:**

1. **Exact match entries** - Content with exact keyword matches for precision testing
2. **Semantic match entries** - Conceptually similar content with different wording
3. **Mixed match entries** - Content that scores high on both semantic and keyword
4. **Irrelevant entries** - Content unrelated to test queries (should rank low)
5. **Special character entries** - Content with regex special characters, punctuation
6. **Tag overlap entries** - Entries with varying degrees of tag overlap for kb_get_related testing
7. **Parent-child entries** - Hierarchical relationships for sibling testing

**Example fixture structure:**
```yaml
# Test query: "How to order routes in vercel.json"
# Expected ranking: entry-1 > entry-2 > entry-3

entries:
  - id: test-entry-1
    content: "Route ordering in vercel.json: specific routes must come before parameterized routes. Place /api/stats/by-category before /api/:id."
    entry_type: fact
    roles: [dev]
    tags: [vercel, routing, api, pattern]
    confidence: 1.0
    # Expected: Rank 1 - exact keyword + high semantic match

  - id: test-entry-2
    content: "When configuring serverless routes, order matters. More specific path patterns should be defined earlier in the configuration than wildcard patterns."
    entry_type: fact
    roles: [dev]
    tags: [serverless, routing, pattern]
    confidence: 1.0
    # Expected: Rank 2 - high semantic match, partial keyword match

  - id: test-entry-3
    content: "Vercel deployment configuration includes route rewrites, redirects, and headers."
    entry_type: fact
    roles: [dev]
    tags: [vercel, deployment]
    confidence: 1.0
    # Expected: Rank 3 - keyword match "vercel", low semantic match
```

**Seed script:**
```bash
pnpm seed:test-fixtures  # Seed test database with fixtures
pnpm seed:test-fixtures --clear  # Clear and re-seed
```

## Test Plan

_Synthesized from `_pm/TEST-PLAN.md`_

### Test Coverage Summary

**Scope:**
- MCP tools: `kb_search`, `kb_get_related`
- Database: `knowledge_entries`, `embedding_cache` (read-only)
- No UI, no HTTP endpoints

**Test Files:**
```
apps/api/knowledge-base/src/search/__tests__/
  hybrid.test.ts          # RRF algorithm, score merging
  semantic.test.ts        # pgvector cosine similarity queries
  keyword.test.ts         # PostgreSQL FTS queries
  integration.test.ts     # Full kb_search flow with test DB
  kb-get-related.test.ts  # Related entry logic
```

**Coverage targets:**
- Unit tests: >80% coverage for search module
- Integration tests: All happy paths, error cases, and edge cases from test plan
- Performance benchmarks: <200ms p50 for 100 entries, <500ms p50 for 1,000 entries

### Happy Path Tests (10)

1. **Semantic search returns relevant results** - Verify top results match query intent
2. **Keyword fallback when OpenAI unavailable** - Verify graceful degradation
3. **Hybrid search with RRF merging** - Verify combined ranking is correct
4. **Role-based filtering** - Verify only matching roles returned
5. **Tag filtering** - Verify only matching tags returned
6. **Minimum confidence filtering** - Verify confidence threshold applied
7. **Entry type filtering** - Verify type filter works
8. **Limit parameter enforcement** - Verify result count respects limit
9. **kb_get_related - sibling entries** - Verify parent/sibling lookup
10. **kb_get_related - tag overlap** - Verify tag-based relationships

### Error Cases (6)

1. **Invalid query parameter** - Empty string rejected with Zod error
2. **Invalid role filter** - Non-enum value rejected
3. **Invalid limit (too high)** - Exceeds max rejected or capped
4. **Invalid entry type filter** - Non-enum value rejected
5. **kb_get_related with non-existent entry** - Returns empty gracefully
6. **Database connection failure** - Returns sanitized error

### Edge Cases (9)

1. **Search query with special characters** - Properly escaped, no SQL errors
2. **Empty result set** - Returns empty array, no errors
3. **Single result** - Returns array with 1 entry
4. **Very long query text** - Handles up to 10,000 characters
5. **All entries have same relevance score** - Stable ordering by updated_at
6. **RRF weight tuning** - Verify 0.7/0.3 weights produce expected ranking
7. **Concurrent search requests** - 10 parallel searches complete successfully
8. **kb_get_related with zero tag overlap** - Returns empty array
9. **kb_get_related limit boundary** - Enforces limit with many related entries

### Test Fixtures

**File:** `seed-data/test-fixtures.yaml`

**Contents:**
- 20+ entries with known relevance for test queries
- Document expected ranking in test comments
- Cover exact matches, semantic matches, mixed matches, irrelevant content
- Include parent-child relationships for kb_get_related
- Include entries with varying tag overlap

**Evidence to capture:**
- Test coverage report (vitest --coverage)
- Integration test logs showing RRF scores, fallback triggers
- Performance benchmark results

**Risks:**
- Test database dependency (Docker Compose must be running)
- OpenAI API key required for semantic search tests (or mock in unit tests)
- Test fixture quality determines relevance validation accuracy
- RRF weight tuning may require test updates if weights change

## UI/UX Notes

_Synthesized from `_pm/UIUX-NOTES.md`_

**Verdict: SKIPPED**

This is a backend-only story implementing MCP tools for AI agents. No UI components or user-facing interfaces. Future stories KNOW-023 (Search UI) and KNOW-024 (Management UI) will require UI/UX review when building web dashboards.

## Architecture Decision Records

### ADR-001: Hybrid Search with RRF

**Decision:** Use hybrid semantic + keyword search with Reciprocal Rank Fusion (RRF) to merge results.

**Context:** Semantic search (embeddings) finds conceptually similar content but can miss exact keyword matches. Keyword search (FTS) is precise for exact terms but misses semantic similarity.

**Options considered:**
1. Semantic-only search
2. Keyword-only search
3. Hybrid with simple score averaging
4. Hybrid with RRF merging
5. Hybrid with machine learning re-ranker

**Rationale:**
- RRF is well-established algorithm for hybrid search (used by Elasticsearch, Solr)
- More robust than simple score averaging (doesn't require score normalization)
- Simpler than ML re-ranker (no training data required)
- Weights (0.7 semantic, 0.3 keyword) are tunable for future optimization
- Provides best of both worlds: semantic + keyword precision

**Consequences:**
- Requires two separate queries (semantic + keyword) per search
- RRF merging adds computation overhead (minimal - O(n log n) sort)
- Weights may need tuning based on real usage patterns
- Fallback to keyword-only maintains degraded functionality

### ADR-002: plainto_tsquery for Keyword Search

**Decision:** Use `plainto_tsquery` instead of `to_tsquery` for converting natural language queries to FTS queries.

**Context:** `to_tsquery` requires FTS syntax (AND, OR, NOT operators). `plainto_tsquery` accepts natural language text and handles special characters safely.

**Rationale:**
- Agents submit natural language queries, not FTS syntax
- `plainto_tsquery` prevents SQL injection and syntax errors
- Automatically handles special characters: `.*+?[]{}()`
- Simpler for agents - no need to learn FTS syntax

**Consequences:**
- Slightly less control over query logic (no explicit AND/OR/NOT)
- Performance equivalent to `to_tsquery`
- Easier to use, more robust

### ADR-003: ts_rank_cd for Keyword Ranking

**Decision:** Use `ts_rank_cd` (cover density) instead of `ts_rank` for keyword search ranking.

**Context:** `ts_rank_cd` considers proximity of query terms and normalizes by document length. `ts_rank` only counts term frequency.

**Rationale:**
- `ts_rank_cd` produces higher quality rankings
- Normalization prevents long documents from dominating results
- Proximity weighting finds more relevant matches (terms close together)
- Minimal performance difference

**Consequences:**
- Slightly more complex SQL
- Better relevance for knowledge base use case (short entries with specific terms)

### ADR-004: 0.7/0.3 Semantic/Keyword Weights

**Decision:** Default RRF weights of 0.7 semantic, 0.3 keyword, configurable as constants.

**Context:** RRF requires weighting semantic vs keyword contributions. Common ratios are 0.5/0.5, 0.7/0.3, or 0.8/0.2.

**Rationale:**
- Knowledge base content is conceptual (architectural patterns, lessons learned)
- Semantic search is more valuable for conceptual queries
- Keyword search provides precision for technical identifiers (function names, file paths)
- 0.7/0.3 balances both - favors semantic but doesn't ignore keywords
- Defined as constants for easy future tuning

**Consequences:**
- May need adjustment based on real query patterns
- Test suite assumes 0.7/0.3 - may need updates if weights change
- Future enhancement: per-query weight adjustment based on query type

### ADR-005: Similarity Threshold 0.3 for Semantic Results

**Decision:** Exclude semantic search results with cosine similarity < 0.3.

**Context:** pgvector can return very distant matches with low similarity scores. These are rarely relevant.

**Rationale:**
- Similarity 0.3 is commonly used threshold for relevance
- Prevents noise in results (very low similarity = unrelated content)
- Improves result quality without over-filtering
- Threshold is tunable like RRF weights

**Consequences:**
- May filter some edge-case relevant results
- Reduces result set size (fewer low-quality results)
- Threshold can be adjusted if too aggressive

## Token Budget

| Phase | Input Tokens | Output Tokens | Total | Cost (est.) |
|-------|--------------|---------------|-------|-------------|
| **PM Story Generation** | TBD | TBD | TBD | TBD |
| Elaboration | — | — | — | — |
| Implementation | — | — | — | — |
| Code Review | — | — | — | — |
| QA Verification | — | — | — | — |
| **Total** | **—** | **—** | **—** | **—** |

_PM: Record token delta after completing this phase. Run `/cost` before and after._

## Agent Log

Append-only record of agent actions on this story.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-25T00:00 | pm-story-generation-leader | Story generation | KNOW-004.md, TEST-PLAN.md, DEV-FEASIBILITY.md, UIUX-NOTES.md |
| 2026-01-25T02:30 | qa-epic-analyst | Elaboration analysis | ANALYSIS.md with 8 audit checks, 5 issues, 10 gaps, 10 enhancements |
| 2026-01-25T03:00 | pm-story-refinement | User decision review | 15 items as AC, 5 out-of-scope items deferred |
| 2026-01-25T03:15 | elab-completion-leader | Story completion | ELAB-KNOW-004.md, updated KNOW-004.md status |

---

## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on 2026-01-25_

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Index performance validation missing | Add as AC | Add EXPLAIN ANALYZE logging during integration tests to confirm IVFFlat and GIN index hits. Document in test plan. |
| 2 | Fallback mode discoverability | Add as AC | Add `search_modes_used: ['semantic', 'keyword']` array to metadata for transparency. |
| 3 | RRF k-constant documentation | Add as AC | Document why k=60: "k=60 is standard RRF constant from IR research (Cormack et al., 2009)". |
| 4 | Tag filter OR vs AND semantics documentation | Add as AC | Document: OR enables discovery (find entries related to ANY listed tag), AND would be too restrictive. |
| 5 | Related entries relationship priority documentation | Add as AC | Document: Parent provides context, siblings provide alternatives, tag-overlap provides discovery. |
| 6 | Content hash collision handling documentation | Add as AC | Document: if collision occurs, cached embedding is reused (acceptable false positive). |
| 7 | Empty result set ranking documentation | Add as AC | Document: RRF merging degrades gracefully to keyword-only ranking. |
| 8 | Concurrent request isolation | Add as AC | Document: PostgreSQL default (READ COMMITTED) is safe for read-only queries. |
| 9 | Embedding dimension mismatch detection | Out of Scope | Defer to KNOW-016 (PostgreSQL Monitoring) or KNOW-018 (Audit Logging). Ops/monitoring concern. |
| 10 | Search logging verbosity | Add as AC | Add structured performance metrics to info log: `{ query_time_ms, semantic_ms, keyword_ms, rrf_ms, result_count }`. |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Query explanation for debugging | Add as AC | Add optional `explain: boolean` parameter returning debug_info with component scores. |
| 2 | Semantic-only vs keyword-only modes | Out of Scope | Defer as future enhancement post-MVP. |
| 3 | Result highlighting | Add as AC | Return matched terms or semantic similarity scores per result for UI display. |
| 4 | Query suggestions | Add as AC | If search returns empty, suggest alternative queries based on tag analysis. |
| 5 | Saved searches / bookmarks | Add as AC | Allow agents to save frequently used queries for efficiency. |
| 6 | Approximate result count | Add as AC | Track estimated vs actual result distribution for performance insights. |
| 7 | Multi-language FTS support | Out of Scope | Defer until multi-language content needed. |
| 8 | Embedding model versioning | Out of Scope | Defer to KNOW-007 (Admin Tools) for embedding rebuild capabilities. |
| 9 | Search telemetry dashboard | Out of Scope | Defer to KNOW-016 (PostgreSQL Monitoring) and KNOW-019 (Query Analytics). |
| 10 | Semantic clustering visualization | Out of Scope | Defer to KNOW-024 (Management UI) as optional curation feature. |

### Follow-up Stories Suggested

- [ ] None - All enhancements marked "Add as AC" are now part of primary story scope

### Items Marked Out-of-Scope

- **Embedding dimension mismatch detection**: Ops/monitoring concern - defer to KNOW-016 or KNOW-018
- **Semantic-only vs keyword-only modes**: Future enhancement post-MVP
- **Multi-language FTS support**: Defer until internationalization requirement emerges
- **Embedding model versioning**: Defer to KNOW-007 (Admin Tools) as part of embedding rebuild
- **Search telemetry dashboard**: Defer to KNOW-016 (PostgreSQL Monitoring) and KNOW-019 (Query Analytics)
- **Semantic clustering visualization**: Defer to KNOW-024 (Management UI) as optional feature

### Elaboration Impact Summary

**Original Story**: 10 acceptance criteria
**Gaps Added**: 10 findings → 8 added as AC (issues #1, #2, #3, #4, #5, #6, #7, #8, #10)
**Enhancements Added**: 10 findings → 5 added as AC (enhancements #1, #3, #4, #5, #6)
**Items Deferred**: 5 findings (gaps #9, enhancements #2, #7, #8, #9, #10)

**Final Story**: 25 acceptance criteria
**Status**: Ready to implement with expanded scope addressing discovered gaps and planned enhancements
