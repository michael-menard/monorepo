# Future Risks: MODL-0010

## Non-MVP Risks

### Risk 1: Provider-Specific Features
- **Impact**: OpenRouter supports model routing, fallbacks, and preferences that aren't exposed in basic LangChain integration. Missing these features limits cost optimization opportunities.
- **Recommended timeline**: MODL-0030 (Quality Evaluator) or MODL-0040 (Model Leaderboards) when we need advanced routing

### Risk 2: Rate Limiting and Retry Logic
- **Impact**: Production workloads may hit rate limits without exponential backoff. Could cause orchestrator failures under load.
- **Recommended timeline**: Before production deployment, after MVP validation

### Risk 3: Cost Tracking Per Provider
- **Impact**: Without per-provider token usage tracking, we can't compare costs across OpenRouter vs. Anthropic direct.
- **Recommended timeline**: MODL-0040 (Model Leaderboards) when metrics tracking is implemented

### Risk 4: Model Availability Monitoring
- **Impact**: If a provider's model becomes unavailable (deprecated, rate limited), we have no automatic fallback. Orchestrator will fail.
- **Recommended timeline**: Post-MVP when we have multiple models per task (MODL-0020)

### Risk 5: Security: API Key Rotation
- **Impact**: Hardcoded env vars don't support key rotation without redeployment. Security risk for long-running production instances.
- **Recommended timeline**: Before production deployment, could use AWS Secrets Manager

## Scope Tightening Suggestions

### Suggestion 1: Defer Provider-Specific Configuration
**Current scope**: Each provider has unique config options (OpenRouter routing preferences, Anthropic streaming modes, etc.)

**Recommendation**: Start with minimal config (API key + model name). Add provider-specific config in MODL-0020 when we know which features we need.

**Concrete scope clarification**:
> "Provider adapters MUST expose only: API key, model name, timeout. Provider-specific features (OpenRouter routing preferences, Anthropic beta headers) are OUT OF SCOPE for MODL-0010."

### Suggestion 2: Defer Multi-Model Fallback
**Current scope**: Each adapter supports one model at a time.

**Recommendation**: Fallback logic (e.g., "try GPT-4, fall back to GPT-3.5") belongs in MODL-0020 (Model Selector), not individual adapters.

**Concrete scope clarification**:
> "Provider adapters MUST support single model initialization only. Fallback chains (try model A, then B) are OUT OF SCOPE for MODL-0010, handled by Model Selector in MODL-0020."

### Suggestion 3: Defer Provider Health Checks
**Current scope**: Ollama has availability checking (`isOllamaAvailable()`).

**Recommendation**: Health checks for OpenRouter/Anthropic add complexity (network calls, timeouts). Defer to post-MVP when we have telemetry to track actual failures.

**Concrete scope clarification**:
> "OpenRouter and Anthropic adapters MAY implement lazy initialization (fail on first use) instead of upfront availability checking. Only Ollama adapter MUST preserve existing availability check for backward compatibility."

## Future Requirements

### Nice-to-Have: Provider Adapter Registry
Instead of hardcoded provider factory switch statement, use a registry pattern that allows dynamic provider registration. Enables third-party providers without core code changes.

**Timeline**: Post-MVP refactor when we have 5+ providers

### Nice-to-Have: Provider Metrics Dashboard
Expose provider-level metrics (latency, cost, error rate) through orchestrator API for debugging and cost optimization.

**Timeline**: MODL-0040 (Model Leaderboards) or separate telemetry story

### Nice-to-Have: Streaming Support
LangChain supports streaming responses. Current scope assumes non-streaming (blocking calls).

**Timeline**: If needed for UX (e.g., real-time code generation display), post-MVP

### Polish: Provider-Specific Error Handling
Each provider has unique error codes (OpenRouter rate limit headers, Anthropic overload responses). Generic error handling may miss optimization opportunities.

**Timeline**: After production usage reveals common failure modes
