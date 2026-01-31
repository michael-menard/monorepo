# Elaboration Analysis - KNOW-007

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches index entry; builds on KNOW-001 through KNOW-006 infrastructure |
| 2 | Internal Consistency | PASS | — | Goals/Non-goals/AC are aligned; test plan covers acceptance criteria |
| 3 | Reuse-First | PASS | — | Uses @repo/logger, existing embedding-client, crud-operations, and test infrastructure |
| 4 | Ports & Adapters | PASS | — | Clear separation: rebuild-embeddings.ts port, EmbeddingClient/DB adapters, logging layer |
| 5 | Local Testability | PASS | — | Vitest test suites required (admin-tools.test.ts, performance.test.ts); no .http tests (MCP not HTTP) |
| 6 | Decision Completeness | CONDITIONAL PASS | Medium | See Issue #1: batch_size validation range needs justification |
| 7 | Risk Disclosure | PASS | — | 6 risks explicitly called out: scale, rate limits, invalidation strategy, log volume, test flakiness, index tuning |
| 8 | Story Sizing | CONDITIONAL PASS | Medium | 13 ACs, but most are documentation/polish; see Issue #2 for split recommendation |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Batch Size Range Justification | Medium | AC4 specifies batch_size max of 1000 but minimum of 1. Single-entry batching seems inefficient. Recommend: (a) increase min to 10, or (b) document why batch_size=1 is a valid operational use case. |
| 2 | Story Size - Consider Split | Medium | 13 ACs suggest potential split. However, ACs 5-6 (logging), 10-13 (documentation) are polish/cross-cutting. Core rebuild functionality is ACs 1-4. Recommend: proceed as-is if team velocity supports ~8 SP, or split into KNOW-007-A (rebuild tool) and KNOW-007-B (logging + documentation). |
| 3 | Performance Test Dataset Size | Low | AC7 requires "1000+ entries minimum" but AC9 validates for "1k-10k entry range". Recommend: clarify target dataset size for performance tests (suggest 2000-3000 entries for mid-range validation). |
| 4 | Concurrent Load Test Ambiguity | Low | AC8 specifies "10-20 clients" but doesn't define query mix. Recommend: specify whether all clients run kb_search simultaneously or mixed operations (search, list, stats). |
| 5 | Cost Estimation Formula Clarity | Low | AC1 logs "estimated_cost_usd" with formula `entries × avg_chars × $0.00002/1k tokens`. Clarify: (a) is avg_chars per-entry or corpus-wide? (b) token estimate uses standard 4:1 char-to-token ratio? Document in code comments. |
| 6 | Rebuild Rollback Strategy | Low | AC3 states "No transaction rollback across batches" but doesn't address partial rebuild cleanup. If rebuild fails at 50%, should users manually query which entries are missing cache? Recommend: add `last_rebuilt_at` timestamp to embedding_cache or return detailed list of failed entry_ids. |

## Split Recommendation (if applicable)

### Option: Two-Story Split

| Split | Scope | AC Allocation | Dependency |
|-------|-------|---------------|------------|
| KNOW-007-A: kb_rebuild_embeddings Tool | Core rebuild functionality and validation | AC1, AC2, AC3, AC4 | None (KNOW-006) |
| KNOW-007-B: Logging, Performance, Documentation | Comprehensive logging, performance testing, production docs | AC5, AC6, AC7, AC8, AC9, AC10, AC11, AC12, AC13 | Depends on KNOW-007-A |

**Rationale:** AC1-4 are self-contained (rebuild tool), while AC5-13 are cross-cutting polish (logging applies to all MCP tools, docs are standalone). Split enables:
- Faster delivery of rebuild capability (blocker for KNOW-008)
- Independent testing of rebuild vs. performance suite
- Parallel work if two developers available

**Recommendation:** Proceed as single story if team prefers consolidated delivery. Split is optional, not required.

---

## Preliminary Verdict

- PASS: All checks pass, no Critical/High issues
- CONDITIONAL PASS: Minor issues, proceed with fixes
- FAIL: Critical/High issues block implementation
- SPLIT REQUIRED: Story too large, must split

**Verdict**: CONDITIONAL PASS

**Conditions:**
1. Address Issue #1 (batch_size range justification) before implementation
2. Clarify Issue #3 (performance test dataset size)
3. Clarify Issue #4 (concurrent load test query mix)
4. Document Issue #5 (cost estimation formula) in code comments
5. Consider Issue #6 (rebuild progress tracking) for UX improvement

Issues #1, #3, #4, #5 are low-effort clarifications (docs/comments). Issue #2 (split) is optional based on team velocity. Issue #6 is enhancement, not blocker.

---

## Discovery Findings

### Gaps & Blind Spots

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No progress cancellation mechanism | Medium | Medium | kb_rebuild_embeddings with 10k+ entries could take hours. Add "cancel token" pattern or document that long rebuilds must complete. Consider adding `max_entries` parameter for partial rebuilds. |
| 2 | No cache invalidation detection | Medium | Low | Story documents "when to rebuild" but no automated detection of model changes. Add `embedding_model_version` column to embedding_cache and log warnings if mismatch detected during kb_search. |
| 3 | No rate limit handling documentation | Medium | Low | AC3 mentions "OpenAI API failures: retry via EmbeddingClient" but doesn't document behavior during rate limiting (429 errors). Clarify: does retry logic handle 429 with exponential backoff? Document expected rebuild duration under rate limits. |
| 4 | Missing rebuild dry-run mode | Low | Low | kb_bulk_import has `dry_run` option (AC validation). Consider adding `dry_run: true` to kb_rebuild_embeddings to estimate cost/time without API calls (query DB, calculate cost, return estimate). |
| 5 | No monitoring integration examples | Low | Low | AC13 mentions "monitoring and observability" but doesn't provide CloudWatch/DataDog integration examples. Add sample alarm definitions or log parsing queries for common issues (slow searches, API errors). |
| 6 | Edge case: concurrent rebuilds | Low | Medium | What happens if two agents call kb_rebuild_embeddings simultaneously? Potential race condition on embedding_cache writes. Recommend: add advisory lock or document "do not run concurrent rebuilds". |
| 7 | Missing embedding_cache cleanup | Low | Medium | Over time, embedding_cache may accumulate orphaned entries (deleted knowledge_entries). Consider adding `kb_cleanup_cache` admin tool or document manual cleanup query. |
| 8 | No performance test failure thresholds | Low | Low | AC7 defines latency targets (e.g., kb_search <200ms p95) but doesn't specify what happens if tests fail. Recommend: make performance tests separate suite with `--performance` flag; failures log warnings but don't block CI. |

### Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Rebuild progress websocket/SSE | High | High | For long rebuilds, stream progress updates via MCP server-sent events. Enables real-time monitoring in agent UI. Future enhancement (KNOW-024 candidate). |
| 2 | Incremental rebuild by date range | Medium | Medium | Add `updated_after: Date` parameter to rebuild only entries modified since timestamp. Useful for routine maintenance without full rebuild. |
| 3 | Cost tracking and budgeting | Medium | Medium | Extend kb_stats to track actual OpenAI API spend (log costs, aggregate daily/monthly). Add `cost_limit_usd` parameter to kb_rebuild_embeddings to abort if estimate exceeds budget. |
| 4 | Performance regression testing | Medium | High | Integrate performance tests into CI with historical baseline comparison. Alert if p95 latency regresses >20%. Requires metrics storage (e.g., CloudWatch Insights, Prometheus). |
| 5 | Smart batch size auto-tuning | Low | Medium | Instead of fixed batch_size parameter, auto-adjust based on API latency and rate limit headroom. Start at 50, increase to 200 if no throttling, decrease if 429 errors. |
| 6 | Cache warming on startup | Low | Low | Pre-load frequently accessed entries' embeddings into memory cache on MCP server startup. Reduces cold-start latency for first few searches. |
| 7 | Semantic duplicate detection during rebuild | Medium | High | During rebuild, detect semantically identical entries (cosine similarity >0.98) and flag for manual review. Helps identify redundant knowledge entries. |
| 8 | Multi-model embedding support | High | High | Store model name with each embedding_cache entry. Support querying with different models (e.g., text-embedding-3-small vs. text-embedding-3-large). Requires schema migration and multi-index support. Future epic candidate. |

---

## Worker Token Summary

- Input: ~37,000 tokens (KNOW-007.md: 700 lines × ~30 tokens/line = 21k, stories.index.md partial, qa.agent.md: 99 lines, tool-schemas.ts, tool-handlers.ts, admin-tools.test.ts partials, codebase context)
- Output: ~2,500 tokens (ANALYSIS.md)

**Total**: ~39,500 tokens
