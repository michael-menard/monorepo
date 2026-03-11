# Test Plan: WINT-0230 - Create Unified Model Interface

**Story**: WINT-0230
**Generated**: 2026-02-14
**Epic**: WINT (Workflow Intelligence)

---

## Scope Summary

### Endpoints Touched
- **None** - This is a backend orchestrator-only feature with no HTTP API surface

### UI Touched
- **No** - Backend infrastructure only

### Data/Storage Touched
- **Yes** - Reads from YAML configuration files (WINT-0220-STRATEGY.yaml)
- **Yes** - In-memory caching of strategy configuration and provider instances

### Packages Modified
- `packages/backend/orchestrator/src/config/` - Strategy configuration loader
- `packages/backend/orchestrator/src/providers/` - Unified model interface and routing logic

---

## Happy Path Tests

### Test 1: Strategy Configuration Loading

**Setup**:
- Valid `WINT-0220-STRATEGY.yaml` file with 4 tiers defined
- Clean cache state (no previous strategy loaded)

**Action**:
```typescript
const router = new UnifiedModelInterface()
const strategy = router.loadStrategyConfiguration()
```

**Expected Outcome**:
- Configuration parsed successfully with all 4 tiers (0-3)
- Escalation triggers loaded (quality, cost, failure, human)
- Task type mappings populated
- Configuration cached in memory

**Evidence**:
- Log entry: `@repo/logger.info("Strategy configuration loaded", { version, tiers })`
- Return value matches Zod schema validation
- Cache hit on second load (no file I/O)

---

### Test 2: Tier-Based Model Selection (Agent Name Lookup)

**Setup**:
- Strategy configuration loaded
- Test agent `pm-story-generation-leader` mapped to Tier 1 (Complex/Sonnet)

**Action**:
```typescript
const model = router.selectModelForAgent('pm-story-generation-leader')
```

**Expected Outcome**:
- Returns `anthropic/claude-sonnet-4.5`
- Logs model selection decision
- No provider instantiation (lazy loading)

**Evidence**:
- Log entry: `@repo/logger.debug("Model selected", { agent, tier: 1, model })`
- Return value format: `{provider}/{model-name}`

---

### Test 3: Legacy Model Frontmatter Compatibility

**Setup**:
- Agent with `model: haiku` in frontmatter
- Strategy configuration loaded

**Action**:
```typescript
const model = router.selectModelForAgent('legacy-agent', { legacyModel: 'haiku' })
```

**Expected Outcome**:
- Maps `haiku` → Tier 2 (Routine)
- Returns `anthropic/claude-haiku-3.5`
- Backward compatibility preserved

**Evidence**:
- Log entry: `@repo/logger.debug("Legacy model mapped", { legacyModel: 'haiku', tier: 2 })`
- No breaking changes to existing agent invocations

---

### Test 4: Provider Integration (ILLMProvider Wrapping)

**Setup**:
- MODL-0010 provider adapters available (Ollama, Anthropic, OpenRouter)
- Strategy configuration loaded

**Action**:
```typescript
const provider = router.getProviderForModel('anthropic/claude-sonnet-4.5')
const instance = await provider.getInstance()
```

**Expected Outcome**:
- Returns Anthropic provider adapter instance
- Reuses cached provider instance (no duplicate instantiation)
- Provider availability check passed

**Evidence**:
- `provider instanceof AnthropicProvider === true`
- Cache hit on second `getProviderForModel()` call
- Log entry: `@repo/logger.debug("Provider instance retrieved", { provider, cached: true })`

---

### Test 5: Fallback Chain (Ollama Unavailable)

**Setup**:
- Ollama provider unavailable (service down)
- Agent assigned to Tier 2 (Ollama primary)
- Fallback strategy: Tier 2 → Claude Haiku

**Action**:
```typescript
const model = router.selectModelForAgent('dev-unit-test-writer')
```

**Expected Outcome**:
- Primary model: `ollama/llama3.3:70b` (unavailable)
- Fallback executed automatically
- Returns `anthropic/claude-haiku-3.5`
- Fallback event logged

**Evidence**:
- Log entry: `@repo/logger.warn("Fallback triggered", { reason: 'provider_unavailable', primary, fallback })`
- Return value: `anthropic/claude-haiku-3.5`

---

### Test 6: Configuration API (getTierForAgent)

**Setup**:
- Strategy configuration loaded
- Test agent mapped in strategy

**Action**:
```typescript
const tier = router.getTierForAgent('pm-story-generation-leader')
```

**Expected Outcome**:
- Returns `1` (Tier 1 = Complex/Sonnet)
- No side effects (read-only query)

**Evidence**:
- Return value: `1`
- No cache invalidation or state mutation

---

## Error Cases

### Error 1: Strategy Configuration Missing

**Setup**:
- `WINT-0220-STRATEGY.yaml` file does not exist

**Action**:
```typescript
const router = new UnifiedModelInterface()
const strategy = router.loadStrategyConfiguration()
```

**Expected Outcome**:
- Falls back to embedded defaults (hardcoded 4-tier strategy)
- Log warning: `@repo/logger.warn("Strategy YAML missing, using defaults")`
- No exception thrown

**Evidence**:
- Default configuration loaded successfully
- Application continues running with fallback strategy

---

### Error 2: Invalid Tier Number in Strategy

**Setup**:
- Strategy YAML contains invalid tier (tier: 5, only 0-3 valid)

**Action**:
```typescript
const router = new UnifiedModelInterface()
const strategy = router.loadStrategyConfiguration()
```

**Expected Outcome**:
- Zod validation fails
- Throws `ZodError` with clear message
- Application initialization fails fast (prevents runtime errors)

**Evidence**:
- Exception thrown: `ZodError: Invalid tier number, expected 0-3, got 5`
- Error logged with `@repo/logger.error()`

---

### Error 3: Provider Timeout (Model Unavailable)

**Setup**:
- Provider endpoint responds slowly (exceeds 2x latency tolerance)
- No fallback model available in same tier

**Action**:
```typescript
const model = router.selectModelForAgent('test-agent')
const provider = router.getProviderForModel(model)
const instance = await provider.getInstance({ timeout: 5000 })
```

**Expected Outcome**:
- Timeout exception after 5 seconds
- Error logged with provider details
- Escalates to next tier's primary model (if available)

**Evidence**:
- Log entry: `@repo/logger.error("Provider timeout", { provider, timeout: 5000 })`
- Escalation to higher tier attempted

---

### Error 4: All Fallbacks Exhausted

**Setup**:
- Primary model unavailable (Ollama down)
- Tier 2 fallback unavailable (Claude Haiku rate limited)
- Tier 1 fallback unavailable (Claude Sonnet quota exceeded)

**Action**:
```typescript
const model = router.selectModelForAgent('dev-unit-test-writer')
```

**Expected Outcome**:
- Escalates to Tier 0 (Critical/Opus) as last resort
- If Tier 0 also fails, throws exception
- Human-in-loop trigger activated

**Evidence**:
- Log entries for each fallback attempt
- Final log: `@repo/logger.error("All fallbacks exhausted, human intervention required")`
- Exception: `ModelUnavailableError`

---

## Edge Cases

### Edge 1: Circular Escalation (Quality → Cost → Failure → Quality)

**Setup**:
- Quality escalation: Tier 2 → Tier 1
- Cost de-escalation: Tier 1 → Tier 2 (budget exceeded)
- Failure escalation: Tier 2 → Tier 1 (retry)
- Potential circular dependency

**Action**:
```typescript
const model = router.selectModelForAgent('test-agent', {
  qualityThreshold: 0.85, // triggers escalation to Tier 1
  budgetExceeded: true,   // triggers de-escalation to Tier 2
  retryCount: 3,          // triggers failure escalation to Tier 1
})
```

**Expected Outcome**:
- Escalation priority order enforced:
  1. Human triggers (highest priority)
  2. Failure escalation (second)
  3. Quality escalation (third)
  4. Cost de-escalation (lowest)
- Max escalation depth = 3 retries, then Tier 0 or human
- No infinite loops

**Evidence**:
- Escalation terminates at Tier 0 or human review
- Log entry: `@repo/logger.warn("Max escalation depth reached")`
- No stack overflow or infinite recursion

---

### Edge 2: Concurrent Strategy Updates (Cache Invalidation)

**Setup**:
- Strategy configuration loaded and cached
- `WINT-0220-STRATEGY.yaml` file modified during runtime
- Cache TTL = 30 seconds

**Action**:
```typescript
// T=0s: Load strategy
const router = new UnifiedModelInterface()
const model1 = router.selectModelForAgent('test-agent')

// T=35s: Modify YAML file, cache expired
// Simulate file modification
fs.writeFileSync('WINT-0220-STRATEGY.yaml', updatedContent)

const model2 = router.selectModelForAgent('test-agent')
```

**Expected Outcome**:
- T=0s: Cache miss, load from file
- T=35s: Cache expired, reload from file
- Updated strategy applied after TTL expiration
- No stale cache served

**Evidence**:
- Log entry: `@repo/logger.debug("Cache expired, reloading strategy")`
- `model1 !== model2` (if strategy changed tier assignment)

---

### Edge 3: Agent Not in Strategy (Default Tier Assignment)

**Setup**:
- New agent created but not yet added to strategy YAML
- Strategy loaded successfully

**Action**:
```typescript
const model = router.selectModelForAgent('new-unlisted-agent')
```

**Expected Outcome**:
- Falls back to task type mapping (if available)
- If task type unknown, defaults to Tier 2 (Routine/Safe)
- Logs warning about missing agent assignment

**Evidence**:
- Log entry: `@repo/logger.warn("Agent not in strategy, using default tier", { agent, tier: 2 })`
- Returns Tier 2 model (Ollama or Haiku fallback)

---

### Edge 4: Empty Strategy File

**Setup**:
- `WINT-0220-STRATEGY.yaml` exists but is empty (0 bytes)

**Action**:
```typescript
const router = new UnifiedModelInterface()
const strategy = router.loadStrategyConfiguration()
```

**Expected Outcome**:
- YAML parsing fails (empty document)
- Falls back to embedded defaults
- Application continues with fallback strategy

**Evidence**:
- Log entry: `@repo/logger.error("Strategy YAML empty, using defaults")`
- Default 4-tier configuration loaded

---

### Edge 5: Simultaneous Provider Failures

**Setup**:
- Ollama provider down (service unavailable)
- Anthropic provider rate limited (429 error)
- OpenRouter provider quota exceeded

**Action**:
```typescript
const model = router.selectModelForAgent('test-agent')
```

**Expected Outcome**:
- Attempts primary model (Ollama) → fails
- Attempts Tier 2 fallback (Haiku) → fails
- Attempts Tier 1 fallback (Sonnet) → fails
- Escalates to Tier 0 (Opus) → if also fails, human trigger
- Each failure logged with reason

**Evidence**:
- Log entries for each provider failure:
  - `ollama: connection_refused`
  - `anthropic: rate_limit_exceeded`
  - `openrouter: quota_exceeded`
- Final escalation to human review or exception

---

## Integration Tests

### Integration 1: Real Strategy YAML Loading

**Setup**:
- Use actual `WINT-0220-STRATEGY.yaml` from UAT/WINT-0220/
- Not a fixture, but the real strategy document

**Action**:
```typescript
const router = new UnifiedModelInterface()
const tier = router.getTierForAgent('pm-story-generation-leader')
```

**Expected Outcome**:
- Loads real strategy successfully
- Agent tier matches WINT-0220 strategy document
- No validation errors

**Evidence**:
- Strategy version matches WINT-0220 document
- Agent tier assignment correct per strategy

---

### Integration 2: Provider Factory Usage (MODL-0010)

**Setup**:
- MODL-0010 provider adapters installed
- Provider factory available

**Action**:
```typescript
const router = new UnifiedModelInterface()
const provider = router.getProviderForModel('ollama/llama3.3:70b')
const instance = await provider.getInstance()
```

**Expected Outcome**:
- Uses MODL-0010 `ProviderFactory.createProvider()`
- Returns `OllamaProvider` instance
- Instance cached statically (BaseProvider pattern)

**Evidence**:
- `provider instanceof OllamaProvider === true`
- Provider factory invoked (verify via mock spy)
- Cache reuse confirmed on second call

---

## Coverage Requirements

### Overall Coverage
- **Minimum**: 80% statement coverage (exceeds CLAUDE.md 45% standard)
- **Target**: 90%+ for critical infrastructure

### Critical Path Coverage (100% Required)
1. **Escalation Logic**: All escalation triggers (quality, cost, failure, human)
2. **Fallback Chains**: Primary → fallback → escalation paths
3. **Strategy Loading**: YAML parsing, Zod validation, cache invalidation

### Test Distribution
- **Unit Tests**: 70% of test suite
  - Strategy loading (5 tests)
  - Tier selection (8 tests)
  - Escalation logic (10 tests)
  - Fallback chains (6 tests)
  - Configuration API (4 tests)
- **Integration Tests**: 30% of test suite
  - Real strategy YAML loading (2 tests)
  - Provider factory integration (2 tests)
  - E2E model selection flow (3 tests)

---

## Testing Constraints

### Framework
- **Vitest** for unit and integration tests (project standard)
- **React Testing Library** patterns (not applicable here, but consistent approach)
- **MSW (Mock Service Worker)** for provider endpoint mocking

### Mocking Strategy
- Mock `@repo/logger` to avoid console spam during tests
- Mock file system I/O for strategy YAML loading (use fixtures)
- Mock `checkEndpointAvailability()` from MODL-0010 (control availability)
- Mock provider instances (use jest.mock or vitest.mock)

### Test Fixtures
- Use strategy fixtures from WINT-0220 (copy to test fixtures directory)
- Create minimal valid strategy fixture (4 tiers, 1 agent)
- Create invalid strategy fixtures (missing tiers, invalid tier numbers, malformed YAML)

### Test Isolation
- Each test starts with clean cache state
- No shared mutable state between tests
- Use `beforeEach` to reset singletons/caches

---

## Test Execution

### Local Testing
```bash
# Run all tests
pnpm test packages/backend/orchestrator

# Run with coverage
pnpm test:coverage packages/backend/orchestrator

# Watch mode for TDD
pnpm test:watch packages/backend/orchestrator
```

### CI/CD Gate
- All tests must pass before merge
- Coverage threshold enforced: 80% minimum
- No new console.log statements (use @repo/logger)

---

## Notes

- **Strategy fixtures**: Copy `WINT-0220-STRATEGY.yaml` to `__fixtures__/` for tests
- **Provider mocking**: Use MODL-0010 test utilities if available
- **Escalation graph**: Consider property-based testing for escalation termination proofs
- **Performance**: Strategy loading should be <10ms (cached), <100ms (uncached)
