---
status: backlog
follow_up_from: KNOW-002
---

# KNOW-025: Embedding Vector Compression (Quantization)

## Follow-up Context

- **Parent Story:** KNOW-002 (Embedding Client Implementation)
- **Source:** QA Discovery Notes - Enhancement Opportunity #2
- **Original Finding:** "text-embedding-3-small outputs float32[1536]. Quantization to int8 or float16 reduces storage 50-75%. Research pgvector quantization support post-MVP."
- **Category:** Enhancement Opportunity
- **Impact:** High (significant storage and cost reduction)
- **Effort:** Medium (requires pgvector quantization research and testing)

## Context

The embedding client (KNOW-002) stores embeddings as uncompressed float32[1536] vectors in PostgreSQL via pgvector. Each embedding consumes 6KB of storage (1536 dimensions × 4 bytes). As the knowledge base scales to thousands or tens of thousands of entries, storage costs and index performance become concerns.

Vector quantization reduces precision (float32 → int8 or float16) while maintaining semantic search accuracy. This can reduce storage requirements by 50-75% with minimal impact on search relevance. Modern pgvector versions support quantization natively.

This story explores embedding compression techniques, validates their impact on search quality, and implements the optimal strategy for production deployment.

## Goal

Reduce embedding storage footprint by 50-75% through vector quantization while maintaining search quality above 95% relevance threshold (compared to unquantized baseline).

## Non-goals

- **Compression of text content** - Only embedding vectors are in scope
- **Runtime decompression** - pgvector handles quantized vectors natively
- **Retroactive compression** - Existing embeddings remain uncompressed (migration deferred)
- **Alternative vector databases** - Stay with PostgreSQL pgvector
- **Multi-level quantization** - Single quantization strategy (int8 or float16, not both)

## Scope

### Packages Affected

- `apps/api/knowledge-base/embedding-client/` - Update cache storage format
- `apps/api/knowledge-base/schema/` - Database migration for quantized vectors

### Endpoints

None - Internal storage optimization only

### Infrastructure

**Database changes:**
- Update `embedding_cache` table to use quantized vector type (e.g., `vector(1536, int8)`)
- Benchmark pgvector index performance with quantized vectors
- Test cosine similarity accuracy with quantized vs unquantized vectors

**pgvector version requirements:**
- Research minimum pgvector version supporting quantization
- Document Docker Compose upgrade path if needed

## Acceptance Criteria

### AC1: Quantization Research
**Given** pgvector documentation and version compatibility
**When** researching quantization options
**Then**:
- Document supported quantization formats (int8, float16, binary)
- Identify minimum pgvector version for each format
- Document storage reduction percentages for each format
- Document expected accuracy impact (from pgvector benchmarks)

### AC2: Baseline Quality Metrics
**Given** 1000 test embeddings from diverse knowledge base content
**When** running search quality benchmarks
**Then**:
- Establish baseline search relevance metrics with float32 vectors
- Calculate precision@K (K=1,5,10) for semantic search
- Document baseline cosine similarity distributions
- Create reproducible test harness for quality validation

### AC3: Quantized Search Quality Validation
**Given** same 1000 test embeddings quantized to target format
**When** running identical search benchmarks
**Then**:
- Quantized precision@K matches baseline within 5% degradation
- Cosine similarity correlation > 0.95 with baseline
- No catastrophic failures (zero results for valid queries)
- Document quality metrics in proof

### AC4: Storage Reduction Validation
**Given** production-scale test dataset (10k entries)
**When** comparing storage footprint
**Then**:
- Storage reduction meets target (50-75% depending on format)
- Index size reduction documented
- Query performance impact < 10% latency increase
- Benchmark results captured in proof

### AC5: Database Migration Script
**Given** migration from float32 to quantized vectors
**When** running migration script
**Then**:
- Existing embeddings converted to quantized format
- Migration is idempotent (can re-run safely)
- Rollback script provided
- Zero downtime migration strategy documented

### AC6: Backward Compatibility
**Given** existing embedding client code
**When** quantization is enabled
**Then**:
- EmbeddingClient API unchanged (internal implementation detail)
- Cache lookups work correctly with quantized vectors
- Cosine similarity calculations use pgvector native operators
- No breaking changes to KNOW-003+ stories

### AC7: Configuration Toggle
**Given** environment variable `EMBEDDING_QUANTIZATION`
**When** set to "none", "int8", or "float16"
**Then**:
- Storage format adapts to configuration
- Migration path documented for switching formats
- Default value documented (recommend int8 if quality validates)

## Reuse Plan

### Builds on KNOW-002
- Existing embedding generation pipeline unchanged
- Cache lookup logic reused
- OpenAI API integration unaffected

### Database Infrastructure (KNOW-001)
- PostgreSQL with pgvector extension
- May require pgvector version upgrade
- Docker Compose configuration update if needed

### Testing Infrastructure
- Vitest test harness from KNOW-002
- Add new benchmarking tests for quality validation
- MSW mocks unaffected (quantization is storage-layer only)

## Architecture Notes

### Quantization Strategy Decision Tree

**int8 quantization:**
- Storage: 1536 bytes (75% reduction from float32's 6144 bytes)
- Accuracy: Typically 1-2% precision degradation
- Performance: Faster similarity calculations
- Recommended for: High-volume knowledge bases

**float16 quantization:**
- Storage: 3072 bytes (50% reduction)
- Accuracy: Minimal degradation (<0.5%)
- Performance: Moderate speed improvement
- Recommended for: Quality-critical applications

**Decision criteria:**
1. Run quality benchmarks (AC2-AC3)
2. If int8 maintains >95% precision@10: use int8
3. If int8 degrades >5%: use float16
4. Document decision in proof with benchmark data

### Migration Strategy

**Zero-downtime migration approach:**
1. Add new quantized column (`embedding_quantized`) alongside existing `embedding`
2. Populate quantized column in background (batched updates)
3. Switch queries to use quantized column
4. Drop original `embedding` column after validation period

**Rollback plan:**
- Keep original float32 column during validation period (e.g., 1 sprint)
- If quality issues detected, revert queries to float32 column
- Drop quantized column if rollback permanent

### pgvector Index Optimization

Research IVFFlat index parameters for quantized vectors:
- May need different `lists` parameter vs float32
- Benchmark index build time with quantized vectors
- Document recommended index configuration in proof

## Test Plan

### Unit Tests
- Quantization conversion correctness
- Round-trip conversion (float32 → quantized → similarity calculation)
- Configuration parsing for EMBEDDING_QUANTIZATION variable

### Integration Tests
- End-to-end embedding storage and retrieval with quantization
- Cosine similarity calculation accuracy vs float32 baseline
- Cache hit logic with quantized vectors

### Benchmarking Tests
- Search quality validation (precision@K)
- Storage footprint measurements
- Query performance comparison (quantized vs float32)
- Index build time comparison

### Load Tests
- 10k entry dataset storage and query performance
- Concurrent query performance with quantized vectors
- Memory usage comparison

## Risks / Edge Cases

### Risk 1: pgvector Version Incompatibility
**Scenario:** Current pgvector version doesn't support quantization
**Mitigation:** Research version requirements early, document upgrade path, test Docker Compose upgrade

### Risk 2: Search Quality Degradation
**Scenario:** Quantization reduces search relevance below acceptable threshold
**Mitigation:** Comprehensive quality benchmarks (AC2-AC3), rollback plan via dual-column migration

### Risk 3: Migration Complexity
**Scenario:** Converting existing embeddings is slow or error-prone
**Mitigation:** Batched background migration, dual-column strategy for zero downtime, extensive testing on dev dataset

### Risk 4: Performance Regression
**Scenario:** Quantized similarity calculations slower than expected
**Mitigation:** Benchmark before migration (AC4), validate query latency SLOs, rollback if performance degrades >10%

## Open Questions

- What is the current pgvector version in Docker Compose? (Check KNOW-001 configuration)
- Are there existing quantization benchmarks from pgvector documentation?
- Should quantization apply to new entries only, or migrate existing cache?

---

**Next Steps After Story Creation:**
1. Run `/elab-story plans/future/knowledgebase-mcp KNOW-025` to elaborate this story
2. Research pgvector quantization documentation and version requirements
3. Coordinate with KNOW-002 implementation team on timeline
