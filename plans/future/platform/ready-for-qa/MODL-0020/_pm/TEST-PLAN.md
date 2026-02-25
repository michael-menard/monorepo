# Test Plan: MODL-0020 - Task Contracts & Model Selector

## Scope Summary

**Endpoints touched**: None (backend infrastructure only)

**UI touched**: No

**Data/storage touched**: No (configuration-driven, no persistence in this story)

**Packages modified**:
- `packages/backend/orchestrator/src/models/__types__/task-contract.ts` (new)
- `packages/backend/orchestrator/src/models/task-selector.ts` (new)
- `packages/backend/orchestrator/src/models/unified-interface.ts` (extends ModelRouter)
- `packages/backend/orchestrator/src/models/__tests__/task-selector.test.ts` (new)

---

## Happy Path Tests

### Test 1: Simple Task Selection (Tier 3)
**Setup**:
- Load WINT-0220-STRATEGY.yaml with 4-tier configuration
- Create task contract: `{ taskType: 'code_generation', complexity: 'low', qualityRequirement: 'adequate' }`

**Action**:
- Call `selectModelForTask(contract)`

**Expected Outcome**:
- Returns `TierSelection` with `tier: 3` (cheapest tier)
- Model is Ollama model from Tier 3 strategy
- Provider is `ollama`
- Fallback chain includes Tier 2 options

**Evidence**:
- Unit test assertion: `selection.tier === 3`
- Unit test assertion: `selection.model` matches strategy Tier 3
- Log event: `task_selection_start` with full contract context
- Log event: `tier_selection` with decision reasoning

---

### Test 2: Complex Task Selection (Tier 1)
**Setup**:
- Load WINT-0220-STRATEGY.yaml
- Create task contract: `{ taskType: 'code_generation', complexity: 'high', qualityRequirement: 'high' }`

**Action**:
- Call `selectModelForTask(contract)`

**Expected Outcome**:
- Returns `TierSelection` with `tier: 1` (Sonnet tier)
- Model is `claude-sonnet-4.5`
- Provider is `anthropic`
- Fallback chain includes Tier 0 (Opus)

**Evidence**:
- Unit test assertion: `selection.tier === 1`
- Unit test assertion: `selection.model === 'claude-sonnet-4.5'`
- Log event: `tier_escalation` showing escalation from default tier to Tier 1

---

### Test 3: Critical Task Selection (Tier 0)
**Setup**:
- Load WINT-0220-STRATEGY.yaml
- Create task contract: `{ taskType: 'security_analysis', complexity: 'high', qualityRequirement: 'critical', securitySensitive: true }`

**Action**:
- Call `selectModelForTask(contract)`

**Expected Outcome**:
- Returns `TierSelection` with `tier: 0` (Opus tier - highest quality)
- Model is `claude-opus-4`
- Provider is `anthropic`
- No cheaper fallbacks (security-critical)

**Evidence**:
- Unit test assertion: `selection.tier === 0`
- Unit test assertion: `selection.model === 'claude-opus-4'`
- Log event: `critical_task_escalation` showing security flag triggered Tier 0

---

### Test 4: Backward Compatibility - Agent-Based Selection Without Contract
**Setup**:
- Initialize `ModelRouter` with strategy
- Mock `LEGACY_MODEL_TO_TIER` mapping

**Action**:
- Call `ModelRouter.selectModelForAgent('dev-implement-story')` (no contract parameter)

**Expected Outcome**:
- Uses existing agent-name-based tier selection
- Returns tier from legacy mapping
- No task contract logic invoked

**Evidence**:
- Unit test assertion: agent-based selection returns expected tier (unchanged behavior)
- No `task_selection_start` log event (different code path)
- Log event: `agent_selection` (existing legacy path)

---

### Test 5: Task Contract Defaults
**Setup**:
- Create partial task contract: `{ taskType: 'code_generation' }`

**Action**:
- Call `createTaskContract({ taskType: 'code_generation' })`

**Expected Outcome**:
- Returns full contract with defaults:
  - `complexity: 'medium'`
  - `qualityRequirement: 'good'`
  - `allowOllama: true`
  - `requiresReasoning: false`
  - `securitySensitive: false`

**Evidence**:
- Unit test assertion: all default fields populated correctly
- Zod validation passes

---

## Error Cases

### Error 1: Invalid Task Type
**Setup**:
- Load WINT-0220-STRATEGY.yaml

**Action**:
- Create task contract: `{ taskType: 'unknown_task_type', complexity: 'medium', qualityRequirement: 'good' }`
- Call `selectModelForTask(contract)`

**Expected Outcome**:
- Throws clear error: `Task type 'unknown_task_type' not found in strategy configuration`
- Error includes available task types from strategy

**Evidence**:
- Unit test assertion: `expect(() => selectModelForTask(contract)).toThrow('Task type')`
- Error message is actionable

---

### Error 2: Zod Schema Validation Failure
**Setup**:
- N/A

**Action**:
- Create invalid contract: `{ taskType: 'code_generation', complexity: 'invalid_value', qualityRequirement: 'good' }`
- Pass to `TaskContractSchema.parse()`

**Expected Outcome**:
- Zod throws validation error
- Error message indicates `complexity` field is invalid
- Lists valid values: `low | medium | high`

**Evidence**:
- Unit test assertion: `expect(() => TaskContractSchema.parse(invalid)).toThrow()`
- Error message includes field name and valid options

---

### Error 3: No Valid Fallback Chain
**Setup**:
- Mock all Ollama providers as unavailable
- Create contract with `allowOllama: false`
- Mock all Anthropic tiers as unavailable

**Action**:
- Call `selectModelForTask(contract)`

**Expected Outcome**:
- Throws error: `No valid fallback model available for task`
- Logs all attempted fallbacks with unavailability reasons

**Evidence**:
- Unit test assertion: error thrown when no fallbacks available
- Log events: `fallback_failed` for each attempted provider

---

## Edge Cases (Reasonable)

### Edge 1: Budget-Constrained Task De-escalation
**Setup**:
- Load WINT-0220-STRATEGY.yaml
- Create contract: `{ taskType: 'code_generation', complexity: 'medium', qualityRequirement: 'good', budgetTokens: 500 }`

**Action**:
- Call `selectModelForTask(contract)`

**Expected Outcome**:
- Selects cheaper tier than quality alone would suggest
- Tier 2 or 3 (Ollama) chosen instead of Tier 1 (Sonnet)
- Logs budget constraint as selection factor

**Evidence**:
- Unit test assertion: `selection.tier >= 2`
- Log event: `budget_constraint_applied` with token budget

---

### Edge 2: Ollama Prohibited - Skips Ollama Tiers
**Setup**:
- Load WINT-0220-STRATEGY.yaml
- Create contract: `{ taskType: 'code_generation', complexity: 'low', qualityRequirement: 'adequate', allowOllama: false }`

**Action**:
- Call `selectModelForTask(contract)`

**Expected Outcome**:
- Skips Tier 2 and Tier 3 (Ollama tiers)
- Selects Tier 1 (Sonnet) or Tier 0 (Opus)
- Fallback chain excludes all Ollama options

**Evidence**:
- Unit test assertion: `selection.tier <= 1`
- Unit test assertion: `selection.provider !== 'ollama'`
- Fallback chain contains no Ollama models

---

### Edge 3: Ollama Provider Unavailable - Falls Back to Anthropic
**Setup**:
- Mock Ollama provider `checkAvailability()` to return `false`
- Create contract: `{ taskType: 'code_generation', complexity: 'low', qualityRequirement: 'adequate' }`

**Action**:
- Call `selectModelForTask(contract)`

**Expected Outcome**:
- Primary selection is Tier 3 (Ollama)
- Fallback triggered due to unavailability
- Falls back to Tier 2, then Tier 1 (Anthropic)

**Evidence**:
- Unit test assertion: `selection.provider === 'anthropic'`
- Log event: `fallback_triggered` with reason `provider_unavailable`
- Mock `checkAvailability()` called with expected timeout

---

### Edge 4: Task Type Mapping to Default Tier
**Setup**:
- Load WINT-0220-STRATEGY.yaml with task type taxonomy
- Task type `gap_analysis` maps to Tier 2 by default

**Action**:
- Create contract: `{ taskType: 'gap_analysis', complexity: 'medium', qualityRequirement: 'good' }`
- Call `selectModelForTask(contract)`

**Expected Outcome**:
- Starts with Tier 2 (from task type default)
- No escalation needed (medium complexity, good quality)
- Returns Tier 2 selection

**Evidence**:
- Unit test assertion: `selection.tier === 2`
- Log event: `task_type_default_applied` showing Tier 2 from taxonomy

---

### Edge 5: Multiple Escalation Factors - Highest Tier Wins
**Setup**:
- Load WINT-0220-STRATEGY.yaml
- Create contract: `{ taskType: 'code_review', complexity: 'high', qualityRequirement: 'critical', securitySensitive: true }`

**Action**:
- Call `selectModelForTask(contract)`

**Expected Outcome**:
- All escalation factors apply:
  - `complexity: 'high'` → escalate (tier - 1)
  - `qualityRequirement: 'critical'` → escalate to Tier 0
  - `securitySensitive: true` → escalate to Tier 0
- Final selection is Tier 0 (highest quality)

**Evidence**:
- Unit test assertion: `selection.tier === 0`
- Log event shows all escalation factors evaluated
- Decision reasoning logged

---

## Required Tooling Evidence

### Backend Testing
**Framework**: Vitest + TypeScript

**Test Files**:
- `packages/backend/orchestrator/src/models/__tests__/task-selector.test.ts`
- `packages/backend/orchestrator/src/models/__tests__/task-contract-validation.test.ts`

**Required Assertions**:
1. Zod schema validation (all fields, edge values)
2. Tier selection logic (all combinations of complexity × quality)
3. Escalation logic (security, complexity, quality triggers)
4. De-escalation logic (budget constraints)
5. Fallback chain validation (Ollama prohibited, provider unavailable)
6. Backward compatibility (agent-based selection unchanged)
7. Strategy integration (task type taxonomy loading)
8. Logging (all decision points logged via `@repo/logger`)

**Integration Test Requirements**:
- Load real WINT-0220-STRATEGY.yaml (not mocked)
- Use real provider adapters from MODL-0010 (mock network calls only)
- Validate tier→model mappings from strategy
- Test with multiple task types from strategy taxonomy

**Mocking Strategy**:
- Mock provider `checkAvailability()` for unavailability tests
- Mock strategy YAML loading for invalid config tests
- Do NOT mock ModelRouter or provider factory (integration tests)

---

### Required Artifacts
**Coverage Requirements**:
- Minimum 80% coverage for task contract validation
- Minimum 80% coverage for selection logic
- 100% coverage for error paths (invalid task types, no fallbacks)

**Logging Validation**:
- All log events emitted via `@repo/logger` (never `console.log`)
- Structured logging with full context:
  - `task_selection_start`: contract fields
  - `tier_selection`: selected tier, decision factors
  - `tier_escalation`: escalation reason, original tier, new tier
  - `budget_constraint_applied`: token budget, tier adjustment
  - `fallback_triggered`: reason, attempted provider, fallback chain
  - `critical_task_escalation`: security flag, quality requirement

---

## Risks to Call Out

### Risk 1: Strategy Configuration Drift
**Description**: Task types in code may diverge from WINT-0220-STRATEGY.yaml over time.

**Mitigation**:
- Test validates task type exists in strategy
- Clear error thrown if mismatch detected
- Integration tests use real strategy file

**Test Coverage**: Error case #1 validates this.

---

### Risk 2: Selection Logic Complexity
**Description**: Multiple decision factors (taskType, complexity, quality, security, budget) create complex decision tree.

**Mitigation**:
- Comprehensive test matrix covering all factor combinations
- Clear logging at each decision point
- Decision tree documented in code comments

**Test Coverage**: Happy path tests 1-3, Edge cases 1-2, Edge case 5.

---

### Risk 3: Fallback Chain Edge Cases
**Description**: Fallback logic with multiple unavailable providers and Ollama prohibition can create complex scenarios.

**Mitigation**:
- Test all fallback scenarios (provider down, Ollama prohibited, all unavailable)
- Clear error if no valid fallback exists
- Log all attempted fallbacks

**Test Coverage**: Error case #3, Edge cases 3, 2.

---

### Risk 4: Backward Compatibility Breakage
**Description**: Changes to ModelRouter could break existing agent-based selection.

**Mitigation**:
- Test 4 validates existing agent-based path unchanged
- Make task contract optional parameter
- Preserve all legacy code paths

**Test Coverage**: Happy path test 4.

---

## Blockers

**None identified** - All requirements are clear and testable based on seed context.
