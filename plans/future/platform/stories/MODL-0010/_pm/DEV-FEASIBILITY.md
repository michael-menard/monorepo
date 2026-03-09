# Dev Feasibility: MODL-0010 Provider Adapters

## Feasibility Summary
- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**:
  - Existing Ollama implementation provides proven pattern to follow
  - LangChain packages already installed with adapter interfaces
  - Configuration patterns already established in codebase
  - Backward compatibility straightforward (wrap existing Ollama code)
  - No database or frontend changes required

## Likely Change Surface (Core Only)

### Areas/Packages for Core Journey
1. **packages/backend/orchestrator/src/providers/** (new directory)
   - `base.ts` - Base provider interface
   - `ollama.ts` - Refactored Ollama adapter
   - `openrouter.ts` - New OpenRouter adapter
   - `anthropic.ts` - New Anthropic adapter
   - `index.ts` - Provider factory

2. **packages/backend/orchestrator/src/config/** (existing directory)
   - `llm-provider.ts` - Refactor to use new provider system
   - `model-assignments.ts` - Update to support new provider prefixes

3. **packages/backend/orchestrator/package.json**
   - Add `@langchain/anthropic` dependency
   - Optionally add `@langchain/openai` for OpenRouter compatibility

### Endpoints for Core Journey
None - this is infrastructure only, no API endpoints.

### Critical Deploy Touchpoints
1. **Environment variables** (required in production):
   - `OPENROUTER_API_KEY` - for OpenRouter provider
   - `ANTHROPIC_API_KEY` - for Anthropic provider
   - Existing: `OLLAMA_BASE_URL`, `ANTHROPIC_API_KEY` (Claude Code)

2. **Package dependencies**:
   - `@langchain/anthropic` - new package installation
   - No breaking changes to existing dependencies

3. **Configuration files**:
   - None required - providers configured via env vars

## MVP-Critical Risks (Max 5)

### Risk 1: Ollama Backward Compatibility Break
- **Why it blocks MVP**: Existing orchestrator nodes depend on current Ollama integration
- **Required mitigation**:
  - Create comprehensive test suite for existing Ollama behavior
  - Refactor incrementally, keeping existing `getLLMProvider()` function signature
  - Test all existing LangGraph nodes before merging

### Risk 2: OpenRouter API Instability
- **Why it blocks MVP**: If OpenRouter API changes, adapter breaks immediately
- **Required mitigation**:
  - Test against real OpenRouter API during implementation
  - Implement robust error handling with fallback to other providers
  - Version-lock LangChain packages to known-working versions
  - Document OpenRouter API version tested against

### Risk 3: Missing LangChain Anthropic Package Features
- **Why it blocks MVP**: Anthropic adapter may not support all required features (streaming, tool calling)
- **Required mitigation**:
  - Verify `@langchain/anthropic` supports required features before implementation
  - Test streaming completions (if needed by existing nodes)
  - Test tool/function calling (if needed by existing nodes)
  - Have fallback to Anthropic SDK if LangChain adapter insufficient

## Missing Requirements for MVP

### Requirement 1: Provider Selection Strategy
- **Concrete decision text**: "How should the system choose between providers when multiple support the same model (e.g., Claude via OpenRouter vs. Anthropic direct)?"
- **Options**:
  - A) Prefix-based explicit selection (e.g., `openrouter/claude-3-5-sonnet` vs. `anthropic/claude-3-5-sonnet`)
  - B) Configuration file with provider priority
  - C) Runtime provider health checking with automatic failover
- **Recommendation**: Start with (A) prefix-based, add (C) failover in MODL-0020

### Requirement 2: Cache Invalidation Strategy
- **Concrete decision text**: "When should cached provider instances be invalidated (config change, API key rotation, error threshold)?"
- **Options**:
  - A) Never invalidate, require process restart
  - B) Invalidate on configuration change detection
  - C) Invalidate after N consecutive errors
- **Recommendation**: (A) for MVP simplicity, add (B) in MODL-0020

### Requirement 3: Availability Check Timeout
- **Concrete decision text**: "What is the maximum timeout for provider availability checks?"
- **Options**:
  - A) 5 seconds (existing pattern)
  - B) 10 seconds (more forgiving)
  - C) Configurable per provider
- **Recommendation**: (A) 5 seconds per existing `isOllamaAvailable()` pattern

## MVP Evidence Expectations

### Proof Needed for Core Journey
1. **Integration test suite passing**:
   - All three providers (Ollama, OpenRouter, Anthropic) successfully return model instances
   - Model instances can generate completions
   - Caching behavior verified
   - Availability checks work correctly

2. **Backward compatibility verified**:
   - Existing orchestrator nodes continue working with refactored Ollama adapter
   - No regression in existing LangGraph graphs
   - Performance unchanged (no added latency)

3. **Configuration validated**:
   - Zod schemas parse valid configurations correctly
   - Zod schemas reject invalid configurations with clear errors
   - Environment variable loading works in all environments (dev, test, prod)

### Critical CI/Deploy Checkpoints
1. **Pre-merge**:
   - Unit tests pass (100% coverage on new adapter code)
   - Integration tests pass (with test API keys)
   - TypeScript compilation passes
   - Linting passes

2. **Post-deploy**:
   - Smoke test: Call each provider in production to verify API keys work
   - Monitor error logs for provider initialization failures
   - Verify existing orchestrator functionality unchanged

## Implementation Notes

### Dependencies to Add
```json
{
  "dependencies": {
    "@langchain/anthropic": "^0.3.0"
  }
}
```

Note: `@langchain/openai` may be needed for OpenRouter compatibility if OpenRouter doesn't have native LangChain support. Verify during implementation.

### Existing Code to Reuse

**From `llm-provider.ts`**:
- `LLMProviderConfigSchema` (Zod schema pattern)
- `loadLLMProviderConfig()` (env var loading)
- `isOllamaAvailable()` (availability check pattern)
- `ollamaInstanceCache` (caching pattern)

**From `model-assignments.ts`**:
- `parseOllamaModel()` (model parsing pattern)
- `getModelProvider()` (provider detection pattern)

### Time Estimate Breakdown
- **Day 1 (6-8 hours)**:
  - Define base provider interface with Zod schemas
  - Refactor existing Ollama code into new adapter pattern
  - Write unit tests for Ollama adapter
  - Verify backward compatibility with existing nodes

- **Day 2 (6-8 hours)**:
  - Implement OpenRouter adapter
  - Test against real OpenRouter API
  - Handle rate limiting and error cases
  - Write integration tests

- **Day 3 (6-8 hours)**:
  - Implement Anthropic adapter
  - Create provider factory with routing logic
  - Write integration tests for all providers
  - Final backward compatibility verification
  - Documentation

### Confidence Boosters
1. **Existing implementation**: Ollama adapter already works, just needs refactoring
2. **Proven libraries**: LangChain provides stable adapter interfaces
3. **Simple scope**: No database, no frontend, no API changes
4. **Clear patterns**: Configuration and caching patterns already established
5. **Good test coverage**: Integration tests can verify real provider connections per ADR-005
