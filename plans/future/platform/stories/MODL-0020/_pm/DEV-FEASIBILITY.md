# Dev Feasibility Review: MODL-0020 - Task Contracts & Model Selector

## Feasibility Summary

**Feasible for MVP**: Yes

**Confidence**: High

**Why**:
- MODL-0020 extends existing `ModelRouter` from WINT-0230 (UAT), not replacing it
- Provider abstraction from MODL-0010 (completed) provides stable foundation
- Strategy configuration pattern established in WINT-0230
- Task contract is optional parameter - enables gradual migration without breaking changes
- Selection logic is rule-based (no ML inference) - deterministic and testable
- No new external dependencies required - uses existing Zod, @repo/logger, strategy-loader

**Key Success Factor**: Clear decision tree for task→tier mapping with comprehensive test coverage.

---

## Likely Change Surface (Core Only)

### Backend Packages Modified
1. **`packages/backend/orchestrator/src/models/__types__/task-contract.ts`** (new)
   - Define `TaskContractSchema` with Zod
   - Export `TaskContract` type via `z.infer`
   - ~50 lines

2. **`packages/backend/orchestrator/src/models/task-selector.ts`** (new)
   - Implement `selectModelForTask(contract)` function
   - Task→tier selection logic
   - Integration with strategy taxonomy
   - ~150-200 lines

3. **`packages/backend/orchestrator/src/models/unified-interface.ts`** (extend)
   - Extend `ModelRouter.selectModelForAgent()` to accept optional `TaskContract`
   - Route to task-based or agent-based logic based on parameter
   - ~20 lines added

4. **`packages/backend/orchestrator/src/models/__tests__/task-selector.test.ts`** (new)
   - Comprehensive test suite (contract validation, selection logic, fallbacks)
   - ~300-400 lines

### Configuration Files Modified
**None** - Uses existing WINT-0220-STRATEGY.yaml

### Deployment Touchpoints
**None** - Pure code changes, no infrastructure updates required

---

## MVP-Critical Risks

### Risk 1: Selection Logic Complexity
**Why it blocks MVP**:
- Task→tier mapping has multiple decision factors (taskType, complexity, quality, security, budget)
- Incorrect tier selection could route critical tasks to inadequate models
- Wrong tier = poor quality output or excessive cost

**Required Mitigation**:
- Implement clear decision tree with explicit precedence rules
- Document decision logic in code comments
- Comprehensive test matrix covering all factor combinations (see TEST-PLAN.md)
- Log all decision points via `@repo/logger` for debugging

**Implementation Note**:
```typescript
// Decision tree precedence (highest to lowest):
// 1. securitySensitive === true → Tier 0 or 1
// 2. qualityRequirement === 'critical' → Tier 0
// 3. complexity === 'high' → escalate (tier - 1)
// 4. budgetTokens constraint → de-escalate if quality permits
// 5. taskType default tier (from strategy)
```

---

### Risk 2: Strategy Configuration Mismatch
**Why it blocks MVP**:
- Task types referenced in code must exist in WINT-0220-STRATEGY.yaml
- Missing task type → runtime error when selector invoked
- Blocks all tasks using undefined task types

**Required Mitigation**:
- Validate task type exists in strategy configuration
- Throw clear error with available task types if mismatch
- Integration test with real WINT-0220-STRATEGY.yaml (not mocked)
- Document task type taxonomy in code comments

**Implementation Note**:
```typescript
const strategy = await loadStrategy()
const taskTypeConfig = strategy.task_types[contract.taskType]
if (!taskTypeConfig) {
  throw new Error(
    `Task type '${contract.taskType}' not found in strategy. ` +
    `Available: ${Object.keys(strategy.task_types).join(', ')}`
  )
}
```

---

### Risk 3: Backward Compatibility Breakage
**Why it blocks MVP**:
- Existing agent-based selection must continue working unchanged
- Breaking existing agents → workflow failures across all agent invocations
- High blast radius if compatibility broken

**Required Mitigation**:
- Make task contract optional parameter to `selectModelForAgent()`
- When contract absent: use existing agent-name-based logic (unchanged)
- When contract provided: use new task-based logic
- Dedicated test validates existing agent-based path unchanged (TEST-PLAN.md Test 4)

**Implementation Note**:
```typescript
class ModelRouter {
  selectModelForAgent(
    agentName: string,
    context?: { taskContract?: TaskContract }
  ): TierSelection {
    if (context?.taskContract) {
      return selectModelForTask(context.taskContract)
    }
    // Existing agent-based logic (unchanged)
    return this.selectByAgentName(agentName)
  }
}
```

---

## Missing Requirements for MVP

### Requirement 1: Task Type Taxonomy Documentation
**Missing**: List of valid task types for contracts is not documented in story ACs.

**Concrete Decision**:
PM must specify in story whether to:
- Option A: Use all task types from existing WINT-0220-STRATEGY.yaml as-is
- Option B: Define subset of task types for initial release
- Option C: Add new task types to strategy for MODL-0020 use cases

**Recommendation**: Option A (use existing taxonomy) - faster MVP, already validated in WINT-0230.

---

### Requirement 2: Default Tier Recommendations per Task Type
**Missing**: Story ACs reference "default tier recommendations from strategy" but don't specify behavior if task type has no default tier defined.

**Concrete Decision**:
PM must specify fallback tier when task type lacks default:
- Option A: Use Tier 2 (balanced cost/quality) as universal fallback
- Option B: Throw error requiring explicit tier in strategy
- Option C: Infer from complexity/quality only (ignore task type)

**Recommendation**: Option A - graceful degradation, enables adding new task types without strategy updates.

---

## MVP Evidence Expectations

### Required Test Evidence
1. **Unit tests passing** (Vitest):
   - Contract validation (all field combinations)
   - Selection logic (tier decision tree)
   - Error handling (invalid task types, no fallbacks)
   - Minimum 80% coverage

2. **Integration tests passing**:
   - Real WINT-0220-STRATEGY.yaml loading
   - Real provider adapters (MODL-0010)
   - Tier→model mapping validation
   - Fallback chain validation

3. **Backward compatibility tests passing**:
   - Existing agent-based selection unchanged
   - No regression in agent invocations

### Required Logging Evidence
- All decision points logged via `@repo/logger`:
  - `task_selection_start`
  - `tier_selection`
  - `tier_escalation`
  - `budget_constraint_applied`
  - `fallback_triggered`

### Critical CI/Deploy Checkpoints
- All Vitest tests pass in `packages/backend/orchestrator`
- TypeScript compilation passes (strict mode)
- ESLint passes (no new warnings)
- No changes to infrastructure/deployment (pure code changes)

---

## Reuse Plan (MVP-Critical)

### 1. ModelRouter (WINT-0230)
**File**: `packages/backend/orchestrator/src/models/unified-interface.ts`

**Reuse**:
- Extend `ModelRouter.selectModelForAgent()` with optional task contract
- Reuse `getModelForTier(tier)` for tier→model mapping
- Reuse `TierSelection` type for return values

**Why Critical**: Core routing logic - don't duplicate.

---

### 2. Strategy Loader (WINT-0230)
**File**: `packages/backend/orchestrator/src/models/strategy-loader.ts`

**Reuse**:
- Use `loadStrategy()` to load WINT-0220-STRATEGY.yaml
- Reuse `StrategySchema` validation
- Reuse task type taxonomy from strategy

**Why Critical**: Configuration source of truth - don't create alternative loaders.

---

### 3. Provider Factory (MODL-0010)
**File**: `packages/backend/orchestrator/src/providers/index.ts`

**Reuse**:
- Use `getProviderForModel(modelName)` for model instantiation
- Reuse provider caching pattern
- Leverage `checkAvailability()` for fallback logic

**Why Critical**: Provider abstraction - don't bypass adapters.

---

### 4. Logging Patterns (MODL-0010, WINT-0230)
**Package**: `@repo/logger`

**Reuse**:
- Use `@repo/logger` for all logging (never `console.log`)
- Event-based logging pattern: `logger.info('event_name', context)`
- Structured context with full decision factors

**Why Critical**: Debugging and telemetry - consistent logging required.

---

## Estimated Effort

**Story Points**: 5 (Medium)

**Breakdown**:
- Task contract schema definition: 0.5 points (Small - straightforward Zod schema)
- Selection logic implementation: 2 points (Medium - decision tree with multiple factors)
- Integration with ModelRouter: 0.5 points (Small - extend existing class)
- Unit tests: 1 point (Medium - comprehensive test matrix)
- Integration tests: 1 point (Medium - real strategy + providers)

**Timeline**: 2-3 days for experienced developer familiar with MODL-0010 and WINT-0230.
