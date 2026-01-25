---
status: backlog
follow_up_from: KNOW-002
---

# KNOW-026: Semantic Deduplication for Near-Duplicate Content

## Follow-up Context

- **Parent Story:** KNOW-002 (Embedding Client Implementation)
- **Source:** QA Discovery Notes - Enhancement Opportunity #3
- **Original Finding:** "Add semantic similarity check: if new text is 99% similar to cached text (cosine similarity > 0.99), reuse cached embedding. Massive cost savings for near-duplicate content."
- **Category:** Enhancement Opportunity
- **Impact:** High (significant API cost reduction for near-duplicate content)
- **Effort:** Medium (similarity search integration, cache lookup optimization)

## Context

The current embedding client (KNOW-002) implements exact content-hash deduplication via SHA-256. Identical text strings share cached embeddings, avoiding redundant OpenAI API calls. However, near-duplicate content (e.g., "How do I create a new feature?" vs "How do I create a feature?") generates separate embeddings despite semantic equivalence.

In a knowledge base with learnings, templates, and agent instructions, near-duplicate content is common. Small variations in phrasing, whitespace, or punctuation create unique content hashes but semantically identical embeddings.

This story implements semantic deduplication: before generating a new embedding, check if highly similar text (cosine similarity > 0.99) already exists in the cache. If found, reuse the existing embedding instead of calling OpenAI API. This provides massive cost savings for near-duplicate content while maintaining search accuracy.

## Goal

Reduce OpenAI API calls by 20-40% through semantic deduplication of near-duplicate content while maintaining embedding generation correctness and performance.

## Non-goals

- **Fuzzy text matching** - Not implementing Levenshtein distance or text similarity algorithms (only embedding similarity)
- **Automatic content normalization** - Not preprocessing text to remove duplicates (users provide content as-is)
- **Deduplication across models** - Only within same embedding model (text-embedding-3-small)
- **Cluster-based deduplication** - Simple threshold-based approach (no k-means clustering)
- **UI for managing duplicates** - Automated detection only (manual management deferred to KNOW-024)

## Scope

### Packages Affected

- `apps/api/knowledge-base/embedding-client/cache-manager.ts` - Add semantic similarity lookup
- `apps/api/knowledge-base/embedding-client/index.ts` - Integrate semantic deduplication check
- `apps/api/knowledge-base/schema/` - Add index for efficient similarity search

### Endpoints

None - Internal cache optimization only

### Infrastructure

**Database optimizations:**
- Add pgvector index on `embedding_cache.embedding` for fast nearest neighbor search
- IVFFlat or HNSW index for approximate nearest neighbor (ANN) lookup
- Tune index parameters for recall vs performance tradeoff

**Performance targets:**
- Semantic similarity check: <100ms for cache lookup
- No impact on cache hit latency (existing exact hash lookups unchanged)
- Acceptable false positive rate: <1% (reusing embeddings for non-duplicates)

## Acceptance Criteria

### AC1: Semantic Similarity Threshold Configuration
**Given** environment variable `SEMANTIC_DEDUP_THRESHOLD`
**When** generating embeddings
**Then**:
- Default threshold is 0.99 (99% similarity)
- Configurable range: 0.90 to 0.999
- Threshold validation on startup (error if out of range)
- Threshold documented in README

### AC2: Near-Duplicate Detection Before API Call
**Given** new text input for embedding generation
**When** exact content-hash lookup misses
**Then**:
- Perform approximate nearest neighbor (ANN) search in embedding_cache
- Use configured similarity threshold (default 0.99)
- If match found: return cached embedding, log "semantic dedup hit"
- If no match: proceed to OpenAI API call
- Performance: similarity search completes in <100ms

### AC3: Cosine Similarity Calculation
**Given** candidate cached embedding
**When** computing similarity with new text's embedding
**Then**:
- Use pgvector's cosine similarity operator (<=>)
- Return similarity score in range [0, 1]
- Log similarity score for matches above threshold
- No false negatives (threshold misses true duplicates)

### AC4: Cache Entry Reuse
**Given** semantically similar text found (similarity > threshold)
**When** returning cached embedding
**Then**:
- Return existing embedding vector unchanged
- Do NOT create new cache entry (avoid redundant storage)
- Log original content_hash and new content_hash for audit trail
- Include semantic similarity score in log message

### AC5: Deduplication Logging and Metrics
**Given** any embedding generation request
**When** semantic deduplication is evaluated
**Then**:
- Log "semantic dedup check" with similarity score
- Log "semantic dedup hit" when embedding reused
- Log "semantic dedup miss" when no similar embedding found
- Include estimated cost savings in log (avoided API call)
- Use @repo/logger for structured logging

### AC6: Deduplication Bypass for Low Similarity
**Given** semantic similarity check returns score < threshold
**When** no similar embeddings found
**Then**:
- Proceed to OpenAI API call (normal flow)
- Generate new embedding
- Store in cache with unique content_hash
- No performance penalty vs current implementation

### AC7: Batch Processing Support
**Given** batch embedding request (generateEmbeddingsBatch)
**When** processing multiple texts
**Then**:
- Semantic deduplication applied to each text individually
- Batch performance impact < 20% vs exact-match-only
- Results returned in original order
- Deduplication stats logged per batch (total hits/misses)

### AC8: False Positive Prevention
**Given** similarity threshold configuration
**When** validating deduplication accuracy
**Then**:
- False positive rate < 1% (reusing embeddings for non-duplicates)
- Measure false positive rate on test dataset (1000+ examples)
- Document validation methodology in proof
- Threshold tuning guidance based on false positive analysis

### AC9: Index Performance Optimization
**Given** pgvector ANN index on embedding_cache
**When** performing similarity searches
**Then**:
- Index type selected: IVFFlat or HNSW (document decision)
- Index parameters tuned for <100ms lookup at 10k+ cache entries
- Index creation script in migration
- Index performance benchmarks in proof

### AC10: Graceful Degradation on Index Failure
**Given** pgvector ANN index is missing or corrupted
**When** semantic deduplication check runs
**Then**:
- Fall back to exact content-hash lookup only
- Log warning: "Semantic deduplication disabled (index unavailable)"
- Continue normal embedding generation
- No errors thrown to caller

### AC11: Deduplication Statistics Tracking
**Given** extended cache usage
**When** querying deduplication effectiveness
**Then**:
- Track total semantic dedup hits vs exact hits vs misses
- Expose statistics via future kb_cache_stats tool (KNOW-019)
- Store stats in memory (no database persistence in this story)
- Log stats summary at regular intervals (e.g., every 1000 requests)

### AC12: Multi-Model Isolation
**Given** embeddings from different models (future KNOW-013)
**When** performing semantic similarity search
**Then**:
- Similarity search scoped to same model only
- WHERE clause filters by model field
- No cross-model deduplication
- Model validation in cache lookup query

## Reuse Plan

### Builds on KNOW-002
- Existing cache-manager.ts extended with similarity search
- Content-hash deduplication remains primary strategy
- OpenAI API integration unchanged (semantic dedup is pre-check)

### Database Infrastructure (KNOW-001)
- PostgreSQL with pgvector extension
- Cosine similarity operator (<=>)
- Approximate nearest neighbor (ANN) indexes

### Testing Infrastructure
- Vitest test harness from KNOW-002
- Add benchmarking for similarity search performance
- MSW mocks unaffected (semantic dedup operates on cache layer)

## Architecture Notes

### Deduplication Flow

**Layered cache lookup strategy:**
```
1. Check exact content-hash lookup (O(1)) → cache hit? return
2. Check semantic similarity (O(log n)) → similarity > 0.99? reuse
3. Generate new embedding via OpenAI API
4. Store in cache with unique content_hash
```

**Why layered?**
- Exact hash lookups are fastest (indexed lookup)
- Semantic similarity is approximate (requires ANN search)
- Minimize latency by checking exact match first

### Similarity Search Algorithm

**pgvector ANN index options:**

**IVFFlat (Inverted File Flat):**
- Faster index builds
- Moderate recall (90-95%)
- Good for medium datasets (1k-100k entries)
- Parameters: `lists` (number of clusters)

**HNSW (Hierarchical Navigable Small World):**
- Slower index builds
- High recall (95-99%)
- Better for large datasets (100k+ entries)
- Parameters: `m` (connections per node), `ef_construction` (build quality)

**Decision criteria:**
- Start with IVFFlat (simpler, adequate for MVP)
- Benchmark recall vs performance
- Document upgrade path to HNSW if needed

### Similarity Query

**SQL query for semantic deduplication:**
```sql
SELECT content_hash, embedding, 1 - (embedding <=> $1) AS similarity
FROM embedding_cache
WHERE model = $2
  AND 1 - (embedding <=> $1) > $3  -- threshold filter
ORDER BY embedding <=> $1  -- cosine distance
LIMIT 1;
```

**Parameters:**
- `$1`: Query embedding vector (generated from input text)
- `$2`: Model name (e.g., "text-embedding-3-small")
- `$3`: Similarity threshold (e.g., 0.99)

**Performance considerations:**
- pgvector ANN indexes use approximate search (trade recall for speed)
- Higher `lists` or `ef_construction` → better recall, slower queries
- Tuning documented in migration script

### Cache Entry Linking

**Option 1: Store reference to original (recommended):**
- Add `duplicate_of` column to embedding_cache (UUID nullable)
- When semantic duplicate found, create new row with `duplicate_of` pointing to original
- Allows audit trail of deduplication decisions
- Enables rollback if false positives detected

**Option 2: No separate entry (deferred):**
- Simply return cached embedding without new entry
- Simpler implementation, no storage overhead
- Loses audit trail (only visible in logs)

**Decision:** Start with Option 2 for MVP simplicity, defer Option 1 to KNOW-019 (analytics)

## Test Plan

### Unit Tests
- Similarity threshold parsing and validation
- Cosine similarity calculation correctness
- Cache lookup query construction
- Deduplication decision logic (above/below threshold)

### Integration Tests
- End-to-end semantic deduplication flow
- Exact match takes priority over semantic match
- Batch processing with mixed exact/semantic/miss scenarios
- Index unavailable fallback behavior

### Benchmarking Tests
- Similarity search latency (target <100ms)
- False positive rate measurement (target <1%)
- Deduplication effectiveness (API call reduction on test dataset)
- Index performance at scale (1k, 10k, 100k entries)

### Quality Validation Tests
- Test dataset with known near-duplicates (e.g., paraphrases)
- Verify correct deduplication for similar texts
- Verify no deduplication for semantically different texts
- Document threshold tuning analysis in proof

## Risks / Edge Cases

### Risk 1: False Positives (High Similarity, Different Meaning)
**Scenario:** Two texts score >0.99 similarity but have different semantic meanings
**Mitigation:** Comprehensive quality validation (AC8), tunable threshold, audit logging of deduplication decisions

### Risk 2: Query Performance Degradation
**Scenario:** Semantic similarity search adds unacceptable latency
**Mitigation:** ANN index tuning (AC9), <100ms SLO, fallback to exact-match-only mode

### Risk 3: Index Build Time for Large Caches
**Scenario:** Creating ANN index on 100k+ entries takes hours
**Mitigation:** Background index creation, document maintenance windows, consider online index builds (pgvector 0.5+)

### Risk 4: Reduced Cost Savings vs Expectations
**Scenario:** Real-world deduplication rate lower than anticipated (20-40% target)
**Mitigation:** Measure actual deduplication rate on production data, document ROI analysis, deactivate feature if savings negligible

### Risk 5: Embedding Drift Over Time
**Scenario:** OpenAI updates embedding model, causing similarity scores to change
**Mitigation:** Model version in cache key (from KNOW-002), semantic dedup scoped per model, invalidate cache on model upgrade

## Open Questions

- What is the expected near-duplicate rate in the knowledge base? (Estimate via sample analysis)
- Should semantic deduplication apply to batch requests or single requests only?
- What is acceptable latency impact for semantic dedup (<100ms target confirmed?)

---

**Next Steps After Story Creation:**
1. Run `/elab-story plans/future/knowledgebase-mcp KNOW-026` to elaborate this story
2. Analyze sample knowledge base content for near-duplicate rate
3. Research pgvector ANN index performance benchmarks
