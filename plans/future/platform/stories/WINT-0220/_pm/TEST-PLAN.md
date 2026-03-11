# Test Plan: WINT-0220 - Define Model-per-Task Strategy

**Generated**: 2026-02-14
**Story**: WINT-0220
**Type**: Strategy Documentation

---

## Test Objectives

1. Validate strategy document completeness and internal consistency
2. Verify all task types have model tier assignments
3. Confirm no circular dependencies in escalation logic
4. Validate edge case coverage
5. Ensure backward compatibility with existing agent frontmatter

---

## Test Scenarios

### 1. Document Completeness Validation

**Scenario**: Verify WINT-0220-STRATEGY.md contains all required sections

**Test Steps**:
1. Read strategy document
2. Verify presence of:
   - Model tier definitions (4 tiers: Critical/Complex/Routine/Simple)
   - Task taxonomy (Setup/Analysis/Generation/Validation/Decision/Completion)
   - Selection criteria flowchart
   - Escalation trigger documentation
   - Cost impact analysis
   - Example scenarios (minimum 5)
3. Check each section has substantive content (not placeholders)

**Pass Criteria**:
- [ ] All 8 ACs from story are addressed in document
- [ ] Each tier has: name, models, selection criteria, fallback strategy
- [ ] Taxonomy covers all workflow task types currently in use
- [ ] Flowchart is machine-parseable (YAML or Mermaid format)

**Automation**: Schema validation script against strategy YAML

---

### 2. Model Tier Consistency Check

**Scenario**: Verify tier assignments are consistent across document sections

**Test Steps**:
1. Extract tier definitions from strategy
2. Extract tier references from task taxonomy
3. Extract tier references from escalation triggers
4. Compare all three extractions for consistency
5. Check for undefined tier references

**Pass Criteria**:
- [ ] No references to tiers not defined in tier specification
- [ ] All tiers have at least one task type assigned
- [ ] Tier numbering is consistent (0-3)
- [ ] Fallback models exist for all tiers

**Automation**: Cross-reference validator script

---

### 3. Escalation Trigger Validation

**Scenario**: Verify no circular dependencies in escalation logic

**Test Steps**:
1. Model escalation triggers as directed graph
2. Run cycle detection algorithm
3. Verify all paths terminate at either Tier 0 or human-in-the-loop
4. Check for unreachable escalation states
5. Validate de-escalation paths exist (cost constraints)

**Pass Criteria**:
- [ ] No circular escalation loops detected
- [ ] All failure paths lead to higher tier or HitL
- [ ] Budget-constrained de-escalation documented
- [ ] Maximum escalation depth defined

**Automation**: Graph analysis script (networkx or similar)

---

### 4. Cost Projection Realism Check

**Scenario**: Verify cost estimates are grounded in reality

**Test Steps**:
1. Extract cost estimates from strategy document
2. Load actual workflow telemetry (if available from INFR-0040)
3. Compare projected vs. actual costs for 3-5 sample workflows
4. Check variance is within ±30%
5. If no telemetry available, compare against MODEL_STRATEGY.md estimates

**Pass Criteria**:
- [ ] Cost projections include both current and proposed strategy
- [ ] Savings estimate (40-60%) has documented rationale
- [ ] At least 3 workflow scenarios analyzed
- [ ] Assumptions clearly stated (e.g., "assumes Ollama available 95% of time")

**Automation**: Cost comparison script (if telemetry available)
**Fallback**: Manual review against MODEL_STRATEGY.md

---

### 5. Edge Case Coverage

**Scenario**: Verify strategy handles known edge cases

**Test Cases**:

| Edge Case | Expected Behavior | Validation |
|-----------|-------------------|------------|
| Ollama unavailable | Fallback to Claude Haiku/Sonnet | Documented in strategy |
| Budget exceeded mid-workflow | De-escalate to lower tier or pause | Escalation triggers section |
| Quality gate failure | Retry with higher tier model | Failure-based escalation defined |
| Unknown task type | Default tier assignment documented | Strategy includes catch-all rule |
| Model unavailable (e.g., Opus outage) | Fallback to Sonnet or pause | Each tier has fallback model |
| Local model missing (e.g., deepseek-coder) | Documented in minimum requirements | Ollama fleet specs reference WINT-0240 |

**Pass Criteria**:
- [ ] All 6 edge cases addressed in strategy or example scenarios
- [ ] Fallback behavior is deterministic (no undefined states)
- [ ] Edge cases align with operational constraints from baseline

---

### 6. Agent Mapping Validation

**Scenario**: Verify strategy is compatible with existing 100+ agent files

**Test Steps**:
1. Load all agent files from `.claude/agents/*.agent.md`
2. Extract `model:` frontmatter from each
3. Map current assignments to proposed strategy tiers
4. Identify discrepancies (agent assigned tier X but strategy suggests tier Y)
5. Check migration plan covers all discrepancies
6. Verify backward compatibility approach (no breaking changes)

**Pass Criteria**:
- [ ] At least 90% of current agent assignments align with strategy
- [ ] Discrepancies documented with rationale
- [ ] Migration plan exists for misaligned agents
- [ ] No agent left unmapped

**Automation**: Agent frontmatter parser + strategy mapper script

---

### 7. Integration with Provider System (MODL-0010)

**Scenario**: Verify strategy aligns with provider adapter interfaces

**Test Steps**:
1. Read MODL-0010 story/implementation artifacts
2. Extract provider interface definitions
3. Verify strategy tier models are supported by provider adapters
4. Check configuration format compatibility with `model-assignments.ts`
5. Validate no assumptions about provider features not yet implemented

**Pass Criteria**:
- [ ] All tier models (Opus/Sonnet/Haiku/Ollama variants) supported by adapters
- [ ] Strategy references provider capabilities correctly
- [ ] No breaking changes to `model-assignments.ts` schema
- [ ] Configuration format is YAML-compatible

**Dependencies**: MODL-0010 must be complete for full validation
**Fallback**: Review against MODL-0010 design doc if implementation incomplete

---

### 8. Example Scenario Walkthrough

**Scenario**: Manually trace 5 example scenarios from strategy document

**Test Steps**:
For each example scenario:
1. Read scenario description
2. Follow decision flowchart
3. Verify model selection matches documented tier
4. Check rationale is clear and justified
5. Compare with current informal approach

**Example Scenarios to Validate**:
1. PM story generation (multi-step workflow)
2. Dev implementation (code generation + reasoning)
3. QA verification (validation + evidence collection)
4. Lint/format task (simple automation)
5. Gap analysis (complex reasoning)

**Pass Criteria**:
- [ ] All 5 scenarios trace correctly through decision tree
- [ ] Model selections are justified with clear rationale
- [ ] Comparison with current approach shows improvement
- [ ] Edge cases within scenarios are handled

---

## Validation Approach

### Manual Review Checklist

- [ ] Strategy document exists at `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.md`
- [ ] All 8 ACs from story are addressed
- [ ] Document is well-structured and readable
- [ ] Technical reviewers can understand and apply strategy
- [ ] No ambiguous or contradictory guidance

### Automated Schema Validation

Create validation script:

```typescript
// packages/backend/orchestrator/scripts/validate-strategy.ts

import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import { z } from 'zod'

const ModelTierSchema = z.object({
  tier: z.number().min(0).max(3),
  name: z.string(),
  models: z.array(z.string()).min(1),
  criteria: z.string(),
  fallback: z.string(),
})

const TaskTypeSchema = z.object({
  type: z.string(),
  tier: z.number().min(0).max(3),
  rationale: z.string(),
})

const StrategySchema = z.object({
  version: z.string(),
  tiers: z.array(ModelTierSchema).length(4),
  task_types: z.array(TaskTypeSchema).min(6),
  escalation_triggers: z.object({
    quality: z.array(z.unknown()),
    cost: z.array(z.unknown()),
    failure: z.array(z.unknown()),
  }),
  cost_analysis: z.object({
    current_estimate: z.string(),
    proposed_estimate: z.string(),
    savings_target: z.string(),
  }),
})

// Run validation
const strategyYaml = readFileSync('docs/WINT-0220-STRATEGY.yaml', 'utf-8')
const strategy = load(strategyYaml)
const result = StrategySchema.safeParse(strategy)

if (!result.success) {
  console.error('Validation failed:', result.error)
  process.exit(1)
}

console.log('✓ Strategy validation passed')
```

**Run**: `pnpm --filter @repo/orchestrator validate:strategy`

---

## Key Risks

1. **Complexity Risk**: Strategy too complex for developers to understand/apply
   - **Mitigation**: Include decision flowchart and 5+ real examples
   - **Test**: Have 2-3 developers not involved in writing apply strategy to sample agents

2. **Data Availability Risk**: Cost projections may lack supporting telemetry data
   - **Mitigation**: Document assumptions clearly, revisit with MODL-0040 data
   - **Test**: Compare against MODEL_STRATEGY.md estimates as baseline

3. **Provider Dependency Risk**: Strategy assumes MODL-0010 provider interfaces
   - **Mitigation**: Review strategy with MODL-0010 implementer before finalization
   - **Test**: Cross-reference provider capabilities

4. **Agent Migration Risk**: 100+ agents may not align with new strategy
   - **Mitigation**: Create migration plan as AC-4 requirement
   - **Test**: Sample 10% of agents for alignment check

---

## Success Criteria Summary

**All 8 ACs validated**:
- [x] AC-1: Strategy document created with required sections
- [x] AC-2: Task taxonomy defined and mapped
- [x] AC-3: Model tier specifications complete
- [x] AC-4: Agent mappings validated with migration plan
- [x] AC-5: Escalation triggers defined (no circular logic)
- [x] AC-6: Integration with MODL-0010 verified
- [x] AC-7: Cost impact analysis realistic
- [x] AC-8: Example scenarios documented and walkthrough-validated

**Quality Gates**:
- Schema validation passes
- No circular escalation dependencies
- Manual review by 2+ technical reviewers
- 90%+ agent alignment with strategy

---

## Non-Test Activities

**Out of Scope for This Test Plan**:
- Implementing auto-selection logic (WINT-0230)
- Building model leaderboards (MODL-0030/0040)
- Configuring Ollama fleet (WINT-0240)
- Creating escalation automation (WINT-0250)
- Migrating all 100+ agents (follow-up work)

**These will have their own test plans in respective stories.**

---

## Test Execution Timeline

1. **Pre-Validation** (before story completion):
   - Run schema validator on draft strategy
   - Check document completeness against AC list

2. **At Story Completion**:
   - Full manual review checklist
   - Edge case coverage verification
   - Example scenario walkthroughs
   - Agent mapping analysis (10% sample)

3. **Post-Completion** (as follow-up):
   - Full agent migration validation (100% coverage)
   - Cost analysis with real telemetry (when INFR-0040 complete)
   - Integration testing with WINT-0230 implementation

---

**Test Plan Owner**: PM team
**Execution**: Manual + automated validation
**Review**: Technical lead + product owner sign-off required
