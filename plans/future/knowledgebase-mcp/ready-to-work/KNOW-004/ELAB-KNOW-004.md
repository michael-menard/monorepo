# Elaboration Report - KNOW-004

**Date**: 2026-01-25
**Verdict**: CONDITIONAL PASS

## Summary

KNOW-004 is a well-structured backend story implementing hybrid semantic and keyword search with graceful fallback. The story applies findings from epic elaboration (UX-002 through UX-004, SEC-005, QA-004) and demonstrates strong reuse discipline. User review accepted 15 findings as acceptance criteria and deferred 5 items as out-of-scope.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Scope matches stories.index.md entry. No extra endpoints or infrastructure. Search implementation (kb_search, kb_get_related) aligns with stated goal. |
| 2 | Internal Consistency | PASS | — | Goals align with AC (hybrid search, fallback, filtering). Non-goals exclude MCP integration (KNOW-005), admin tools (KNOW-006/007), and pagination. Decisions support scope. |
| 3 | Reuse-First | PASS | — | EmbeddingClient (KNOW-002), @repo/logger, Zod, Drizzle ORM all reused. No new shared packages created. Patterns from KNOW-002/003 reused (retry, validation, DB queries). |
| 4 | Ports & Adapters | PASS | — | SearchPort interface defined with SearchPort implementation. EmbeddingClient and DrizzleClient injected via constructor. Core logic transport-agnostic. |
| 5 | Local Testability | CONDITIONAL PASS | Medium | Integration tests with test DB required per AC10. Test fixtures with realistic data required (seed-data/test-fixtures.yaml). |
| 6 | Decision Completeness | PASS | — | No blocking TBDs. All ADRs complete with rationale. RRF weights, similarity threshold, and FTS approach all decided. |
| 7 | Risk Disclosure | PASS | — | Risks explicit: RRF weight tuning, OpenAI API dependency, performance at scale, fallback behavior transparency. No hidden dependencies. |
| 8 | Story Sizing | CONDITIONAL PASS | Medium | 10 ACs (threshold: 8+). Borderline acceptable if RRF and FTS implementations are straightforward. Consider monitoring velocity. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | Missing test execution baseline | Medium | Story declares performance targets (p50/p95) but doesn't specify how to measure them. Add vitest benchmark suite or document manual testing procedure. | Added to AC |
| 2 | Seed fixture structure incomplete | Medium | AC10 requires "document expected ranking for each test query in test comments" but seed requirements show YAML structure without test query mapping. Add test query annotations to fixture spec. | Added to AC |
| 3 | Semantic similarity threshold tunability | Low | ADR-005 sets threshold at 0.3 but doesn't document it as a constant like RRF weights. For consistency with ADR-004's tunability principle, define as `SEMANTIC_SIMILARITY_THRESHOLD` constant. | Added to AC |
| 4 | Error response structure undefined | Low | AC7 mentions "consistent error response structure" but doesn't specify the shape. Define Zod schema for error responses for consistency across operations. | Added to AC |
| 5 | kb_get_related return type inconsistency | Low | Function signature shows `Promise<KnowledgeEntry[]>` but documented response includes `metadata` object with `total` and `relationship_types`. Align signature with MCP tool contract. | Added to AC |

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | **Index performance validation missing** | Add as AC | AC10 requires "test fixtures with 100 and 1,000 entries" but doesn't specify how to validate index usage. Add EXPLAIN ANALYZE logging during integration tests to confirm IVFFlat and GIN index hits. Document in test plan. |
| 2 | **Fallback mode discoverability** | Add as AC | When OpenAI API fails, kb_search sets `fallback_mode: true` but doesn't document *how* keyword-only results differ from hybrid. Add `search_modes_used: ['semantic', 'keyword']` array to metadata for transparency. |
| 3 | **RRF k-constant documentation** | Add as AC | ADR-003 uses k=60 (standard RRF) but doesn't document why 60 specifically. Add comment: "k=60 is standard RRF constant from IR research (Cormack et al., 2009)". |
| 4 | **Tag filter OR vs AND semantics documentation** | Add as AC | AC3 specifies "OR logic" for tags but doesn't explain *why*. Document: OR enables discovery (find entries related to ANY listed tag), AND would be too restrictive for sparse tagging. |
| 5 | **Related entries relationship priority documentation** | Add as AC | kb_get_related orders by parent > sibling > tag_overlap but doesn't document *why* this order. Document: Parent provides context, siblings provide alternatives, tag-overlap provides discovery. |
| 6 | **Content hash collision handling documentation** | Add as AC | EmbeddingClient uses SHA-256 for deduplication. While collision probability is negligible (2^-128), doesn't document collision behavior. For completeness: if collision occurs, cached embedding is reused (acceptable false positive). |
| 7 | **Empty result set ranking documentation** | Add as AC | What happens when semantic search returns empty (similarity < 0.3 for all entries) but keyword search succeeds? Document: RRF merging degrades gracefully to keyword-only ranking. |
| 8 | **Concurrent request isolation** | Add as AC | AC10 edge case tests concurrent requests but doesn't specify transaction isolation. PostgreSQL default (READ COMMITTED) is safe for read-only queries. Document this assumption. |
| 9 | **Embedding dimension mismatch detection** | Out of Scope | If OpenAI changes embedding model output dimension (unlikely but possible), pgvector insert will fail. This is a monitoring/alerting concern for ops, not story scope. Defer to KNOW-016 (PostgreSQL Monitoring) or KNOW-018 (Audit Logging). |
| 10 | **Search logging verbosity** | Add as AC | AC6 logs embedding, semantic, keyword, RRF times at debug level but total at info. In production, debug logs may be disabled, losing critical performance telemetry. Add structured performance metrics to info log: `{ query_time_ms, semantic_ms, keyword_ms, rrf_ms, result_count }`. |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | **Query explanation for debugging** | Add as AC | Add optional `explain: boolean` parameter to kb_search. When true, return `debug_info: { semantic_scores: {...}, keyword_scores: {...}, rrf_scores: {...} }` in metadata. Invaluable for tuning RRF weights and debugging relevance issues. |
| 2 | **Semantic-only vs keyword-only modes** | Out of Scope | Hybrid search is default but power users may want semantic-only or keyword-only. Defer as future enhancement post-MVP. |
| 3 | **Result highlighting** | Add as AC | Return matched terms or semantic similarity scores per result for UI display. Include relevance indicators in response. |
| 4 | **Query suggestions** | Add as AC | If search returns empty, suggest alternative queries based on tag analysis. Provide discovery guidance in fallback scenarios. |
| 5 | **Saved searches / bookmarks** | Add as AC | Allow agents to save frequently used queries. Improves agent efficiency with reusable search contexts. |
| 6 | **Approximate result count** | Add as AC | Metadata includes `total: number` which is exact count of merged results. For performance insights, track estimated vs actual result distribution. |
| 7 | **Multi-language FTS support** | Out of Scope | Current FTS uses `'english'` language. Internationalization requirement not present. Defer until multi-language content needed. |
| 8 | **Embedding model versioning** | Out of Scope | Embedding model versioning strategy deferred to KNOW-007 (Admin Tools) as part of embedding rebuild capabilities. |
| 9 | **Search telemetry dashboard** | Out of Scope | Aggregate search queries, result counts, fallback frequency. This is observability work deferred to KNOW-016 (PostgreSQL Monitoring) and KNOW-019 (Query Analytics). |
| 10 | **Semantic clustering visualization** | Out of Scope | Visualization of entry clusters in 2D/3D embedding space. Defer to KNOW-024 (Management UI) as optional curation feature. |

### Summary of User Decisions

- **Add as AC (expand story)**: 15 findings
- **Follow-up story**: 0 findings
- **Out of Scope**: 5 findings (embedding dimension monitoring, multi-language, embedding versioning, telemetry dashboard, clustering visualization)
- **Skip**: 0 findings

**Net Result**: Story expanded with 15 additional acceptance criteria addressing gaps and enhancements identified during elaboration.

## Proceed to Implementation?

**YES - story may proceed to implementation with 25 total acceptance criteria (original 10 + 15 from user decisions).**

All critical gaps resolved. Story is now comprehensive and ready for development. Implementation should:
1. Follow the sequential implementation approach documented in ANALYSIS.md
2. Add vitest benchmark suite for performance measurement
3. Document test query annotations in seed-data/test-fixtures.yaml
4. Track velocity checkpoint after semantic + keyword queries implemented
5. Monitor scope creep with expanded AC count (25 vs original 10)

---

**Elaboration completed by**: elab-completion-leader
**Phase duration**: ~2 hours (PM generation + QA analysis + user review)
**Ready for**: dev-implement-story phase
