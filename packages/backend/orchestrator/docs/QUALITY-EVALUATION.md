# Quality Evaluation (MODL-0030)

## Overview

The Quality Evaluator (`quality-evaluator.ts`) provides a heuristic-based system to assess the quality of model outputs against task contract requirements. It evaluates outputs across five dimensions and detects when a tier selection was over- or under-provisioned for the task.

**When to use it**: After a model completes a task, call `evaluateQuality()` with the original task contract, the selected tier, and the model's output to get a structured quality assessment. This feeds into leaderboards, tier selection tuning, and escalation decisions.

**What it does NOT do**: LLM-as-judge evaluation is explicitly excluded from this MVP implementation. All scoring is heuristic and deterministic.

---

## Schema

### QualityDimensionScore

| Field | Type | Description |
|-------|------|-------------|
| `dimension` | `enum` | One of: `correctness`, `completeness`, `coherence`, `compliance`, `cost_efficiency` |
| `score` | `number (0-100)` | Score for this dimension |
| `rationale` | `string` | Human-readable explanation of the score |
| `weight` | `number (0-1)` | Weight in weighted average (defaults to 0.2) |

### QualityEvaluation

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taskContract` | `TaskContract` | Yes | Original task contract used for model selection |
| `selectedTier` | `'tier-0'...'tier-3'` | Yes | Tier that was selected |
| `modelUsed` | `string` | Yes | Model identifier (e.g., `anthropic/claude-sonnet-4.5`) |
| `qualityScore` | `number (0-100)` | Yes | Overall score (weighted average of 5 dimensions) |
| `qualityDimensions` | `QualityDimensionScore[]` | Yes | Per-dimension scores |
| `contractMismatch` | `boolean` | No | True if over/under-provisioned |
| `recommendation` | `string` | No | Tier adjustment recommendation when mismatch detected |
| `timestamp` | `ISO 8601 datetime` | Yes | When the evaluation was performed |

---

## Usage

### Direct function

```typescript
import { evaluateQuality } from './quality-evaluator.js'
import { createTaskContract } from './__types__/task-contract.js'

const contract = createTaskContract({
  taskType: 'code_generation',
  complexity: 'medium',
  qualityRequirement: 'good',
})

const evaluation = evaluateQuality(contract, 'tier-1', modelOutput)

console.log(evaluation.qualityScore)      // e.g., 78.5
console.log(evaluation.contractMismatch)  // false
```

### Via ModelRouter.evaluateQuality()

```typescript
import { ModelRouter } from './unified-interface.js'
import { createTaskContract } from './__types__/task-contract.js'

const router = new ModelRouter()
const contract = createTaskContract({ taskType: 'security_analysis', securitySensitive: true })

const evaluation = await router.evaluateQuality(contract, 'tier-0', modelOutput)
console.log(evaluation.qualityScore)
console.log(evaluation.recommendation)
```

---

## Thresholds

Quality requirement levels map to numeric score thresholds:

| Quality Requirement | Threshold | Use Case |
|--------------------|-----------|----------|
| `adequate` | 60 | Simple, non-critical tasks (lint, status updates) |
| `good` | 75 | Standard development tasks |
| `high` | 85 | Complex reasoning, multi-factor tasks |
| `critical` | 95 | Security-sensitive, high-stakes decisions |

**Over-provisioning margin**: If the achieved score exceeds the requirement threshold by 20+ points, the task is flagged as over-provisioned. Example: `adequate` threshold is 60; score of 80+ triggers over-provisioning.

---

## Tier Quality Expectations

Each tier has an expected quality output level:

| Tier | Model | Expected Quality Score |
|------|-------|----------------------|
| `tier-0` | Opus (anthropic) | 95 |
| `tier-1` | Sonnet (anthropic) | 85 |
| `tier-2` | Haiku (anthropic) | 75 |
| `tier-3` | Ollama (local) | 60 |

---

## Dimension Evaluators

All dimension evaluators are synchronous, heuristic/rule-based functions. No external API calls.

### 1. Correctness (`evaluateCorrectness`)

**What it measures**: Does the output fulfill the stated requirements?

**Approach**:
- Extracts keywords from `taskType` (e.g., `code_generation` → `['code', 'generation']`)
- Counts keyword matches in the output (up to 60 points)
- Checks for substantial content length (≥50 chars = +25 points)
- Checks for structured content (newlines, dots, colons = +15 points)

**Scoring**: Max 100 points, 0 for empty output.

### 2. Completeness (`evaluateCompleteness`)

**What it measures**: Are all required elements present?

**Approach**:
- Compares output length to expected length by complexity (low=100, medium=300, high=800 chars)
- Rewards multi-paragraph structure (+15 points)
- Rewards list usage (+10 points)
- Rewards conclusion/summary language (+5 points)

**Scoring**: Length ratio contributes up to 70 points; structural markers add up to 30 more.

### 3. Coherence (`evaluateCoherence`)

**What it measures**: Is the output logically structured?

**Approach** (acknowledged as heuristic):
- Counts transition words (therefore, however, furthermore, etc.) — up to 30 points
- Rewards multi-paragraph structure (+20 points)
- Rewards logical flow (+15 points)
- Penalizes contradictory phrases (-20 points)
- Checks sentence length variance (diverse sentences = +17.5 points)

**Note**: This heuristic approach is intentionally lightweight for MVP. Future iterations may use LLM-as-judge for coherence scoring.

### 4. Compliance (`evaluateCompliance`)

**What it measures**: Does the output respect contract flags?

**Approach**:
- Starts at 100, deducts for violations
- If `securitySensitive=true` and no security keywords in output: -30 points
- If `allowOllama=false` and output references Ollama/local models: -20 points
- If output is shorter than quality threshold / 2: -15 points

### 5. Cost Efficiency (`evaluateCostEfficiency`)

**What it measures**: Was the selected tier appropriate for the quality needed?

**Approach**:
- Looks up `TIER_QUALITY_EXPECTATIONS` for the selected tier
- Finds the cheapest tier that would meet the quality requirement threshold
- If selected tier is more expensive than the cheapest sufficient tier: "over-provisioned"
- Empty output reduces score by 50

---

## Integration

### Post-Execution Pattern

After a model executes a task, evaluate quality before returning results:

```typescript
async function executeWithQualityCheck(
  contract: TaskContract,
  tier: string,
  executeTask: () => Promise<string>,
): Promise<{ output: string; evaluation: QualityEvaluation }> {
  const output = await executeTask()
  const evaluation = evaluateQuality(contract, tier, output)

  if (evaluation.contractMismatch) {
    logger.warn('tier_mismatch', {
      event: 'tier_mismatch_detected',
      recommendation: evaluation.recommendation,
    })
  }

  return { output, evaluation }
}
```

### MODL-0040 Integration Path

MODL-0040 (Quality-Aware Execution) will call `evaluateQuality()` after each model execution and use the result to:
1. Feed quality metrics into the model leaderboard
2. Trigger tier escalation when quality is insufficient
3. Suggest tier de-escalation when over-provisioned (cost optimization)

---

## Examples

### Code Generation Task

```typescript
const contract = createTaskContract({
  taskType: 'code_generation',
  complexity: 'medium',
  qualityRequirement: 'good',  // threshold: 75
  requiresReasoning: false,
  securitySensitive: false,
  allowOllama: true,
})

const output = `
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0)
}
`

const evaluation = evaluateQuality(contract, 'tier-2', output)
// qualityScore: ~65 (short output, meets adequate but not good)
// contractMismatch: true (under-provisioned if score < 75)
```

### Security Analysis Task

```typescript
const contract = createTaskContract({
  taskType: 'security_analysis',
  complexity: 'high',
  qualityRequirement: 'critical',  // threshold: 95
  requiresReasoning: true,
  securitySensitive: true,
  allowOllama: false,
})

const output = `
## Security Analysis Report

### Authentication
JWT tokens are validated on every request. Token expiry is enforced.
Authorization checks verify role-based access control.

### Input Validation
All inputs are sanitized to prevent SQL injection and XSS.
Credentials are hashed using bcrypt with appropriate salt rounds.
Encryption at rest uses AES-256.

### Conclusion
The implementation meets security requirements with proper access control,
token validation, and input sanitization.
`

const evaluation = evaluateQuality(contract, 'tier-0', output)
// qualityScore: ~85+ (good security keywords, substantial content)
// contractMismatch: depends on whether score exceeds 95 threshold
```

### Documentation Task

```typescript
const contract = createTaskContract({
  taskType: 'documentation',
  complexity: 'low',
  qualityRequirement: 'adequate',  // threshold: 60
  requiresReasoning: false,
  securitySensitive: false,
  allowOllama: true,
})

const output = `
# Function: calculateTotal

Calculates the total price of all items.

## Parameters
- items: Array of items with price property

## Returns
- number: The sum of all item prices
`

const evaluation = evaluateQuality(contract, 'tier-3', output)
// qualityScore: ~72 (meets adequate threshold)
// contractMismatch: depends on whether score is >= 80 (over-provisioning boundary)
```
