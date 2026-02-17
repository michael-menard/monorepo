# Future Opportunities - MODL-0020

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No contract persistence for analytics | Medium | Medium | MODL-0040: Add `contracts` table, track selection outcomes for leaderboard analysis |
| 2 | No workflow orchestrator integration | Medium | Low | MODL-0021/WINT-9xxx: Add TaskContract parameter to orchestrator node invocation |
| 3 | Task type inference is heuristic-based | Low | Low | MODL-0030: Use quality evaluator to auto-classify task complexity from agent output |
| 4 | No multi-criteria optimization | Low | High | Future ML story: Pareto optimization for cost/quality/latency trade-offs |
| 5 | No runtime contract validation in agents | Low | Low | Future: Add contract enforcement hooks in agent execution runtime |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Task contract UI builder | High | High | AUTO-2xxx: Dashboard for creating/testing contracts interactively |
| 2 | Contract templates library | Medium | Low | Create curated contract library for common task patterns (simple_gen, security_review, etc.) |
| 3 | A/B testing for selection strategy | High | Medium | WINT-5xxx: Split traffic between strategies, measure quality/cost outcomes |
| 4 | Task contract versioning | Low | Medium | Future: Track contract schema evolution, migrate legacy contracts automatically |
| 5 | Real-time cost dashboards | Medium | Low | TELE-0xxx: Live cost tracking per task contract, budget alerts |
| 6 | Contract-based billing | Low | High | Future: Multi-tenant billing based on task contract complexity |
| 7 | ML-based task classification | High | High | WINT-5xxx: Train classifier to predict optimal tier from task description |
| 8 | Contract composition | Low | Medium | Future: Allow contracts to inherit from base contracts (DRY principle) |
| 9 | Task contract audit log | Medium | Low | INFR-0xxx: Log all contract evaluations for compliance/debugging |
| 10 | Reasoning trace for tier selection | Low | Low | Add detailed reasoning explanation for why tier X was selected (transparency) |

## Categories

### Edge Cases
- **No valid model available**: Current fallback logic goes to Haiku, but what if Anthropic is down? Need OpenRouter fallback.
- **Tier saturation**: If all Tier 0 tasks queue up, need queue management to prevent starvation.
- **Conflicting contract constraints**: E.g., `complexity: 'high'` + `budgetTokens: 100` (impossible). Need validation to detect conflicts.

### UX Polish
- **Contract presets**: One-click contracts for common patterns ("Security Review", "Simple Refactor", "Epic Planning")
- **Contract dry-run**: Test contract selection without invoking agent (cost estimation)
- **Contract diff**: Show how contract changes affect tier selection (what-if analysis)
- **Contract autocomplete**: IDE-style autocomplete for task types from strategy YAML

### Performance
- **Strategy hot-reload optimization**: Current 30s cache may be too short for high-frequency selection. Consider 5-minute cache with invalidation on file change.
- **Parallel tier selection**: Batch contract evaluation for multi-agent workflows (e.g., 5 agents × 3 tasks = 15 selections in parallel)
- **Contract memoization**: Cache tier selections for identical contracts (e.g., all lint tasks use same contract)

### Observability
- **Selection telemetry**: Track tier distribution, escalation frequency, fallback rate (TELE-0xxx integration)
- **Cost attribution**: Per-contract cost tracking, aggregate by task type for budgeting
- **Quality correlation**: Does task contract complexity predict QA pass rate? (MODL-0030 integration)
- **Latency profiling**: Measure tier selection overhead (<1ms target for hot path)

### Integrations
- **LangGraph state integration**: Store task contract in LangGraph state for multi-node workflows
- **GitHub Actions integration**: Select tier based on CI/CD context (PR vs main branch)
- **Slack notifications**: Alert on Tier 0 escalations (high-cost tasks require attention)
- **Calendar integration**: Schedule Tier 0 tasks during off-peak hours for cost savings

### Future-Proofing
- **Provider-agnostic contracts**: Add support for non-LLM providers (e.g., code formatters, linters as "Tier 4")
- **Multi-model contracts**: Select different models for different sub-tasks (e.g., Opus for planning, Ollama for execution)
- **Contract negotiation**: Agent can request tier upgrade with justification (human approval gate)
- **Contract SLA**: Define latency/quality SLAs per contract, auto-escalate if violated

---

## Detailed Recommendations

### 1. Task Contract Persistence (MODL-0040 Dependency)

**Current State**: Contracts are ephemeral (request-scoped), no persistence.

**Future State**: Persist contracts to PostgreSQL for analytics.

**Schema Design**:
```sql
CREATE TABLE task_contracts (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  task_type TEXT NOT NULL,
  complexity TEXT NOT NULL,
  quality_requirement TEXT NOT NULL,
  budget_tokens INT,
  security_sensitive BOOLEAN,
  allow_ollama BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL,
  selected_tier INT NOT NULL,
  selected_model TEXT NOT NULL,
  fallback_used BOOLEAN,
  outcome TEXT, -- 'success' | 'failure' | 'escalated'
  quality_score FLOAT, -- from MODL-0030
  cost_tokens INT,
  latency_ms INT
);

CREATE INDEX idx_task_contracts_task_type ON task_contracts(task_type);
CREATE INDEX idx_task_contracts_outcome ON task_contracts(outcome);
```

**Use Cases**:
- Model leaderboards: Which models perform best for each task type?
- Cost optimization: Which contracts are most expensive? Can we de-escalate?
- Quality correlation: Does complexity predict quality score?

**Effort**: Medium (2 points) - Schema + migration + analytics queries

---

### 2. Workflow Orchestrator Integration (MODL-0021)

**Current State**: Story provides selection API but no orchestrator integration.

**Future State**: Orchestrator nodes pass TaskContract on invocation.

**Integration Points**:
```typescript
// Before (agent-based selection)
const model = await router.selectModelForAgent('dev-implement-story')

// After (task-based selection with fallback)
const contract = createTaskContract({
  taskType: 'complex_code_generation',
  complexity: 'high',
  qualityRequirement: 'good',
})
const model = await router.selectModelForAgent('dev-implement-story', { taskContract: contract })
```

**Migration Path**:
1. Add optional `taskContract` parameter to orchestrator node invocations
2. Agents without contracts use legacy agent-based selection (backward compatible)
3. Gradually migrate agents to task contracts (agent-by-agent rollout)

**Effort**: Low (1 point) - Simple adapter change, no breaking changes

---

### 3. ML-Based Task Classification (WINT-5xxx)

**Current State**: Task type inferred heuristically from agent name.

**Future State**: Classifier predicts optimal tier from task description.

**Approach**:
```python
# Train classifier on historical task contracts
X = task_descriptions  # Text features
y = optimal_tiers      # Ground truth from MODL-0040 analytics

model = LightGBM(objective='multiclass', num_class=4)
model.fit(X, y)

# Predict tier at runtime
predicted_tier = model.predict(new_task_description)
```

**Training Data**: MODL-0040 contract persistence provides labeled dataset.

**Effort**: High (5 points) - Data pipeline + model training + inference API

---

### 4. Contract Composition & Inheritance (Future)

**Current State**: Contracts are flat, no reuse mechanism.

**Future State**: Contracts can extend base contracts (DRY).

**Example**:
```typescript
// Base contract for all security tasks
const securityBase = {
  securitySensitive: true,
  qualityRequirement: 'critical',
  allowOllama: false,
}

// Specific security review contract
const securityReviewContract = createTaskContract({
  ...securityBase,
  taskType: 'security_review',
  complexity: 'high',
})

// Specific threat modeling contract
const threatModelContract = createTaskContract({
  ...securityBase,
  taskType: 'threat_modeling',
  complexity: 'high',
  budgetTokens: 50000,
})
```

**Benefits**: Reduce duplication, enforce security policies consistently.

**Effort**: Medium (2 points) - Contract schema extension + validation

---

### 5. A/B Testing for Selection Strategies (WINT-5xxx)

**Current State**: Single strategy YAML, no experimentation framework.

**Future State**: Multiple strategies deployed simultaneously, split traffic.

**Architecture**:
```typescript
// Strategy selection based on experiment variant
const strategy = experimentVariant === 'control'
  ? loadStrategy({ strategyPath: 'WINT-0220-STRATEGY.yaml' })
  : loadStrategy({ strategyPath: 'WINT-0220-STRATEGY-v2.yaml' })

// Track outcomes per strategy
trackExperiment({
  variant: experimentVariant,
  taskType: contract.taskType,
  selectedTier: tier,
  outcome: 'success',
  qualityScore: 0.92,
  cost: 0.015,
})
```

**Metrics**: Cost reduction, quality score, latency, escalation rate.

**Effort**: Medium (3 points) - Experiment framework + telemetry integration

---

## Prioritization

**High Impact, Low Effort** (Do First):
1. Workflow orchestrator integration (MODL-0021)
2. Contract templates library
3. Real-time cost dashboards (TELE-0xxx)
4. Contract dry-run (cost estimation)

**High Impact, High Effort** (Strategic Investments):
1. ML-based task classification (WINT-5xxx)
2. Task contract UI builder (AUTO-2xxx)
3. A/B testing framework (WINT-5xxx)
4. Task contract persistence + analytics (MODL-0040)

**Low Impact, Low Effort** (Polish):
1. Contract autocomplete
2. Reasoning trace for tier selection
3. Task contract audit log
4. Contract diff (what-if analysis)

**Low Impact, High Effort** (Defer):
1. Contract-based billing
2. Multi-model contracts
3. Contract versioning
4. Provider-agnostic contracts (non-LLM)

---

## Next Steps

1. **Immediate** (Post-MODL-0020):
   - Create MODL-0021: Workflow Orchestrator Integration (1 point)
   - Add contract templates to strategy YAML (documentation update)

2. **Short-term** (After MODL-0030 Quality Evaluator):
   - Create MODL-0040: Task contract persistence + model leaderboards (3 points)
   - Integrate quality scores into contract analytics

3. **Medium-term** (WINT-5xxx ML Pipeline):
   - Train task classifier from MODL-0040 dataset
   - Deploy A/B testing framework for strategy experimentation

4. **Long-term** (AUTO Epic):
   - Build task contract UI builder
   - Add contract-based billing for multi-tenant scenarios
