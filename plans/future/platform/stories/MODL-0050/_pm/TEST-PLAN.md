# Test Plan: MODL-0050

## Scope Summary

- **Endpoints touched**: None (backend infrastructure only)
- **UI touched**: No
- **Data/storage touched**: No (in-memory caching only)
- **Testing scope**: Provider adapter system, model factory routing, configuration validation
- **Test framework**: Vitest for unit and integration tests

---

## Happy Path Tests

### Test 1: MiniMax Provider Initialization

**Setup**:
- Set environment variables: `MINIMAX_API_KEY=test-key`, `MINIMAX_GROUP_ID=test-group`
- Clear all provider caches

**Action**:
```typescript
const provider = MinimaxProvider.getInstance('minimax/abab5.5-chat')
const model = await provider.getModel('minimax/abab5.5-chat')
```

**Expected Outcome**:
- Provider instance created successfully
- Model instance is ChatMinimax from @langchain/community
- Configuration loaded from environment variables
- Cache logging shows cache miss for first call

**Evidence**:
- `@repo/logger.debug()` output shows "MiniMax provider initialized"
- `@repo/logger.debug()` output shows cache miss
- Model instance has correct configuration (API key, group ID, model name)

### Test 2: Model Prefix Parsing

**Setup**:
- MiniMax provider initialized

**Action**:
```typescript
const parsedName = provider.parseModelName('minimax/abab5.5-chat')
```

**Expected Outcome**:
- Returns `'abab5.5-chat'` (prefix stripped)
- Works for all MiniMax model variants (abab5.5, abab5.5s, abab6)

**Evidence**:
- Return value matches expected parsed name
- No errors thrown for valid model names

### Test 3: Factory Routing

**Setup**:
- Provider factory initialized

**Action**:
```typescript
const provider = getProviderForModel('minimax/abab5.5-chat')
```

**Expected Outcome**:
- Returns MinimaxProvider instance
- Provider is cached for subsequent calls with same config

**Evidence**:
- `provider instanceof MinimaxProvider` is true
- Second call returns same instance (reference equality)

### Test 4: Cache Hit on Second Call

**Setup**:
- First call to `getModel('minimax/abab5.5-chat')` completed

**Action**:
```typescript
const model2 = await provider.getModel('minimax/abab5.5-chat')
```

**Expected Outcome**:
- Returns cached model instance
- Cache logging shows cache hit

**Evidence**:
- `@repo/logger.debug()` output shows cache hit
- Same model instance returned (reference equality)

### Test 5: Availability Check (Integration Test)

**Setup**:
- Real MiniMax API credentials in environment
- Test skip condition: `test.skipIf(!process.env.MINIMAX_API_KEY)`

**Action**:
```typescript
const isAvailable = await provider.checkAvailability()
```

**Expected Outcome**:
- Returns boolean result (true if MiniMax API reachable)
- Timeout after 5000ms if endpoint unreachable
- Result cached for 30 seconds

**Evidence**:
- Boolean return value
- `@repo/logger.debug()` output shows availability check result
- Second call within 30s returns cached result

---

## Error Cases

### Error 1: Missing API Key

**Setup**:
- Unset `MINIMAX_API_KEY` environment variable
- `MINIMAX_GROUP_ID` set

**Action**:
```typescript
const provider = MinimaxProvider.getInstance('minimax/abab5.5-chat')
```

**Expected Outcome**:
- Throws clear error: "MINIMAX_API_KEY environment variable is required"
- Error message includes setup instructions

**Evidence**:
- Error thrown with expected message
- Error is instance of configuration validation error

### Error 2: Missing Group ID

**Setup**:
- `MINIMAX_API_KEY` set
- Unset `MINIMAX_GROUP_ID` environment variable

**Action**:
```typescript
const provider = MinimaxProvider.getInstance('minimax/abab5.5-chat')
```

**Expected Outcome**:
- Throws clear error: "MINIMAX_GROUP_ID environment variable is required"

**Evidence**:
- Error thrown with expected message
- Zod validation error

### Error 3: Invalid Model Prefix

**Setup**:
- Factory initialized

**Action**:
```typescript
const provider = getProviderForModel('unknown/model-name')
```

**Expected Outcome**:
- Throws error: "Unknown model prefix: unknown"
- Error message lists supported providers (including minimax)

**Evidence**:
- Error thrown with expected message
- MiniMax listed in supported providers

### Error 4: Invalid Credentials (Integration Test)

**Setup**:
- Invalid API key in environment: `MINIMAX_API_KEY=invalid-key`
- Test skip condition: `test.skipIf(!process.env.MINIMAX_API_KEY)`

**Action**:
```typescript
const model = await provider.getModel('minimax/abab5.5-chat')
const result = await model.invoke('test message')
```

**Expected Outcome**:
- API call fails with authentication error
- Error propagated from ChatMinimax

**Evidence**:
- Error thrown with authentication failure message
- Error logged via `@repo/logger.error()`

### Error 5: Availability Check Timeout

**Setup**:
- Mock MiniMax endpoint to not respond within timeout

**Action**:
```typescript
const isAvailable = await provider.checkAvailability()
```

**Expected Outcome**:
- Returns `false` after 5000ms timeout
- No uncaught exceptions

**Evidence**:
- Boolean `false` returned
- Timeout logged via `@repo/logger.warn()`

---

## Edge Cases

### Edge 1: Configuration Schema Validation

**Setup**:
- Provide invalid configuration values

**Action**:
```typescript
const invalidConfigs = [
  { apiKey: '', groupId: 'valid-group' }, // Empty API key
  { apiKey: 'valid-key', groupId: '' }, // Empty group ID
  { apiKey: 'valid-key', groupId: 'valid-group', temperature: 2.5 }, // Out of range temperature
  { apiKey: 'valid-key', groupId: 'valid-group', timeoutMs: -1 }, // Negative timeout
]

for (const config of invalidConfigs) {
  try {
    MinimaxConfigSchema.parse(config)
  } catch (error) {
    // Expected validation error
  }
}
```

**Expected Outcome**:
- Zod validation errors for each invalid configuration
- Clear error messages indicating what's invalid

**Evidence**:
- ZodError thrown for each invalid config
- Error messages are actionable

### Edge 2: Multiple Configurations (Different Temperatures)

**Setup**:
- Two different configurations with same API key but different temperatures

**Action**:
```typescript
const provider1 = MinimaxProvider.getInstance('minimax/abab5.5-chat', { temperature: 0 })
const provider2 = MinimaxProvider.getInstance('minimax/abab5.5-chat', { temperature: 0.5 })
```

**Expected Outcome**:
- Two separate cache entries created
- Each configuration gets its own cached instance
- Cache keys are different (based on config hash)

**Evidence**:
- Different cache keys logged
- Different model instances returned (reference inequality)

### Edge 3: Cache Key Consistency

**Setup**:
- Same configuration provided multiple times

**Action**:
```typescript
const config = { apiKey: 'test-key', groupId: 'test-group', temperature: 0 }
const hash1 = generateConfigHash(config)
const hash2 = generateConfigHash(config)
```

**Expected Outcome**:
- Same hash generated for identical configurations
- Hash does NOT include API key value (security)

**Evidence**:
- `hash1 === hash2`
- Hash is SHA-256 hex string
- Config hash excludes sensitive API key

### Edge 4: Cache Clearing for Tests

**Setup**:
- Multiple cached instances exist

**Action**:
```typescript
MinimaxProvider.clearCaches()
const provider = MinimaxProvider.getInstance('minimax/abab5.5-chat')
```

**Expected Outcome**:
- All caches (instance, config, availability) cleared
- Next call creates fresh instances

**Evidence**:
- Cache miss logged after clearCaches()
- New instance created

### Edge 5: Concurrent Requests with Same Config

**Setup**:
- Multiple simultaneous requests for same model

**Action**:
```typescript
const promises = Array(5).fill(null).map(() =>
  provider.getModel('minimax/abab5.5-chat')
)
const models = await Promise.all(promises)
```

**Expected Outcome**:
- All requests return same cached instance
- No race conditions or duplicate initializations

**Evidence**:
- All models are same reference
- Only one cache miss logged

### Edge 6: Availability Cache TTL

**Setup**:
- Availability check completed
- Wait for cache TTL to expire (30 seconds)

**Action**:
```typescript
const available1 = await provider.checkAvailability()
// Wait 31 seconds
await new Promise(resolve => setTimeout(resolve, 31000))
const available2 = await provider.checkAvailability()
```

**Expected Outcome**:
- First call caches result
- Second call after TTL makes new availability check

**Evidence**:
- Two availability check calls logged
- Cache hit for first call, cache miss for second

---

## Required Tooling Evidence

### Backend Testing

**Unit Tests** (No API key required):
- File: `packages/backend/orchestrator/src/providers/__tests__/minimax.test.ts`
- Coverage areas:
  - Configuration schema validation (Zod)
  - Model prefix parsing
  - Cache key generation consistency
  - Factory routing for minimax prefix
  - Configuration loading with/without env vars
  - Static cache clearing

**Assertions**:
```typescript
expect(MinimaxConfigSchema.parse(validConfig)).toBeTruthy()
expect(() => MinimaxConfigSchema.parse(invalidConfig)).toThrow(ZodError)
expect(provider.parseModelName('minimax/abab5.5-chat')).toBe('abab5.5-chat')
expect(getProviderForModel('minimax/abab5.5-chat')).toBeInstanceOf(MinimaxProvider)
```

**Integration Tests** (Requires API key):
- File: `packages/backend/orchestrator/src/providers/__tests__/minimax.integration.test.ts`
- Test skip pattern: `test.skipIf(!process.env.MINIMAX_API_KEY || !process.env.MINIMAX_GROUP_ID)`
- Coverage areas:
  - Model initialization with real API key
  - Availability check against real MiniMax endpoint
  - Cache behavior (hit/miss logging)
  - Error handling for invalid credentials

**Assertions**:
```typescript
expect(model).toBeInstanceOf(ChatMinimax)
expect(await provider.checkAvailability()).toBe(true)
// Verify cache hit/miss in logs via logger spy
```

**CI Considerations**:
- Unit tests run on every PR (no API key needed)
- Integration tests skip in CI unless `MINIMAX_API_KEY` secret configured
- No test failures due to missing API keys (per lesson from MODL-0010)

### Test Isolation

**Setup/Teardown**:
```typescript
beforeEach(() => {
  MinimaxProvider.clearCaches()
})

afterEach(() => {
  jest.clearAllMocks()
})
```

**Logger Spy** (for cache verification):
```typescript
const loggerSpy = jest.spyOn(logger, 'debug')
// ... perform action ...
expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('cache hit'))
```

---

## Risks to Call Out

### Risk 1: MiniMax API Documentation Language Barrier

**Description**: MiniMax API documentation may be primarily in Chinese, making endpoint verification difficult.

**Impact**: May delay implementation if English API docs unavailable.

**Mitigation**:
- Use LangChain JS source code as reference (ChatMinimax implementation)
- Verify endpoint URL from @langchain/community package documentation
- Check MiniMax official English docs (if available)

### Risk 2: ChatMinimax Package Version Compatibility

**Description**: @langchain/community package version may have breaking changes.

**Impact**: Integration tests may fail if ChatMinimax API changed.

**Mitigation**:
- Check current @langchain/core version in package.json
- Verify @langchain/community compatibility matrix
- Run integration tests early to catch incompatibilities

### Risk 3: MiniMax Rate Limiting

**Description**: MiniMax API may have rate limits not documented in English.

**Impact**: Integration tests may fail intermittently if rate limited.

**Mitigation**:
- Document rate limiting behavior in integration test comments
- Add retry logic if needed (defer to future story)
- Use test.skipIf() for flaky rate limit scenarios

### Risk 4: Availability Check Endpoint

**Description**: MiniMax may not have a dedicated health check endpoint.

**Impact**: Availability check may need to use model inference endpoint (slower, uses credits).

**Mitigation**:
- Research MiniMax API for health/ping endpoint
- Fallback to minimal inference call if no health endpoint
- Document API credit usage in comments

### Risk 5: Backward Compatibility Test Coverage

**Description**: Need to verify existing providers (OpenRouter, Ollama, Anthropic) still work after factory changes.

**Impact**: Could break existing provider tests if factory routing logic changes.

**Mitigation**:
- Run full orchestrator test suite (2273+ tests)
- Verify no performance regression in provider creation
- Test all existing provider prefixes still route correctly

---

## Test Execution Order

1. **Unit Tests** (no API key required)
   - Configuration schema validation
   - Model prefix parsing
   - Cache key generation
   - Factory routing
   - Cache clearing

2. **Integration Tests** (API key required, skipped in CI)
   - Real MiniMax API connection
   - Availability check
   - Model initialization
   - Cache behavior verification
   - Invalid credentials handling

3. **Regression Tests** (existing provider suite)
   - All existing OpenRouter tests pass
   - All existing Ollama tests pass
   - All existing Anthropic tests pass
   - Factory routing for existing prefixes unchanged

---

## Success Criteria

- [ ] All unit tests pass (100% coverage of MiniMax adapter code)
- [ ] Integration tests pass with real API credentials (when MINIMAX_API_KEY set)
- [ ] Integration tests skip gracefully when API key not available
- [ ] All existing orchestrator tests continue passing (2273+ tests)
- [ ] No performance regression in provider creation benchmarks
- [ ] Cache behavior verified via logger output
- [ ] Configuration validation catches all invalid inputs
- [ ] Error messages are clear and actionable
