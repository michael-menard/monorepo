---
generated: "2026-02-15"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: MODL-0020

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: None - comprehensive baseline available

### Relevant Existing Features

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| Provider Adapters (MODL-0010) | `packages/backend/orchestrator/src/providers/` | **Completed** | OpenRouter, Ollama, Anthropic adapters with `ILLMProvider` interface |
| Unified Model Interface (WINT-0230) | `packages/backend/orchestrator/src/models/unified-interface.ts` | **UAT** | `ModelRouter` class implementing tier-based selection |
| Strategy Loader (WINT-0230) | `packages/backend/orchestrator/src/models/strategy-loader.ts` | **UAT** | Loads/validates WINT-0220-STRATEGY.yaml with Zod |
| Model Strategy Config | `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.yaml` | **Active** | 4-tier strategy (Tier 0: Opus, Tier 1: Sonnet, Tier 2/3: Ollama) |
| Model Assignments | `packages/backend/orchestrator/src/config/model-assignments.ts` | **Active** | Legacy agent→model mapping with tier support |

### Active In-Progress Work

| Story | Status | Overlap Risk | Notes |
|-------|--------|--------------|-------|
| WINT-0230 | UAT | None | Unified interface complete - MODL-0020 builds on this foundation |
| WINT-0110 | In-Progress | None | Session management - orthogonal concern |
| INFR-0050 | In-Progress | None | Event SDK - orthogonal concern |

**No blocking conflicts** - MODL-0020 depends on completed work (MODL-0010, WINT-0230).

### Constraints to Respect

| Constraint | Source | Impact |
|------------|--------|--------|
| Zod-first types (REQUIRED) | CLAUDE.md | All configuration schemas must use Zod, no TypeScript interfaces |
| Use @repo/logger | CLAUDE.md | All logging via `@repo/logger`, never `console.log` |
| Provider abstraction | MODL-0010 | Use `ILLMProvider` interface, don't bypass adapters |
| Strategy-based routing | WINT-0230 | Leverage existing `ModelRouter`, don't duplicate logic |
| No barrel files | CLAUDE.md | Import directly from source files |
| Component directory structure | CLAUDE.md | Use `__tests__/`, `__types__/`, `utils/` subdirectories |

---

## Retrieved Context

### Related Endpoints
**Not applicable** - This is backend infrastructure only, no API endpoints exposed.

### Related Components

**Existing Model Selection Infrastructure**:

1. **`packages/backend/orchestrator/src/providers/base.ts`**
   - `ILLMProvider` interface with `getModel()`, `checkAvailability()`, `loadConfig()`
   - `BaseProviderConfigSchema` Zod schema
   - Provider factory pattern established

2. **`packages/backend/orchestrator/src/providers/`** (MODL-0010 deliverables)
   - `ollama.ts` - Ollama adapter with local server support
   - `openrouter.ts` - OpenRouter adapter (200+ models)
   - `anthropic.ts` - Anthropic direct API adapter
   - `index.ts` - Factory routing by model prefix

3. **`packages/backend/orchestrator/src/models/unified-interface.ts`** (WINT-0230 deliverable)
   - `ModelRouter` class implementing tier-based selection
   - `selectModelForAgent(agentName, context?)` - Tier selection by agent
   - `getModelForTier(tier)` - Get model configuration for tier
   - `escalate(context)` - Escalation logic for quality/cost/failure triggers

4. **`packages/backend/orchestrator/src/models/strategy-loader.ts`** (WINT-0230 deliverable)
   - `loadStrategy()` - Loads WINT-0220-STRATEGY.yaml with caching
   - `StrategySchema` - Zod validation for tier definitions, task types, escalation triggers
   - `analyzeEscalationPaths()` - Graph analysis to detect circular escalation

5. **`packages/backend/orchestrator/src/config/model-assignments.ts`**
   - `getModelForAgent()` - Legacy agent→model mapping
   - `LEGACY_MODEL_TO_TIER` - Maps opus/sonnet/haiku to tiers 0/1/2
   - `getTierForAgent()` - Tier lookup for backward compatibility

6. **`packages/backend/orchestrator/docs/WINT-0220-STRATEGY.yaml`**
   - 4-tier strategy definition (Tier 0: Opus, Tier 1: Sonnet, Tier 2/3: Ollama)
   - Task type taxonomy mapping agent types to tiers
   - Escalation triggers for quality, cost, failure, human-in-loop

### Reuse Candidates

**Existing Patterns to Reuse**:

1. **Provider Factory Pattern** (from MODL-0010 `providers/index.ts`)
   - `getProviderForModel(modelName)` - Already routes by prefix
   - Cache provider instances to avoid re-initialization
   - Reuse for task-based model selection

2. **Tier Selection** (from WINT-0230 `models/unified-interface.ts`)
   - `ModelRouter.selectModelForAgent()` - Already selects tier by agent name
   - `ModelRouter.getModelForTier()` - Already maps tier to model
   - Extend with task contract-based selection

3. **Strategy Configuration** (from WINT-0230 `models/strategy-loader.ts`)
   - YAML loading with Zod validation
   - Caching with TTL or file change detection
   - Fallback to embedded defaults
   - Reuse for task contract definitions

4. **Availability Checking** (from MODL-0010 providers)
   - `checkAvailability(timeout)` pattern with cache
   - 5s timeout default, AbortController pattern
   - Reuse for provider health checks before task execution

5. **Logging Patterns** (from all existing providers)
   - Structured logging via `@repo/logger`
   - Event-based logging: `model_selection_start`, `tier_escalation`, `fallback_triggered`
   - Reuse for task contract selection telemetry

---

## Knowledge Context

### Lessons Learned

**Note**: KB unavailable during generation - no lessons retrieved. Future iterations should query KB for:
- Lessons from MODL-0010 (provider adapters)
- Lessons from WINT-0230 (unified interface)
- Lessons from WINT-0220 (strategy definition)

### Architecture Decisions (ADRs)

**ADR Context**: No ADR-LOG.md found at `plans/future/platform/ADR-LOG.md`. Assuming standard patterns:

| Constraint | Impact on MODL-0020 |
|------------|---------------------|
| Zod-first types | All task contract schemas must use Zod, no TypeScript interfaces |
| Provider abstraction | Task selector must use `ILLMProvider` interface from MODL-0010 |
| Strategy-based routing | Must leverage WINT-0230 `ModelRouter`, not duplicate logic |

### Patterns to Follow

1. **Zod Schema Validation** (from MODL-0010, WINT-0230)
   - Define `TaskContractSchema` with Zod
   - Infer types via `z.infer<typeof Schema>`
   - Validate all task contract inputs

2. **Strategy-Based Configuration** (from WINT-0230)
   - Load task contracts from YAML with fallback to code defaults
   - Cache configuration with TTL
   - Support `forceReload` for testing

3. **Provider Integration** (from MODL-0010)
   - Use `getProviderForModel()` factory
   - Don't bypass provider abstraction
   - Leverage provider availability checks

4. **Tier-Based Selection** (from WINT-0230)
   - Extend `ModelRouter` rather than replacing it
   - Use existing tier→model mappings
   - Preserve backward compatibility with agent-based selection

### Patterns to Avoid

1. **Bypassing Provider Abstraction** (from MODL-0010 lessons)
   - Don't directly instantiate `ChatOllama`, `ChatAnthropic`, etc.
   - Always use `getProviderForModel()` factory

2. **Duplicating Strategy Logic** (from WINT-0230)
   - Don't reimplement tier selection - extend `ModelRouter`
   - Don't duplicate YAML loading - reuse `strategy-loader.ts`

3. **Hard-coded Model Names** (from WINT-0230)
   - Don't hard-code `claude-sonnet-4.5` in code
   - Read from strategy configuration
   - Support configuration changes without code changes

4. **Unbounded Caching** (from MODL-0010 review findings)
   - Implement cache eviction (LRU or TTL)
   - Document cache size assumptions
   - Plan for production cache management

---

## Conflict Analysis

**No conflicts detected.**

All dependencies are satisfied:
- ✅ MODL-0010 (Provider Adapters) - **Completed**
- ✅ WINT-0230 (Unified Model Interface) - **UAT** (ready for integration)
- ✅ WINT-0220 Strategy definition - **Active** (YAML configuration deployed)

---

## Story Seed

### Title
Task Contracts & Model Selector

### Description

**Context**: MODL-0010 established provider adapters (OpenRouter, Ollama, Anthropic) with a unified `ILLMProvider` interface. WINT-0230 implemented tier-based model selection via `ModelRouter`, enabling agent-level routing based on the WINT-0220 4-tier strategy. However, selection is currently **agent-centric** (routing by agent name), not **task-centric** (routing by task characteristics).

**Problem**: Different tasks require different model capabilities even within the same agent. For example:
- **Code review** (simple syntax check vs. security analysis) have different quality requirements
- **Code generation** (boilerplate vs. complex algorithm) have different complexity levels
- **Analysis** (gap analysis vs. architectural decision) have different reasoning depth needs

Agent-level selection is too coarse-grained and prevents optimal cost/quality balance.

**Goal**: Create a **task contract system** that defines task characteristics (complexity, quality requirements, budget constraints) and a **task-based model selector** that routes tasks to optimal model tiers based on these contracts. This enables:

1. **Task-level granularity** - Different tasks within same agent can use different tiers
2. **Contract-based selection** - Tasks declare requirements via contracts, selector matches to tiers
3. **Dynamic optimization** - Adjust model tier based on task characteristics (complexity, budget, quality)
4. **Backward compatibility** - Existing agent-based selection continues working as fallback
5. **Cost reduction** - Fine-grained selection enables moving more tasks to cheaper tiers (60% cost reduction target)

**Expected Outcome**: Tasks can declare their requirements via task contracts (e.g., `{ complexity: 'high', quality: 'critical', budget: 1000 }`), and the model selector automatically chooses the optimal provider+model tier from the WINT-0220 strategy. This provides foundation for MODL-0030 (Quality Evaluator) to validate selections and MODL-0040 (Model Leaderboards) to track performance.

### Initial Acceptance Criteria

**AC-1: Task Contract Schema**
- [ ] Define `TaskContractSchema` with Zod including fields:
  - `taskType` - Enum of task types from WINT-0220 strategy (gap_analysis, code_generation, etc.)
  - `complexity` - Enum: `low | medium | high`
  - `qualityRequirement` - Enum: `adequate | good | high | critical`
  - `budgetTokens` - Optional max tokens for task execution
  - `requiresReasoning` - Boolean flag for reasoning-heavy tasks
  - `securitySensitive` - Boolean flag for security-critical tasks
  - `allowOllama` - Boolean flag to permit/prohibit local models
- [ ] Export `TaskContract` type via `z.infer<typeof TaskContractSchema>`
- [ ] All fields validated with clear error messages
- [ ] Schema located in `packages/backend/orchestrator/src/models/__types__/task-contract.ts`

**AC-2: Task Type Taxonomy Integration**
- [ ] Load task type taxonomy from WINT-0220-STRATEGY.yaml
- [ ] Map task types to default tier recommendations (from strategy `task_types` section)
- [ ] Validate task type exists in strategy configuration
- [ ] Throw clear error if unknown task type provided
- [ ] Cache task type mappings with strategy configuration

**AC-3: Task-Based Model Selector**
- [ ] Implement `selectModelForTask(contract: TaskContract)` function
- [ ] Returns `TierSelection` (tier, model, provider, fallbackChain) from WINT-0230
- [ ] Selection logic:
  - Start with `contract.taskType` → default tier from strategy
  - Escalate if `contract.complexity === 'high'` (tier - 1)
  - Escalate if `contract.qualityRequirement === 'critical'` (tier 0)
  - Escalate if `contract.securitySensitive === true` (tier 0 or 1)
  - De-escalate if `contract.budgetTokens` low and quality permits
  - Skip Ollama tiers if `contract.allowOllama === false`
- [ ] Uses existing `ModelRouter.getModelForTier()` for tier→model resolution
- [ ] Logs selection decisions via `@repo/logger` with full contract context

**AC-4: Backward Compatibility with Agent-Based Selection**
- [ ] Extend `ModelRouter.selectModelForAgent()` to accept optional `TaskContract`
- [ ] When contract provided: use `selectModelForTask(contract)` logic
- [ ] When contract not provided: use existing agent-name-based logic (unchanged)
- [ ] All existing agent invocations continue working without changes
- [ ] Migration path documented in code comments

**AC-5: Fallback Chain Validation**
- [ ] `selectModelForTask()` validates fallback chain from strategy
- [ ] Skips Ollama fallbacks if `contract.allowOllama === false`
- [ ] Ensures at least one non-Ollama fallback available for production tasks
- [ ] Throws clear error if no valid fallback chain exists
- [ ] Logs fallback selection when primary model unavailable

**AC-6: Contract Validation & Defaults**
- [ ] Provide `createTaskContract(partial)` helper with sensible defaults
- [ ] Default `complexity: 'medium'`
- [ ] Default `qualityRequirement: 'good'`
- [ ] Default `allowOllama: true`
- [ ] Default `requiresReasoning: false`
- [ ] Default `securitySensitive: false`
- [ ] Validate partial contracts with Zod partial parsing

**AC-7: Integration Tests**
- [ ] Test suite: `packages/backend/orchestrator/src/models/__tests__/task-selector.test.ts`
- [ ] Test: Simple task (low complexity, adequate quality) → Tier 3
- [ ] Test: Complex task (high complexity, high quality) → Tier 1
- [ ] Test: Critical task (security sensitive, critical quality) → Tier 0
- [ ] Test: Budget-constrained task → De-escalates to cheaper tier when safe
- [ ] Test: Ollama-prohibited task → Skips Ollama tiers, uses Anthropic
- [ ] Test: Fallback chain validation with unavailable primary model
- [ ] Test: Backward compatibility - agent-based selection unchanged when no contract

**AC-8: Documentation**
- [ ] Document task contract fields in code comments
- [ ] Provide usage examples in module docstring
- [ ] Document migration path from agent-based to task-based selection
- [ ] Add to `packages/backend/orchestrator/docs/TASK-CONTRACTS.md`

### Non-Goals

**Explicitly out of scope**:

1. **Quality Evaluation** - MODL-0030 (Quality Evaluator) scope
   - Task contract defines requirements, not evaluation
   - Quality validation is post-selection concern

2. **Model Leaderboards** - MODL-0040 scope
   - Task selector doesn't track model performance
   - Leaderboard integration is future work

3. **ML-Based Selection** - Future ML pipeline (WINT-5xxx) scope
   - Task contract selection is rule-based (strategy configuration)
   - ML-based optimization deferred to learning loop

4. **Workflow Integration** - Follow-up work after MODL-0020
   - Story focuses on selector implementation
   - Integration into orchestrator nodes is separate effort

5. **Contract Persistence** - Future story
   - Contracts are ephemeral (request-scoped)
   - Persistence for analytics deferred

6. **UI for Contract Management** - Not in scope
   - Contracts defined in code
   - UI deferred to AUTO epic (automation dashboard)

7. **Dynamic Strategy Updates** - WINT-0230 scope (already supported)
   - Task selector uses existing strategy loader
   - Hot-reload already implemented in WINT-0230

### Reuse Plan

**Components to Reuse**:

1. **Provider Factory** (`packages/backend/orchestrator/src/providers/index.ts`)
   - Use `getProviderForModel(modelName)` for model instantiation
   - Reuse provider caching pattern
   - Don't duplicate provider selection logic

2. **ModelRouter** (`packages/backend/orchestrator/src/models/unified-interface.ts`)
   - Extend `ModelRouter` class with task-based selection
   - Reuse `getModelForTier(tier)` for tier→model mapping
   - Reuse `TierSelection` type for return values

3. **Strategy Loader** (`packages/backend/orchestrator/src/models/strategy-loader.ts`)
   - Use `loadStrategy()` for strategy configuration
   - Reuse `StrategySchema` validation
   - Reuse task type taxonomy from strategy

4. **Logging Patterns** (from MODL-0010 and WINT-0230)
   - Use `@repo/logger` for all logging
   - Event-based logging: `task_selection_start`, `tier_selection`, `fallback_triggered`
   - Structured log context with full task contract

**Patterns to Follow**:

1. **Zod-First Types** (from MODL-0010, WINT-0230)
   - Define `TaskContractSchema` with Zod
   - Infer `TaskContract` type via `z.infer<>`
   - Validate all inputs with Zod schemas

2. **Configuration-Driven** (from WINT-0230)
   - Read task type taxonomy from WINT-0220-STRATEGY.yaml
   - Support configuration changes without code changes
   - Cache configuration with TTL

3. **Backward Compatibility** (from WINT-0230)
   - Don't break existing agent-based selection
   - Make task contracts optional parameter
   - Migration path preserves existing behavior

**Packages to Use** (already installed):

- `zod` - Schema validation
- `@repo/logger` - Structured logging
- `@langchain/core` - BaseChatModel type
- `yaml` - Parse strategy YAML (via strategy-loader)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Context**: Task-based selection introduces new dimensions to test:

1. **Contract validation** - Test all field combinations and edge cases
2. **Selection logic** - Test tier selection matrix (taskType × complexity × quality)
3. **Fallback chains** - Test provider unavailability and Ollama-prohibited scenarios
4. **Backward compatibility** - Test existing agent-based selection unchanged

**Key Test Scenarios**:
- Contract validation (valid/invalid field values)
- Tier escalation matrix (low/medium/high complexity × adequate/good/high/critical quality)
- Security-sensitive task routing (always Tier 0/1)
- Budget constraints (de-escalation when safe)
- Ollama availability (fallback to Anthropic when Ollama down)
- Ollama prohibition (skip Ollama tiers when `allowOllama: false`)

**Integration Testing**:
- Use real provider adapters (MODL-0010)
- Test with real WINT-0220-STRATEGY.yaml
- Validate tier→model mapping from strategy

### For UI/UX Advisor

**Not applicable** - This is backend infrastructure only. No UI changes in scope.

If future UI needed (AUTO epic):
- Contract builder interface for interactive task configuration
- Model selector playground for testing contract→tier mapping
- Tier visualization showing cost/quality trade-offs

### For Dev Feasibility

**Implementation Considerations**:

1. **Leverage WINT-0230 Foundation**
   - `ModelRouter` already implements tier-based selection
   - Extend with task contract logic rather than replacing
   - Preserve existing agent-based selection paths

2. **Task Contract as Optional Enhancement**
   - Make task contract optional parameter to `selectModelForAgent()`
   - When provided: use task-based logic
   - When absent: use existing agent-based logic
   - This enables gradual migration

3. **Selection Logic Complexity**
   - Task→tier mapping has multiple decision factors
   - Implement as clear decision tree with logging at each step
   - Document decision logic in code comments

4. **Testing Strategy**
   - Unit tests for contract validation (Zod)
   - Unit tests for selection logic (tier decision tree)
   - Integration tests with real strategy YAML
   - Integration tests with real provider adapters

5. **Performance Considerations**
   - Strategy configuration already cached (WINT-0230)
   - Contract validation is fast (Zod)
   - Tier selection is rule-based (no ML inference)
   - No performance concerns expected

**Technical Risks**:

1. **Selection Logic Complexity** (Medium Risk)
   - Multiple decision factors (taskType, complexity, quality, security, budget)
   - Mitigation: Clear decision tree with comprehensive tests

2. **Strategy Configuration Mismatch** (Low Risk)
   - Task types in code vs. YAML may diverge
   - Mitigation: Validate task type exists in strategy, throw clear error if missing

3. **Backward Compatibility** (Low Risk)
   - Existing agent-based selection must continue working
   - Mitigation: Make contract optional, preserve existing code paths

**Estimated Complexity**: **Medium (5 story points)**
- Task contract schema definition: Small
- Selection logic implementation: Medium (decision tree with multiple factors)
- Integration with WINT-0230: Small (extension, not replacement)
- Testing: Medium (comprehensive test matrix needed)

---

**Seed Generated**: 2026-02-15
**Agent**: pm-story-seed-agent
**Baseline**: BASELINE-REALITY-2026-02-13.md
**Next Phase**: Test Plan Generation

---

**STORY-SEED COMPLETE**
