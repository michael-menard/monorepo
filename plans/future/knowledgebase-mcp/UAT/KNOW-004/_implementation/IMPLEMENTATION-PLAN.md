# Implementation Plan - KNOW-004: Search Implementation

## Overview

Implement hybrid semantic + keyword search for the knowledge base MCP server using RRF (Reciprocal Rank Fusion) to merge results from pgvector cosine similarity and PostgreSQL full-text search.

## Implementation Order

### Step 1: Create Search Schemas (`schemas.ts`)

Define Zod schemas for search inputs and outputs:

```typescript
// SearchInputSchema - kb_search input validation
// SearchResultSchema - kb_search output with metadata
// GetRelatedInputSchema - kb_get_related input validation
// GetRelatedResultSchema - kb_get_related output with metadata
// ScoredEntrySchema - internal type for ranked results
// SearchErrorSchema - consistent error response structure
```

**Constants:**
- `SEMANTIC_WEIGHT = 0.7`
- `KEYWORD_WEIGHT = 0.3`
- `RRF_K = 60`
- `SEMANTIC_SIMILARITY_THRESHOLD = 0.3`
- `DEFAULT_LIMIT = 10`
- `MAX_LIMIT = 50`

### Step 2: Implement Semantic Search (`semantic.ts`)

Query pgvector using cosine distance operator:

```typescript
async function semanticSearch(
  db: DrizzleClient,
  queryEmbedding: number[],
  filters: SearchFilters,
  limit: number
): Promise<ScoredEntry[]>
```

**SQL Pattern:**
```sql
SELECT
  ke.*,
  1 - (ke.embedding <=> $queryEmbedding) as similarity_score
FROM knowledge_entries ke
WHERE
  ($role IS NULL OR ke.role = $role OR ke.role = 'all')
  AND ($tags IS NULL OR ke.tags && $tags)
  AND 1 - (ke.embedding <=> $queryEmbedding) >= 0.3
ORDER BY ke.embedding <=> $queryEmbedding ASC
LIMIT 100;
```

### Step 3: Implement Keyword Search (`keyword.ts`)

Query PostgreSQL FTS using plainto_tsquery:

```typescript
async function keywordSearch(
  db: DrizzleClient,
  query: string,
  filters: SearchFilters,
  limit: number
): Promise<ScoredEntry[]>
```

**SQL Pattern:**
```sql
SELECT
  ke.*,
  ts_rank_cd(to_tsvector('english', ke.content), plainto_tsquery('english', $query)) as keyword_score
FROM knowledge_entries ke
WHERE
  to_tsvector('english', ke.content) @@ plainto_tsquery('english', $query)
  AND ($role IS NULL OR ke.role = $role OR ke.role = 'all')
  AND ($tags IS NULL OR ke.tags && $tags)
ORDER BY keyword_score DESC
LIMIT 100;
```

### Step 4: Implement RRF Hybrid Merge (`hybrid.ts`)

Merge semantic and keyword results using Reciprocal Rank Fusion:

```typescript
function mergeWithRRF(
  semanticResults: ScoredEntry[],
  keywordResults: ScoredEntry[],
  config: { semanticWeight: number; keywordWeight: number; k: number }
): RankedEntry[]
```

**RRF Formula:**
```
rrf_score = (semantic_weight / (k + semantic_rank)) + (keyword_weight / (k + keyword_rank))
```

### Step 5: Implement kb_search (`kb-search.ts`)

Main search function orchestrating the hybrid search flow:

```typescript
async function kb_search(
  input: SearchInput,
  deps: KbSearchDeps
): Promise<SearchResult>
```

**Flow:**
1. Validate input with Zod schema
2. Start timer for query_time_ms
3. Try to generate query embedding via EmbeddingClient
4. If embedding succeeds, execute semantic search
5. Execute keyword search (always)
6. Merge results with RRF (or use keyword-only if embedding failed)
7. Apply limit and return with metadata

**Fallback Behavior:**
- If EmbeddingClient throws after retries, set `fallback_mode: true`
- Continue with keyword-only search
- Log warning with @repo/logger

### Step 6: Implement kb_get_related (`kb-get-related.ts`)

Find related entries via parent/sibling/tag relationships:

```typescript
async function kb_get_related(
  input: GetRelatedInput,
  deps: KbGetRelatedDeps
): Promise<GetRelatedResult>
```

**Query Order:**
1. Parent entry (if parent_id exists)
2. Sibling entries (same parent_id)
3. Tag overlap entries (2+ shared tags, ordered by overlap count)

### Step 7: Create Barrel Export (`index.ts`)

Export all public functions, types, and schemas.

### Step 8: Write Test Suite

| Test File | Coverage |
|-----------|----------|
| `semantic.test.ts` | pgvector queries, similarity threshold, filtering |
| `keyword.test.ts` | FTS queries, special characters, ranking |
| `hybrid.test.ts` | RRF algorithm, deduplication, edge cases |
| `kb-search.test.ts` | Full integration, fallback, validation errors |
| `kb-get-related.test.ts` | Parent/sibling/tag relationships |

## File Structure

```
apps/api/knowledge-base/src/search/
  schemas.ts         # Zod schemas and constants
  semantic.ts        # pgvector cosine similarity
  keyword.ts         # PostgreSQL FTS
  hybrid.ts          # RRF merging
  kb-search.ts       # Main kb_search function
  kb-get-related.ts  # Related entries lookup
  index.ts           # Barrel exports
  __tests__/
    semantic.test.ts
    keyword.test.ts
    hybrid.test.ts
    kb-search.test.ts
    kb-get-related.test.ts
    test-helpers.ts  # Shared test utilities
```

## Dependencies

| Dependency | Usage |
|------------|-------|
| `drizzle-orm` | Type-safe SQL queries |
| `zod` | Input/output validation |
| `@repo/logger` | Structured logging |
| `EmbeddingClient` | Query embedding generation |
| `knowledgeEntries` schema | Database table reference |

## Acceptance Criteria Mapping

| AC | Implementation |
|----|----------------|
| AC1 | kb-search.ts with hybrid flow |
| AC2 | Fallback in kb-search.ts try/catch |
| AC3 | Filter parameters in schemas.ts and query functions |
| AC4 | Zod validation in schemas.ts |
| AC5 | kb-get-related.ts |
| AC6 | Logging in all functions |
| AC7 | Error handling with sanitization |
| AC8 | hybrid.ts RRF implementation |
| AC9 | keyword.ts FTS implementation |
| AC10 | Test suite coverage |

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| pgvector query syntax | Use raw SQL via Drizzle sql`` template |
| FTS index usage | Add EXPLAIN ANALYZE in tests |
| RRF score calculation | Unit tests with known inputs |
| OpenAI API failures | EmbeddingClient has retry logic built-in |

## Estimated Implementation Time

| Step | Estimate |
|------|----------|
| Schemas | 30 min |
| Semantic search | 45 min |
| Keyword search | 45 min |
| Hybrid RRF | 30 min |
| kb_search | 45 min |
| kb_get_related | 30 min |
| Index/exports | 15 min |
| Test suite | 90 min |
| **Total** | ~6 hours |

## Plan Validation Checklist

- [x] All ACs have implementation mapping
- [x] Dependencies identified and available
- [x] File structure follows monorepo patterns
- [x] Test strategy defined
- [x] Error handling planned
- [x] Logging strategy defined
- [x] No blocking TBDs
