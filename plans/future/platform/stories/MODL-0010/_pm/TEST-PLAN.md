# Test Plan: MODL-0010 Provider Adapters

## Scope Summary
- **Endpoints touched**: None (backend infrastructure only)
- **UI touched**: No
- **Data/storage touched**: No (in-memory caching only)

## Happy Path Tests

### Test 1: Base Provider Interface
- **Setup**: Import base provider interface
- **Action**: Verify all required methods are defined
- **Expected outcome**: Interface exports `getModel()`, `checkAvailability()`, `getCachedInstance()`, `loadConfig()`
- **Evidence**: TypeScript compilation passes, Zod schema validates

### Test 2: OpenRouter Adapter - Model Initialization
- **Setup**: Set `OPENROUTER_API_KEY` env var, configure model prefix `openrouter/claude-3-5-sonnet`
- **Action**: Call `getModel()` with OpenRouter model
- **Expected outcome**: Returns LangChain `BaseChatModel` instance configured for OpenRouter API
- **Evidence**: Model instance has correct baseURL, API key set, model name parsed correctly

### Test 3: Ollama Adapter - Backward Compatibility
- **Setup**: Local Ollama server running with `qwen2.5-coder:7b` model
- **Action**: Call existing `getLLMProvider()` function
- **Expected outcome**: Returns ChatOllama instance as before
- **Evidence**: Existing orchestrator nodes continue working, model responses received

### Test 4: Anthropic Adapter - Direct API
- **Setup**: Set `ANTHROPIC_API_KEY` env var, configure `anthropic/claude-opus-4`
- **Action**: Call `getModel()` with Anthropic model
- **Expected outcome**: Returns ChatAnthropic instance with direct API configuration
- **Evidence**: Model instance has correct API key, model name, baseURL

### Test 5: Provider Factory - Dynamic Selection
- **Setup**: Configure different model prefixes
- **Action**: Call factory with `openrouter/*`, `ollama/*`, `anthropic/*` prefixes
- **Expected outcome**: Factory routes to correct adapter based on prefix
- **Evidence**: Correct adapter instance returned for each prefix

### Test 6: Model Caching
- **Setup**: Initialize model twice with same configuration
- **Action**: Call `getModel()` twice for same model
- **Expected outcome**: Second call returns cached instance (same object reference)
- **Evidence**: Cache hit logged, instance equality check passes

## Error Cases

### Error 1: Missing API Key (OpenRouter)
- **Setup**: Unset `OPENROUTER_API_KEY` env var
- **Action**: Attempt to initialize OpenRouter adapter
- **Expected outcome**: Throws configuration error with clear message
- **Evidence**: Error message indicates missing API key, includes setup instructions

### Error 2: Missing API Key (Anthropic)
- **Setup**: Unset `ANTHROPIC_API_KEY` env var
- **Action**: Attempt to initialize Anthropic adapter
- **Expected outcome**: Throws configuration error with clear message
- **Evidence**: Error message indicates missing API key, includes setup instructions

### Error 3: Ollama Server Unavailable
- **Setup**: Stop Ollama server
- **Action**: Call `checkAvailability()` on Ollama adapter
- **Expected outcome**: Returns `false` or throws availability error
- **Evidence**: Timeout respected, error logged via @repo/logger

### Error 4: Invalid Model Prefix
- **Setup**: Configure model with unknown prefix `unknown/model-name`
- **Action**: Call provider factory
- **Expected outcome**: Throws error indicating unsupported provider
- **Evidence**: Error message lists supported prefixes

### Error 5: OpenRouter API Failure
- **Setup**: Use invalid OpenRouter API key
- **Action**: Attempt to call model
- **Expected outcome**: API error propagated with rate limit/auth error
- **Evidence**: Error includes HTTP status, rate limit headers if applicable

## Edge Cases (Reasonable)

### Edge 1: Availability Check Timeout
- **Setup**: Ollama server slow to respond (mock delay)
- **Action**: Call `checkAvailability()` with 5s timeout
- **Expected outcome**: Times out after 5s, returns unavailable
- **Evidence**: Timeout logged, execution doesn't hang

### Edge 2: Model Catalog Lookup (OpenRouter)
- **Setup**: Query OpenRouter for available models
- **Action**: List models from OpenRouter API
- **Expected outcome**: Returns 200+ models including Claude, GPT, Llama families
- **Evidence**: Model list includes expected model IDs, pricing data

### Edge 3: Concurrent Model Initialization
- **Setup**: Multiple parallel requests for same model
- **Action**: Call `getModel()` concurrently 10 times
- **Expected outcome**: Only one initialization, all requests get same cached instance
- **Evidence**: Cache hit count = 9, only 1 initialization logged

### Edge 4: Configuration Reload
- **Setup**: Change env var mid-execution
- **Action**: Clear cache, reinitialize adapter
- **Expected outcome**: New configuration loaded correctly
- **Evidence**: Updated API key/model used, old cached instances cleared

### Edge 5: Zod Schema Validation Failure
- **Setup**: Provide malformed configuration object
- **Action**: Parse with Zod schema
- **Expected outcome**: Zod validation error with specific field failures
- **Evidence**: Error lists missing/invalid fields with types

## Required Tooling Evidence

### Backend Integration Tests

**Test file**: `packages/backend/orchestrator/src/providers/__tests__/integration.test.ts`

Required test assertions:
1. **Ollama integration**:
   - `OLLAMA_BASE_URL` set to local server
   - Model responds to chat completion request
   - Response includes usage tokens
   - Backward compatibility with existing `getLLMProvider()` maintained

2. **OpenRouter integration** (requires API key):
   - `OPENROUTER_API_KEY` set in env
   - Model selection by prefix works (`openrouter/claude-3-5-sonnet`)
   - API returns completion with usage data
   - Rate limits respected (if hit)

3. **Anthropic integration** (requires API key):
   - `ANTHROPIC_API_KEY` set in env
   - Direct Claude API call succeeds
   - Response format matches LangChain expectations
   - Streaming enabled if configured

4. **Provider factory**:
   - Correct adapter selected for each prefix
   - Unknown prefix throws clear error
   - Cache behavior validated

5. **Availability checks**:
   - Ollama availability returns `true` when server running
   - Ollama availability returns `false` when server down
   - Timeout behavior verified (max 5s)

**Required assertions**:
```typescript
expect(model).toBeInstanceOf(BaseChatModel)
expect(response.content).toBeTruthy()
expect(response.usage_metadata).toBeDefined()
expect(cachedModel).toBe(originalModel) // same instance
expect(availability).toBe(true/false)
```

### Unit Tests

**Test file**: `packages/backend/orchestrator/src/providers/__tests__/unit.test.ts`

Required test coverage:
1. Zod schema validation (valid/invalid configs)
2. Model prefix parsing
3. Cache key generation
4. Configuration merging
5. Error message formatting

**Mock strategy**: Mock LangChain classes, test adapter logic only

## Risks to Call Out

### Test Fragility
1. **API key rotation**: OpenRouter/Anthropic keys expire, tests may fail in CI
   - **Mitigation**: Use long-lived test API keys in CI secrets, document rotation process

2. **Ollama server dependency**: Local server must be running for integration tests
   - **Mitigation**: Add pre-test check for Ollama availability, skip tests gracefully if unavailable

3. **Rate limits**: OpenRouter/Anthropic APIs rate-limited in CI
   - **Mitigation**: Use test tier API keys with higher limits, implement retry with exponential backoff

### Missing Prerequisites
1. **API keys**: Need `OPENROUTER_API_KEY` and `ANTHROPIC_API_KEY` for full test coverage
   - **Blocker level**: Medium - can test Ollama only without keys, but reduces confidence

2. **Model availability**: OpenRouter models may be deprecated or unavailable
   - **Mitigation**: Test with stable models (Claude 3.5 Sonnet, GPT-4), have fallback list

3. **LangChain version compatibility**: Tests assume current LangChain API surface
   - **Mitigation**: Pin LangChain versions in package.json, test upgrades separately

### Ambiguity
1. **Provider selection logic**: Unclear if prefix is only selection mechanism or if config files involved
   - **Decision needed**: Confirm prefix-based routing is sufficient or if we need config-based provider selection

2. **Error handling**: What should happen when all providers unavailable?
   - **Decision needed**: Define fallback behavior (throw error vs. return null vs. use default)
