# Future Opportunities - WINT-0230

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No runtime hot-reload for strategy configuration | Low | Medium | Add file watcher to reload strategy YAML on change without process restart (WINT-5xxx ML pipeline scope) |
| 2 | Cache TTL hardcoded at 30s (no configuration) | Low | Low | Make cache TTL configurable via strategy YAML (add `cache_ttl_ms` field) |
| 3 | No metrics/telemetry for model selection decisions | Medium | Medium | Add structured logging hooks for WINT-0260 (model cost tracking) to consume |
| 4 | Escalation trigger priority order not documented visually | Low | Low | Add Mermaid diagram showing escalation priority order (human > failure > quality > cost) |
| 5 | No validation for circular escalation at runtime | Medium | Medium | Add runtime cycle detection in EscalationManager (currently only max depth enforcement) |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Context-aware escalation (file count, complexity scoring) | High | High | ML-based complexity scoring (WINT-5xxx scope) - foundation laid with optional context parameter |
| 2 | Multi-tenant strategy support (different strategies per workflow) | Medium | High | Add strategy profile selection API (future scalability, not MVP requirement) |
| 3 | A/B testing for tier assignments | High | Medium | Experiment framework to test tier assignments against quality/cost metrics (MODL-0030/0040 integration) |
| 4 | Dynamic tier adjustment based on telemetry | High | High | Feedback loop from WINT-0260 telemetry to auto-adjust tier assignments (ML pipeline scope) |
| 5 | Provider-specific fallback chains (not just Ollama → Claude) | Medium | Medium | Add fallback chains for OpenRouter, Anthropic Direct (currently assumes Ollama primary, Claude fallback) |
| 6 | Graceful degradation UI (notify user when fallback used) | Low | Medium | Frontend notification when Ollama unavailable and falling back to Claude (UX enhancement) |
| 7 | Cost budget enforcement at strategy level | High | Medium | Add budget thresholds in strategy YAML, enforce in EscalationManager (WINT-0260 integration point) |
| 8 | Model warmup/pre-loading for critical tiers | Low | High | Pre-load Tier 0/1 models on orchestrator startup to reduce first-call latency (optimization) |
| 9 | Strategy versioning with migration support | Medium | High | Add version migration logic when strategy schema changes (currently assumes single version) |
| 10 | Agent-level escalation override (per-agent configuration) | Medium | Medium | Allow agents to specify custom escalation rules in frontmatter (advanced use case) |

## Categories

### Edge Cases
- **Gap #1**: Runtime hot-reload (prevents downtime during strategy updates)
- **Gap #5**: Runtime cycle detection (defense-in-depth for escalation logic)
- **Enhancement #5**: Provider-specific fallback chains (handle non-Ollama primary scenarios)
- **Enhancement #9**: Strategy versioning with migration (handle breaking changes)

### UX Polish
- **Gap #4**: Visual escalation priority diagram (improves strategy comprehension)
- **Enhancement #6**: Graceful degradation UI (user awareness of fallback behavior)

### Performance
- **Gap #2**: Configurable cache TTL (optimize for different environments)
- **Enhancement #8**: Model warmup/pre-loading (reduce latency)

### Observability
- **Gap #3**: Metrics/telemetry hooks (foundation for WINT-0260)
- **Enhancement #3**: A/B testing framework (measure quality/cost trade-offs)
- **Enhancement #4**: Dynamic tier adjustment (feedback loop from telemetry)

### Integrations
- **Enhancement #1**: Context-aware escalation (ML pipeline integration)
- **Enhancement #2**: Multi-tenant strategy support (scalability)
- **Enhancement #7**: Cost budget enforcement (WINT-0260 integration)
- **Enhancement #10**: Agent-level escalation override (advanced customization)

---

## Summary

**Total Opportunities**: 15 (5 gaps, 10 enhancements)

**High Impact**: 5 (context-aware escalation, A/B testing, dynamic adjustment, cost budget enforcement)
**Medium Impact**: 6
**Low Impact**: 4

**Quick Wins** (Low effort, Medium+ impact):
- Gap #4: Visual escalation priority diagram (Mermaid)
- Enhancement #3: A/B testing framework (reuse existing experiment infrastructure)

**Strategic Bets** (High impact, High effort):
- Enhancement #1: Context-aware escalation (ML pipeline foundation)
- Enhancement #4: Dynamic tier adjustment (learning loop)
- Enhancement #9: Strategy versioning with migration (future-proofing)

---

**Note**: All opportunities are non-blocking for MVP. The unified model interface provides a solid foundation with 90% reuse factor from MODL-0010 and clear extension points for future enhancements.
