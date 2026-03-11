# Dev Feasibility Review: WINT-0230 - Create Unified Model Interface

**Story**: WINT-0230
**Reviewer**: Dev Feasibility Agent
**Generated**: 2026-02-14
**Epic**: WINT (Workflow Intelligence)

---

## Feasibility Summary

**Feasible for MVP**: ✅ **Yes**
**Confidence**: **High**
**Estimated Effort**: 8-10 story points (~20-27 hours)

### Why Feasible

1. **Dependencies Satisfied**: WINT-0220 (strategy) and MODL-0010 (provider adapters) both completed
2. **Clear Specification**: WINT-0220-STRATEGY.yaml provides machine-readable spec
3. **Proven Patterns**: Reuses existing patterns (factory, Zod validation, YAML loading)
4. **No Breaking Changes**: Extends existing system without modifying provider adapters
5. **Strong Reuse**: 90% of required utilities already exist in MODL-0010

### Key Success Factors

- **Strategy Document as Spec**: WINT-0220 eliminates ambiguity
- **Provider Abstraction Ready**: ILLMProvider interface from MODL-0010 is stable
- **Backward Compatibility**: Legacy model frontmatter mapping is straightforward
- **Fallback Logic**: Reuses `checkAvailability()` from MODL-0010

---

## MVP-Critical Risks

### Risk 1: Escalation Logic Complexity (MEDIUM)

**Description**:
Multiple interacting escalation triggers (quality → cost → failure → human) could create circular dependencies or infinite loops if not carefully designed.

**Impact**: **MEDIUM** - Could block deployment if escalation paths don't terminate
**Likelihood**: **MEDIUM** - Complex state machine with 4 trigger types

**Mitigation**:
1. **Priority Hierarchy**: Enforce strict escalation priority order:
   - Human triggers (highest priority, always terminate)
   - Failure escalation (second, max 3 retries → Tier 0)
   - Quality escalation (third, gate failures → higher tier)
   - Cost de-escalation (lowest, non-critical tasks only)

2. **Termination Guarantees**:
   - Max escalation depth = 3 (prevents infinite loops)
   - All paths terminate at Tier 0 or human review
   - Graph analysis tool to validate strategy YAML (optional WINT-0250 work)

3. **Testing**:
   - Property-based tests for escalation termination
   - Edge case: simulate all 4 triggers simultaneously
   - Validate no circular paths in test suite (see TEST-PLAN.md)

**MVP Blocker?**: **No** - Termination guarantees can be enforced with max depth limit
**Follow-up**: WINT-0250 (escalation triggers) should include graph analysis tool

---

### Risk 2: Provider Availability Race Conditions (LOW-MEDIUM)

**Description**:
Ollama could go down mid-workflow between availability check and actual invocation, causing fallback to fail or return stale "available" status.

**Impact**: **MEDIUM** - Workflow fails if fallback logic not atomic
**Likelihood**: **LOW** - Ollama typically stable, but possible during restarts

**Mitigation**:
1. **Availability Cache TTL**: Reuse MODL-0010's 30s cache for `checkAvailability()`
   - Short TTL reduces staleness risk
   - Cache shared across all router instances (static)

2. **Retry-with-Fallback**:
   - If primary model invocation fails, immediately try fallback
   - Don't rely solely on availability check (defensive coding)
   - Fallback chain: Ollama → Haiku → Sonnet → Opus → Human

3. **Graceful Degradation**:
   - Log all fallback events with `@repo/logger.warn()`
   - Fallback is transparent to caller (no API changes)
   - Telemetry (WINT-0260) can track fallback frequency

**MVP Blocker?**: **No** - Fallback chain handles this gracefully
**Follow-up**: WINT-0260 (telemetry) should track fallback frequency for monitoring

---

### Risk 3: Backward Compatibility Test Matrix (LOW)

**Description**:
143 agents × 3 legacy model formats (haiku/sonnet/opus) = potentially large test matrix to ensure no regressions.

**Impact**: **LOW** - Existing agents continue working, but migration plan needed
**Likelihood**: **LOW** - Legacy mapping is simple (haiku→2, sonnet→1, opus→0)

**Mitigation**:
1. **Representative Sampling**:
   - Test 10-15 agents covering all tiers (not full 143)
   - Include agents from each tier: Tier 0 (opus), Tier 1 (sonnet), Tier 2 (haiku), Tier 3 (ollama)
   - Focus on high-volume agents (pm-*, dev-*, qa-*)

2. **Automated Fixture Generation**:
   - Script to extract agent frontmatter from all 143 agents
   - Generate test fixtures automatically (reduce manual effort)
   - Run regression suite in CI/CD

3. **Fallback Default**:
   - If agent not in strategy → default to Tier 2 (safe, low-cost)
   - Log warning for missing agents (tracked in WINT-0260 telemetry)

**MVP Blocker?**: **No** - Representative testing sufficient for MVP
**Follow-up**: Full migration plan in WINT-0220 strategy document (not implementation scope)

---

## Architecture Recommendations

### Recommendation 1: Factory Pattern for Router Instantiation

**Rationale**:
- Unified interface needs strategy configuration loaded before use
- Factory ensures configuration loaded correctly before router created
- Easier to test with dependency injection

**Implementation**:
```typescript
// ModelRouterFactory.ts
export class ModelRouterFactory {
  static create(configPath?: string): UnifiedModelInterface {
    const config = loadStrategyConfiguration(configPath)
    return new UnifiedModelInterface(config)
  }
}

// Usage
const router = ModelRouterFactory.create()
```

**Benefits**:
- Centralizes configuration loading
- Easier to mock in tests
- Clear separation of concerns

---

### Recommendation 2: Strategy Pattern for Escalation Triggers

**Rationale**:
- Each escalation trigger (quality/cost/failure/human) has distinct logic
- Strategy pattern allows testing triggers in isolation
- Easier to add new triggers in future (WINT-0250)

**Implementation**:
```typescript
// EscalationStrategy.ts
interface EscalationStrategy {
  shouldEscalate(context: EscalationContext): boolean
  getTargetTier(currentTier: number): number
}

class QualityEscalationStrategy implements EscalationStrategy {
  shouldEscalate(context: EscalationContext): boolean {
    return context.qualityScore < 0.85
  }

  getTargetTier(currentTier: number): number {
    return Math.max(currentTier - 1, 0) // escalate to higher tier
  }
}

// Usage in UnifiedModelInterface
const strategies = [
  new HumanTriggerStrategy(),     // priority 1
  new FailureEscalationStrategy(), // priority 2
  new QualityEscalationStrategy(), // priority 3
  new CostDeEscalationStrategy(),  // priority 4
]
```

**Benefits**:
- Testable in isolation (mock context)
- Clear priority order enforcement
- Easy to add new strategies

---

### Recommendation 3: Adapter Pattern for Provider Wrapping

**Rationale**:
- Unified interface wraps ILLMProvider from MODL-0010
- Adapter adds tier-based routing layer without modifying base interfaces
- Preserves backward compatibility

**Implementation**:
```typescript
// TierAwareProviderAdapter.ts
export class TierAwareProviderAdapter {
  constructor(
    private provider: ILLMProvider,
    private tier: number,
    private fallbackChain: string[]
  ) {}

  async getInstance(): Promise<BaseChatModel> {
    try {
      return await this.provider.getInstance()
    } catch (error) {
      return this.executeFallback()
    }
  }

  private async executeFallback(): Promise<BaseChatModel> {
    // Try fallback models in chain
  }
}
```

**Benefits**:
- No modifications to MODL-0010 provider interfaces
- Composition over inheritance
- Fallback logic encapsulated

---

### Recommendation 4: Single Responsibility Separation

**Rationale**:
- Unified interface has 4 distinct concerns (SRP violation if combined)
- Each concern should be separate module for testability

**Separation**:
1. **Strategy Loading**: `StrategyConfigurationLoader.ts`
   - Reads YAML, validates with Zod, caches configuration
   - Handles fallback to embedded defaults

2. **Tier Selection**: `TierSelector.ts`
   - Maps agent name → tier based on strategy
   - Handles legacy model frontmatter mapping
   - Falls back to task type mapping

3. **Escalation Logic**: `EscalationManager.ts`
   - Implements strategy pattern for triggers
   - Enforces priority order and max depth
   - Returns escalated tier

4. **Provider Routing**: `ProviderRouter.ts`
   - Maps tier + model → ILLMProvider instance
   - Executes fallback chains
   - Reuses MODL-0010 provider factory

**Benefits**:
- Each module testable in isolation
- Easier code review (smaller files)
- Clear separation of concerns

---

## Implementation Plan

### Phase 1: Foundation (6-8 hours)

1. **Strategy Configuration Loader** (2-3 hours)
   - Zod schema for WINT-0220-STRATEGY.yaml structure
   - YAML parsing with js-yaml
   - Cache implementation (30s TTL, in-memory)
   - Fallback to embedded defaults

2. **Tier Selector** (2-3 hours)
   - Agent name → tier mapping
   - Legacy model frontmatter mapping (haiku/sonnet/opus)
   - Task type fallback
   - Default tier assignment

3. **Unit Tests for Foundation** (2 hours)
   - Strategy loading tests (5 scenarios)
   - Tier selection tests (8 scenarios)
   - Coverage: 90%+

### Phase 2: Escalation & Routing (8-10 hours)

4. **Escalation Manager** (4-5 hours)
   - Implement 4 escalation strategies (quality, cost, failure, human)
   - Priority order enforcement
   - Max depth termination (3 retries → Tier 0)
   - Graph analysis (optional validation tool)

5. **Provider Router** (2-3 hours)
   - Wrap ILLMProvider instances with tier-aware adapter
   - Implement fallback chain execution
   - Reuse MODL-0010 provider factory
   - Availability checking (30s cache)

6. **Integration Tests** (2 hours)
   - Real strategy YAML loading
   - Provider factory integration
   - E2E model selection flow
   - Coverage: 80%+

### Phase 3: Configuration API & Finalization (6-9 hours)

7. **Configuration API** (2-3 hours)
   - `getStrategyVersion()` - returns version + effective date
   - `getTierForAgent()` - returns recommended tier (0-3)
   - `getModelForTier()` - returns primary model for tier
   - `getEscalationTriggers()` - returns active triggers

8. **Backward Compatibility Layer** (2-3 hours)
   - Legacy model string mapping
   - Agent frontmatter compatibility
   - No breaking changes to existing agents

9. **Final Testing & Documentation** (2-3 hours)
   - Edge case tests (circular escalation, simultaneous failures)
   - Integration tests with WINT-0220 strategy
   - Update docs/WINT-0220-STRATEGY.md with usage examples

---

## Time Estimate

### By Component

| Component | Estimated Hours | Complexity |
|-----------|-----------------|------------|
| Strategy Loader | 2-3 | Low |
| Tier Selector | 2-3 | Low |
| Escalation Manager | 4-5 | High |
| Provider Router | 2-3 | Medium |
| Configuration API | 2-3 | Low |
| Backward Compat | 2-3 | Low |
| Unit Tests | 4-5 | Medium |
| Integration Tests | 2-3 | Medium |
| Documentation | 1-2 | Low |

**Total**: ~20-27 hours
**Story Points**: 8-10 (using Fibonacci scale)

### Confidence Intervals

- **Best Case** (20 hours): No escalation edge cases, simple fallback logic
- **Expected Case** (24 hours): Some escalation complexity, 1-2 unexpected issues
- **Worst Case** (27 hours): Complex escalation debugging, backward compatibility issues

---

## Coordination Points

### WINT-0220 (Model Strategy)

**Status**: UAT (qa_verdict: PASS)
**Coordination**: Use WINT-0220-STRATEGY.yaml as canonical spec

**Action Items**:
- Copy strategy YAML to test fixtures
- Validate strategy structure with Zod schema
- No interpretation needed (strategy is machine-readable)

**Blocker?**: **No** - WINT-0220 complete, strategy document available

---

### MODL-0010 (Provider Adapters)

**Status**: Completed
**Coordination**: Reuse ILLMProvider interface, don't modify base.ts

**Action Items**:
- Import `ILLMProvider`, `BaseProvider`, `ProviderFactory` from MODL-0010
- Reuse `checkEndpointAvailability()` for availability checks
- Leverage static instance caching (no changes needed)

**Blocker?**: **No** - MODL-0010 complete, interfaces stable

---

### WINT-0240 (Ollama Fleet Configuration)

**Status**: Backlog (Wave 6)
**Coordination**: Assume Ollama models in strategy YAML are installed

**Action Items**:
- Unified interface assumes Ollama models exist (validated by WINT-0240)
- If Ollama model missing, fallback to Claude Haiku (graceful degradation)
- WINT-0240 implementer ensures Ollama models from strategy installed

**Blocker?**: **No** - Fallback chain handles missing Ollama models

---

### WINT-0260 (Model Cost Tracking)

**Status**: Backlog (Wave 21)
**Coordination**: Expose telemetry hooks for cost tracking

**Action Items**:
- Log model selection events with `@repo/logger.info()`
- Log fallback events with `@repo/logger.warn()`
- WINT-0260 can ingest logs for cost analysis

**Blocker?**: **No** - Logging hooks sufficient for telemetry

---

## Reuse Candidates

### From MODL-0010 (Provider Adapters)

✅ **Reuse**:
- `ILLMProvider` interface - base contract for providers
- `BaseProvider` abstract class - template method pattern
- `ProviderFactory.createProvider()` - factory method for provider instantiation
- `checkEndpointAvailability()` - shared availability checking (30s cache)
- `parseModelString()` - parse `{provider}/{model}` format
- `generateConfigHash()` - cache key generation for model instances

**No modifications needed** - all MODL-0010 patterns reused as-is

---

### From WINT-0220 (Model Strategy)

✅ **Reuse**:
- `WINT-0220-STRATEGY.yaml` - machine-readable tier definitions
- 4-tier model specifications with fallback chains
- Escalation trigger logic (quality, cost, failure, human)
- Task type → tier mappings

**No interpretation needed** - strategy is authoritative spec

---

### From Existing Codebase

✅ **Reuse**:
- Zod validation pattern (consistent with `@repo/db` generated schemas)
- YAML configuration loading (js-yaml + Zod validation)
- `@repo/logger` for structured logging (no console.log)
- Static instance caching pattern (from BaseProvider)

**No new patterns introduced** - all patterns already established

---

## Non-MVP Concerns

The following concerns are **not MVP-blocking** but should be tracked for future work:

### 1. Cache Eviction Strategy (Future)

**Concern**: Current MVP uses unbounded in-memory cache for strategy configuration and provider instances. MODL-0010 assumes 3-5 providers, but unified interface may scale to 100+ agent invocations.

**Impact**: **Low** - Memory footprint small for MVP (<10MB)
**Future Work**: WINT-0250 or later story
**Recommendation**: Add LRU eviction when cache > 100 entries

---

### 2. Strategy Hot-Reload (Future)

**Concern**: Current MVP uses 30s TTL cache. If strategy YAML changes mid-workflow, changes only reflected after TTL expiration.

**Impact**: **Low** - Strategy changes are rare (versioned configuration)
**Future Work**: WINT-0250 or later story
**Recommendation**: Add file watcher or `forceReload` parameter for development

---

### 3. Model Performance Metrics (Future)

**Concern**: No tracking of model performance (latency, quality, cost) in MVP. Future ML-based optimization requires this data.

**Impact**: **Low** - WINT-0260 (telemetry) will add tracking
**Future Work**: WINT-0260, MODL-0030/0040 (leaderboards)
**Recommendation**: Log model selection events now, analyze later

---

### 4. Escalation Graph Analysis (Future)

**Concern**: No automated validation that escalation paths terminate (prevent circular dependencies). Currently relies on manual review + max depth limit.

**Impact**: **Low** - Max depth limit (3 retries) prevents infinite loops
**Future Work**: WINT-0250 (escalation triggers)
**Recommendation**: Add graph analysis tool to validate strategy YAML

---

### 5. Multi-Tenancy Support (Future)

**Concern**: Current MVP assumes single strategy configuration for entire system. Future multi-tenant use cases may need per-tenant strategies.

**Impact**: **Low** - Not needed for MVP
**Future Work**: Post-MVP (no story defined)
**Recommendation**: Design strategy loader to accept optional tenant ID

---

## Final Recommendation

✅ **Proceed with Implementation**

### Confidence: **High**

**Rationale**:
1. All dependencies satisfied (WINT-0220, MODL-0010 complete)
2. Clear specification with machine-readable strategy
3. Proven patterns reused (90% existing utilities)
4. MVP-critical risks mitigated (escalation termination, fallback chains)
5. Backward compatibility preserved (no breaking changes)
6. Reasonable time estimate (8-10 story points)

### Recommended Approach

1. **Start with Foundation** (Phase 1): Strategy loading + tier selection
2. **Validate Early**: Test with real WINT-0220-STRATEGY.yaml after Phase 1
3. **Iterate on Escalation** (Phase 2): Start simple, add complexity incrementally
4. **Test Thoroughly**: Aim for 90%+ coverage (exceeds 80% requirement)
5. **Document Well**: Add usage examples to WINT-0220-STRATEGY.md

### Success Metrics

- ✅ All 8 acceptance criteria met (see story)
- ✅ 80%+ test coverage (target: 90%+)
- ✅ No breaking changes to existing agents
- ✅ Real strategy YAML loading works
- ✅ Fallback chains tested and working
- ✅ Escalation paths terminate (no infinite loops)
