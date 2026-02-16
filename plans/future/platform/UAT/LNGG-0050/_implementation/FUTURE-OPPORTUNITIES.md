# Future Opportunities - LNGG-0050

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **No batch embedding optimization** - Initial implementation calls embedding API sequentially for each entry. At scale (>100 concurrent writes), this could cause latency. | Low | Medium | Defer to performance story. Add batch embedding support when throughput requirements increase. Document in adapter README that batching is not yet implemented. |
| 2 | **No retry logic for transient failures** - Network failures or temporary KB unavailability cause write failures without retry. | Low | Low | Add exponential backoff retry (max 3 attempts) in follow-up story. Initially acceptable since KB writes are non-blocking to workflows. |
| 3 | **Content hash not explicitly documented** - Migration script uses content hash for deduplication but AC-2 only mentions "similarity search." Unclear if hash-based dedup is needed in addition to embedding similarity. | Low | Low | Clarify in implementation: use embedding similarity only (simpler), or add content hash as fast pre-filter before expensive embedding comparison. |
| 4 | **No metrics/observability** - Adapter doesn't emit metrics (write latency, dedup rate, error rate) for monitoring KB health. | Low | Medium | Add telemetry hooks in follow-up story. Export metrics to Prometheus/Grafana when observability epic is prioritized. |
| 5 | **Vector index performance not validated at scale** - Story assumes IVFFlat works well <10k entries but doesn't validate performance degradation threshold. | Low | Low | Add performance benchmarks in integration tests. Document KB entry count thresholds where re-indexing or index tuning is needed. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Batch write API could support transactions** - Current `addMany()` doesn't guarantee all-or-nothing semantics. Partial failures leave KB in inconsistent state. | Medium | High | Add transaction wrapper for batch operations. Requires DB transaction support in KB service. Defer until multi-entry workflows require atomicity. |
| 2 | **Read/write adapter unification** - Story correctly defers KB read operations, but future unified adapter could share embedding client and connection pooling. | Medium | Medium | After read adapter story (separate from LNGG-0050), consider unified `KbAdapter` with read/write methods sharing resources. Improves resource efficiency. |
| 3 | **Custom deduplication strategies** - Hardcoded 0.85 threshold may not suit all entry types. Lessons might need higher threshold (0.90), notes lower (0.75). | Low | Medium | Add per-entry-type threshold configuration in follow-up. Allow workflow-specific dedup rules. Track false positive/negative rates to tune defaults. |
| 4 | **Embedding model flexibility** - Story locks to OpenAI text-embedding-3-small. Future may need local embeddings (Ollama) or different OpenAI models for cost/quality tradeoffs. | Low | High | Abstract embedding client behind interface. Add model selection config. Requires schema migration if dimensions change. Defer until cost or latency becomes issue. |
| 5 | **Content formatting templates** - `formatLesson()`, `formatDecision()` use hardcoded format. Different workflows might want custom formatting. | Low | Low | Extract format templates to config. Allow injectable formatters per entry type. Useful when KB consumers (agents, search) have specific format requirements. |
| 6 | **Semantic versioning for KB schema** - If KB entry structure evolves (new fields, format changes), old entries may become incompatible. | Low | Medium | Add schema version field to KB entries. Implement migration utilities for schema upgrades. Track breaking changes in KB API contract. |
| 7 | **Offline mode for KB writes** - When KB service is down, writes fail and learnings are lost. Could queue writes for later replay. | Medium | High | Add persistent write queue (file or Redis). Retry failed writes on next KB availability. Requires queue management and conflict resolution logic. |
| 8 | **Multi-tenancy support** - Story assumes single KB for entire monorepo. Future may need per-team or per-project KB isolation. | Low | High | Add `tenantId` to KB schema. Update adapter to filter by tenant. Requires significant KB service refactor. Only needed if teams require knowledge isolation. |

## Categories

### Edge Cases
- **Finding #1 (Gaps)**: Batch embedding latency at scale
- **Finding #2 (Gaps)**: Transient failure retry
- **Finding #3 (Gaps)**: Content hash deduplication ambiguity
- **Finding #5 (Gaps)**: Vector index performance degradation threshold

### UX Polish
- **Finding #3 (Enhancements)**: Custom deduplication thresholds per entry type
- **Finding #5 (Enhancements)**: Content formatting templates

### Performance
- **Finding #1 (Gaps)**: Batch embedding optimization
- **Finding #5 (Gaps)**: Vector index benchmarking
- **Finding #4 (Enhancements)**: Embedding model flexibility

### Observability
- **Finding #4 (Gaps)**: Metrics and telemetry

### Reliability
- **Finding #2 (Gaps)**: Retry logic
- **Finding #1 (Enhancements)**: Batch write transactions
- **Finding #7 (Enhancements)**: Offline write queue

### Integrations
- **Finding #2 (Enhancements)**: Unified read/write adapter
- **Finding #4 (Enhancements)**: Alternative embedding models
- **Finding #6 (Enhancements)**: KB schema versioning
- **Finding #8 (Enhancements)**: Multi-tenancy support

---

## Recommended Prioritization

**Short-term (next sprint):**
- Finding #2 (Gaps): Add retry logic for transient failures (low effort, improves reliability)
- Finding #4 (Gaps): Add basic metrics/telemetry hooks (foundational for observability)

**Medium-term (within 1-2 months):**
- Finding #1 (Gaps): Batch embedding optimization (when write volume increases)
- Finding #3 (Enhancements): Custom deduplication thresholds (improves accuracy)
- Finding #2 (Enhancements): Unified read/write adapter (after read adapter implementation)

**Long-term (3+ months):**
- Finding #1 (Enhancements): Batch write transactions (complex, low priority until needed)
- Finding #6 (Enhancements): KB schema versioning (future-proofing)
- Finding #7 (Enhancements): Offline write queue (complex, defer until KB downtime becomes issue)
- Finding #8 (Enhancements): Multi-tenancy (only if organizational structure changes)

**Defer indefinitely:**
- Finding #4 (Enhancements): Embedding model flexibility (no current need)
- Finding #5 (Enhancements): Formatting templates (YAGNI until proven necessary)
