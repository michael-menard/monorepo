# Task Contracts & Model Selector

**Story**: MODL-0020  
**Status**: Active  
**Version**: 1.0.0  
**Last Updated**: 2026-02-15

---

## Overview

Task contracts enable **task-level granularity** for model selection in the orchestrator. Instead of routing by agent name (agent-level), tasks can declare their requirements (complexity, quality, security) via contracts, and the model selector automatically chooses the optimal tier from the WINT-0220 strategy.

**Key Benefits**:
- **Fine-grained optimization**: Different tasks within the same agent can use different tiers
- **Contract-based selection**: Tasks declare requirements, selector matches to tiers
- **Cost reduction**: Move simple tasks to cheaper tiers (Ollama) while keeping critical tasks on Opus
- **Backward compatibility**: Existing agent-based selection continues working as fallback

---

## Task Contract Fields

### `taskType` (required)

Task type from WINT-0220 strategy taxonomy. Must match a task type defined in `WINT-0220-STRATEGY.yaml`.

**Common task types**:
- `setup_validation` - Pre-flight checks, schema validation (Tier 3)
- `simple_code_generation` - Single-file generation, template-based (Tier 2)
- `complex_code_generation` - Multi-file generation, reasoning required (Tier 1)
- `gap_analysis` - Stakeholder perspective analysis (Tier 1)
- `security_review` - Threat modeling, attack vector analysis (Tier 1)
- `epic_planning` - Large-scale strategic planning (Tier 0)
- `commitment_gate` - Go/no-go decisions (Tier 0)

See full list in `WINT-0220-STRATEGY.yaml` under `task_types`.

---

### `complexity` (default: `'medium'`)

Task complexity level. High complexity triggers tier escalation.

- `'low'` - Simple, well-defined tasks (lint, formatting, status updates)
- `'medium'` - Standard development tasks (single-file generation, refactoring)
- `'high'` - Complex reasoning tasks (multi-file generation, architecture)

**Escalation rule**: `complexity: 'high'` → escalate by 1 tier (e.g., Tier 2 → Tier 1)

---

### `qualityRequirement` (default: `'good'`)

Quality requirement level. Critical quality forces Tier 0 (Opus).

- `'adequate'` - Basic correctness (simple tasks, non-critical)
- `'good'` - Standard quality (routine work)
- `'high'` - High quality (complex reasoning, multiple factors)
- `'critical'` - Highest quality (security-sensitive, high-stakes decisions)

**Escalation rules**:
- `qualityRequirement: 'critical'` → Force Tier 0 (Opus)
- `qualityRequirement: 'high'` → Escalate by 1 tier if not already Tier 0/1

---

### `budgetTokens` (optional)

Maximum token budget for task execution. Triggers tier de-escalation if budget is constrained.

**De-escalation rule**: Budget constraint only applies if quality permits (adequate/good).

**Example**: Task with `budgetTokens: 1000` and `qualityRequirement: 'good'` may de-escalate from Tier 1 to Tier 2 to stay within budget.

**Note**: Budget constraints are **advisory**, not hard limits. High/critical quality requirements override budget.

---

### `securitySensitive` (default: `false`)

Flag for security-critical tasks. Forces Tier 0/1 (no Ollama), requires high-quality models.

**Escalation rule**: `securitySensitive: true` → Escalate to Tier 1 (or Tier 0 if quality also critical)

**Use cases**: Security reviews, authentication logic, payment processing, data encryption

---

### `requiresReasoning` (default: `false`)

Flag for reasoning-intensive tasks. Requires models with strong reasoning capabilities.

**Note**: This flag is informational in v1.0. Future versions may use it for model filtering.

**Use cases**: Multi-factor decision making, synthesis, architectural planning

---

### `allowOllama` (default: `true`)

Flag to allow/prohibit Ollama models. Set to `false` for production-critical tasks requiring managed providers.

**Filtering rule**: `allowOllama: false` → Remove Ollama models from fallback chain, use only Anthropic

**Use cases**: Production deployments, security-sensitive tasks, tasks requiring guaranteed availability

---

## Usage Examples

### Example 1: Simple Code Generation

```typescript
import { createTaskContract } from '@repo/orchestrator/models/__types__/task-contract'
import { selectModelForTask } from '@repo/orchestrator/models/task-selector'

const contract = createTaskContract({
  taskType: 'simple_code_generation',
  complexity: 'low',
  qualityRequirement: 'adequate',
})

const selection = await selectModelForTask(contract)
// → { tier: 3, model: 'ollama/qwen2.5-coder:7b', provider: 'ollama', cost_per_1m_tokens: 0.00 }
```

---

### Example 2: Security Analysis

```typescript
import { createTaskContract } from '@repo/orchestrator/models/__types__/task-contract'
import { selectModelForTask } from '@repo/orchestrator/models/task-selector'

const contract = createTaskContract({
  taskType: 'security_review',
  complexity: 'high',
  qualityRequirement: 'critical',
  securitySensitive: true,
  allowOllama: false,
})

const selection = await selectModelForTask(contract)
// → { tier: 0, model: 'anthropic/claude-opus-4.6', provider: 'anthropic', cost_per_1m_tokens: 15.00 }
```

---

### Example 3: Budget-Constrained Task

```typescript
import { createTaskContract } from '@repo/orchestrator/models/__types__/task-contract'
import { selectModelForTask } from '@repo/orchestrator/models/task-selector'

const contract = createTaskContract({
  taskType: 'gap_analysis',
  complexity: 'medium',
  qualityRequirement: 'good', // Permits de-escalation
  budgetTokens: 1000, // Low budget
})

const selection = await selectModelForTask(contract)
// → { tier: 2, model: 'ollama/deepseek-coder-v2:16b', provider: 'ollama', cost_per_1m_tokens: 0.00 }
// (De-escalated from default Tier 1 to Tier 2 due to budget)
```

---

### Example 4: Agent-Based Selection with Contract Override

```typescript
import { ModelRouter } from '@repo/orchestrator/models/unified-interface'
import { createTaskContract } from '@repo/orchestrator/models/__types__/task-contract'

const router = new ModelRouter()
await router.initialize()

// Legacy agent-based selection (no contract)
const legacySelection = await router.selectModelForAgent('dev-implement-story')
// → Uses agent → tier mapping from WINT-0220-STRATEGY.yaml

// Task-based selection with contract override
const taskSelection = await router.selectModelForAgent('dev-implement-story', {
  taskContract: createTaskContract({
    taskType: 'simple_code_generation',
    complexity: 'high',
    qualityRequirement: 'critical',
  }),
})
// → { tier: 0, ... }
// (Task contract overrides agent default)
```

---

## Selection Logic

### Decision Tree

1. **Load task type default tier** from WINT-0220-STRATEGY.yaml
2. **Apply escalation rules** (highest precedence):
   - `securitySensitive === true` → Tier 0/1
   - `qualityRequirement === 'critical'` → Tier 0
   - `qualityRequirement === 'high'` → Escalate by 1 tier
   - `complexity === 'high'` → Escalate by 1 tier
3. **Apply de-escalation rules** (lower precedence):
   - `budgetTokens` constraint → De-escalate if quality permits (adequate/good)
4. **Validate fallback chain**:
   - Skip Ollama tiers if `allowOllama === false`
   - Ensure at least one valid fallback exists
5. **Return TierSelection** with tier, model, provider, fallbackChain

---

### Escalation Precedence

| Rule | Trigger | Action | Precedence |
|------|---------|--------|------------|
| Security | `securitySensitive: true` | Force Tier 0/1 (no Ollama) | Highest |
| Critical quality | `qualityRequirement: 'critical'` | Force Tier 0 | High |
| High quality | `qualityRequirement: 'high'` | Escalate by 1 tier | Medium |
| High complexity | `complexity: 'high'` | Escalate by 1 tier | Medium |
| Budget constraint | `budgetTokens` low | De-escalate if quality permits | Lowest |

**Note**: Escalation rules override de-escalation rules. Budget constraints cannot downgrade critical/high quality tasks.

---

### Tier Selection Matrix

| Task Type | Default Tier | Escalation Triggers |
|-----------|--------------|---------------------|
| `setup_validation` | 3 | None (deterministic) |
| `simple_code_generation` | 2 | High complexity → Tier 1 |
| `complex_code_generation` | 1 | High complexity → Tier 0 |
| `gap_analysis` | 1 | High complexity → Tier 0 |
| `security_review` | 1 | Security-sensitive → Tier 0 |
| `epic_planning` | 0 | None (always Tier 0) |
| `commitment_gate` | 0 | None (always Tier 0) |

See full matrix in `WINT-0220-STRATEGY.yaml` under `task_types`.

---

## Migration Path

### Phase 1: Agent-Based Selection (Current)

```typescript
const router = new ModelRouter()
const selection = await router.selectModelForAgent('dev-implement-story')
// → Uses agent → tier mapping from strategy
```

---

### Phase 2: Task-Based Selection with Contracts (New)

```typescript
const router = new ModelRouter()
const selection = await router.selectModelForAgent('dev-implement-story', {
  taskContract: createTaskContract({
    taskType: 'simple_code_generation',
    complexity: 'medium',
    qualityRequirement: 'good',
  }),
})
// → Uses task contract → tier selection logic
```

---

### Phase 3: Gradual Rollout

1. **Start with high-variance agents**: Agents that perform diverse tasks (e.g., `dev-implement-story`)
2. **Add contracts incrementally**: Test with simple tasks first, expand to complex tasks
3. **Monitor cost/quality metrics**: Use `@repo/logger` to track tier selections and outcomes
4. **Adjust contracts based on data**: Refine complexity/quality requirements based on observed results

---

## Error Handling

### Unknown Task Type

```typescript
const contract = createTaskContract({
  taskType: 'unknown_task',
})

await selectModelForTask(contract)
// → Error: Task type 'unknown_task' not found in strategy.
//   Available types: setup_validation, simple_code_generation, ...
```

---

### No Valid Fallback

```typescript
const contract = createTaskContract({
  taskType: 'simple_code_generation', // Tier 2 (Ollama primary)
  allowOllama: false, // Prohibit Ollama
})

// If Ollama is primary and no Anthropic fallback exists:
await selectModelForTask(contract)
// → Error: No valid fallback model available
//   (Ollama prohibited, no Anthropic fallback)
```

---

### Budget Constraint Ignored

```typescript
const contract = createTaskContract({
  taskType: 'security_review',
  qualityRequirement: 'critical',
  budgetTokens: 100, // Very low budget
})

const selection = await selectModelForTask(contract)
// → { tier: 0, ... }
// Warning logged: "Budget constraint ignored due to critical quality requirement"
```

---

## Testing

### Unit Tests

- **Contract validation**: Test all field combinations (22 test cases)
- **Defaults**: Verify `createTaskContract()` applies correct defaults
- **Edge cases**: Invalid task types, conflicting constraints

Run:
```bash
pnpm test --filter @repo/orchestrator -- __tests__/task-contract-validation.test.ts
```

---

### Integration Tests

- **Tier selection matrix**: Test all task types map to correct default tiers
- **Escalation logic**: Test security/quality/complexity triggers
- **De-escalation logic**: Test budget constraints
- **Ollama filtering**: Test `allowOllama=false` removes Ollama from fallback chain
- **Backward compatibility**: Test agent-based selection unchanged when no contract

Run:
```bash
pnpm test --filter @repo/orchestrator -- __tests__/task-selector.test.ts
```

---

## Future Enhancements

### Contract Persistence (MODL-0040)

Store contracts in DB for analytics, leaderboard tracking, and cost attribution.

**Schema** (future):
```sql
CREATE TABLE contracts (
  task_id UUID PRIMARY KEY,
  contract_json JSONB,
  tier_selected INTEGER,
  outcome TEXT,
  quality_score FLOAT,
  cost_tokens INTEGER,
  latency_ms INTEGER,
  created_at TIMESTAMP
);
```

---

### ML-Based Task Selection (WINT-5xxx)

Train ML model to predict optimal tier from task description.

**Input**: Task description, context, historical performance  
**Output**: Recommended tier, confidence score

---

### Contract Templates Library

Curated contracts for common patterns:

```typescript
export const SIMPLE_GEN_CONTRACT = createTaskContract({
  taskType: 'simple_code_generation',
  complexity: 'low',
  qualityRequirement: 'adequate',
})

export const SECURITY_REVIEW_CONTRACT = createTaskContract({
  taskType: 'security_review',
  complexity: 'high',
  qualityRequirement: 'critical',
  securitySensitive: true,
  allowOllama: false,
})
```

---

## References

- **MODL-0020**: Task Contracts & Model Selector (this story)
- **WINT-0230**: Unified Model Interface (ModelRouter implementation)
- **WINT-0220**: Model-per-Task Strategy (strategy configuration)
- **MODL-0010**: Provider Adapters System (provider abstraction)
- **MODL-0030**: Quality Evaluator (future - validate contract selections)
- **MODL-0040**: Model Leaderboards (future - track performance by contract)

---

**Created**: 2026-02-15  
**Author**: dev-execute-leader (autonomous implementation)  
**Story**: MODL-0020 (Task Contracts & Model Selector)
