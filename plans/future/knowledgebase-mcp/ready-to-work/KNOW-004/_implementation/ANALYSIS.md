# Elaboration Analysis - KNOW-004

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Scope matches stories.index.md entry. No extra endpoints or infrastructure. Search implementation (kb_search, kb_get_related) aligns with stated goal. |
| 2 | Internal Consistency | PASS | — | Goals align with AC (hybrid search, fallback, filtering). Non-goals exclude MCP integration (KNOW-005), admin tools (KNOW-006/007), and pagination. Decisions support scope. |
| 3 | Reuse-First | PASS | — | EmbeddingClient (KNOW-002), @repo/logger, Zod, Drizzle ORM all reused. No new shared packages created. Patterns from KNOW-002/003 reused (retry, validation, DB queries). |
| 4 | Ports & Adapters | PASS | — | SearchPort interface defined with SearchPort implementation. EmbeddingClient and DrizzleClient injected via constructor. Core logic transport-agnostic. |
| 5 | Local Testability | CONDITIONAL PASS | Medium | `.http` tests not required (no HTTP endpoints in this story - MCP tools in KNOW-005). Integration tests with test DB required per AC10. Test fixtures with realistic data required (seed-data/test-fixtures.yaml). |
| 6 | Decision Completeness | PASS | — | No blocking TBDs. All ADRs complete with rationale. Open Questions section empty. RRF weights, similarity threshold, and FTS approach all decided. |
| 7 | Risk Disclosure | PASS | — | Risks explicit: RRF weight tuning, OpenAI API dependency, performance at scale, fallback behavior transparency. No hidden dependencies. |
| 8 | Story Sizing | CONDITIONAL PASS | Medium | 10 ACs (threshold: 8+). No new endpoints. Frontend work: none. Backend: significant. Test scenarios: 10 happy, 6 error, 9 edge = 25 total (threshold: 3+ happy). Touches 1 package. **Indicators met: 2/6**. Borderline but acceptable if RRF and FTS implementations are straightforward. Consider monitoring velocity. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Missing test execution baseline | Medium | Story declares performance targets (p50/p95) but doesn't specify how to measure them. Add vitest benchmark suite or document manual testing procedure. |
| 2 | Seed fixture structure incomplete | Medium | AC10 requires "document expected ranking for each test query in test comments" but seed requirements show YAML structure without test query mapping. Add test query annotations to fixture spec. |
| 3 | Semantic similarity threshold tunability | Low | ADR-005 sets threshold at 0.3 but doesn't document it as a constant like RRF weights. For consistency with ADR-004's tunability principle, define as `SEMANTIC_SIMILARITY_THRESHOLD` constant. |
| 4 | Error response structure undefined | Low | AC7 mentions "consistent error response structure" but doesn't specify the shape. Define Zod schema for error responses for consistency across operations. |
| 5 | kb_get_related return type inconsistency | Low | Function signature shows `Promise<KnowledgeEntry[]>` but documented response includes `metadata` object with `total` and `relationship_types`. Align signature with MCP tool contract. |

## Split Recommendation

**Not recommended.** While story has 10 ACs (above threshold), only 2/6 sizing indicators met. Core search logic (semantic, keyword, RRF) is tightly coupled and splitting would create artificial boundaries. Recommend proceeding as single story but:

1. **Velocity checkpoint:** Review after semantic + keyword queries implemented (AC1, AC9). If velocity slows significantly, consider extracting kb_get_related (AC5) as KNOW-004-B.
2. **Test strategy:** Implement integration tests incrementally per AC to maintain confidence.

## Preliminary Verdict

**CONDITIONAL PASS**: Proceed with story implementation. Address Issues #1, #2, #4, #5 before implementation phase (low complexity fixes). Monitor velocity per split recommendation. Issue #3 is polish that can be addressed during implementation.

---

## Discovery Findings

### Gaps & Blind Spots

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Index performance validation missing** | High | Medium | AC10 requires "test fixtures with 100 and 1,000 entries" but doesn't specify how to validate index usage. Add EXPLAIN ANALYZE logging during integration tests to confirm IVFFlat and GIN index hits. Document in test plan. |
| 2 | **Fallback mode discoverability** | Medium | Low | When OpenAI API fails, kb_search sets `fallback_mode: true` but doesn't document *how* keyword-only results differ from hybrid. Add `search_modes_used: ['semantic', 'keyword']` array to metadata for transparency. |
| 3 | **RRF k-constant magic number** | Low | Low | ADR-003 uses k=60 (standard RRF) but doesn't document why 60 specifically. Add comment: "k=60 is standard RRF constant from IR research (Cormack et al., 2009)". |
| 4 | **Tag filter OR vs AND semantics** | Medium | Low | AC3 specifies "OR logic" for tags but doesn't explain *why*. Document: OR enables discovery (find entries related to ANY listed tag), AND would be too restrictive for sparse tagging. |
| 5 | **Related entries relationship priority** | Low | Low | kb_get_related orders by parent > sibling > tag_overlap but doesn't document *why* this order. Document: Parent provides context, siblings provide alternatives, tag-overlap provides discovery. |
| 6 | **Content hash collision handling** | Low | Low | EmbeddingClient uses SHA-256 for deduplication. While collision probability is negligible (2^-128), doesn't document collision behavior. For completeness: if collision occurs, cached embedding is reused (acceptable false positive). |
| 7 | **Empty result set ranking documentation** | Low | Low | What happens when semantic search returns empty (similarity < 0.3 for all entries) but keyword search succeeds? Document: RRF merging degrades gracefully to keyword-only ranking. |
| 8 | **Concurrent search request isolation** | Medium | Medium | AC10 edge case tests concurrent requests but doesn't specify transaction isolation. PostgreSQL default (READ COMMITTED) is safe for read-only queries. Document this assumption. |
| 9 | **Embedding dimension mismatch detection** | High | Medium | If OpenAI changes embedding model output dimension (unlikely but possible), pgvector insert will fail cryptically. Add embedding dimension validation in EmbeddingClient: `if (embedding.length !== 1536) throw DimensionMismatchError`. |
| 10 | **Search logging verbosity** | Low | Low | AC6 logs embedding, semantic, keyword, RRF times at debug level but total at info. In production, debug logs may be disabled, losing critical performance telemetry. Add structured performance metrics to info log: `{ query_time_ms, semantic_ms, keyword_ms, rrf_ms, result_count }`. |

### Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Query explanation for debugging** | Medium | Low | Add optional `explain: boolean` parameter to kb_search. When true, return `debug_info: { semantic_scores: {...}, keyword_scores: {...}, rrf_scores: {...} }` in metadata. Invaluable for tuning RRF weights and debugging relevance issues. **Consider for KNOW-005 (MCP integration) or KNOW-023 (Search UI).** |
| 2 | **Semantic-only vs keyword-only modes** | Medium | Low | Hybrid search is default but power users may want semantic-only (conceptual search) or keyword-only (exact match). Add `mode: 'hybrid' | 'semantic' | 'keyword'` parameter. Minimal complexity, high utility. **Consider for post-MVP enhancement.** |
| 3 | **Result highlighting** | High | Medium | Return matched terms or semantic similarity scores per result for UI display. Requires storing intermediate ranking data. **Defer to KNOW-023 (Search UI).** |
| 4 | **Query suggestions** | Medium | High | If search returns empty, suggest alternative queries based on tag analysis. Requires NLP analysis. **Defer to post-launch analytics-driven feature.** |
| 5 | **Saved searches / bookmarks** | Low | High | Allow agents to save frequently used queries. Requires new DB table, MCP tool extensions. **Defer to KNOW-019 (Query Analytics) insights.** |
| 6 | **Approximate result count** | Low | Low | Metadata includes `total: number` which is exact count of merged results. For performance, consider `total_estimate: '>50' | 'many' | 'few'` for large result sets. **Premature optimization - wait for production scale data.** |
| 7 | **Multi-language FTS support** | Medium | Medium | Current FTS uses `'english'` language. For international content, support `language: 'spanish' | 'french'` parameter. Requires per-language indexes. **Defer until internationalization requirement emerges.** |
| 8 | **Embedding model versioning** | High | High | If OpenAI releases text-embedding-3-small-v2 with same dimension but improved quality, need migration strategy. Consider embedding_model_version column in knowledge_entries. **Track as tech debt for KNOW-007 (Admin Tools).** |
| 9 | **Search telemetry dashboard** | Medium | Medium | Aggregate search queries, result counts, fallback frequency for ops visibility. Requires metrics collection + dashboard. **KNOW-016 (PostgreSQL Monitoring) dependency.** |
| 10 | **Semantic clustering visualization** | Low | High | For knowledge base curation, visualize entry clusters in 2D/3D embedding space (t-SNE/UMAP). Requires heavy computation + UI. **Defer to KNOW-024 (Management UI) as optional feature.** |

---

## Worker Token Summary

- **Input**: ~16,000 tokens (KNOW-004.md story: ~6,500 | stories.index.md: ~3,000 | PLAN.exec/meta: ~800 | qa.agent.md: ~400 | architectural-decisions.yaml: ~2,500 | KNOW-003.md partial: ~1,000 | db/schema.ts: ~1,200 | test-helpers.ts: ~600)
- **Output**: ~3,800 tokens (ANALYSIS.md)
- **Total Phase Tokens**: ~19,800 tokens

---

## Completion Notes

### Analysis Summary

KNOW-004 is a **well-structured, architecturally sound story** with clear scope and strong reuse discipline. The hybrid search approach (semantic + keyword with RRF) is industry-standard and appropriate for the knowledge base use case.

**Strengths:**
1. Comprehensive ADRs justify all technical decisions
2. Strong reuse of KNOW-002 EmbeddingClient and KNOW-003 patterns
3. Graceful fallback when OpenAI unavailable (production resilience)
4. Ports & adapters architecture enables future adapter swaps
5. Test plan covers happy paths, errors, and edge cases

**Key Risks Mitigated:**
- Dependency on OpenAI API → Fallback to keyword-only search
- Performance at scale → Index-backed queries with explicit performance targets
- RRF weight tuning → Configurable constants with documented defaults

**Recommended Pre-Implementation Actions:**
1. Define error response Zod schema (Issue #4) - 15 min
2. Add test query annotations to fixture spec (Issue #2) - 30 min
3. Align kb_get_related signature with MCP contract (Issue #5) - 10 min
4. Document performance measurement procedure (Issue #1) - 20 min

**Implementation Approach:**
- Start with semantic search query (AC1 partial)
- Add keyword search query (AC9)
- Implement RRF merging (AC8)
- Wire up kb_search with fallback (AC1 complete, AC2)
- Add filtering (AC3)
- Implement kb_get_related (AC5)
- Comprehensive test coverage (AC10)

**Velocity Checkpoint:** Review progress after AC1+AC9 complete (~40% of story). If implementation complexity higher than estimated, consider extracting kb_get_related to separate story.

---

ANALYSIS COMPLETE
