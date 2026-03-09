# Test Plan: MODL-0010

## Scope Summary

- **Endpoints touched**: None (backend infrastructure)
- **UI touched**: No
- **Data/storage touched**: No (configuration and caching only)

## Happy Path Tests

### Test 1: OpenRouter Provider Initialization
- **Setup**: Valid OpenRouter API key in `OPENROUTER_API_KEY` env var
- **Action**: Call provider factory with model prefix `openrouter/anthropic/claude-3-5-sonnet`
- **Expected outcome**: Returns initialized ChatOpenAI instance configured for OpenRouter endpoint
- **Evidence**:
  - Logger output confirms provider selection
  - Instance cache populated
  - Model name correctly parsed
  - API endpoint set to `https://openrouter.ai/api/v1`

### Test 2: Ollama Provider Initialization (Backward Compatibility)
- **Setup**: Local Ollama server running on default port 11434
- **Action**: Call provider factory with model prefix `ollama/qwen2.5-coder:7b`
- **Expected outcome**: Returns initialized ChatOllama instance (existing behavior maintained)
- **Evidence**:
  - Logger output confirms provider selection
  - Instance cache populated
  - Ollama availability check passes
  - Model name correctly parsed

### Test 3: Anthropic Direct Provider Initialization
- **Setup**: Valid Anthropic API key in `ANTHROPIC_API_KEY` env var
- **Action**: Call provider factory with model prefix `anthropic/claude-opus-4`
- **Expected outcome**: Returns initialized ChatAnthropic instance
- **Evidence**:
  - Logger output confirms provider selection
  - Instance cache populated
  - API key loaded from environment

### Test 4: Provider Instance Caching
- **Setup**: Any provider initialized once
- **Action**: Request same model a second time
- **Expected outcome**: Returns cached instance, no re-initialization
- **Evidence**:
  - Logger output confirms cache hit
  - Only one initialization log entry
  - Same instance reference returned

### Test 5: LangChain Integration
- **Setup**: Provider initialized with test model
- **Action**: Invoke provider with simple prompt "Hello, world!"
- **Expected outcome**: Successful completion with response text
- **Evidence**:
  - Response object contains `content` field
  - No errors thrown
  - Response matches expected LangChain BaseChatModel contract

## Error Cases

### Error 1: Missing API Key
- **Setup**: Remove `OPENROUTER_API_KEY` from environment
- **Action**: Attempt to initialize OpenRouter provider
- **Expected**: Throws validation error with clear message
- **Evidence**:
  - Error logged via @repo/logger
  - Error message references missing env var
  - Zod validation error structure

### Error 2: Ollama Server Unavailable
- **Setup**: Stop local Ollama server
- **Action**: Attempt to initialize Ollama provider
- **Expected**: Availability check fails with timeout
- **Evidence**:
  - Logger warning about Ollama unavailability
  - Error message suggests checking Ollama service
  - Graceful failure (no crash)

### Error 3: Invalid Model Prefix
- **Setup**: Valid environment configuration
- **Action**: Call provider factory with unknown prefix `unknown/model-name`
- **Expected**: Throws error indicating unsupported provider
- **Evidence**:
  - Error message lists supported provider prefixes
  - Logged via @repo/logger

### Error 4: Malformed Model String
- **Setup**: Valid environment configuration
- **Action**: Call provider factory with malformed string (no prefix separator)
- **Expected**: Throws parsing error
- **Evidence**:
  - Error message explains expected format (`provider/model-name`)
  - Logged via @repo/logger

## Edge Cases (Reasonable)

### Edge 1: Empty Provider Instance Cache
- **Setup**: Fresh provider factory initialization
- **Action**: Request provider for first time
- **Expected**: Cache miss, new instance created
- **Evidence**:
  - Logger output confirms cache miss
  - Instance initialization logged
  - Cache populated after request

### Edge 2: Concurrent Provider Requests
- **Setup**: Multiple concurrent requests for same model
- **Action**: Fire 3 parallel requests for `openrouter/anthropic/claude-3-5-sonnet`
- **Expected**: Only one initialization, all return same cached instance
- **Evidence**:
  - Single initialization log entry
  - All requests return same instance reference
  - No race condition errors

### Edge 3: Configuration Reload
- **Setup**: Provider initialized, then env var changed
- **Action**: Request provider again after config change
- **Expected**: Uses cached instance (no hot reload)
- **Evidence**:
  - Cache hit logged
  - Original configuration persists
  - (Note: Config hot reload is non-goal for MVP)

### Edge 4: Large Model Catalog (OpenRouter)
- **Setup**: OpenRouter API key valid
- **Action**: Request multiple different models sequentially
- **Expected**: Each model gets separate cache entry
- **Evidence**:
  - Multiple cache entries logged
  - Each model initialized once
  - Cache keys include model identifier

## Required Tooling Evidence

### Backend Integration Tests

**Test file location**: `packages/backend/orchestrator/src/providers/__tests__/integration.test.ts`

**Prerequisites**:
- Environment variables set:
  - `OPENROUTER_API_KEY` (required for OpenRouter tests)
  - `ANTHROPIC_API_KEY` (required for Anthropic tests)
  - Local Ollama server running (required for Ollama tests)

**Required assertions**:
- Each provider returns instance of correct LangChain type:
  - OpenRouter → `ChatOpenAI`
  - Ollama → `ChatOllama`
  - Anthropic → `ChatAnthropic`
- Provider factory correctly routes based on model prefix
- Instance caching works across providers
- Availability checks return correct status
- Configuration schemas validate correctly

**Test execution**:
```bash
pnpm --filter @repo/orchestrator test:integration
```

**Evidence artifacts**:
- Test output with all assertions passing
- Logger output confirming provider initialization sequence
- No console.log usage (enforce @repo/logger)

### Unit Tests

**Test file location**: `packages/backend/orchestrator/src/providers/__tests__/base.test.ts` (and per-provider)

**Required assertions**:
- Zod schema validation for each provider config
- Model prefix parsing logic
- Cache key generation
- Error handling for missing configuration

**Test execution**:
```bash
pnpm --filter @repo/orchestrator test
```

## Risks to Call Out

### Risk 1: API Rate Limiting
OpenRouter and Anthropic have rate limits that may affect test execution. Integration tests should include retry logic or use test-specific API keys with higher limits.

**Mitigation**:
- Use dedicated test API keys
- Implement exponential backoff in tests
- Consider skipping integration tests in CI if API keys unavailable

### Risk 2: Ollama Version Compatibility
Local Ollama server version may vary across development environments, potentially causing test flakiness.

**Mitigation**:
- Document required Ollama version in test setup
- Gracefully skip Ollama tests if server unavailable
- Use stable model versions for tests

### Risk 3: Test Data Sensitivity
API keys in environment variables must not be committed to git or logged.

**Mitigation**:
- Ensure logger masks API keys
- Use .env.test files (gitignored)
- Document API key setup in test README

### Risk 4: Cache Invalidation Testing
Testing cache behavior requires careful state management between tests.

**Mitigation**:
- Clear cache before each test
- Use isolated cache instances per test suite
- Document cache lifecycle in test setup
