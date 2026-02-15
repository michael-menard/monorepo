# Future Opportunities - MODL-0010

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Model prefix aliases not supported | Low | Low | Story explicitly defers short aliases like "or/" to post-MVP. If usage patterns show developers prefer shortcuts, add alias mapping in provider factory (e.g., "or/" -> "openrouter/", "anth/" -> "anthropic/"). Wait for real usage data. |
| 2 | No health checks for OpenRouter/Anthropic | Low | Medium | Story uses lazy initialization (fail on first use) for OpenRouter/Anthropic. Could add proactive health checks like Ollama's isOllamaAvailable(). Benefit: Earlier error detection. Cost: Additional API calls, rate limit impact. Defer until MODL-0020 integration when health monitoring needs are clearer. |
| 3 | No retry logic for provider initialization | Medium | Medium | If OpenRouter/Anthropic API calls fail transiently during initialization, provider factory throws immediately. Consider exponential backoff retry with configurable max attempts. Defer to observability story (TELE epic) when retry patterns are standardized across orchestrator. |
| 4 | OpenRouter routing preferences not exposed | Low | High | OpenRouter supports advanced routing (prefer speed vs quality, fallback chains). Story defers this to MODL-0020. Document in MODL-0020 scope to avoid re-opening provider adapters later. |
| 5 | No provider-level telemetry | Medium | Medium | Provider factory doesn't emit metrics (initialization time, cache hit rate, availability check duration). Defer to TELE-0010 (Docker Telemetry Stack) when instrumentation patterns are established. |
| 6 | Anthropic streaming modes not configured | Low | Medium | Story uses default ChatAnthropic configuration. Anthropic supports streaming, prompt caching, batch API. Defer streaming to MODL-0020 when task-specific configurations are needed. Document in MODL-0020 scope. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Provider capability metadata | Medium | Medium | Current design doesn't expose provider capabilities (max context window, supported features, pricing). MODL-0020 (Model Selector) will need this for intelligent model selection. Add ProviderCapabilitiesSchema to base.ts with: contextWindow, supportsStreaming, pricing, latencyProfile. Implement in each adapter. Makes selection logic easier. |
| 2 | Unified error types across providers | Medium | Low | Each provider may throw different error types. Consider ProviderErrorSchema with standard error codes (RATE_LIMIT, INVALID_API_KEY, MODEL_NOT_FOUND, TIMEOUT). Improves error handling in MODL-0020 and observability in TELE. |
| 3 | Provider-specific configuration validation | Low | Low | OpenRouter/Anthropic have provider-specific options (temperature ranges, top_p, etc.). Current design uses generic ProviderConfigSchema. Consider per-provider config schemas: OpenRouterConfigSchema, AnthropicConfigSchema, OllamaConfigSchema. Provides better validation and documentation. |
| 4 | Cache eviction policy | Medium | Medium | Current cache is unbounded Map (no TTL, no size limit). Long-running orchestrator could accumulate stale instances. Consider LRU cache or TTL-based eviction. Defer until cache size becomes observable problem (track in TELE metrics). |
| 5 | Multi-model request batching | High | High | Future: Batch multiple requests to same provider for efficiency. OpenRouter/Anthropic support batch APIs. Significant performance/cost optimization for parallel agent workflows. Defer to performance optimization epic (no epic planned yet). |
| 6 | Provider fallback chains | High | Medium | Story defers multi-model fallback (try A, then B) to MODL-0020. This is critical for resilience. Ensure MODL-0020 scope includes fallback chain configuration and execution. High impact on reliability. |
| 7 | Local model auto-pull for Ollama | Medium | Medium | If Ollama model not available locally, current design fails. Could auto-trigger `ollama pull` command. Risk: Unexpected downloads, disk usage. Defer to developer workflow story (outside MODL epic). Document setup requirements in README. |
| 8 | Provider cost tracking hooks | High | Medium | Provider adapters could expose cost calculation hooks (token count * rate). MODL-0020 needs this for budget-aware model selection. WINT-0260 (Model Cost Tracking) will need integration point. Design provider API with cost observability in mind. |

## Categories

- **Edge Cases**: Retry logic (#3), cache eviction (#4), auto-pull Ollama models (#7)
- **UX Polish**: Model prefix aliases (#1), unified error types (#2)
- **Performance**: Multi-model batching (#5), provider capability metadata (#1), fallback chains (#6)
- **Observability**: Provider-level telemetry (#5), cost tracking hooks (#8)
- **Integrations**: OpenRouter routing preferences (#4), Anthropic streaming modes (#6), capability metadata for MODL-0020 (#1)

## Priority Recommendations

**High Priority (address in MODL-0020):**
- Provider capability metadata (#1 in Enhancement) - MODL-0020 needs this for model selection
- Provider fallback chains (#6 in Enhancement) - Critical for resilience
- Cost tracking hooks (#8 in Enhancement) - Enables budget-aware selection

**Medium Priority (address in TELE/observability stories):**
- Provider-level telemetry (#5 in Gaps) - Standard instrumentation
- Retry logic (#3 in Gaps) - Resilience pattern
- Cache eviction policy (#4 in Enhancement) - Operational hygiene

**Low Priority (wait for usage patterns):**
- Model prefix aliases (#1 in Gaps) - Nice-to-have
- Health checks for OpenRouter/Anthropic (#2 in Gaps) - Optimize if needed
- Provider-specific config validation (#3 in Enhancement) - Polish

**Deferred (no immediate timeline):**
- Multi-model batching (#5 in Enhancement) - Needs performance epic
- Local model auto-pull (#7 in Enhancement) - Developer workflow concern
- OpenRouter routing preferences (#4 in Gaps) - Advanced feature
- Anthropic streaming modes (#6 in Gaps) - Task-specific optimization

## Integration Notes for MODL-0020

When implementing Task Contracts & Model Selector (MODL-0020), ensure:

1. Provider capability metadata is accessible from factory
2. Fallback chain configuration uses provider factory API
3. Cost tracking hooks are integrated into provider initialization
4. OpenRouter routing preferences can be configured per task
5. Anthropic streaming modes can be enabled for streaming tasks
6. Error handling leverages unified provider error types

These enhancements should be scoped into MODL-0020 planning to avoid re-opening provider adapter code.
