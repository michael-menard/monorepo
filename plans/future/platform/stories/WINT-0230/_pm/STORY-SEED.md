---
generated: "2026-02-14"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-0230

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No lessons or ADRs loaded (knowledge base not queried for this seed)

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| Model Assignments System | `packages/backend/orchestrator/src/config/model-assignments.ts` | Active | Foundation for model routing - must be extended with tier-based selection |
| Provider Adapters (MODL-0010) | `packages/backend/orchestrator/src/providers/` | Completed | Provides base interfaces (ILLMProvider, BaseProvider) that unified interface will wrap |
| Model Strategy (WINT-0220) | `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.md` | UAT (PASS) | Defines 4-tier strategy that this story implements |
| Provider Factory Pattern | `packages/backend/orchestrator/src/providers/base.ts` | Active | Template method pattern with caching - unified interface should leverage this |

### Active In-Progress Work

| Story | Status | Potential Overlap | Coordination Needed |
|-------|--------|-------------------|---------------------|
| MODL-0010 | Completed | Provider adapter interfaces finalized | None - dependency satisfied |
| WINT-0220 | UAT (qa_verdict: PASS) | Strategy document complete, provides implementation requirements | Use strategy YAML as spec |

### Constraints to Respect

1. **Backward Compatibility (WINT-0220)**: Existing agents with `model:` frontmatter must continue working
2. **No Breaking Changes (WINT-0220)**: Provider adapter interfaces in MODL-0010 must not be modified
3. **Zod-First Types (CLAUDE.md)**: All configuration schemas must be Zod schemas with inferred types
4. **Protected Features (Baseline)**: Cannot modify provider adapter base interfaces or existing model-assignments.ts schema without extension
5. **Strategy Compliance**: Must implement exactly the 4-tier system (0-3) defined in WINT-0220-STRATEGY.yaml

---

## Retrieved Context

### Related Endpoints

No API endpoints - this is a backend orchestrator-only feature.

### Related Components

| Component | Path | Purpose | How to Extend |
|-----------|------|---------|---------------|
| `model-assignments.ts` | `packages/backend/orchestrator/src/config/model-assignments.ts` | TypeScript loader for agent→model mappings | Extend with tier-based selection logic |
| `BaseProvider` | `packages/backend/orchestrator/src/providers/base.ts` | Abstract base class for provider implementations | Wrap with unified interface for tier-based routing |
| `ILLMProvider` | `packages/backend/orchestrator/src/providers/base.ts` | Provider interface contract | Unified interface should accept ILLMProvider instances |
| Provider implementations | `packages/backend/orchestrator/src/providers/{ollama,anthropic,openrouter}.ts` | Concrete provider adapters | Used by unified interface for model selection |

### Reuse Candidates

**From WINT-0220 Strategy**:
- `WINT-0220-STRATEGY.yaml`: Machine-readable tier definitions, escalation triggers, task type mappings
- 4-tier model specifications with fallback chains
- Escalation trigger logic (quality, cost, failure, human)

**From MODL-0010 Provider System**:
- `parseModelString()`: Parse provider-prefixed model names
- `generateConfigHash()`: Generate cache keys for model instances
- `checkEndpointAvailability()`: Shared availability checking logic
- Provider factory pattern with static instance caching

**From Existing Codebase**:
- Zod validation pattern (consistent with `@repo/db` generated schemas)
- YAML configuration loading (js-yaml + Zod validation)
- `@repo/logger` for structured logging

---

## Knowledge Context

### Lessons Learned

*No lessons loaded - knowledge base query was not performed for this seed generation.*

### Blockers to Avoid (from past stories)

*No historical blockers available without KB query.*

### Architecture Decisions (ADRs)

*No ADRs loaded - ADR-LOG.md was not consulted for this seed.*

### Patterns to Follow

**From Codebase Analysis**:
1. **Zod-First Types**: All schemas defined with Zod, types inferred via `z.infer<>`
2. **Provider Abstraction**: Use factory pattern with interface contracts (ILLMProvider)
3. **Static Caching**: Instance caches are static class properties (inherit from MODL-0010)
4. **Configuration as Code**: YAML configs with Zod validation (model-assignments.yaml, WINT-0220-STRATEGY.yaml)
5. **Graceful Degradation**: Fallback chains when primary model unavailable

**From WINT-0220 Strategy**:
1. **Tier-Based Selection**: 4 tiers (0=Critical, 1=Complex, 2=Routine, 3=Simple)
2. **Escalation Logic**: Quality → cost → failure → human triggers
3. **Agent-First Routing**: Use agent name as primary key (more granular than task type)
4. **Free-First Optimization**: Default to Ollama (Tier 2/3) when quality sufficient

### Patterns to Avoid

**From MODL-0010 Review**:
1. **Code Duplication**: Original provider implementations had 24 lines of duplicated caching logic → solved by BaseProvider in MODL-0011
2. **Unbounded Caches**: MVP assumption is acceptable for 3-5 providers, but unified interface may scale to 100+ agent invocations → consider LRU eviction

**General Anti-Patterns**:
1. Don't create barrel files (CLAUDE.md)
2. Don't use TypeScript interfaces without Zod schemas (CLAUDE.md)
3. Don't hardcode model names - load from strategy configuration

---

## Conflict Analysis

**No conflicts detected.**

All dependencies are satisfied:
- WINT-0220 (strategy definition) is in UAT with qa_verdict: PASS
- MODL-0010 (provider adapters) is completed
- No overlapping work with other in-progress stories

---

## Story Seed

### Title

Create Unified Model Interface

### Description

**Context**

The WINT-0220 strategy defines a 4-tier model selection system (Tier 0: Critical/Opus, Tier 1: Complex/Sonnet, Tier 2: Routine/Ollama, Tier 3: Simple/Ollama) to optimize costs while preserving quality. The strategy is documented and validated, but there is currently no implementation of the tier-based routing logic.

The existing system has:
- **Agent-level assignments** via `model-assignments.ts` (loads agent→model mappings from YAML)
- **Provider adapters** via MODL-0010 (ILLMProvider interface with Ollama/Anthropic/OpenRouter implementations)
- **Static model selection** (agents specify model in frontmatter, no dynamic tier selection)

**Problem**

Without a unified model interface that implements the WINT-0220 strategy:
- Agents are statically assigned to models (no tier-based routing)
- No escalation logic for quality/cost/failure scenarios
- Strategy configuration exists but isn't operationalized
- No automatic fallback when Ollama unavailable
- Cost optimization targets (60% reduction) cannot be achieved

**Proposed Solution**

Create a unified model interface (`ModelRouter` or `UnifiedModelInterface`) that:

1. **Loads strategy configuration** from `WINT-0220-STRATEGY.yaml`
2. **Routes agent invocations** to appropriate model tier based on agent name + task characteristics
3. **Implements escalation logic** for quality thresholds, cost budgets, failure retries, and human-in-loop triggers
4. **Provides fallback chains** when primary model unavailable (Ollama down → Claude Haiku)
5. **Maintains backward compatibility** with existing `model:` frontmatter assignments
6. **Exposes clean API** for orchestrator to request models without knowing tier logic

**Expected Outcome**

Orchestrator agents can request models via unified interface without managing provider selection, tier logic, or fallback chains. The interface automatically routes to optimal model tier based on strategy configuration, enabling 60% cost reduction target.

### Initial Acceptance Criteria

- [ ] **AC-1: Strategy Configuration Loader**
  - Zod schema validates `WINT-0220-STRATEGY.yaml` structure
  - Loader parses tier definitions (4 tiers), task type mappings, escalation triggers
  - Configuration cached after first load (30s TTL or invalidate on file change)
  - Falls back to embedded defaults if YAML missing

- [ ] **AC-2: Tier-Based Model Selection**
  - `selectModelForAgent(agentName, context?)` method returns model tier + provider
  - Agent name lookup checks strategy mappings first, falls back to `model-assignments.yaml`
  - Optional context parameter allows override (e.g., `{ complexity: 'high' }` escalates tier)
  - Returns model string in provider-prefixed format (e.g., `anthropic/claude-sonnet-4.5`)

- [ ] **AC-3: Escalation Logic Implementation**
  - Quality escalation: Retry with next higher tier on gate failure (max 3 retries → Tier 0 or human)
  - Cost de-escalation: Downgrade non-critical tasks when budget threshold exceeded (80% warning, 95% critical)
  - Failure escalation: Escalate to Tier 0 or human after 3 failures at current tier
  - Human-in-loop: Pause workflow on low confidence (<50%), scope violations, security concerns

- [ ] **AC-4: Fallback Chain Handling**
  - Ollama unavailable → fallback Tier 2/3 tasks to Claude Haiku
  - Specific Ollama model missing → use alternate model in same tier
  - Provider timeout → retry with different model in same tier (max 2x latency tolerance)
  - All fallback events logged with `@repo/logger`

- [ ] **AC-5: Backward Compatibility Layer**
  - Agents with `model:` frontmatter (haiku/sonnet/opus) continue working
  - Legacy model strings mapped to tiers: opus→0, sonnet→1, haiku→2
  - Agents without tier assignment use task type mapping from strategy
  - No breaking changes to existing agent invocation patterns

- [ ] **AC-6: Provider Integration**
  - Unified interface wraps ILLMProvider instances from MODL-0010
  - Uses provider factory to instantiate Ollama/Anthropic/OpenRouter adapters
  - Leverages existing provider availability checks (`checkAvailability()`)
  - Reuses provider instance caching (no duplicate model instances)

- [ ] **AC-7: Configuration API**
  - `getStrategyVersion()`: Returns strategy version + effective date
  - `getTierForAgent(agentName)`: Returns recommended tier (0-3) for agent
  - `getModelForTier(tier, provider?)`: Returns primary model for tier (optional provider filter)
  - `getEscalationTriggers()`: Returns active escalation trigger configuration

- [ ] **AC-8: Unit Tests**
  - Test tier selection logic with strategy fixtures
  - Test escalation triggers (quality/cost/failure/human)
  - Test fallback chains (Ollama down, model missing, timeout)
  - Test backward compatibility with legacy model assignments
  - Minimum 80% coverage on unified interface code

### Non-Goals

This story focuses on **interface implementation**, not orchestrator integration or ML-based optimization:

- ❌ **Integrating into Orchestrator Workflows**: Workflow integration is follow-up work (not specified in index)
- ❌ **Model Cost Tracking**: Telemetry is WINT-0260 scope (depends on this story)
- ❌ **Quality Leaderboards**: Model performance evaluation is MODL-0030/0040 scope
- ❌ **Ollama Fleet Configuration**: Ollama model setup is WINT-0240 scope
- ❌ **Auto-Escalation Based on Complexity**: Complexity scoring is future ML work (requires WINT-5xxx ML pipeline)
- ❌ **Migrating Agent Assignments**: Strategy defines plan, migration is follow-up work
- ❌ **UI for Strategy Management**: Strategy editing is manual YAML updates (no UI in scope)

### Reuse Plan

**Components to Extend**:
- `model-assignments.ts`: Extend loader to check strategy config first, fallback to YAML
- `BaseProvider`: Wrap provider instances with tier-based routing layer
- `WINT-0220-STRATEGY.yaml`: Primary spec for tier definitions and escalation rules

**Patterns to Reuse**:
- YAML + Zod validation (from `model-assignments.ts`, `@repo/db` schemas)
- Provider factory pattern (from MODL-0010 `providers/index.ts`)
- Static instance caching (from BaseProvider)
- Availability checking (from `checkEndpointAvailability()`)

**Packages to Use**:
- `zod`: Schema validation for strategy configuration
- `js-yaml` (yaml): Parse strategy YAML file
- `@repo/logger`: Structured logging for routing decisions and fallbacks
- `@langchain/core`: BaseChatModel interface for type safety

**No new dependencies required** - all packages already in use.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Key Test Scenarios**:
1. **Strategy Loading**: Verify YAML parsing, Zod validation, cache invalidation
2. **Tier Selection**: Test agent→tier mapping with strategy fixtures (143 agents × 4 tiers)
3. **Escalation Triggers**: Simulate gate failures, confidence thresholds, budget limits, retries
4. **Fallback Chains**: Test Ollama unavailable, specific model missing, provider timeout
5. **Backward Compatibility**: Verify legacy `model:` frontmatter still works (haiku/sonnet/opus)
6. **Provider Integration**: Mock ILLMProvider instances, verify factory usage
7. **Edge Cases**: Empty strategy file, invalid tier numbers, circular escalation, simultaneous failures

**Coverage Requirements**:
- Minimum 80% overall coverage (CLAUDE.md standard is 45%, but this is critical infrastructure)
- 100% coverage on escalation logic (high-stakes decision paths)
- Integration tests with real strategy YAML (not just mocks)

**Testing Constraints**:
- Use Vitest + React Testing Library patterns (project standard)
- Mock `@repo/logger` to avoid console spam
- Use strategy fixtures from WINT-0220 (WINT-0220-STRATEGY.yaml)
- Test with MSW for provider mocking (not Playwright E2E)

### For UI/UX Advisor

**Not applicable** - This is a backend-only orchestrator feature with no UI surface.

### For Dev Feasibility

**Implementation Risks**:
1. **Escalation Logic Complexity**: Multiple interacting triggers (quality/cost/failure/human) could create circular dependencies or deadlocks
   - **Mitigation**: Graph analysis on escalation paths (ensure all paths terminate at Tier 0 or human review)
   - **Recommendation**: Implement escalation as finite state machine with clear termination conditions

2. **Cache Invalidation Strategy**: Strategy YAML can change during development, need cache refresh logic
   - **Mitigation**: Add file watcher or 30s TTL on strategy cache (similar to Ollama availability cache)
   - **Recommendation**: Support `forceReload` parameter for testing

3. **Provider Availability Race Conditions**: Ollama could go down mid-workflow, fallback must be atomic
   - **Mitigation**: Check availability before each invocation, not just at workflow start
   - **Recommendation**: Reuse `checkAvailability()` with 30s cache from MODL-0010

4. **Backward Compatibility Testing**: 143 agents × multiple model formats = large test matrix
   - **Mitigation**: Focus on representative sample (10-15 agents covering all tiers)
   - **Recommendation**: Automated script to extract agent frontmatter and generate test fixtures

**Architecture Recommendations**:
- **Factory Pattern**: Create `ModelRouterFactory` to instantiate router with strategy config
- **Strategy Pattern**: Implement escalation triggers as pluggable strategy objects (easier to test in isolation)
- **Adapter Pattern**: Wrap ILLMProvider with tier-aware routing adapter
- **Single Responsibility**: Separate concerns: strategy loading, tier selection, escalation logic, provider routing

**Time Estimate**:
- **Core Interface**: 4-6 hours (tier selection + provider routing)
- **Escalation Logic**: 6-8 hours (quality/cost/failure/human triggers + graph analysis)
- **Backward Compatibility**: 2-3 hours (legacy model mapping)
- **Tests**: 8-10 hours (unit tests + integration tests with strategy fixtures)
- **Total**: ~20-27 hours (≈ 8-10 story points)

**Coordination Points**:
- **WINT-0220**: Use WINT-0220-STRATEGY.yaml as canonical spec (no interpretation needed)
- **MODL-0010**: Reuse ILLMProvider interface, don't modify base.ts
- **WINT-0240**: Assume Ollama models in strategy YAML are installed (validated by WINT-0240 implementer)
- **WINT-0260**: Expose telemetry hooks for cost tracking (model selection events, fallback events)

---

**Story Status**: Seed complete (ready for elaboration phase)
**Priority**: P2 (blocks WINT-0260 Model Cost Tracking in Wave 21)
**Next Steps**: Assign to elaboration phase for PM/UX/QA gap analysis
