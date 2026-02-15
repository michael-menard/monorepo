# Future Opportunities - MODL-0010

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Provider health monitoring: No continuous health checks beyond initial availability | Medium | Medium | Add background health checking in MODL-0020 with automatic provider switching |
| 2 | Rate limit handling: No explicit rate limit detection/retry logic | Medium | Low | Implement exponential backoff in MODL-0020 when integrating with selector |
| 3 | Model catalog caching: OpenRouter model list fetched on-demand, not cached | Low | Low | Cache model catalog with TTL in MODL-0040 (Leaderboards) |
| 4 | Configuration hot-reload: Requires process restart for config changes | Low | Medium | Add file watcher for config changes in MODL-0020 |
| 5 | Provider metrics: No latency/cost/error tracking | Medium | Medium | Defer to MODL-0030 (Quality Evaluator) and MODL-0040 (Leaderboards) |
| 6 | Streaming support validation: Test plan doesn't verify streaming completions | Low | Low | Add streaming tests in MODL-0020 when implementing model selector |
| 7 | Tool/function calling validation: Not verified for all providers | Medium | Low | Add function calling tests when integrating with existing nodes (MODL-0020) |
| 8 | Provider fallback chain: Only single fallback (Ollama → Claude) | Low | Medium | Add multi-provider fallback chain in MODL-0020 |
| 9 | API key rotation support: No mechanism for live key rotation | Low | High | Defer to production deployment (ops concern, not dev) |
| 10 | Cross-provider model aliasing: No way to define "claude-3-5-sonnet" → "openrouter/anthropic/claude-3.5-sonnet" | Medium | Medium | Add alias system in MODL-0020 (Task Contracts) |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Provider cost tracking: Integrate with pricing APIs to estimate costs per invocation | High | High | Defer to MODL-0040 (Leaderboards) - track costs alongside quality metrics |
| 2 | Model context window validation: No checks for token limits before sending requests | Medium | Medium | Add in MODL-0020 with task contracts (estimate tokens, select appropriate model) |
| 3 | Provider-specific optimizations: Each provider may have unique features (e.g., OpenRouter's fallback models) | Medium | Medium | Explore in MODL-0020 after baseline implementation |
| 4 | Configuration UI: CLI or web UI for managing provider configs | High | High | Defer to AUTO epic (dashboard) |
| 5 | Provider playground: Interactive testing of providers/models | Medium | Medium | Defer to TELE epic (telemetry dashboards) |
| 6 | Batch request optimization: Some providers support batch APIs | Low | High | Investigate in MODL-0020 for parallel task execution |
| 7 | Provider feature matrix: Document capabilities per provider (streaming, tools, vision, etc.) | Medium | Low | Create markdown table in MODL-0020 documentation |
| 8 | Prompt caching: Providers like Anthropic support prompt caching | Medium | Medium | Explore in MODL-0030 (Quality Evaluator) when optimizing performance |
| 9 | Provider-agnostic retry logic: Unified retry mechanism across all providers | Medium | Low | Add to base provider interface in MODL-0020 |
| 10 | Environment-specific provider routing: Dev uses Ollama, prod uses OpenRouter | Medium | Medium | Defer to deployment configuration (ops concern) |

## Categories

### Edge Cases
- **Gap #2**: Rate limit handling - providers return different error formats
- **Gap #7**: Tool/function calling - not all providers support function calling equally
- **Gap #8**: Provider fallback chain - single failure point if both Ollama and Claude fail
- **Enhancement #6**: Batch request optimization - providers have different batch APIs

### UX Polish
- **Enhancement #4**: Configuration UI - reduce friction in provider management
- **Enhancement #5**: Provider playground - improve developer experience when testing
- **Enhancement #7**: Provider feature matrix - clear capability documentation

### Performance
- **Gap #3**: Model catalog caching - reduce API calls to OpenRouter
- **Gap #6**: Streaming support validation - ensure low-latency responses
- **Enhancement #2**: Model context window validation - prevent oversized requests
- **Enhancement #8**: Prompt caching - reduce latency and cost for repeated prompts

### Observability
- **Gap #1**: Provider health monitoring - detect degraded providers proactively
- **Gap #5**: Provider metrics - track latency, cost, error rates
- **Enhancement #1**: Provider cost tracking - visibility into spending per provider
- **Enhancement #4**: Configuration UI - centralized view of provider status

### Integrations
- **Gap #10**: Cross-provider model aliasing - simplify model selection
- **Enhancement #3**: Provider-specific optimizations - leverage unique features
- **Enhancement #9**: Provider-agnostic retry logic - consistent error handling
- **Enhancement #10**: Environment-specific routing - flexibility in deployment

### Future-Proofing
- **Gap #4**: Configuration hot-reload - reduce downtime during config changes
- **Gap #9**: API key rotation support - security best practice
- **Enhancement #2**: Context window validation - prepare for larger context models
- **Enhancement #6**: Batch request optimization - scalability for parallel workflows

---

## Priority Recommendations

### High Impact, Low Effort (Do Next)
1. **Enhancement #7**: Provider feature matrix documentation (1-2 hours)
2. **Gap #2**: Rate limit handling with exponential backoff (4-6 hours)
3. **Enhancement #9**: Provider-agnostic retry logic (4-6 hours)

### High Impact, Medium Effort (Plan for MODL-0020)
1. **Gap #10**: Cross-provider model aliasing (1-2 days)
2. **Enhancement #2**: Model context window validation (1-2 days)
3. **Gap #7**: Tool/function calling validation (1 day)

### High Impact, High Effort (Defer to Later Epics)
1. **Enhancement #1**: Provider cost tracking → MODL-0040 (Leaderboards)
2. **Gap #1**: Provider health monitoring → MODL-0020 (Model Selector)
3. **Enhancement #4**: Configuration UI → AUTO epic (Dashboard)

### Low Priority (Parking Lot)
1. **Gap #3**: Model catalog caching (nice-to-have, low impact)
2. **Gap #4**: Configuration hot-reload (convenience, not critical)
3. **Gap #9**: API key rotation (ops concern, not dev priority)
4. **Enhancement #5**: Provider playground (developer convenience)
5. **Enhancement #10**: Environment-specific routing (deployment concern)

---

## Notes

**Why these are non-MVP:**
- **Edge cases**: Can be handled with basic error messages initially
- **Performance optimizations**: Current implementation is "fast enough" for MVP
- **Observability**: Basic logging with `@repo/logger` is sufficient for initial launch
- **UX enhancements**: Core functionality works without polish
- **Future-proofing**: Can evolve as requirements emerge

**Connection to downstream stories:**
- MODL-0020 (Task Contracts & Model Selector) will address: Gaps #1, #2, #7, #10; Enhancements #2, #3, #9
- MODL-0030 (Quality Evaluator) will address: Gap #5; Enhancement #8
- MODL-0040 (Model Leaderboards) will address: Enhancement #1
- TELE epic will address: Enhancement #5
- AUTO epic will address: Enhancement #4

**Knowledge to capture:**
After implementing MODL-0010, document in KB:
1. Provider adapter pattern (base interface + factory)
2. Caching strategy for provider instances
3. Availability check pattern with timeout
4. Cross-provider configuration management
5. Integration test approach for external APIs (API keys in CI)
