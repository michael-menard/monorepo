---
story_id: KNOW-002
title: "Embedding Client Implementation"
status: uat
created_at: "2026-01-25"
updated_at: "2026-01-25"
depends_on: []
blocks: ["KNOW-003"]
epic: "knowledgebase-mcp"
story_prefix: "KNOW"
priority: P0
estimated_complexity: medium
---

# KNOW-002: Embedding Client Implementation

## Context

The knowledge base MCP server requires a reliable embedding generation service to convert text into vector representations for semantic search. This story implements an OpenAI embedding client using the `text-embedding-3-small` model with intelligent caching, retry logic, and batch processing capabilities.

Embeddings are the foundation of semantic search - they convert natural language into high-dimensional vectors that capture meaning. By caching embeddings based on content hash, we minimize API costs and latency while ensuring fast retrieval of previously processed content.

This story builds on KNOW-001's infrastructure (PostgreSQL with pgvector extension) and creates the core embedding generation capability that all subsequent knowledge base features depend on.

## Goal

Provide a production-ready OpenAI embedding client that:
1. Generates 1536-dimensional embeddings using `text-embedding-3-small` model
2. Caches embeddings in PostgreSQL using content-hash deduplication
3. Handles OpenAI API failures gracefully with exponential backoff retry logic
4. Processes batch requests efficiently while maintaining result order
5. Degrades gracefully when cache is unavailable
6. Logs all operations and estimated costs for observability

## Non-Goals

The following are explicitly **out of scope** for this story:

- **CloudWatch metrics and alerting** - Deferred to KNOW-007 (performance testing) and KNOW-016 (monitoring)
- **AWS Secrets Manager integration** - Deferred to KNOW-011 (local development uses .env only)
- **Automatic cache eviction/expiry** - Deferred to KNOW-007 (manual management via kb_rebuild_embeddings)
- **Multi-model support** - Hard-coded to text-embedding-3-small (future models require schema migration)
- **Production deployment** - This story implements library code only (no Lambda changes)
- **MCP tool exposure** - Embeddings are internal infrastructure (exposed via CRUD operations in KNOW-003)

## Scope

### Packages Affected

**New implementation:**
- `apps/api/knowledge-base/embedding-client/` (new directory)
  - `index.ts` - Main EmbeddingClient class with public API
  - `cache-manager.ts` - Cache read/write operations
  - `batch-processor.ts` - Batch request handling with order preservation
  - `retry-handler.ts` - Exponential backoff retry logic
  - `__types__/index.ts` - Zod schemas for embeddings and cache entries
  - `__tests__/` - Vitest test suite with MSW mocks

**Database schema:**
- `apps/api/knowledge-base/schema/`
  - `embedding_cache` table definition and migration script

**Shared packages (reuse):**
- `@repo/logger` - All logging (NO console.log)
- Docker Compose from KNOW-001 - PostgreSQL with pgvector

### Endpoints

**None** - This is an internal library/service. No API Gateway endpoints exposed.

### Infrastructure

**Database:**
- `embedding_cache` table in PostgreSQL
  - Columns: `id` (UUID), `content_hash` (text, SHA-256), `model` (text), `embedding` (vector(1536)), `created_at` (timestamp)
  - Composite index on `(content_hash, model)` for fast cache lookups
  - pgvector extension required (provided by KNOW-001)

**External APIs:**
- OpenAI Embeddings API (https://api.openai.com/v1/embeddings)
- Model: `text-embedding-3-small`
- Output dimensions: 1536
- Token limit: 8191 tokens

**Environment variables:**
- `OPENAI_API_KEY` - OpenAI API authentication (required)
- `EMBEDDING_MODEL` - Model name (default: "text-embedding-3-small")
- `OPENAI_TIMEOUT_MS` - Request timeout (default: 30000)
- `OPENAI_RETRY_COUNT` - Retry attempts (default: 3)
- `OPENAI_MAX_CONCURRENT_REQUESTS` - Concurrency limit (default: 10)
- `CACHE_ENABLED` - Enable/disable caching (default: true)

## Acceptance Criteria

### AC1: Single Embedding Generation (Cache Miss)
**Given** a text string and no cached embedding exists
**When** `generateEmbedding(text)` is called
**Then**:
- Returns a 1536-dimensional embedding vector
- Creates cache entry with SHA-256 content hash
- Logs OpenAI API request with estimated cost
- Response time < 200ms (excluding OpenAI API latency)

### AC2: Single Embedding Generation (Cache Hit)
**Given** a text string with existing cached embedding
**When** `generateEmbedding(text)` is called
**Then**:
- Returns cached embedding vector
- NO OpenAI API call is made
- Logs "cache hit" message
- Response time < 50ms

### AC3: Batch Embedding Generation
**Given** an array of N unique text strings
**When** `generateEmbeddingsBatch(texts)` is called
**Then**:
- Returns array of N embeddings in same order as input
- Creates N cache entries for uncached texts
- Batches OpenAI API requests efficiently (respects API limits)
- Preserves input array order in output

### AC4: Mixed Cache Hits and Misses in Batch
**Given** a batch with both cached and uncached texts
**When** `generateEmbeddingsBatch(texts)` is called
**Then**:
- Only uncached texts generate OpenAI API calls
- Cached texts retrieved from database
- Results assembled in correct input order
- Logs show cache hit count and miss count

### AC5: Retry Logic for Rate Limits (429)
**Given** OpenAI API returns 429 rate limit error
**When** `generateEmbedding(text)` is called
**Then**:
- Retries 3 times with exponential backoff (1s, 2s, 4s)
- Logs each retry attempt with delay
- Throws clear error after all retries exhausted: "OpenAI API rate limit exceeded after 3 retries"
- No cache entry created on failure

### AC6: Error Handling for Invalid API Key
**Given** invalid or expired OPENAI_API_KEY
**When** `generateEmbedding(text)` is called
**Then**:
- Throws error: "OpenAI API authentication failed"
- Does NOT retry (auth errors are permanent)
- Logs error with 401 status code
- No cache entry created

### AC7: Graceful Degradation on Cache Failure
**Given** PostgreSQL database is unavailable
**When** `generateEmbedding(text)` is called
**Then**:
- Falls back to uncached mode
- Still generates embedding via OpenAI API
- Logs warning: "Cache unavailable, proceeding without caching"
- Returns valid embedding to caller (no error thrown)

### AC8: Text Preprocessing and Validation
**Given** various text inputs
**When** `generateEmbedding(text)` is called
**Then**:
- Trims leading/trailing whitespace before hashing
- Normalizes internal whitespace (multiple spaces → single space)
- Throws validation error for null/undefined/empty inputs
- Preserves case (no automatic lowercasing)

### AC9: Content Hash Deduplication
**Given** identical text content
**When** multiple `generateEmbedding(text)` calls are made
**Then**:
- Same SHA-256 content hash generated
- Same cache entry retrieved
- Only 1 OpenAI API call made for first request
- Subsequent requests use cached embedding

### AC10: Concurrent Request Deduplication
**Given** 10 parallel requests for identical text (cache cold)
**When** requests are made concurrently
**Then**:
- Only 1 OpenAI API call made (in-memory deduplication)
- All 10 requests return same embedding
- 1 cache entry created
- No race condition errors
- Deduplication overhead < 50ms

### AC11: Cache Key Includes Model Version
**Given** embeddings generated with different models
**When** cache lookups are performed
**Then**:
- Cache key is composite: (content_hash + model)
- Same text with different models creates separate cache entries
- Model version changes trigger cache miss (correct behavior)

### AC12: Cost Logging
**Given** any embedding generation
**When** OpenAI API is called
**Then**:
- Logs estimated cost using formula: $0.00002 per 1K tokens
- Includes token count in log message
- Logs are structured (use @repo/logger)
- Cost visible for budget tracking

### AC13: Batch Size Handling
**Given** a batch exceeding OpenAI API limits (>2048 texts)
**When** `generateEmbeddingsBatch(texts)` is called
**Then**:
- Automatically splits into multiple API requests
- Respects rate limits between batches
- Returns all embeddings in original order
- Logs batch splitting activity

### AC14: Token Limit Truncation
**Given** text exceeding 8191 tokens (model limit)
**When** `generateEmbedding(longText)` is called
**Then**:
- Text truncated to 8191 tokens before API call
- Logs warning: "Text truncated to 8191 tokens"
- Embedding generated for truncated text
- Cache stores hash of truncated content

### AC15: Error Response Contract
**Given** any error scenario
**When** embedding generation fails
**Then**:
- Throws standard Error objects with descriptive messages
- Includes retry count in error message for retryable failures
- Does NOT expose OpenAI API keys or sensitive details
- Error messages are safe to log and display to developers

## Test Plan

### Scope Summary

**Endpoints touched:** None (internal library)
**UI touched:** No
**Data/storage touched:** Yes (`embedding_cache` table, OpenAI API)

### Unit Tests (Vitest)

**Test files:**
1. `embedding-client.test.ts` - Core client logic
2. `cache-manager.test.ts` - Cache operations
3. `retry-handler.test.ts` - Exponential backoff
4. `batch-processor.test.ts` - Batch handling

**Coverage requirement:** >80% code coverage

### Happy Path Tests

**Test 1: Generate Single Embedding (Cache Miss)**
- Clear cache, call `generateEmbedding("test text")`
- Assert: 1536-dimensional vector returned
- Assert: Cache entry created with correct content_hash
- Assert: OpenAI API called once
- Assert: Cost logged

**Test 2: Generate Embedding (Cache Hit)**
- Pre-populate cache with "cached text"
- Call `generateEmbedding("cached text")`
- Assert: Cached embedding returned
- Assert: No OpenAI API call
- Assert: Response time < 50ms

**Test 3: Batch Embedding Generation**
- Call `generateEmbeddingsBatch([text1, text2, text3])`
- Assert: 3 embeddings returned in order
- Assert: 3 cache entries created
- Assert: Batch API request made

**Test 4: Mixed Cache Hits and Misses**
- Pre-cache ["a", "b"], request ["a", "b", "c", "d"]
- Assert: Only 2 API calls (for "c" and "d")
- Assert: 4 embeddings returned in correct order

### Error Cases

**Test 5: Invalid API Key**
- Mock 401 response
- Assert: Error thrown with clear message
- Assert: No retries attempted (permanent error)
- Assert: No cache entry created

**Test 6: Rate Limit (429)**
- Mock 429 responses for first 3 attempts, then 200
- Assert: 3 retries with exponential backoff
- Assert: Success after retries
- Assert: Logs show retry attempts

**Test 7: Network Timeout**
- Mock timeout error
- Assert: 3 retries attempted
- Assert: Error thrown after exhausting retries

**Test 8: Empty Text Input**
- Call `generateEmbedding("")`
- Assert: Validation error thrown
- Assert: No API call made

**Test 9: Database Connection Failure**
- Stop PostgreSQL before test
- Assert: Embedding still generated (fallback mode)
- Assert: Warning logged about cache unavailable

**Test 10: Malformed Cache Entry**
- Insert corrupt embedding in cache
- Assert: Cache corruption detected
- Assert: New embedding generated
- Assert: Corrupt entry overwritten

### Edge Cases

**Test 11: Very Long Text (>8191 tokens)**
- Input text exceeding token limit
- Assert: Text truncated to 8191 tokens
- Assert: Warning logged
- Assert: Embedding generated for truncated text

**Test 12: Concurrent Requests for Same Text**
- Spawn 10 parallel `generateEmbedding(sameText)` calls
- Assert: Only 1 OpenAI API call
- Assert: All 10 requests receive same embedding
- Assert: 1 cache entry created

**Test 13: Batch Size > OpenAI Limit**
- Request batch of 2048 texts
- Assert: Auto-split into multiple API requests
- Assert: All embeddings returned in order

**Test 14: Cache at Capacity**
- Pre-populate cache with 100k+ entries
- Assert: New embedding cached successfully
- Assert: Performance < 100ms for cache lookup

**Test 15: Model Upgrade Scenario**
- Cache embedding for text with model A
- Request same text with model B
- Assert: Cache miss (different model)
- Assert: New cache entry created

## Definition of Done

- [ ] All acceptance criteria (AC1-AC15) passing
- [ ] Vitest test suite with >80% code coverage
- [ ] All tests passing in CI
- [ ] MSW mocks for all OpenAI API scenarios
- [ ] Database migration script created and tested
- [ ] README.md in embedding-client directory with usage examples
- [ ] JSDoc comments on all public methods
- [ ] Environment variables documented
- [ ] @repo/logger used for all logging (no console.log)
- [ ] Zod schemas for all types (no TypeScript interfaces)
- [ ] Cache invalidation scenarios documented
- [ ] Cost estimation formula documented
- [ ] Graceful degradation tested (cache unavailable)
- [ ] Performance benchmarks met (<200ms cache miss, <50ms cache hit)
- [ ] Proof document (PROOF-KNOW-002.md) created with evidence

## Agent Log

| Timestamp | Agent | Action | Notes |
|-----------|-------|--------|-------|
| 2026-01-25 | pm-story-generation-leader | Story generated | Synthesized from index entry and worker artifacts |
| 2026-01-25 | qa-verify-completion-leader | Status updated to needs-work | QA verification FAILED - no test coverage (0% vs 80% required) |

---
