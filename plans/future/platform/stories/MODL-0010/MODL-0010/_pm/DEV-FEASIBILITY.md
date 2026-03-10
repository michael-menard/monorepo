# Dev Feasibility Review: MODL-0010

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: Refactoring existing Ollama implementation into adapter pattern is straightforward. OpenRouter and Anthropic adapters follow established LangChain patterns. All required packages are actively maintained and well-documented. Implementation is isolated to backend orchestrator with no cross-domain dependencies.

## Likely Change Surface (Core Only)

### Packages
- `packages/backend/orchestrator/src/providers/` (new directory)
  - `base.ts` - Provider interface definition
  - `openrouter.ts` - OpenRouter adapter
  - `ollama.ts` - Refactored Ollama adapter
  - `anthropic.ts` - Anthropic direct adapter
  - `index.ts` - Provider factory

### Refactored Files
- `packages/backend/orchestrator/src/config/llm-provider.ts` - Will delegate to new provider factory
- `packages/backend/orchestrator/src/config/model-assignments.ts` - Update model provider detection logic

### Configuration
- Environment variables:
  - `OPENROUTER_API_KEY` (new)
  - `ANTHROPIC_API_KEY` (new)
  - Existing Ollama env vars unchanged

### Dependencies
- Add `@langchain/anthropic` package
- Add `@langchain/openai` package (for OpenRouter compatibility)
- Existing: `@langchain/core`, `@langchain/ollama`

## MVP-Critical Risks

### Risk 1: Backward Compatibility with Existing Ollama Usage
**Why it blocks MVP**: Existing LangGraph nodes use current Ollama integration. Breaking this would require updating all nodes simultaneously, expanding scope significantly.

**Required mitigation**:
- Refactor existing `llm-provider.ts` to use new Ollama adapter internally
- Maintain exact same public API
- Add integration test verifying existing model-assignments.ts patterns work unchanged
- Keep `ollamaInstanceCache` functional or migrate transparently

### Risk 2: OpenRouter API Endpoint Configuration
**Why it blocks MVP**: OpenRouter uses OpenAI-compatible API but with different base URL. Incorrect endpoint configuration will cause all requests to fail.

**Required mitigation**:
- Use `@langchain/openai` package with custom `baseURL` parameter pointing to `https://openrouter.ai/api/v1`
- Add integration test with real OpenRouter API call during implementation
- Document OpenRouter-specific headers (HTTP-Referer, X-Title) in provider implementation

### Risk 3: Provider Selection Logic Ambiguity
**Why it blocks MVP**: If model prefix parsing fails or is ambiguous, provider factory won't know which adapter to instantiate, breaking core initialization flow.

**Required mitigation**:
- Define strict model prefix format: `{provider}/{model-name}` (e.g., `openrouter/anthropic/claude-3-5-sonnet`)
- Implement Zod schema validation for model string format
- Throw clear error with supported prefix list if parsing fails
- Add unit tests covering all prefix formats and edge cases

## Missing Requirements for MVP

### API Key Management
**Decision needed**: How should API keys be validated at startup?

**Recommendation**: Add optional startup validation that warns (but doesn't crash) if API keys missing. This allows local development without all providers configured while ensuring production deployments catch missing keys early.

**Concrete text for PM to include**:
> "API key validation: Provider factory MUST log warning if required API keys (OPENROUTER_API_KEY, ANTHROPIC_API_KEY) are missing from environment, but MUST NOT crash the application. This allows developers to work with only Ollama locally. If a provider is requested and its API key is missing, throw error at request time with clear message."

### Model Prefix Standard
**Decision needed**: Should we support short aliases (e.g., `or/` for `openrouter/`)?

**Recommendation**: Start with full prefix names only for clarity. Aliases can be added post-MVP based on developer feedback.

**Concrete text for PM to include**:
> "Model prefix format: Full provider names only in MVP (e.g., `openrouter/`, `ollama/`, `anthropic/`). No short aliases. Future story can add alias support based on usage patterns."

## MVP Evidence Expectations

### Proof Needed for Core Journey

1. **Integration test passing with real providers**:
   - OpenRouter: Successful completion of simple prompt
   - Ollama: Backward compatible with existing usage
   - Anthropic: Successful completion of simple prompt

2. **Backward compatibility verification**:
   - Existing orchestrator nodes continue working without modification
   - Model assignments system correctly detects provider from model string
   - No breaking changes to public APIs

3. **Configuration validation**:
   - Zod schemas validate all provider configs
   - Clear error messages for missing/invalid configuration
   - Logging via @repo/logger (no console.log)

### Critical CI/Deploy Checkpoints

- **Type checking**: All provider files must pass TypeScript strict mode
- **Unit tests**: 100% coverage on provider factory routing logic
- **Integration tests**: Pass with at least OpenRouter + Ollama (Anthropic optional if key unavailable)
- **Lint**: No ESLint errors in new provider files
- **Import validation**: No barrel files created, direct imports only
