# Future Opportunities - WINT-0230

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Fallback loop prevention mechanism missing from AC-4 | Low - edge case handling | Low | Define max fallback attempts (3) and post-exhaustion behavior (escalate to human or return error). Add to AC-4 validation tests |
| 2 | Cache invalidation strategy not finalized (30s TTL vs file watcher) | Low - affects cache freshness in development | Low | Recommend 30s TTL for MVP (consistent with Ollama availability checks), file watcher for v1.1+ when strategy updates become frequent |
| 3 | Test fixture directory structure undefined | Low - affects test organization | Low | Create `packages/backend/orchestrator/src/models/__tests__/fixtures/` with 4 strategy YAML examples (valid, minimal, invalid, empty) |
| 4 | Provider factory instantiation pattern lacks detail | Medium - affects clean architecture | Medium | Clarify singleton vs factory method: recommend `ModelRouterFactory.getInstance()` singleton that wraps provider factory from MODL-0010 |
| 5 | LRU cache eviction policy not in MVP scope | Low - unbounded cache acceptable for MVP (3-5 providers) | High | Defer to MODL-0020: implement LRU eviction when scaling to 100+ agent invocations per workflow |
| 6 | Telemetry hooks for cost tracking mentioned but not specified | Low - WINT-0260 dependency | Medium | Defer to WINT-0260: expose model selection events (tier chosen, fallback triggered) as structured logs, consumed by telemetry layer |
| 7 | Escalation graph analysis not formalized | Medium - prevents circular escalation bugs | Medium | Add graph validator in strategy-loader.ts: parse escalation triggers, build directed graph, check for cycles using DFS. Return validation errors on circular paths |
| 8 | Backward compatibility test matrix (143 agents × 4 model formats) too large | Medium - risk of missing edge cases | High | Defer full matrix testing: focus on 10-15 representative agents (2-3 per tier) for MVP, automate full matrix in WINT-0270 (Agent Migration Validation) |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Configuration API (AC-7) could expose tier recommendation reasons | Medium - improves debuggability | Low | Add `getTierRecommendationReason(agentName)` method that returns rationale string ("Agent in strategy tier 1", "Legacy model 'sonnet' maps to tier 1", etc.) |
| 2 | Escalation logic could log decision rationale | High - critical for debugging failed escalations | Low | Add structured logging in escalation engine: `logger.info('Escalating', { trigger, currentTier, newTier, retries, reason })` |
| 3 | Strategy versioning could include migration tools | Medium - simplifies strategy updates | High | Defer to v1.1+: build CLI tool to migrate agent assignments between strategy versions (e.g., rebalance tiers when new model released) |
| 4 | Feature flag for unified interface not specified | Low - allows gradual rollout | Low | Add `ENABLE_UNIFIED_MODEL_INTERFACE` env var (default: true), fallback to legacy model-assignments.ts if disabled |
| 5 | Model performance metrics could inform tier adjustments | High - enables data-driven tier optimization | Very High | Defer to MODL-0030/0040: collect quality metrics per tier (test pass rate, human review frequency), auto-suggest tier changes quarterly |
| 6 | Complexity detection heuristics could be ML-based | High - enables auto-escalation | Very High | Defer to WINT-5xxx: train ML model to predict task complexity from agent inputs, auto-escalate Tier 2→1 when confidence low |
| 7 | Human-in-loop UX not defined | Medium - affects workflow pause experience | High | Defer to orchestrator integration (WINT-0270): design approval UI for paused workflows, notification system, resume mechanism |
| 8 | Cost budget tracking requires workflow-level state | High - enables cost de-escalation triggers | High | Defer to WINT-0260: workflow events table tracks cumulative cost, unified interface queries budget before each invocation |

## Categories

### Edge Cases
- **Fallback loop prevention**: Max 3 attempts, then escalate to human or return error
- **Cache invalidation**: 30s TTL for MVP, file watcher for future iterations
- **Circular escalation detection**: Graph analysis to validate strategy on load

### UX Polish
- **Tier recommendation reasons**: Expose rationale for debugging
- **Escalation decision logging**: Structured logs for every escalation event
- **Feature flag for gradual rollout**: `ENABLE_UNIFIED_MODEL_INTERFACE` env var

### Performance
- **LRU cache eviction**: Defer to MODL-0020 when scaling beyond 3-5 providers
- **Strategy caching optimization**: Consider file watcher for hot-reload in development

### Observability
- **Telemetry hooks**: Defer to WINT-0260 for cost tracking events
- **Model performance metrics**: Defer to MODL-0030/0040 for quality leaderboards
- **Escalation decision logs**: Add structured logging to escalation engine

### Integrations
- **Workflow budget tracking**: Defer to WINT-0260 workflow events table
- **Human-in-loop UX**: Defer to orchestrator integration (WINT-0270)
- **Auto-complexity detection**: Defer to WINT-5xxx ML pipeline

### Future-Proofing
- **Strategy migration tools**: CLI tool to rebalance tiers between versions
- **Auto-tier suggestions**: ML-based tier optimization from quality metrics
- **Multi-strategy support**: Parallel A/B testing of different tier assignments (WINT-6xxx experimentation framework)
